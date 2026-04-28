type DbAvailabilityState = {
  unavailableUntilMs: number;
};

const globalForDbAvailability = globalThis as unknown as {
  dbAvailabilityState?: DbAvailabilityState;
};

const dbAvailabilityState: DbAvailabilityState =
  globalForDbAvailability.dbAvailabilityState ?? {
    unavailableUntilMs: 0,
  };

if (!globalForDbAvailability.dbAvailabilityState) {
  globalForDbAvailability.dbAvailabilityState = dbAvailabilityState;
}

function getRetryWindowMs(): number {
  const raw = process.env.DB_RETRY_WINDOW_MS;
  if (!raw) return 30_000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30_000;
  return Math.floor(parsed);
}

export function isDbUnavailableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P1001"
  );
}

export function hasDbCooldown(): boolean {
  return Date.now() < dbAvailabilityState.unavailableUntilMs;
}

export function markDbUnavailable(): void {
  dbAvailabilityState.unavailableUntilMs = Date.now() + getRetryWindowMs();
}

export function clearDbUnavailable(): void {
  dbAvailabilityState.unavailableUntilMs = 0;
}

export function getDbRetryAfterSeconds(): number {
  const remainingMs = dbAvailabilityState.unavailableUntilMs - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
}

