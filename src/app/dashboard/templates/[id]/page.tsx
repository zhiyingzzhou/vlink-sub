"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { ButtonLink } from "@/components/ui/Link";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useConfirm } from "@/components/ui/Confirm";
import { useToast } from "@/components/ui/Toast";
import { useSupabaseSession } from "@/lib/auth/useSession";

type TemplateDetail = {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function TemplateDetailPage() {
  const { session, ready, error } = useSupabaseSession();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const token = session?.access_token || "";
  const userId = session?.user?.id || "";
  const id = typeof params?.id === "string" ? params.id : "";

  const [tpl, setTpl] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const isOwner = useMemo(() => {
    if (!tpl) return false;
    return Boolean(userId) && tpl.user_id === userId;
  }, [tpl, userId]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/templates/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = (await res.json().catch(() => null)) as
        | { template?: TemplateDetail; error?: string }
        | null;
      if (!res.ok || !json?.template) {
        setActionError(json?.error || "加载失败");
        setTpl(null);
        return;
      }
      setTpl(json.template);
      setTitle(json.template.title);
      setContent(json.template.content);
      setIsPublic(json.template.is_public);
    } catch {
      setActionError("加载失败");
      setTpl(null);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!id) {
      toast.error("无效模板 ID");
      return;
    }
    if (!token) {
      toast.error("请先登录");
      return;
    }
    if (!isOwner) {
      toast.error("无权限", "只有拥有者可以修改此模板");
      return;
    }

    const t = title.trim();
    const c = content.trim();
    if (!t) {
      toast.error("标题不能为空");
      return;
    }
    if (!c) {
      toast.error("内容不能为空");
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: t, content: c, is_public: isPublic }),
      });
      const json = (await res.json().catch(() => null)) as
        | { template?: TemplateDetail; error?: string }
        | null;
      if (!res.ok || !json?.template) {
        setActionError(json?.error || "保存失败");
        toast.error("保存失败", json?.error);
        return;
      }
      setTpl(json.template);
      toast.success("已保存");
    } catch {
      setActionError("保存失败");
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const duplicateToMine = async () => {
    if (!id) return;
    if (!token) {
      toast.error("需要登录", "登录后才能复制为我的模板");
      return;
    }
    if (!tpl) return;
    setSaving(true);
    setActionError("");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${tpl.title}（复制）`,
          content: tpl.content,
          is_public: false,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { template?: { id?: string }; error?: string }
        | null;
      if (!res.ok || !json?.template?.id) {
        setActionError(json?.error || "复制失败");
        toast.error("复制失败", json?.error);
        return;
      }
      toast.success("已复制为我的模板");
      router.push(`/dashboard/templates/${json.template.id}`);
    } catch {
      setActionError("复制失败");
      toast.error("复制失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    if (!token) {
      toast.error("请先登录");
      return;
    }
    if (!isOwner) {
      toast.error("无权限", "只有拥有者可以删除此模板");
      return;
    }
    if (!tpl) return;

    const ok = await confirm.confirm({
      title: `删除模板「${tpl.title}」？`,
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
      toast.success("已删除");
      router.push("/dashboard/templates");
    } catch {
      setActionError("删除失败");
      toast.error("删除失败");
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        badge={<Badge tone="accent">模板详情</Badge>}
        title={tpl?.title || "模板"}
        description="模板更新只影响未来创建/重新生成的订阅；已创建订阅保持快照不变。"
        actions={
          <>
            <ButtonLink href="/dashboard/templates" variant="secondary" size="sm">
              返回模板库
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

      {actionError ? (
        <Card tone="danger">
          <CardTitle>提示</CardTitle>
          <CardDescription>{actionError}</CardDescription>
        </Card>
      ) : null}

      {!tpl ? (
        <Card tone="neutral">
          <CardTitle>{loading ? "加载中…" : ready ? "模板不存在或无权限" : "正在加载会话…"}</CardTitle>
          <CardDescription> </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card tone="neutral">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>内容预览</CardTitle>
                <CardDescription>只读展示（用于对比修改）</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {tpl.is_public ? (
                  <Badge tone="primary">公开</Badge>
                ) : (
                  <Badge tone="muted">私有</Badge>
                )}
                <Badge tone="muted">更新 {tpl.updated_at}</Badge>
              </div>
            </div>

            <div className="mt-6">
              <CodeBlock
                label="YAML"
                value={tpl.content}
                maxHeightClassName="max-h-[560px]"
              />
            </div>
          </Card>

          <Card tone="accent">
            <CardTitle>{isOwner ? "编辑模板" : "只读 / 复制"}</CardTitle>
            <CardDescription>
              {isOwner
                ? "你是拥有者，可以修改与删除。"
                : "你不是拥有者：可以复制为我的模板再修改。"}
            </CardDescription>

            <div className="mt-6 grid gap-4">
              <div>
                <Label requiredMark>标题</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div>
                <Label requiredMark>内容（YAML）</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[420px]"
                  disabled={!isOwner}
                />
              </div>

              <Checkbox
                checked={isPublic}
                onChange={(e) => setIsPublic(e.currentTarget.checked)}
                disabled={!isOwner}
              >
                公开模板（所有人可读）
              </Checkbox>

              <div className="flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    <Button onClick={() => void save()} disabled={saving}>
                      {saving ? "保存中…" : "保存"}
                    </Button>
                    <Button variant="destructive" onClick={() => void remove()} disabled={saving}>
                      删除
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => void duplicateToMine()} disabled={saving}>
                      复制为我的模板
                    </Button>
                    {!session ? (
                      <ButtonLink href="/login" variant="primary">
                        去登录
                      </ButtonLink>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
