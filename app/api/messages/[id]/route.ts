import { auth } from "@/auth";
import {
  clearDbUnavailable,
  getDbRetryAfterSeconds,
  hasDbCooldown,
  isDbUnavailableError,
  markDbUnavailable,
} from "@/lib/db-availability";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequesterIdFromHeaders } from "@/lib/requester";
import { getUserTag } from "@/lib/user-tag";
import {
  buildPainMetrics,
  fromPublicMessageId,
  toPublicMessageId,
} from "@/lib/message-metrics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MESSAGE_READS_PER_MINUTE = 120;

type RouteProps = {
  params: Promise<{ id: string }>;
};

function dbUnavailableResponse() {
  const retryAfter = getDbRetryAfterSeconds();
  return NextResponse.json(
    {
      error: "Database unavailable",
      details:
        process.env.NODE_ENV !== "production"
          ? "Unable to reach database host. Check DATABASE_URL and network/IPv6 connectivity."
          : undefined,
    },
    {
      status: 503,
      headers: retryAfter > 0 ? { "Retry-After": String(retryAfter) } : undefined,
    },
  );
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  try {
    if (hasDbCooldown()) {
      return dbUnavailableResponse();
    }

    const { id: rawId } = await params;
    const shortId = fromPublicMessageId(rawId);
    if (!shortId) {
      return NextResponse.json({ error: "Invalid message id format." }, { status: 400 });
    }

    const session = await auth();
    const currentUserId = session?.user?.id ?? null;
    const requesterId = currentUserId
      ? `user:${currentUserId}`
      : getRequesterIdFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `messages:get-one:${requesterId}`,
      max: MESSAGE_READS_PER_MINUTE,
      windowMs: 60_000,
    });

    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
        },
      );
    }

    const message = await prisma.message.findUnique({
      where: { shortId },
      select: {
        id: true,
        shortId: true,
        content: true,
        tries: true,
        consumedCount: true,
        length: true,
        createdAt: true,
        authorId: true,
        author: {
          select: {
            name: true,
            discordTag: true,
            email: true,
            image: true,
          },
        },
      },
    });

    clearDbUnavailable();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const metrics = buildPainMetrics({
      iterations: message.tries,
      consumed: message.consumedCount,
      length: message.length,
    });

    return NextResponse.json({
      id: message.id,
      publicId: toPublicMessageId(message.shortId),
      content: message.content,
      ratio: metrics.ratioLabel,
      ratioDetails: metrics.ratioDetails,
      pseudo: message.author?.name || message.author?.email?.split("@")[0] || "Unknown",
      avatar: message.author?.image,
      authorTag: getUserTag(message.author ?? {}),
      userId:
        message.authorId && message.authorId === currentUserId
          ? message.authorId
          : undefined,
      date: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(message.createdAt),
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      markDbUnavailable();
      return dbUnavailableResponse();
    }

    console.error("Error fetching message by id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
