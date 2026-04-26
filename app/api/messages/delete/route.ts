import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { emitMessageDeleted } from "@/lib/realtime/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MESSAGE_DELETES_PER_MINUTE = 20;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rate = checkRateLimit({
      key: `messages:delete:user:${session.user.id}`,
      max: MESSAGE_DELETES_PER_MINUTE,
      windowMs: 60_000,
    });

    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many delete requests. Please retry later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) }, 
        }
      );
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Verify user owns this message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { authorId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });

    emitMessageDeleted({ id: messageId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
