import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { confirmation?: string } = {};
  try {
    body = (await request.json()) as { confirmation?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Deletion confirmation is required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.message.deleteMany({ where: { authorId: userId } });
      await transaction.user.delete({ where: { id: userId } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete account data:", error);
    return NextResponse.json({ error: "Unable to delete account data" }, { status: 500 });
  }
}
