"use client";

import { useEffect, useMemo, useState } from "react";

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
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";
import { saveSubscriptionSecret } from "@/lib/client/subscriptionLinks";
import { UniversalParser } from "@/lib/parser/UniversalParser";
import { PROXY_TYPE_META } from "@/lib/proxy/meta";
import type { ProxyNode, ProxyType } from "@/lib/proxy/types";

type ExpiryMode = "permanent" | "7d" | "30d" | "custom";

type TemplateSummary = {
  id: string;
  title: string;
  is_public: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateDetail = TemplateSummary & { content: string };

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

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

export default function DashboardCreatePage() {
  const { session, ready, error: sessionError } = useSupabaseSession();
  const toast = useToast();

  const [subName, setSubName] = useState("我的订阅");
  const [raw, setRaw] = useState("");

  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("permanent");
  const [customExpiryIso, setCustomExpiryIso] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null);
  const [templateDetailError, setTemplateDetailError] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [result, setResult] = useState<{
    id: string;
    short_code: string;
    secret: string;
    url: string;
  } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const report = useParseReport(raw);

  const userId = session?.user?.id || "";
  const publicTemplates = templates.filter((t) => t.is_public);
  const myTemplates = templates.filter((t) => t.user_id === userId);

  const resolveExpiresAt = () => {
    if (expiryMode === "permanent") return null;
    if (expiryMode === "7d") return addDaysIso(7);
    if (expiryMode === "30d") return addDaysIso(30);
    return customExpiryIso;
  };

  useEffect(() => {
    if (expiryMode !== "custom") return;
    if (customExpiryIso) return;
    setCustomExpiryIso(addDaysIso(7));
  }, [customExpiryIso, expiryMode]);

  const templateGroups = useMemo(() => {
    const base: SelectMenuGroup<string>[] = [
      {
        label: "默认",
        options: [
          {
            value: "",
            label: "默认（Loyalsoldier 注入）",
            description: "rule-providers + Fake-IP DNS",
          },
        ],
      },
    ];
    if (publicTemplates.length > 0) {
      base.push({
        label: "公开模板",
        options: publicTemplates.map((t) => ({
          value: t.id,
          label: t.title,
          description: `更新 ${t.updated_at}`,
        })),
      });
    }
    if (myTemplates.length > 0) {
      base.push({
        label: "我的模板",
        options: myTemplates.map((t) => ({
          value: t.id,
          label: t.title,
          description: `${t.is_public ? "公开" : "私有"} · 更新 ${t.updated_at}`,
        })),
      });
    }
    return base;
  }, [myTemplates, publicTemplates]);

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

  useEffect(() => {
    setTemplatesError("");
    setTemplatesLoading(true);
    const token = session?.access_token;
    void (async () => {
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
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, [session?.access_token]);

  useEffect(() => {
    const id = selectedTemplateId;
    if (!id) {
      setTemplateDetail(null);
      setTemplateDetailError("");
      return;
    }

    setTemplateDetailError("");
    const token = session?.access_token;
    void (async () => {
      try {
        const res = await fetch(`/api/templates/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = (await res.json().catch(() => null)) as
          | { template?: TemplateDetail; error?: string }
          | null;
        if (!res.ok) {
          setTemplateDetailError(json?.error || "加载模板内容失败");
          setTemplateDetail(null);
          return;
        }
        setTemplateDetail(json?.template || null);
      } catch {
        setTemplateDetailError("加载模板内容失败");
        setTemplateDetail(null);
      }
    })();
  }, [selectedTemplateId, session?.access_token]);

  const onCreate = async () => {
    setCreateError("");
    setResult(null);

    if (!session?.access_token) {
      setCreateError("请先登录后再创建订阅");
      toast.error("未登录", "请先登录后再创建订阅");
      return;
    }

    const input = raw.trim();
    if (!input) {
      setCreateError("请输入节点原文");
      return;
    }
    if (report.nodes.length === 0) {
      setCreateError("未解析到可用节点，请先修正输入");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: subName.trim(),
          raw: input,
          templateId: selectedTemplateId || null,
          expiresAt: resolveExpiresAt(),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | {
            id?: string;
            short_code?: string;
            secret?: string;
            url?: string;
            error?: string;
            details?: unknown;
          }
        | null;
      if (!res.ok) {
        const detailsCount = Array.isArray(json?.details) ? json?.details?.length ?? 0 : 0;
        const details = detailsCount > 0 ? `（${detailsCount} 条解析错误）` : "";
        const msg = (json?.error || "生成失败") + details;
        setCreateError(msg);
        toast.error("生成失败", msg);
        return;
      }
      if (!json?.id || !json?.short_code || !json?.secret || !json?.url) {
        setCreateError("生成失败（返回数据不完整）");
        return;
      }
      saveSubscriptionSecret(json.short_code, json.secret);
      setResult({
        id: json.id,
        short_code: json.short_code,
        secret: json.secret,
        url: json.url,
      });
      toast.success("订阅已创建", "请妥善保存 secret（只会返回一次）");
    } catch {
      setCreateError("生成失败（网络异常）");
      toast.error("生成失败", "网络异常");
    } finally {
      setCreating(false);
    }
  };

  const installLink = useMemo(() => {
    if (!result?.url) return "";
    const name = (subName || "").trim() || "vlink-hub";
    return `clash://install-config?url=${encodeURIComponent(
      result.url
    )}&name=${encodeURIComponent(name)}`;
  }, [result?.url, subName]);

  const downloadLink = useMemo(() => {
    if (!result?.url) return "";
    try {
      const u = new URL(result.url, window.location.origin);
      u.searchParams.set("download", "1");
      return u.toString();
    } catch {
      return "";
    }
  }, [result?.url]);

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="accent">控制台 · 创建订阅</Badge>}
        title="生成 Clash Meta（Mihomo）订阅"
        description="粘贴 3x-ui 导出的混杂文本，自动解析多协议节点；选择模板与有效期后生成短链订阅。"
        actions={
          <>
            <ButtonLink href="/dashboard/subscriptions" variant="secondary" size="sm">
              订阅
            </ButtonLink>
            <ButtonLink href="/dashboard/templates" variant="secondary" size="sm">
              模板
            </ButtonLink>
            <ButtonLink href="/dashboard/account" variant="secondary" size="sm">
              账号
            </ButtonLink>
          </>
        }
      />

      {sessionError ? (
        <Card tone="danger">
          <CardTitle>会话错误</CardTitle>
          <CardDescription>{sessionError}</CardDescription>
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
          <CardDescription>创建订阅需要登录（管理端走 RLS）。</CardDescription>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/login" variant="primary">
              去登录
            </ButtonLink>
            <ButtonLink href="/" variant="secondary">
              返回首页
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card tone="neutral">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>1) 输入节点原文</CardTitle>
              <CardDescription>支持混合协议：vmess / vless / trojan / ss / wireguard</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="muted">{report.stats.totalNodes} 节点</Badge>
              {(
                Object.keys(report.stats.byType) as Array<keyof typeof report.stats.byType>
              ).map((k) =>
                report.stats.byType[k] ? (
                  <Badge key={k} tone={PROXY_TYPE_META[k].tone}>
                    {PROXY_TYPE_META[k].glyph} {report.stats.byType[k]}
                  </Badge>
                ) : null
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <Label>订阅名称</Label>
              <Input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="例如：iPhone / 家用"
              />
            </div>

            <div>
              <Label requiredMark>节点原文</Label>
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="把 3x-ui 导出页面里的所有节点（可能包含多行/混杂文本）直接粘贴到这里…"
                className="min-h-[320px]"
              />
              <div className="mt-2 text-xs text-muted-foreground">
                解析失败的行会被跳过；不会因为某条坏数据导致整体崩溃。
              </div>
            </div>

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
          </div>
        </Card>

        <div className="grid gap-6">
          <Card tone="neutral">
            <CardTitle>实时预览</CardTitle>
            <CardDescription>解析出的节点列表与关键参数（仅在本地渲染，不会上传）。</CardDescription>
            <div className="mt-6">
              <NodesPreview nodes={report.nodes} />
            </div>
          </Card>

          <Card tone="neutral">
            <CardTitle>2) 模板与有效期</CardTitle>
            <CardDescription>
              订阅创建时会写入模板快照；模板更新不会影响历史订阅。
            </CardDescription>

            <div className="mt-6 grid gap-4">
              <div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label>模板选择</Label>
                  <ButtonLink href="/dashboard/templates" variant="secondary" size="sm">
                    管理模板
                  </ButtonLink>
                </div>
                <SelectMenu<string>
                  value={selectedTemplateId}
                  onValueChange={(v) => setSelectedTemplateId(v)}
                  groups={templateGroups}
                  title="选择模板"
                  description="公开模板所有人可读；我的模板可增删改。创建时会写入快照，历史订阅稳定输出。"
                  searchable
                  searchPlaceholder="搜索模板标题…"
                  disabled={templatesLoading}
                />
                {templatesError ? (
                  <div className="mt-2 text-sm text-destructive">{templatesError}</div>
                ) : null}
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

              {templateDetailError ? (
                <div className="text-sm text-destructive">{templateDetailError}</div>
              ) : null}
              {templateDetail?.content ? (
                <CodeBlock
                  label="模板预览（只读）"
                  description="此内容会被快照写入订阅；后续模板更新不会影响历史订阅。"
                  value={templateDetail.content}
                  maxHeightClassName="max-h-56"
                />
              ) : (
                <CodeBlock
                  label="模板预览（默认）"
                  description="默认会注入 Loyalsoldier rule-providers + Fake-IP DNS。"
                  value={"# 默认模板：Loyalsoldier rule-providers + Fake-IP DNS\n"}
                  maxHeightClassName="max-h-56"
                  copyable={false}
                />
              )}
            </div>
          </Card>

          <Card tone="primary">
            <CardTitle>3) 生成短链订阅</CardTitle>
            <CardDescription>
              shortCode + secret 等同密码；secret 只会在创建时返回一次。
            </CardDescription>

            <div className="mt-6 grid gap-4">
              <Button onClick={onCreate} disabled={creating || !session}>
                {creating ? "生成中…" : "生成订阅链接"}
              </Button>

              {createError ? (
                <div className="text-sm text-destructive">{createError}</div>
              ) : null}

              {result ? (
                <div className="grid gap-4">
                  <CopyField
                    label="订阅地址"
                    description="可直接粘贴到 Mihomo / Clash Meta 中使用。"
                    value={result.url}
                    monospace
                    copyText="复制订阅链接"
                    actions={
                      <>
                        <Button variant="secondary" onClick={() => setQrOpen(true)}>
                          二维码
                        </Button>
                        <ButtonLink
                          href={`/dashboard/subscriptions/${result.id}`}
                          variant="secondary"
                        >
                          打开详情
                        </ButtonLink>
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
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <QrCodeModal
        open={qrOpen}
        title="订阅二维码"
        value={result?.url || ""}
        installName={(subName || "").trim() || "vlink-hub"}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}
