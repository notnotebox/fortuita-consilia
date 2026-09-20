import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { generateNextChar, isWriteRunCharAllowed } from "@/lib/write-run/shared";
import { prisma } from "@/lib/prisma";
import type {
  ClientRunTokenPayload,
  CommitPayload,
  CommitResponse,
  RunStartResponse,
} from "@/lib/write-run/types";

const RUN_TTL_MS = 1000 * 60 * 20;
const MAX_OPS = 8000;
const MAX_CONSUMED = 4000;
const REFRESH_WINDOW_MS = 1000 * 60 * 20;
const FREE_REFRESH_ATTEMPTS = 20;
const REFRESH_COOLDOWN_MS = 1000;
const writeRunSecretEnv = process.env.WRITE_RUN_SECRET;
if (!writeRunSecretEnv && process.env.NODE_ENV === "production") {
  throw new Error("WRITE_RUN_SECRET is required in production");
}
const WRITE_RUN_SECRET = writeRunSecretEnv ?? "dev-write-run-secret-change-me";

type RefreshState = {
  windowStartedAt: number;
  attempts: number;
  lastIssuedAt: number;
};
type RefreshStore = Map<string, RefreshState>;
type PersistedRun = {
  runId: string;
  publicSeed: string;
  expiresAt: number;
  maxOps: number;
  maxConsumed: number;
  tokenVersion: number;
  committed: boolean;
};

declare global {
  var __WRITE_RUN_REFRESH_STORE__: RefreshStore | undefined;
}

export class StartRunCooldownError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("start-run-cooldown");
    this.retryAfterMs = retryAfterMs;
  }
}

function getRefreshStore(): RefreshStore {
  if (!globalThis.__WRITE_RUN_REFRESH_STORE__) {
    globalThis.__WRITE_RUN_REFRESH_STORE__ = new Map<string, RefreshState>();
  }
  return globalThis.__WRITE_RUN_REFRESH_STORE__;
}

function base64urlEncode(raw: string): string {
  return Buffer.from(raw, "utf8").toString("base64url");
}

