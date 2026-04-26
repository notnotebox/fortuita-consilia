type WindowState = {
  count: number;
  resetAt: number;
};

type Store = Map<string, WindowState>;

declare global {
  var __RATE_LIMIT_STORE__: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__RATE_LIMIT_STORE__) {
    globalThis.__RATE_LIMIT_STORE__ = new Map<string, WindowState>();
  }
  return globalThis.__RATE_LIMIT_STORE__;
}

export function checkRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}): { limited: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const store = getStore();
  const current = store.get(input.key);

  if (!current || current.resetAt <= now) {
    store.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return {
      limited: false,
      remaining: Math.max(0, input.max - 1),
      retryAfterMs: 0,
    };
  }

  if (current.count >= input.max) {
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  store.set(input.key, current);

  return {
    limited: false,
    remaining: Math.max(0, input.max - current.count),
    retryAfterMs: 0,
  };
}
