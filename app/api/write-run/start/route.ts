import { NextResponse } from "next/server";
import { createRun, StartRunCooldownError } from "@/lib/write-run/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requesterIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const requesterIdHeader = request.headers.get("x-requester-id");
  const requesterId = requesterIdHeader || requesterIp;

  try {
    const started = createRun(requesterId);
    return NextResponse.json(started, { status: 201 });
  } catch (error) {
    if (error instanceof StartRunCooldownError) {
      return NextResponse.json(
        { ok: false, reason: "cooldown", retryAfterMs: error.retryAfterMs },
        { status: 429 },
      );
    }
    throw error;
  }
}