function base64urlDecode(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

function signRaw(payloadEncoded: string): string {
  return createHmac("sha256", WRITE_RUN_SECRET)
    .update(payloadEncoded)
    .digest("base64url");
}

export function signToken(payload: ClientRunTokenPayload): string {
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signature = signRaw(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export function verifyToken(token: string): ClientRunTokenPayload | null {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return null;

  const expected = signRaw(payloadEncoded);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const parsed = JSON.parse(
      base64urlDecode(payloadEncoded),
    ) as ClientRunTokenPayload;
    if (
      typeof parsed.runId !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.tokenVersion !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function cleanupRefreshState(): void {
  const now = Date.now();
  const store = getRefreshStore();
  for (const [requesterId, state] of store.entries()) {
    if (now - state.windowStartedAt > REFRESH_WINDOW_MS * 2) {
      store.delete(requesterId);
    }
  }
}

function enforceStartCooldown(requesterId: string, now: number): void {
  const store = getRefreshStore();
  const current = store.get(requesterId);

  if (!current || now - current.windowStartedAt > REFRESH_WINDOW_MS) {
    store.set(requesterId, {
      windowStartedAt: now,
      attempts: 1,
      lastIssuedAt: now,
    });
    return;
  }

  if (current.attempts >= FREE_REFRESH_ATTEMPTS) {
    const earliestNext = current.lastIssuedAt + REFRESH_COOLDOWN_MS;
    if (now < earliestNext) {
      throw new StartRunCooldownError(earliestNext - now);
    }
  }

  current.attempts += 1;
  current.lastIssuedAt = now;
  store.set(requesterId, current);
}

async function cleanupExpiredRuns(): Promise<void> {
  await prisma.writeRun.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
}

function derivePublicSeed(runId: string, nonce: string): string {
  return createHmac("sha256", WRITE_RUN_SECRET)
    .update(`${runId}:${nonce}`)
    .digest("base64url")
    .slice(0, 32);
}

export function hashSeed(seed: string): string {
  return createHmac("sha256", WRITE_RUN_SECRET)
    .update(seed)
    .digest("base64url");
}

export function hashOps(
  ops: CommitPayload["ops"],
  initialChar: string = "",
): string {
  const payload = JSON.stringify({ initialChar, ops });
  return createHmac("sha256", WRITE_RUN_SECRET)
    .update(payload)
    .digest("base64url");
}

export async function createRun(requesterId: string): Promise<RunStartResponse> {
  cleanupRefreshState();

  const now = Date.now();
  enforceStartCooldown(requesterId, now);

  const runId = randomUUID();
  const nonce = randomBytes(16).toString("base64url");
  const expiresAt = now + RUN_TTL_MS;

  const publicSeed = derivePublicSeed(runId, nonce);
  await prisma.writeRun.create({
    data: {
      runId,
      publicSeed,
      expiresAt: new Date(expiresAt),
      maxOps: MAX_OPS,
      maxConsumed: MAX_CONSUMED,
    },
  });

  const token = signToken({
    runId,
    iat: now,
    exp: expiresAt,
    tokenVersion: 1,
    nonce,
  });

  return {
    runId,
    token,
    seed: publicSeed,
    expiresAt,
    maxOps: MAX_OPS,
    maxConsumed: MAX_CONSUMED,
  };
}

function replayRun(run: PersistedRun, payload: CommitPayload): CommitResponse {
  let consumedCount = 0;
  let opCount = 0;
  let text = payload.initialChar;

  for (const op of payload.ops) {
    if ((op.t !== "A" && op.t !== "D" && op.t !== "N") || op.n <= 0) {
      return { ok: false, reason: "invalid-op" };
    }

    if (!Number.isInteger(op.n)) {
      return { ok: false, reason: "invalid-op-count" };
    }

    opCount += op.n;
    if (opCount > run.maxOps) {
      return { ok: false, reason: "too-many-ops" };
    }

    for (let step = 0; step < op.n; step += 1) {
      if (op.t === "A") {
        if (consumedCount >= run.maxConsumed) {
          return { ok: false, reason: "too-many-consumed" };
        }
        text += generateNextChar(run.publicSeed, consumedCount);
        consumedCount += 1;
        continue;
      }

      if (op.t === "D") {
        text = text.slice(0, -1);
        continue;
      }

      text += "\n";
    }
  }

  if (consumedCount !== payload.consumedCount) {
    return {
      ok: false,
      reason: "consumed-mismatch",
      serverText: text,
      consumedCount,
    };
  }

  if (text !== payload.finalText) {
    return {
      ok: false,
      reason: "text-mismatch",
      serverText: text,
      consumedCount,
    };
  }

  return { ok: true, serverText: text, consumedCount };
}

export async function verifyCommit(payload: CommitPayload): Promise<CommitResponse> {
  await cleanupExpiredRuns();

  payload.initialChar = payload.initialChar ?? "";

  const tokenPayload = verifyToken(payload.token);
  if (!tokenPayload) {
    return { ok: false, reason: "invalid-token" };
  }

  if (tokenPayload.runId !== payload.runId) {
    return { ok: false, reason: "run-token-mismatch" };
  }

  const now = Date.now();
  if (tokenPayload.exp <= now) {
    return { ok: false, reason: "token-expired" };
  }

  const storedRun = await prisma.writeRun.findUnique({
    where: { runId: payload.runId },
  });
  if (!storedRun) {
    return { ok: false, reason: "run-not-found" };
  }

  const run: PersistedRun = {
    runId: storedRun.runId,
    publicSeed: storedRun.publicSeed,
    expiresAt: storedRun.expiresAt.getTime(),
    maxOps: storedRun.maxOps,
    maxConsumed: storedRun.maxConsumed,
    tokenVersion: storedRun.tokenVersion,
    committed: storedRun.committed,
  };

  if (run.committed) {
    return { ok: false, reason: "run-already-committed" };
  }

  if (run.expiresAt <= now) {
    return { ok: false, reason: "run-expired" };
  }

  if (tokenPayload.tokenVersion !== run.tokenVersion) {
    return { ok: false, reason: "stale-token" };
  }

  if (typeof payload.initialChar !== "string" || payload.initialChar.length > 1) {
    return { ok: false, reason: "invalid-initial-char" };
  }
  if (
    payload.initialChar.length === 1 &&
    !isWriteRunCharAllowed(payload.initialChar)
  ) {
    return { ok: false, reason: "invalid-initial-char" };
  }

  if (
    typeof payload.finalText !== "string" ||
    payload.finalText.length > 12000
  ) {
    return { ok: false, reason: "invalid-final-text" };
  }
  if (payload.finalText.length === 0) {
    return { ok: false, reason: "empty-final-text" };
  }

  if (!Array.isArray(payload.ops)) {
    return { ok: false, reason: "invalid-ops" };
  }

  if (!Number.isInteger(payload.consumedCount) || payload.consumedCount < 0) {
    return { ok: false, reason: "invalid-consumed-count" };
  }

  const result = replayRun(run, payload);
  if (!result.ok) {
    return result;
  }

  const claimed = await prisma.writeRun.updateMany({
    where: { runId: run.runId, committed: false },
    data: { committed: true },
  });
  if (claimed.count !== 1) {
    return { ok: false, reason: "run-already-committed" };
  }

  return {
    ok: true,
    consumedCount: result.consumedCount,
    seed: run.publicSeed,
  };
}
