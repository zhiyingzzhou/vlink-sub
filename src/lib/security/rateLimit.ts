import "server-only";

type Entry = { count: number; resetAt: number };

/**
 * 极简内存限流器（单实例）。
 *
 * 注意：
 * - 仅在当前 Node.js 进程内生效；多实例/无状态部署需要替换为 Redis/WAF/边缘限流。
 * - 使用 `globalThis` 挂载 store，避免 Next.js 开发/热重载时重复创建导致统计抖动。
 */
declare global {
  var __vlink_hub_rate_limit__: Map<string, Entry> | undefined;
  var __vlink_hub_rate_limit_last_cleanup__: number | undefined;
}

function getStore(): Map<string, Entry> {
  if (!globalThis.__vlink_hub_rate_limit__) {
    globalThis.__vlink_hub_rate_limit__ = new Map<string, Entry>();
  }
  return globalThis.__vlink_hub_rate_limit__;
}

function maybeCleanup(store: Map<string, Entry>, now: number) {
  const last = globalThis.__vlink_hub_rate_limit_last_cleanup__ || 0;
  if (now - last < 60_000) return;
  globalThis.__vlink_hub_rate_limit_last_cleanup__ = now;

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * 计数窗口限流（sliding window 的简化版本：固定窗口 + resetAt）。
 *
 * @param key 维度 key（例如 `sub_export:${ip}`）
 * @param limit 窗口内允许的最大次数
 * @param windowMs 窗口大小（毫秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const store = getStore();
  maybeCleanup(store, now);
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
