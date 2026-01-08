import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * 创建 Supabase 管理 client（service_role）。
 *
 * 仅用于服务端后台任务/RPC：
 * - 绕过 RLS 做受控写入（例如下载计数、模板同步脚本等）
 */
export function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("缺少环境变量：NEXT_PUBLIC_SUPABASE_URL（或 SUPABASE_URL）");
  }
  if (!serviceRoleKey) {
    throw new Error("缺少环境变量：SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
