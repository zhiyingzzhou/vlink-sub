import "server-only";

type Entry = { count: number; resetAt: number };

declare global {
  var __vlink_hub_rate_limit__: Map<string, Entry> | undefined;
}

function getStore(): Map<string, Entry> {
  if (!globalThis.__vlink_hub_rate_limit__) {
    globalThis.__vlink_hub_rate_limit__ = new Map<string, Entry>();
  }
  return globalThis.__vlink_hub_rate_limit__;
}

export function rateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  const nextCount = current.count + 1;
  current.count = nextCount;
  store.set(key, current);

  const allowed = nextCount <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - nextCount),
    resetAt: current.resetAt,
  };
}
