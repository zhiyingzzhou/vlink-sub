import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseRlsClient(accessToken: string) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("缺少环境变量：NEXT_PUBLIC_SUPABASE_URL（或 SUPABASE_URL）");
  }
  if (!anonKey) {
    throw new Error("缺少环境变量：NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!accessToken) {
    throw new Error("缺少 accessToken");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

