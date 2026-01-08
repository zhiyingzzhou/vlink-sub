"use client";

import { useState } from "react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ButtonLink } from "@/components/ui/Link";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onSend = async () => {
    setHint("");
    setError("");
    const value = email.trim();
    if (!value) {
      setError("请输入邮箱");
      return;
    }

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Supabase 未配置");
      return;
    }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email: value,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (e) {
        setError(e.message);
        toast.error("发送失败", e.message);
        return;
      }
      setHint("已发送登录链接，请检查邮箱完成登录。");
      toast.success("已发送邮件", "请在邮箱中点击登录链接完成登录");
    } catch {
      setError("发送失败，请稍后重试");
      toast.error("发送失败", "请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingShell>
      <div className="mx-auto grid max-w-xl gap-6">
        <PageHeader
          badge={<Badge tone="primary">Supabase Auth · Magic Link</Badge>}
          title="登录 / 注册"
          description="输入邮箱，我们会发送一次性登录链接到你的邮箱，点击即可完成登录。"
          actions={
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              返回控制台
            </ButtonLink>
          }
        />

        <Card tone="neutral">
          <CardTitle>邮箱登录</CardTitle>
          <CardDescription>
            登录链接会跳转到 <span className="font-mono">/auth/callback</span>{" "}
            完成 session 建立。
          </CardDescription>

          <div className="mt-6 grid gap-3">
            <div>
              <Label requiredMark>邮箱</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <Button onClick={onSend} disabled={loading}>
              {loading ? "发送中…" : "发送登录链接"}
            </Button>

            {error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : null}
            {hint ? (
              <div className="text-sm text-muted-foreground">{hint}</div>
            ) : null}
          </div>
        </Card>
      </div>
    </MarketingShell>
  );
}
