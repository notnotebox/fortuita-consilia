import { NextResponse } from "next/server";
import { createRun, StartRunCooldownError } from "@/lib/write-run/server";
import { getRequesterIdFromHeaders } from "@/lib/requester";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requesterId = getRequesterIdFromHeaders(request.headers);

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
