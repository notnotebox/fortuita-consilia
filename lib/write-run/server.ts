import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { generateNextChar } from "@/lib/write-run/shared";
import type {
  ClientRunTokenPayload,
  CommitPayload,
  CommitResponse,
  DraftPayload,
  RunStartResponse,
  RunState,
} from "@/lib/write-run/types";

const RUN_TTL_MS = 1000 * 60 * 20;
const MAX_OPS = 8000;
const MAX_CONSUMED = 4000;
const REFRESH_WINDOW_MS = 1000 * 60 * 20;
const FREE_REFRESH_ATTEMPTS = 20;
const REFRESH_COOLDOWN_MS = 1000;
const DRAFT_TTL_MS = 1000 * 60 * 60 * 12;

const writeRunSecretEnv = process.env.WRITE_RUN_SECRET;
if (!writeRunSecretEnv && process.env.NODE_ENV === "production") {
  throw new Error("WRITE_RUN_SECRET is required in production");
}
const WRITE_RUN_SECRET = writeRunSecretEnv ?? "dev-write-run-secret-change-me";

type Store = Map<string, RunState>;
type RefreshState = {
  windowStartedAt: number;
  attempts: number;
  lastIssuedAt: number;
};
type RefreshStore = Map<string, RefreshState>;
type DraftState = DraftPayload & { savedAt: number };
type DraftStore = Map<string, DraftState>;

declare global {
  var __WRITE_RUN_STORE__: Store | undefined;
  var __WRITE_RUN_REFRESH_STORE__: RefreshStore | undefined;
  var __WRITE_RUN_DRAFT_STORE__: DraftStore | undefined;
}

export class StartRunCooldownError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("start-run-cooldown");
    this.retryAfterMs = retryAfterMs;
  }
}

function getStore(): Store {
  if (!globalThis.__WRITE_RUN_STORE__) {
    globalThis.__WRITE_RUN_STORE__ = new Map<string, RunState>();
  }
  return globalThis.__WRITE_RUN_STORE__;
}

function getRefreshStore(): RefreshStore {
  if (!globalThis.__WRITE_RUN_REFRESH_STORE__) {
    globalThis.__WRITE_RUN_REFRESH_STORE__ = new Map<string, RefreshState>();
  }
  return globalThis.__WRITE_RUN_REFRESH_STORE__;
}

function getDraftStore(): DraftStore {
  if (!globalThis.__WRITE_RUN_DRAFT_STORE__) {
    globalThis.__WRITE_RUN_DRAFT_STORE__ = new Map<string, DraftState>();
  }
  return globalThis.__WRITE_RUN_DRAFT_STORE__;
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

function cleanupExpiredRuns(): void {
  const now = Date.now();
  const store = getStore();
  for (const [runId, state] of store.entries()) {
    if (state.expiresAt <= now || state.committed) {
      store.delete(runId);
    }
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

function cleanupDraftState(): void {
  const now = Date.now();
  const store = getDraftStore();
  const runStore = getStore();

  for (const [draftOwner, draft] of store.entries()) {
    if (now - draft.savedAt > DRAFT_TTL_MS) {
      store.delete(draftOwner);
      continue;
    }

    const run = runStore.get(draft.run.runId);
    if (!run || run.committed || run.expiresAt <= now) {
      store.delete(draftOwner);
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

export function hashOps(ops: CommitPayload["ops"]): string {
  const payload = JSON.stringify(ops);
  return createHmac("sha256", WRITE_RUN_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createRun(requesterId: string): RunStartResponse {
  cleanupRefreshState();
  cleanupExpiredRuns();
  cleanupDraftState();

  const now = Date.now();
  enforceStartCooldown(requesterId, now);

  const runId = randomUUID();
  const nonce = randomBytes(16).toString("base64url");
  const expiresAt = now + RUN_TTL_MS;

  const state: RunState = {
    runId,
    publicSeed: derivePublicSeed(runId, nonce),
    createdAt: now,
    expiresAt,
    maxOps: MAX_OPS,
    maxConsumed: MAX_CONSUMED,
    tokenVersion: 1,
    committed: false,
  };

  getStore().set(runId, state);

  const token = signToken({
    runId,
    iat: now,
    exp: expiresAt,
    tokenVersion: state.tokenVersion,
    nonce,
  });

  return {
    runId,
    token,
    seed: state.publicSeed,
    expiresAt: state.expiresAt,
    maxOps: state.maxOps,
    maxConsumed: state.maxConsumed,
  };
}

export function saveDraft(ownerId: string, draft: DraftPayload): void {
  cleanupExpiredRuns();
  cleanupDraftState();

  const now = Date.now();
  const run = getStore().get(draft.run.runId);
  if (!run || run.committed || run.expiresAt <= now) {
    return;
  }

  getDraftStore().set(ownerId, {
    run: draft.run,
    finalText: draft.finalText,
    consumedCount: draft.consumedCount,
    ops: draft.ops,
    savedAt: now,
  });
}

export function loadDraft(ownerId: string): DraftPayload | null {
  cleanupExpiredRuns();
  cleanupDraftState();

  const stored = getDraftStore().get(ownerId);
  if (!stored) return null;

  return {
    run: stored.run,
    finalText: stored.finalText,
    consumedCount: stored.consumedCount,
    ops: stored.ops,
  };
}

export function clearDraft(ownerId: string): void {
  getDraftStore().delete(ownerId);
}

function replayRun(run: RunState, payload: CommitPayload): CommitResponse {
  let consumedCount = 0;
  let opCount = 0;
  let text = "";

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

export function verifyCommit(payload: CommitPayload): CommitResponse {
  cleanupExpiredRuns();

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

  const run = getStore().get(payload.runId);
  if (!run) {
    return { ok: false, reason: "run-not-found" };
  }

  if (run.committed) {
    return { ok: false, reason: "run-already-committed" };
  }

  if (run.expiresAt <= now) {
    return { ok: false, reason: "run-expired" };
  }

  if (tokenPayload.tokenVersion !== run.tokenVersion) {
    return { ok: false, reason: "stale-token" };
  }

  if (
    typeof payload.finalText !== "string" ||
    payload.finalText.length > 12000
  ) {
    return { ok: false, reason: "invalid-final-text" };
  }

  if (!Array.isArray(payload.ops) || payload.ops.length === 0) {
    return { ok: false, reason: "invalid-ops" };
  }

  if (!Number.isInteger(payload.consumedCount) || payload.consumedCount < 0) {
    return { ok: false, reason: "invalid-consumed-count" };
  }

  const result = replayRun(run, payload);
  if (!result.ok) {
    return result;
  }

  run.committed = true;
  getStore().set(run.runId, run);

  return {
    ok: true,
    consumedCount: result.consumedCount,
    seed: run.publicSeed,
  };
}
