import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 创建“公共只读” Supabase client（匿名 key）。
 *
 * 用途：
 * - 读取公共模板
 * - 订阅导出 RPC（只读）
 *
 * 注意：关闭 session 持久化与自动刷新，避免在 server runtime 内产生隐式状态。
 */
export function createSupabasePublicClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("缺少环境变量：NEXT_PUBLIC_SUPABASE_URL（或 SUPABASE_URL）");
  }
  if (!anonKey) {
    throw new Error("缺少环境变量：NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
