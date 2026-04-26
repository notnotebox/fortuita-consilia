import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequesterIdFromHeaders } from "@/lib/requester";
import { getUserTag } from "@/lib/user-tag";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TAKE = 10;
const MAX_TAKE = 20;
const MAX_SKIP = 1000;
const MESSAGE_READS_PER_MINUTE = 120;
const UUID_V4_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBoundedInt(
  raw: string | null,
  options: { fallback: number; min: number; max: number }
): number | null {
  if (raw === null || raw === "") return options.fallback;
  if (!/^\d+$/.test(raw)) return null;

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) return null;
  if (value < options.min || value > options.max) return null;

  return value;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id ?? null;
    const requesterId = currentUserId
      ? `user:${currentUserId}`
      : getRequesterIdFromHeaders(request.headers);
    const rate = checkRateLimit({
      key: `messages:get:${requesterId}`,
      max: MESSAGE_READS_PER_MINUTE,
      windowMs: 60_000,
    });

    if (rate.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const skip = parseBoundedInt(searchParams.get("skip"), {
      fallback: 0,
      min: 0,
      max: MAX_SKIP,
    });
    const take = parseBoundedInt(searchParams.get("take"), {
      fallback: DEFAULT_TAKE,
      min: 1,
      max: MAX_TAKE,
    });

    if (skip === null || take === null) {
      return NextResponse.json(
        {
          error: `Invalid pagination. "skip" must be 0-${MAX_SKIP} and "take" must be 1-${MAX_TAKE}.`,
        },
        { status: 400 }
      );
    }

    const authorIdParam = searchParams.get("authorId");
    if (authorIdParam && !UUID_V4_LIKE_REGEX.test(authorIdParam)) {
      return NextResponse.json(
        { error: "Invalid authorId format." },
        { status: 400 }
      );
    }

    const authorId = authorIdParam || undefined;

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      where: authorId ? { authorId } : undefined,
      skip,
      take,
      select: {
        id: true,
        content: true,
        tries: true,
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

    return NextResponse.json(
      messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        ratio: String(msg.tries),
        pseudo: msg.author?.name || msg.author?.email?.split("@")[0] || "Unknown",
        avatar: msg.author?.image,
        authorTag: getUserTag(msg.author ?? {}),
        // Expose owner id only for the current user's own messages.
        userId: msg.authorId && msg.authorId === currentUserId ? msg.authorId : undefined,
        date: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }).format(msg.createdAt),
      }))
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    const details =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? { details: error.message }
        : {};
    return NextResponse.json(
      { error: "Internal server error", ...details },
      { status: 500 }
    );
  }
}
