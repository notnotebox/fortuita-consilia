export const RUN_OP_TYPES = ["A", "D", "N"] as const;

export type RunOpType = (typeof RUN_OP_TYPES)[number];

export interface RunOp {
  t: RunOpType;
  n: number;
}

export interface RunState {
  runId: string;
  publicSeed: string;
  createdAt: number;
  expiresAt: number;
  maxOps: number;
  maxConsumed: number;
  tokenVersion: number;
  committed: boolean;
}

export interface ClientRunTokenPayload {
  runId: string;
  iat: number;
  exp: number;
  tokenVersion: number;
  nonce: string;
}

export type ClientRunToken = string;

export interface RunStartResponse {
  runId: string;
  token: ClientRunToken;
  seed: string;
  expiresAt: number;
  maxOps: number;
  maxConsumed: number;
}

export interface RunStartCooldownResponse {
  ok: false;
  reason: "cooldown";
  retryAfterMs: number;
}

export interface CommitPayload {
  runId: string;
  token: ClientRunToken;
  finalText: string;
  consumedCount: number;
  ops: RunOp[];
}

export interface DraftPayload {
  run: RunStartResponse;
  finalText: string;
  consumedCount: number;
  ops: RunOp[];
}

export interface DraftResponse {
  ok: boolean;
  draft: DraftPayload | null;
}

export interface CommitResponse {
  ok: boolean;
  reason?: string;
  serverText?: string;
  consumedCount?: number;
  seed?: string;
}
