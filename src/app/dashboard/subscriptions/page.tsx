"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { QrCodeModal } from "@/components/QrCodeModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AppLink, ButtonLink } from "@/components/ui/Link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useConfirm } from "@/components/ui/Confirm";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import {
  buildSubscriptionUrl,
  loadSubscriptionSecret,
  saveSubscriptionSecret,
} from "@/lib/client/subscriptionLinks";

type SubscriptionRow = {
  id: string;
  name: string;
  short_code: string;
  expires_at: string | null;
  disabled: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
};

/** expires_at 展示文案（本地时区）。 */
function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "永久";
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return "（无效）";
  return new Date(ms).toLocaleString();
}

/** 订阅列表页：查看订阅、生成/保存导出链接、启用/停用、删除等。 */
export default function SubscriptionsPage() {
  const { session, ready, error } = useSupabaseSession();
  const toast = useToast();
  const confirm = useConfirm();

  const token = session?.access_token || "";

  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");

  const [secretMap, setSecretMap] = useState<Record<string, string>>({});

  const [linkModal, setLinkModal] = useState<{ url: string; name: string } | null>(
    null
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        r.short_code.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [query, sorted]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const row of rows) {
      const secret = loadSubscriptionSecret(row.short_code);
      if (secret) next[row.short_code] = secret;
    }
    setSecretMap(next);
  }, [rows]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { subscriptions?: SubscriptionRow[]; error?: string }
        | null;
      if (!res.ok) {
        setActionError(json?.error || "加载失败");
        toast.error("加载失败", json?.error);
        return;
      }
      setRows(Array.isArray(json?.subscriptions) ? json!.subscriptions : []);
    } catch {
      setActionError("加载失败");
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [toast, token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const toggleDisabled = async (row: SubscriptionRow) => {
    if (!token) return;
    setActionError("");
    const ok = await confirm.confirm({
      title: row.disabled ? "启用订阅？" : "停用订阅？",
      description: row.disabled
        ? "启用后订阅地址将恢复可用。"
        : "停用后 /s 导出将返回 404（不影响历史）。",
      confirmText: row.disabled ? "启用" : "停用",
      cancelText: "取消",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/subscriptions/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled: !row.disabled }),
      });
      const json = (await res.json().catch(() => null)) as
        | { subscription?: SubscriptionRow; error?: string }
        | null;
      if (!res.ok || !json?.subscription) {
        setActionError(json?.error || "操作失败");
        toast.error("操作失败", json?.error);
        return;
      }
      setRows((prev) => prev.map((x) => (x.id === row.id ? json.subscription! : x)));
      toast.success("已更新状态");
    } catch {
      setActionError("操作失败");
      toast.error("操作失败");
    }
  };

  /**
   * 重置 secret 并返回新的导出链接。
   *
   * 注意：旧链接会立即失效；前端会把新 secret 写入 localStorage。
   */
  const rotateSecret = async (row: SubscriptionRow): Promise<{ url: string; secret: string } | null> => {
    if (!token) return null;
    setActionError("");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}/rotate-secret`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { url?: string; secret?: string; error?: string }
        | null;
      if (!res.ok || !json?.url || !json?.secret) {
        setActionError(json?.error || "重置失败");
        toast.error("重置失败", json?.error);
        return null;
      }
      saveSubscriptionSecret(row.short_code, json.secret);
      setSecretMap((prev) => ({ ...prev, [row.short_code]: json.secret! }));
      toast.success("secret 已重置", "旧订阅地址已失效");
      return { url: json.url, secret: json.secret };
    } catch {
      setActionError("重置失败");
      toast.error("重置失败");
      return null;
    }
  };

  const openLink = async (row: SubscriptionRow) => {
    const secret = secretMap[row.short_code];
    if (secret) {
      setLinkModal({
        url: buildSubscriptionUrl(window.location.origin, row.short_code, secret),
        name: row.name,
      });
      return;
    }

    const ok = await confirm.confirm({
      title: "本机未保存 secret",
      description:
        "没有 secret 就无法得到真实订阅地址。继续将会重置 secret（旧订阅链接会失效）。",
      confirmText: "重置并生成",
      cancelText: "取消",
      variant: "danger",
    });
    if (!ok) return;
    const rotated = await rotateSecret(row);
    if (!rotated) return;
    setLinkModal({ url: rotated.url, name: row.name });
  };

  const remove = async (row: SubscriptionRow) => {
    if (!token) return;
    const ok = await confirm.confirm({
      title: `删除订阅「${row.name}」？`,
      description: "此操作不可恢复。",
      confirmText: "删除",
      cancelText: "取消",
      variant: "danger",
    });
    if (!ok) return;

    setActionError("");
    try {
      const res = await fetch(`/api/subscriptions/${row.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.ok) {
        setActionError(json?.error || "删除失败");
        toast.error("删除失败", json?.error);
        return;
      }
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      toast.success("已删除");
    } catch {
      setActionError("删除失败");
      toast.error("删除失败");
    }
  };

  const rotateAndShow = async (row: SubscriptionRow) => {
    const ok = await confirm.confirm({
      title: "重置 secret？",
      description: "重置后旧订阅地址会失效，请立即保存新链接。",
      confirmText: "重置",
      cancelText: "取消",
      variant: "danger",
    });
    if (!ok) return;
    const rotated = await rotateSecret(row);
    if (!rotated) return;
    setLinkModal({ url: rotated.url, name: row.name });
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="primary">订阅</Badge>}
        title="订阅管理"
        description="订阅地址采用 shortCode + secret；secret 只会在创建/重置时返回，建议保存在本机。"
        actions={
          <>
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              返回创建
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={load} disabled={!token || loading}>
              {loading ? "刷新中…" : "刷新"}
            </Button>
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
          <CardTitle>需要登录</CardTitle>
          <CardDescription>登录后才能查看与管理自己的订阅列表。</CardDescription>
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
        <>
          <Card tone="neutral">
            <CardTitle>筛选</CardTitle>
            <CardDescription>按名称 / short code / id 搜索</CardDescription>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索订阅…"
              />
              <ButtonLink href="/dashboard" variant="primary">
                新建订阅
              </ButtonLink>
            </div>
            {actionError ? (
              <div className="mt-3 text-sm text-destructive">{actionError}</div>
            ) : null}
          </Card>

          <Card tone="neutral">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>列表</CardTitle>
              <Badge tone="muted">{filtered.length} 条</Badge>
            </div>

            <div className="mt-6 grid gap-3">
              {filtered.length === 0 ? (
                <div className="rounded-[2rem] border border-border/60 bg-muted p-6 shadow-[var(--shadow-soft)]">
                  <div className="font-heading text-lg font-extrabold tracking-tight">
                    暂无订阅
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    去创建页生成一个订阅链接吧。
                  </div>
                  <div className="mt-6">
                    <ButtonLink href="/dashboard" variant="primary">
                      去创建
                    </ButtonLink>
                  </div>
                </div>
              ) : (
                filtered.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[2rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <AppLink href={`/dashboard/subscriptions/${row.id}`} className="font-heading text-base font-extrabold">
                            {row.name}
                          </AppLink>
                          {row.disabled ? (
                            <Badge tone="danger">停用</Badge>
                          ) : (
                            <Badge tone="primary">正常</Badge>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          short: <span className="font-mono">{row.short_code}</span> · 下载：{" "}
                          {row.download_count} · 有效期：{formatExpiry(row.expires_at)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {secretMap[row.short_code] ? "本机已保存 secret" : "未保存 secret"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void openLink(row)}>
                          查看链接
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void rotateAndShow(row)}>
                          重置 secret
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => void toggleDisabled(row)}>
                          {row.disabled ? "启用" : "停用"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void remove(row)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <QrCodeModal
            open={Boolean(linkModal?.url)}
            title="订阅链接"
            value={linkModal?.url || ""}
            installName={(linkModal?.name || "").trim() || "vlink-sub"}
            onClose={() => setLinkModal(null)}
          />
        </>
      )}
    </div>
  );
}
