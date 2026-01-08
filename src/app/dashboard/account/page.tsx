"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function hasEnv(name: string): boolean {
  return Boolean((process.env[name] || "").trim());
}

export default function AccountPage() {
  const { session, ready, error } = useSupabaseSession();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.success("已退出登录");
    } catch (e) {
      toast.error("退出失败", e instanceof Error ? e.message : undefined);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="accent">账号</Badge>}
        title="账号与设置"
        description="这里展示登录信息、环境配置检查与安全建议。"
        actions={
          <>
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              返回创建
            </ButtonLink>
            {session ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSignOut}
                disabled={signingOut}
              >
                {signingOut ? "退出中…" : "退出登录"}
              </Button>
            ) : null}
          </>
        }
      />

      {error ? (
        <Card tone="danger">
          <CardTitle>会话错误</CardTitle>
          <CardDescription>{error}</CardDescription>
        </Card>
      ) : null}

      {!ready ? (
        <Card tone="neutral">
          <CardTitle>正在加载…</CardTitle>
          <CardDescription>正在初始化会话</CardDescription>
        </Card>
      ) : !session ? (
        <Card tone="accent">
          <CardTitle>当前未登录</CardTitle>
          <CardDescription>登录后可管理订阅与我的模板。</CardDescription>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/login" variant="primary">
              去登录
            </ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              返回创建页
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <Card tone="neutral">
            <CardTitle>用户信息</CardTitle>
            <CardDescription>Supabase Auth session</CardDescription>
            <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
              <div>
                Email：{" "}
                <span className="font-medium text-foreground">
                  {session.user.email || "（无）"}
                </span>
              </div>
              <div>
                User ID：{" "}
                <span className="font-mono text-xs text-foreground">
                  {session.user.id}
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/dashboard/subscriptions" variant="secondary" size="sm">
                订阅
              </ButtonLink>
              <ButtonLink href="/dashboard/templates" variant="secondary" size="sm">
                模板
              </ButtonLink>
            </div>
          </Card>

          <Card tone="neutral">
            <CardTitle>环境配置检查</CardTitle>
            <CardDescription>缺失会导致登录/导出失败</CardDescription>
            <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</span>
                {hasEnv("NEXT_PUBLIC_SUPABASE_URL") ? (
                  <Badge tone="primary">已配置</Badge>
                ) : (
                  <Badge tone="danger">缺失</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                {hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? (
                  <Badge tone="primary">已配置</Badge>
                ) : (
                  <Badge tone="danger">缺失</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</span>
                {hasEnv("SUPABASE_SERVICE_ROLE_KEY") ? (
                  <Badge tone="primary">已配置</Badge>
                ) : (
                  <Badge tone="danger">缺失</Badge>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-mono">DATA_ENCRYPTION_KEY</span> /
                <span className="font-mono">DATA_ENCRYPTION_KEY_ID</span>{" "}
                属于服务端变量，前端不会显示。
              </div>
            </div>
          </Card>

          <Card tone="primary" className="md:col-span-2">
            <CardTitle>安全建议</CardTitle>
            <CardDescription>面向大规模用户的默认策略</CardDescription>
            <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
              <div>
                - 订阅地址使用 <span className="font-mono">shortCode + secret</span>；
                如怀疑泄露，可随时重置 secret。
              </div>
              <div>
                - /s 导出已带 ETag/304；生产建议配合边缘缓存/WAF 与日志聚合。
              </div>
              <div>
                - 计数为“近似值”，避免千万级请求把 Postgres 写爆（最小写入间隔可配置）。
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
