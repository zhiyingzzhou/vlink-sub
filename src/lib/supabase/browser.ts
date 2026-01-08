import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

/**
 * 创建浏览器端 Supabase client（PKCE flow）。
 *
 * 约定：
 * - 单例缓存：避免在 React 重渲染中重复创建 client。
 * - 仅能使用 `NEXT_PUBLIC_*` 环境变量（会被打进前端 bundle）。
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(supabaseUrl, anonKey, {
    // 关闭自动从 URL 解析 session，避免在 callback 页出现“自动交换 + 手动交换”重复执行。
    auth: { flowType: "pkce", detectSessionInUrl: false },
  });
  return browserClient;
}
