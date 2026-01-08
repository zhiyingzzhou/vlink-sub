"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * 读取当前浏览器端 Supabase session。
 *
 * 约定：
 * - 若未配置 Supabase 环境变量，则 `ready=true` 且 `error` 给出提示（用于本地演示/只读场景）。
 * - 订阅 auth state change，确保页面内 session 变化能即时反映到 UI。
 */
export function useSupabaseSession(): {
  session: Session | null;
  ready: boolean;
  error: string;
} {
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(() => !supabase);
  const [error, setError] = useState(() =>
    supabase
      ? ""
      : "Supabase 未配置：缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data, error: e }) => {
      if (e) setError(e.message);
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return { session, ready, error };
}
