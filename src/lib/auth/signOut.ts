import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** 统一的前端退出登录（Supabase）。 */
export async function signOut(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}

