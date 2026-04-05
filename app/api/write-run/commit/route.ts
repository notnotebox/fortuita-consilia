import { NextResponse } from "next/server";
import { hashOps, hashSeed, verifyCommit } from "@/lib/write-run/server";
import type { CommitPayload } from "@/lib/write-run/types";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

  const session = await auth();
  let authorId: string | null = null;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    authorId = user?.id ?? null;
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
