"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { NodesPreview } from "@/components/proxy/NodesPreview";
import { QrCodeModal } from "@/components/QrCodeModal";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonAnchor } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CopyField } from "@/components/ui/CopyField";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Input } from "@/components/ui/Input";
import { ButtonLink } from "@/components/ui/Link";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectMenu, type SelectMenuGroup, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { Textarea } from "@/components/ui/Textarea";
import { useConfirm } from "@/components/ui/Confirm";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import {
  buildSubscriptionUrl,
  loadSubscriptionSecret,
  saveSubscriptionSecret,
} from "@/lib/client/subscriptionLinks";
import { UniversalParser } from "@/lib/parser/UniversalParser";
import { PROXY_TYPE_META } from "@/lib/proxy/meta";
import type { ProxyNode, ProxyType } from "@/lib/proxy/types";

type ExpiryMode = "permanent" | "7d" | "30d" | "custom";

type SubscriptionDetail = {
  id: string;
  name: string;
  short_code: string;
  template_id: string | null;
  template_snapshot: string;
  config_hash: string;
  expires_at: string | null;
  disabled: boolean;
  download_count: number;
  last_downloaded_at: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateSummary = {
  id: string;
  title: string;
  is_public: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

/** 以当前时间为基准增加天数，返回 ISO 字符串（用于 expires_at 预设）。 */
function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** ISO 字符串 → 本地可读时间；解析失败返回占位符。 */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleString();
}

/** 将 UI 选择的到期模式转换成实际写入的 expires_at（ISO 或 null）。 */
function resolveExpiresAt(
  mode: ExpiryMode,
  customExpiryIso: string | null
): string | null {
  if (mode === "permanent") return null;
  if (mode === "7d") return addDaysIso(7);
  if (mode === "30d") return addDaysIso(30);
  return customExpiryIso;
}

/**
 * 解析输入原文并返回 report（带 memo）。
 *
 * 说明：解析失败不会抛错，UI 可以用 `errors/stats` 给出友好提示。
 */
function useParseReport(raw: string): {
  nodes: ProxyNode[];
  stats: { totalLinks: number; totalNodes: number; byType: Record<ProxyType, number> };
  errors: { protocol: string; line: number; message: string; link: string }[];
} {
  return useMemo(() => {
    const input = raw.trim();
    if (!input) {
      return {
        nodes: [],
        errors: [],
        stats: {
          totalLinks: 0,
          totalNodes: 0,
          byType: { vless: 0, vmess: 0, trojan: 0, ss: 0, wireguard: 0 },
        },
      };
    }
    try {
      const report = new UniversalParser().parseWithReport(input);
      return {
        nodes: report.nodes,
        errors: report.errors.map((e) => ({
          protocol: e.protocol,
          line: e.line,
          message: e.message,
          link: e.link,
        })),
        stats: report.stats,
      };
    } catch {
      return {
        nodes: [],
        errors: [{ protocol: "unknown", line: 0, message: "解析异常", link: "" }],
        stats: {
          totalLinks: 0,
          totalNodes: 0,
          byType: { vless: 0, vmess: 0, trojan: 0, ss: 0, wireguard: 0 },
        },
      };
    }
  }, [raw]);
}

/** 订阅详情页：查看/编辑订阅元信息、原文、配置与导出链接。 */
export default function SubscriptionDetailPage() {
  const { session, ready, error } = useSupabaseSession();
  const toast = useToast();
  const confirm = useConfirm();
  const params = useParams<{ id?: string }>();

  const token = session?.access_token || "";
  const id = typeof params?.id === "string" ? params.id : "";

  const [row, setRow] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("permanent");
  const [customExpiryIso, setCustomExpiryIso] = useState<string | null>(null);
  const [savingBasics, setSavingBasics] = useState(false);

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesError, setTemplatesError] = useState("");
  const [regenTemplate, setRegenTemplate] = useState<string>("__KEEP__");

  const [raw, setRaw] = useState("");
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState("");

  const report = useParseReport(raw);

  const [regenLoading, setRegenLoading] = useState(false);
  const [regenHint, setRegenHint] = useState("");
  const [regenError, setRegenError] = useState("");

  const [configText, setConfigText] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState("");

  const [rotateResult, setRotateResult] = useState<{ url: string; secret: string } | null>(
    null
  );
  const [savedSecret, setSavedSecret] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { subscription?: SubscriptionDetail; error?: string }
        | null;
      if (!res.ok || !json?.subscription) {
        setActionError(json?.error || "加载失败");
        return;
      }
      setRow(json.subscription);
      setName(json.subscription.name || "");
      setDisabled(Boolean(json.subscription.disabled));
      if (!json.subscription.expires_at) {
        setExpiryMode("permanent");
        setCustomExpiryIso(null);
      } else {
        setExpiryMode("custom");
        setCustomExpiryIso(json.subscription.expires_at);
      }
    } catch {
      setActionError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (expiryMode !== "custom") return;
    if (customExpiryIso) return;
    setCustomExpiryIso(addDaysIso(7));
  }, [customExpiryIso, expiryMode]);

  const expiryOptions = useMemo(() => {
    const opts: SelectMenuOption<ExpiryMode>[] = [
      { value: "permanent", label: "永久", description: "不设置到期时间" },
      { value: "7d", label: "7 天", description: "自动到期（推荐）" },
      { value: "30d", label: "30 天", description: "自动到期" },
      { value: "custom", label: "自定义", description: "手动选择到期时间" },
    ];
    return opts;
  }, []);

  const expiresAtPreview = useMemo(() => {
    if (expiryMode === "permanent") return null;
    if (expiryMode === "7d") return addDaysIso(7);
    if (expiryMode === "30d") return addDaysIso(30);
    return customExpiryIso;
  }, [customExpiryIso, expiryMode]);

  const loadTemplates = useCallback(async () => {
    setTemplatesError("");
    try {
      const res = await fetch("/api/templates", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json().catch(() => null)) as
        | { templates?: TemplateSummary[]; error?: string }
        | null;
      if (!res.ok) {
        setTemplatesError(json?.error || "加载模板失败");
        return;
      }
      setTemplates(Array.isArray(json?.templates) ? json!.templates : []);
    } catch {
      setTemplatesError("加载模板失败");
    }
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!row?.short_code) return;
    const secret = loadSubscriptionSecret(row.short_code);
    if (secret) setSavedSecret(secret);
  }, [row?.short_code]);

  const publicTemplates = templates.filter((t) => t.is_public);
  const myTemplates = templates.filter((t) => t.user_id === (session?.user?.id || ""));

  const regenTemplateGroups = useMemo(() => {
    const groups: SelectMenuGroup<string>[] = [
      {
        label: "策略",
        options: [
          {
            value: "__KEEP__",
            label: "保持当前快照（推荐）",
            description: "稳定输出（不受模板更新影响）",
          },
          {
            value: "",
            label: "默认（Loyalsoldier 注入）",
            description: "rule-providers + Fake-IP DNS",
          },
        ],
      },
    ];

    if (publicTemplates.length > 0) {
      groups.push({
        label: "公开模板",
        options: publicTemplates.map((t) => ({
          value: t.id,
          label: t.title,
          description: `更新 ${t.updated_at}`,
        })),
      });
    }

    if (myTemplates.length > 0) {
      groups.push({
        label: "我的模板",
        options: myTemplates.map((t) => ({
          value: t.id,
          label: t.title,
          description: `${t.is_public ? "公开" : "私有"} · 更新 ${t.updated_at}`,
        })),
      });
    }

    return groups;
  }, [myTemplates, publicTemplates]);

  const currentUrl = useMemo(() => {
    if (!row?.short_code) return "";
    if (rotateResult?.url) return rotateResult.url;
    if (!savedSecret) return "";
    return buildSubscriptionUrl(window.location.origin, row.short_code, savedSecret);
  }, [row?.short_code, rotateResult?.url, savedSecret]);

  const installLink = useMemo(() => {
    if (!currentUrl) return "";
    const name = (row?.name || "").trim() || "vlink-sub";
    return `clash://install-config?url=${encodeURIComponent(
      currentUrl
    )}&name=${encodeURIComponent(name)}`;
  }, [currentUrl, row?.name]);

  const downloadLink = useMemo(() => {
    if (!currentUrl) return "";
    try {
      const u = new URL(currentUrl, window.location.origin);
      u.searchParams.set("download", "1");
      return u.toString();
    } catch {
      return "";
    }
  }, [currentUrl]);

  const saveBasics = async () => {
    if (!token || !id) return;
    setActionError("");
    setSavingBasics(true);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          disabled,
          expires_at: resolveExpiresAt(expiryMode, customExpiryIso),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { subscription?: SubscriptionDetail; error?: string }
        | null;
      if (!res.ok || !json?.subscription) {
        setActionError(json?.error || "保存失败");
        toast.error("保存失败", json?.error);
        return;
      }
      setRow(json.subscription);
      toast.success("已保存");
    } catch {
      setActionError("保存失败");
      toast.error("保存失败");
    } finally {
      setSavingBasics(false);
    }
  };

  const loadRaw = async () => {
    if (!token || !id) return;
    setRawLoading(true);
    setRawError("");
    try {
      const res = await fetch(`/api/subscriptions/${id}/raw`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { raw?: string; error?: string }
        | null;
      if (!res.ok || typeof json?.raw !== "string") {
        setRawError(json?.error || "加载原文失败");
        toast.error("加载原文失败", json?.error);
        return;
      }
      setRaw(json.raw);
      toast.success("已加载原文");
    } catch {
      setRawError("加载原文失败");
      toast.error("加载原文失败");
    } finally {
      setRawLoading(false);
    }
  };

  const regenerate = async () => {
    if (!token || !id) return;
    setRegenLoading(true);
    setRegenError("");
    setRegenHint("");
    setConfigError("");
    setConfigText("");

    try {
      const body: Record<string, unknown> = {};
      if (raw.trim()) body.raw = raw;
      if (regenTemplate === "") body.templateId = null;
      else if (regenTemplate !== "__KEEP__") body.templateId = regenTemplate;

      const res = await fetch(`/api/subscriptions/${id}/regenerate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { subscription?: SubscriptionDetail; error?: string; details?: unknown }
        | null;
      if (!res.ok || !json?.subscription) {
        const detailsCount = Array.isArray(json?.details) ? json?.details?.length ?? 0 : 0;
        const details = detailsCount > 0 ? `（${detailsCount} 条解析错误）` : "";
        const msg = (json?.error || "重新生成失败") + details;
        setRegenError(msg);
        toast.error("重新生成失败", msg);
        return;
      }

      setRow(json.subscription);
      setRegenHint("已重新生成配置（快照/原文可选更新）");
      toast.success("已重新生成");
    } catch {
      setRegenError("重新生成失败");
      toast.error("重新生成失败");
    } finally {
      setRegenLoading(false);
    }
  };

  const loadConfigPreview = async () => {
    if (!token || !id) return;
    setConfigLoading(true);
    setConfigError("");
    try {
      const res = await fetch(`/api/subscriptions/${id}/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setConfigError(json?.error || "加载配置失败");
        toast.error("加载配置失败", json?.error);
        return;
      }
      const text = await res.text();
      setConfigText(text);
      toast.success("已加载配置预览");
    } catch {
      setConfigError("加载配置失败");
      toast.error("加载配置失败");
    } finally {
      setConfigLoading(false);
    }
  };

  const rotateSecret = async () => {
    if (!token || !id || !row?.short_code) return;
    const ok = await confirm.confirm({
      title: "重置 secret？",
      description: "重置后旧订阅地址会失效，请立即保存新链接。",
      confirmText: "重置",
      cancelText: "取消",
      variant: "danger",
    });
    if (!ok) return;

    setRotateResult(null);
    setActionError("");
    try {
      const res = await fetch(`/api/subscriptions/${id}/rotate-secret`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => null)) as
        | { url?: string; secret?: string; error?: string }
        | null;
      if (!res.ok || !json?.url || !json?.secret) {
        setActionError(json?.error || "重置失败");
        toast.error("重置失败", json?.error);
        return;
      }
      saveSubscriptionSecret(row.short_code, json.secret);
      setSavedSecret(json.secret);
      setRotateResult({ url: json.url, secret: json.secret });
      toast.success("secret 已重置", "旧订阅地址已失效");
    } catch {
      setActionError("重置失败");
      toast.error("重置失败");
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="accent">订阅详情</Badge>}
        title={row?.name || "订阅"}
        description="shortCode + secret 为真实导出地址；secret 不落库，只在创建/重置时返回。"
        actions={
          <>
            <ButtonLink href="/dashboard/subscriptions" variant="secondary" size="sm">
              返回列表
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
          <CardDescription>登录后才能管理订阅。</CardDescription>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/login" variant="primary">
              去登录
            </ButtonLink>
            <ButtonLink href="/dashboard/subscriptions" variant="secondary">
              返回列表
            </ButtonLink>
          </div>
        </Card>
      ) : !row ? (
        <Card tone="neutral">
          <CardTitle>{loading ? "加载中…" : "订阅不存在或无权限"}</CardTitle>
          <CardDescription>{actionError || " "}</CardDescription>
        </Card>
      ) : (
        <>
          {actionError ? (
            <Card tone="danger">
              <CardTitle>操作失败</CardTitle>
              <CardDescription>{actionError}</CardDescription>
            </Card>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="grid gap-6">
              <Card tone="neutral">
                <CardTitle>概览</CardTitle>
                <CardDescription>状态与基础信息</CardDescription>
                <div className="mt-6 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.disabled ? (
                      <Badge tone="danger">停用</Badge>
                    ) : (
                      <Badge tone="primary">正常</Badge>
                    )}
                    <Badge tone="muted">下载 {row.download_count}</Badge>
                    {row.expires_at ? (
                      <Badge tone="secondary">到期 {formatDateTime(row.expires_at)}</Badge>
                    ) : (
                      <Badge tone="muted">永久</Badge>
                    )}
                  </div>
                  <div>
                    short: <span className="font-mono text-foreground">{row.short_code}</span>
                  </div>
                  <div>
                    config_hash: <span className="font-mono text-foreground">{row.config_hash}</span>
                  </div>
                  <div>最后下载：{formatDateTime(row.last_downloaded_at)}</div>
                  <div>创建时间：{formatDateTime(row.created_at)}</div>
                  <div>更新时间：{formatDateTime(row.updated_at)}</div>
                </div>
              </Card>

              <Card tone="accent">
                <CardTitle>订阅地址</CardTitle>
                <CardDescription>
                  可直接用于 Mihomo / Clash Meta；浏览器打开为 inline（不强制下载）。
                </CardDescription>

                <div className="mt-6 grid gap-4">
                  {currentUrl ? (
                    <>
                      <CopyField
                        label="订阅链接"
                        value={currentUrl}
                        monospace
                        copyText="复制链接"
                        actions={
                          <>
                            <Button variant="secondary" onClick={() => setQrOpen(true)}>
                              二维码
                            </Button>
                          </>
                        }
                      />

                      <div className="flex flex-wrap gap-2">
                        {installLink ? (
                          <ButtonAnchor href={installLink} variant="primary">
                            一键导入
                          </ButtonAnchor>
                        ) : null}
                        {downloadLink ? (
                          <ButtonAnchor href={downloadLink} variant="secondary">
                            下载 YAML
                          </ButtonAnchor>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[2rem] border border-border/60 bg-muted p-4 shadow-[var(--shadow-soft)]">
                      <div className="font-heading text-sm font-extrabold tracking-tight">
                        本机未保存 secret
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        没有 secret 就无法得到真实订阅链接。你可以重置 secret 生成新链接。
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void rotateSecret()}>
                      重置 secret
                    </Button>
                  </div>

                  {rotateResult ? (
                    <CodeBlock
                      label="新 secret（请立即保存）"
                      description="已写入本机缓存；旧订阅地址已失效。"
                      value={rotateResult.secret}
                      maxHeightClassName="max-h-24"
                    />
                  ) : null}
                </div>
              </Card>

              <Card tone="neutral">
                <CardTitle>基础设置</CardTitle>
                <CardDescription>名称 / 有效期 / 启用状态</CardDescription>
                <div className="mt-6 grid gap-4">
                  <div>
                    <Label>订阅名称</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>有效期</Label>
                      <SelectMenu<ExpiryMode>
                        value={expiryMode}
                        onValueChange={(v) => setExpiryMode(v)}
                        options={expiryOptions}
                        title="有效期"
                        description="永久 / 7 天 / 30 天 / 自定义"
                      />
                    </div>
                    <div>
                      <Label>到期时间</Label>
                      <DateTimePicker
                        value={expiresAtPreview}
                        onChange={(v) => setCustomExpiryIso(v)}
                        disabled={expiryMode !== "custom"}
                        placeholder={expiryMode === "permanent" ? "永久" : "请选择到期时间"}
                        title="到期时间"
                        description="仅在“自定义”模式下可编辑"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => setDisabled((v) => !v)}>
                      {disabled ? "当前：停用（点击切换）" : "当前：启用（点击切换）"}
                    </Button>
                    <Button onClick={() => void saveBasics()} disabled={savingBasics}>
                      {savingBasics ? "保存中…" : "保存"}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid gap-6">
              <Card tone="neutral">
                <CardTitle>模板快照</CardTitle>
                <CardDescription>
                  创建订阅时已写入快照；这里展示的是当前订阅的快照内容（稳定输出）。
                </CardDescription>

                <div className="mt-6 grid gap-4">
                  <CodeBlock
                    label="当前快照（只读）"
                    value={
                      row.template_snapshot?.trim()
                        ? row.template_snapshot.trim()
                        : "# 默认：将注入 Loyalsoldier rule-providers + Fake-IP DNS\n"
                    }
                    maxHeightClassName="max-h-56"
                    copyable={false}
                  />

                  <div>
                    <Label>重新生成时使用的模板</Label>
                    <SelectMenu<string>
                      value={regenTemplate}
                      onValueChange={(v) => setRegenTemplate(v)}
                      groups={regenTemplateGroups}
                      title="重新生成模板"
                      description="可选覆盖模板快照；历史订阅默认保持稳定输出。"
                      searchable
                      searchPlaceholder="搜索模板标题…"
                    />
                    {templatesError ? (
                      <div className="mt-2 text-sm text-destructive">{templatesError}</div>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card tone="neutral">
                <CardTitle>原文（加密存储）</CardTitle>
                <CardDescription>
                  这里的编辑只影响“重新生成”时是否覆盖服务端原文；留空则使用服务端已存原文。
                </CardDescription>

                <div className="mt-6 grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void loadRaw()} disabled={rawLoading}>
                      {rawLoading ? "加载中…" : "加载原文"}
                    </Button>
                    <Button variant="secondary" onClick={() => setRaw("")}>
                      清空
                    </Button>
                  </div>

                  <Textarea
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="粘贴/编辑节点原文；留空则重新生成时使用服务端已存原文"
                    className="min-h-[240px]"
                  />

                  {rawError ? <div className="text-sm text-destructive">{rawError}</div> : null}

                  {raw.trim() ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="muted">{report.stats.totalNodes} 节点</Badge>
                      {Object.entries(report.stats.byType).map(([k, v]) =>
                        v ? (
                          <Badge key={k} tone="muted">
                            {PROXY_TYPE_META[k as ProxyType].label} {v}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  ) : null}

                  {report.errors.length > 0 ? (
                    <div className="rounded-[2rem] border border-border/60 bg-secondary/10 p-4 shadow-[var(--shadow-soft)]">
                      <div className="font-heading text-sm font-extrabold tracking-tight">
                        解析错误（已跳过）
                      </div>
                      <div className="mt-3 grid gap-2">
                        {report.errors.slice(0, 6).map((e, idx) => (
                          <div
                            key={`${e.protocol}-${e.line}-${idx}`}
                            className="rounded-[1.5rem] border border-border/60 bg-card/70 p-3 shadow-[var(--shadow-soft)]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="font-semibold">
                                行 {e.line} · {e.protocol}
                              </div>
                              <div className="text-muted-foreground">{e.message}</div>
                            </div>
                            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                              {e.link}
                            </div>
                          </div>
                        ))}
                        {report.errors.length > 6 ? (
                          <div className="text-xs text-muted-foreground">
                            还有 {report.errors.length - 6} 条未展示
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {report.nodes.length > 0 ? (
                    <div className="rounded-[2rem] border border-border/60 bg-background/60 p-4 shadow-[var(--shadow-soft)]">
                      <div className="font-heading text-sm font-extrabold tracking-tight">
                        实时预览
                      </div>
                      <div className="mt-3">
                        <NodesPreview
                          nodes={report.nodes}
                          maxItems={120}
                          emptyHint="编辑原文后，这里会实时展示解析结果。"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card tone="primary">
                <CardTitle>重新生成与预览</CardTitle>
                <CardDescription>
                  重新生成会更新 config_hash/config_cache；可选覆盖模板快照与原文。
                </CardDescription>

                <div className="mt-6 grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void regenerate()} disabled={regenLoading}>
                      {regenLoading ? "生成中…" : "重新生成配置"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void loadConfigPreview()}
                      disabled={configLoading}
                    >
                      {configLoading ? "加载中…" : "加载配置预览"}
                    </Button>
                  </div>

                  {regenHint ? <div className="text-sm text-muted-foreground">{regenHint}</div> : null}
                  {regenError ? <div className="text-sm text-destructive">{regenError}</div> : null}
                  {configError ? <div className="text-sm text-destructive">{configError}</div> : null}

                  {configText ? (
                    <CodeBlock
                      label="配置预览（YAML）"
                      value={configText}
                      maxHeightClassName="max-h-[420px]"
                    />
                  ) : null}
                </div>
              </Card>
            </div>
          </div>

          <QrCodeModal
            open={qrOpen}
            title="订阅二维码"
            value={currentUrl}
            installName={(row?.name || "").trim() || "vlink-sub"}
            onClose={() => setQrOpen(false)}
          />
        </>
      )}
    </div>
  );
}
