import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clearDraft, loadDraft, saveDraft } from "@/lib/write-run/server";
import { getRequesterIdFromHeaders } from "@/lib/requester";
import type { DraftPayload, DraftResponse } from "@/lib/write-run/types";

export const runtime = "nodejs";

async function getDraftOwnerId(request: Request): Promise<string> {
  const session = await auth();

  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  const requesterId = getRequesterIdFromHeaders(request.headers);

  return `anon:${requesterId}`;
}

export async function GET(request: Request) {
  const ownerId = await getDraftOwnerId(request);
  const draft = loadDraft(ownerId);

  const response: DraftResponse = {
    ok: true,
    draft,
  };

  return NextResponse.json(response, { status: 200 });
}

export async function POST(request: Request) {
  let payload: DraftPayload;

  try {
    payload = (await request.json()) as DraftPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-json" },
      { status: 400 },
    );
  }

  if (
    !payload ||
    typeof payload.finalText !== "string" ||
    !Number.isInteger(payload.consumedCount) ||
    payload.consumedCount < 0 ||
    !Array.isArray(payload.ops) ||
    typeof payload.run?.runId !== "string" ||
    typeof payload.run?.token !== "string" ||
    typeof payload.run?.seed !== "string" ||
    !Number.isInteger(payload.run?.expiresAt) ||
    !Number.isInteger(payload.run?.maxOps) ||
    !Number.isInteger(payload.run?.maxConsumed)
  ) {
    return NextResponse.json(
      { ok: false, reason: "invalid-payload" },
      { status: 400 },
    );
  }

  const ownerId = await getDraftOwnerId(request);
  saveDraft(ownerId, payload);

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(request: Request) {
  const ownerId = await getDraftOwnerId(request);
  clearDraft(ownerId);

  return NextResponse.json({ ok: true }, { status: 200 });
}
