"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Link";
import { PageHeader } from "@/components/ui/PageHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();

  const code = params.get("code") || "";
  const tokenHash = params.get("token_hash") || params.get("token") || "";
  const otpType = params.get("type") || "";
  const urlError = params.get("error_description") || params.get("error") || "";

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [message, setMessage] = useState(
    supabase ? "正在完成登录…" : "Supabase 未配置"
  );

  useEffect(() => {
    if (!supabase) return;

    const run = async () => {
      if (urlError) {
        setMessage(`登录失败：${safeDecode(urlError)}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(`登录失败：${error.message}`);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      // 兼容 implicit flow：token 放在 URL hash（#access_token=...）
      const hashRaw = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashRaw);
      const accessToken = hashParams.get("access_token") || "";
      const refreshToken = hashParams.get("refresh_token") || "";

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setMessage(`登录失败：${error.message}`);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      // 兼容 token_hash + type 模式（自定义邮件模板可能会用到）
      if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as
            | "magiclink"
            | "signup"
            | "recovery"
            | "invite"
            | "email_change",
        });
        if (error) {
          setMessage(`登录失败：${error.message}`);
          return;
        }
        router.replace("/dashboard");
        return;
      }

      // 兜底：可能被 detectSessionInUrl 自动处理，或用户已登录
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(`登录失败：${error.message}`);
        return;
      }
      if (data.session) {
        router.replace("/dashboard");
        return;
      }

      setMessage("缺少登录参数，请重新发送邮件登录链接");
    };

    void run().catch(() => setMessage("登录失败，请重试"));
  }, [code, otpType, router, supabase, tokenHash, urlError]);

  return (
    <MarketingShell>
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <PageHeader
          badge={<Badge tone="primary">Supabase Auth</Badge>}
          title="Auth Callback"
          description={message}
          actions={
            <>
              <ButtonLink href="/login" variant="secondary" size="sm">
                返回登录
              </ButtonLink>
              <ButtonLink href="/dashboard" variant="primary" size="sm">
                进入控制台
              </ButtonLink>
            </>
          }
        >
          <div className="text-xs text-muted-foreground">
            如果你是从邮件链接跳转而来，请确保链接完整（包含 code/token 参数）。
          </div>
        </PageHeader>
      </div>
    </MarketingShell>
  );
}
