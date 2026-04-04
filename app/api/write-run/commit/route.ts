import { NextResponse } from "next/server";
import { verifyCommit } from "@/lib/write-run/server";
import type { CommitPayload } from "@/lib/write-run/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: CommitPayload;

  try {
    payload = (await request.json()) as CommitPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-json" },
      { status: 400 },
    );
  }

  const result = verifyCommit(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
