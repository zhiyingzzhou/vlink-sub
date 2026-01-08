"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { ListItemButton } from "@/components/ui/ListItemButton";
import { AppLink, ButtonLink } from "@/components/ui/Link";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useConfirm } from "@/components/ui/Confirm";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";

type TemplateSummary = {
  id: string;
  title: string;
  is_public: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateDetail = TemplateSummary & { content: string };

export default function TemplatesPage() {
  const { session, ready, error } = useSupabaseSession();
  const toast = useToast();
  const confirm = useConfirm();

  const token = session?.access_token || "";
  const userId = session?.user?.id || "";

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selected, setSelected] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = useMemo(() => {
    if (!selected) return false;
    return Boolean(userId) && selected.user_id === userId;
  }, [selected, userId]);

  const publicTemplates = useMemo(
    () => templates.filter((t) => t.is_public),
    [templates]
  );
  const myTemplates = useMemo(
    () => templates.filter((t) => t.user_id === userId),
    [templates, userId]
  );

  const filteredPublic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publicTemplates;
    return publicTemplates.filter((t) => t.title.toLowerCase().includes(q));
  }, [publicTemplates, query]);

  const filteredMine = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return myTemplates;
    return myTemplates.filter((t) => t.title.toLowerCase().includes(q));
  }, [myTemplates, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/templates", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json().catch(() => null)) as
        | { templates?: TemplateSummary[]; error?: string }
        | null;
      if (!res.ok) {
        setActionError(json?.error || "加载失败");
        toast.error("加载失败", json?.error);
        return;
      }
      setTemplates(Array.isArray(json?.templates) ? json!.templates : []);
    } catch {
      setActionError("加载失败");
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [toast, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectTemplate = async (id: string) => {
    setActionError("");
    setSelected(null);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json().catch(() => null)) as
        | { template?: TemplateDetail; error?: string }
        | null;
      if (!res.ok || !json?.template) {
        setActionError(json?.error || "加载模板失败");
        toast.error("加载模板失败", json?.error);
        return;
      }
      setSelected(json.template);
      setTitle(json.template.title);
      setContent(json.template.content);
      setIsPublic(json.template.is_public);
    } catch {
      setActionError("加载模板失败");
      toast.error("加载模板失败");
    }
  };

  const resetForm = () => {
    setSelected(null);
    setTitle("");
    setContent("");
    setIsPublic(false);
    setActionError("");
  };

  const duplicateToMine = async () => {
    if (!selected) return;
    if (!session) {
      toast.error("需要登录", "登录后才能创建我的模板");
      return;
    }
    setSelected(null);
    setTitle(`${selected.title}（复制）`);
    setContent(selected.content);
    setIsPublic(false);
    toast.success("已复制到编辑器", "保存即可创建我的模板");
  };

  const save = async () => {
    if (!token) {
      setActionError("请先登录");
      toast.error("请先登录");
      return;
    }
    setActionError("");
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      setActionError("标题不能为空");
      return;
    }
    if (!c) {
      setActionError("内容不能为空");
      return;
    }

    const isEdit = Boolean(selected?.id) && isOwner;
    const url = isEdit ? `/api/templates/${selected!.id}` : "/api/templates";
    const method = isEdit ? "PATCH" : "POST";

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: t, content: c, is_public: isPublic }),
      });
      const json = (await res.json().catch(() => null)) as
        | { template?: TemplateSummary; error?: string }
        | null;
      if (!res.ok) {
        setActionError(json?.error || "保存失败");
        toast.error("保存失败", json?.error);
        return;
      }
      toast.success(isEdit ? "已保存" : "已创建");
      await load();
      if (json?.template?.id) {
        await selectTemplate(json.template.id);
      } else {
        resetForm();
      }
    } catch {
      setActionError("保存失败");
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, tplTitle: string) => {
    if (!token) return;
    const ok = await confirm.confirm({
      title: `删除模板「${tplTitle}」？`,
      description: "此操作不可恢复。",
      confirmText: "删除",
      cancelText: "取消",
      variant: "danger",
    });
    if (!ok) return;

    setActionError("");
    try {
      const res = await fetch(`/api/templates/${id}`, {
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
      if (selected?.id === id) resetForm();
      toast.success("已删除");
      await load();
    } catch {
      setActionError("删除失败");
      toast.error("删除失败");
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="accent">模板</Badge>}
        title="模板库"
        description="公开模板所有人可读；我的模板可增删改。订阅创建时会把模板内容快照写入订阅，历史订阅保持稳定输出。"
        actions={
          <>
            <ButtonLink href="/dashboard" variant="secondary" size="sm">
              返回创建
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card tone="neutral">
          <CardTitle>列表</CardTitle>
          <CardDescription>公开模板 + 我的模板</CardDescription>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索模板标题…"
              />
            </div>

            {actionError ? (
              <div className="text-sm text-destructive">{actionError}</div>
            ) : null}

            <div className="grid gap-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>公开模板</Label>
                  <Badge tone="muted">{filteredPublic.length}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {filteredPublic.length === 0 ? (
                    <div className="text-sm text-muted-foreground">暂无公开模板</div>
                  ) : (
                    filteredPublic.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <ListItemButton
                          onClick={() => void selectTemplate(t.id)}
                          className="min-w-0 flex-1"
                        >
                          <div className="truncate font-heading text-sm font-extrabold">
                            {t.title}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t.updated_at}
                          </div>
                        </ListItemButton>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone="primary">公开</Badge>
                          <AppLink href={`/dashboard/templates/${t.id}`} className="text-sm">
                            详情
                          </AppLink>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>我的模板</Label>
                  <Badge tone="muted">{filteredMine.length}</Badge>
                </div>

                {!ready ? (
                  <div className="mt-3 text-sm text-muted-foreground">正在加载会话…</div>
                ) : !session ? (
                  <div className="mt-3 text-sm text-muted-foreground">
                    登录后可管理我的模板。{" "}
                    <AppLink href="/login">去登录</AppLink>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {filteredMine.length === 0 ? (
                      <div className="text-sm text-muted-foreground">暂无我的模板</div>
                    ) : (
                      filteredMine.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <ListItemButton
                            onClick={() => void selectTemplate(t.id)}
                            className="min-w-0 flex-1"
                          >
                            <div className="truncate font-heading text-sm font-extrabold">
                              {t.title}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {t.is_public ? "公开" : "私有"} · {t.updated_at}
                            </div>
                          </ListItemButton>
                          <div className="flex shrink-0 items-center gap-2">
                            <AppLink href={`/dashboard/templates/${t.id}`} className="text-sm">
                              详情
                            </AppLink>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void remove(t.id, t.title)}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card tone="accent">
          <CardTitle>{selected ? "编辑模板" : "新建模板"}</CardTitle>
          <CardDescription>
            {selected
              ? isOwner
                ? "修改后仅影响未来创建/重新生成的订阅；已创建订阅保持快照不变。"
                : "你不是拥有者：可预览内容，无法直接修改。可复制为我的模板。"
              : "创建一个可复用的 Clash/Mihomo YAML 模板。"}
          </CardDescription>

          <div className="mt-6 grid gap-4">
            {selected ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  id: <span className="font-mono text-foreground">{selected.id}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/dashboard/templates/${selected.id}`} variant="secondary" size="sm">
                    打开详情
                  </ButtonLink>
                  {!isOwner ? (
                    <Button variant="secondary" size="sm" onClick={() => void duplicateToMine()}>
                      复制为我的模板
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <Label requiredMark>标题</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="模板标题"
                disabled={Boolean(selected) && !isOwner}
              />
            </div>

            <div>
              <Label requiredMark>内容（YAML）</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="YAML 内容（Clash/Mihomo）"
                className="min-h-[420px]"
                disabled={Boolean(selected) && !isOwner}
              />
            </div>

            <Checkbox
              checked={isPublic}
              onChange={(e) => setIsPublic(e.currentTarget.checked)}
              disabled={!session || (Boolean(selected) && !isOwner)}
            >
              公开模板（所有人可读）
            </Checkbox>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} disabled={!session || saving || (Boolean(selected) && !isOwner)}>
                {saving ? "保存中…" : selected && isOwner ? "保存修改" : "创建模板"}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                清空
              </Button>
            </div>

            {selected?.content ? (
              <CodeBlock
                label="当前内容预览"
                value={selected.content}
                maxHeightClassName="max-h-56"
                copyable={false}
                className="opacity-80"
              />
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
