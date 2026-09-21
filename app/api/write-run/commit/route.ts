import { NextResponse } from "next/server";
import { hashOps, hashSeed, verifyCommit } from "@/lib/write-run/server";
import type { CommitPayload } from "@/lib/write-run/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_COMMIT_BODY_BYTES = 1_000_000;
const COMMITS_PER_MINUTE = 10;

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

  const rate = checkRateLimit({
    key: `write-run:commit:user:${authorId}`,
    max: COMMITS_PER_MINUTE,
    windowMs: 60_000,
  });
  if (rate.limited) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_COMMIT_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "request-too-large" }, { status: 413 });
  }

  let payload: CommitPayload;

  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { ops?: unknown }).ops)) {
      return NextResponse.json({ ok: false, reason: "invalid-payload" }, { status: 400 });
    }
    if ((parsed as { ops: unknown[] }).ops.length > 8000) {
      return NextResponse.json({ ok: false, reason: "too-many-ops" }, { status: 400 });
    }
    payload = parsed as CommitPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-json" },
      { status: 400 },
    );
  }

  const result = await verifyCommit(payload);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const opsCount = payload.ops.reduce(
    (sum, op) => sum + (Number.isFinite(op.n) ? op.n : 0),
    0,
  );
  const seed = result.seed ?? "";

  const shortId = await reserveShortId();
  await prisma.message.create({
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

  return NextResponse.json(result, { status: 200 });
}
