import { NextResponse } from "next/server";
import { hashOps, hashSeed, verifyCommit } from "@/lib/write-run/server";
import type { CommitPayload } from "@/lib/write-run/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import {
  buildCreatedMessagePayload,
  emitMessageCreated,
} from "@/lib/realtime/server";

export const runtime = "nodejs";

function generateShortId(): string {
  return randomBytes(9)
    .toString("base64url")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 12);
}

async function reserveShortId(): Promise<string> {
  for (let i = 0; i < 6; i += 1) {
    const candidate = generateShortId();
    const exists = await prisma.message.findUnique({
      where: { shortId: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new Error("Unable to allocate short message id");
}

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

  const shortId = await reserveShortId();
  const createdMessage = await prisma.message.create({
    data: {
      shortId,
      content: payload.finalText,
      runId: payload.runId,
      seed,
      seedHash: hashSeed(seed),
      consumedCount: result.consumedCount ?? payload.consumedCount,
      opsHash: hashOps(payload.ops, payload.initialChar ?? ""),
      tries: opsCount,
      length: payload.finalText.length,
      authorId,
    },
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

  emitMessageCreated(buildCreatedMessagePayload(createdMessage));

  return NextResponse.json(result, { status: 200 });
}
