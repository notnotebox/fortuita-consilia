import { NextResponse } from "next/server";
import { hashOps, hashSeed, verifyCommit } from "@/lib/write-run/server";
import type { CommitPayload } from "@/lib/write-run/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  const authorId = session?.user?.id;

  if (!authorId) {
    return NextResponse.json(
      { ok: false, reason: "auth-required" },
      { status: 401 },
    );
  }

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

  const opsCount = payload.ops.reduce((sum, op) => sum + op.n, 0);
  const seed = result.seed ?? "";

  await prisma.message.create({
    data: {
      content: payload.finalText,
      runId: payload.runId,
      seed,
      seedHash: hashSeed(seed),
      consumedCount: result.consumedCount ?? payload.consumedCount,
      opsHash: hashOps(payload.ops),
      tries: opsCount,
      length: payload.finalText.length,
      authorId,
    },
  });

  return NextResponse.json(result, { status: 200 });
}
