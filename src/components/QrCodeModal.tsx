"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { Button, ButtonAnchor } from "@/components/ui/Button";
import { CopyField } from "@/components/ui/CopyField";
import { Dialog } from "@/components/ui/Dialog";

export function QrCodeModal({
  open,
  title,
  value,
  installName,
  onClose,
}: {
  open: boolean;
  title?: string;
  value: string;
  installName?: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clashInstallLink = useMemo(() => {
    const url = value.trim();
    if (!url) return "";
    const name = (installName || "").trim();
    if (!name) return "";
    return `clash://install-config?url=${encodeURIComponent(
      url
    )}&name=${encodeURIComponent(name)}`;
  }, [installName, value]);

  const downloadLink = useMemo(() => {
    const raw = value.trim();
    if (!raw) return "";
    try {
      const u = new URL(raw, window.location.origin);
      u.searchParams.set("download", "1");
      return u.toString();
    } catch {
      return "";
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const generate = async () => {
      const v = value.trim();
      if (!v) {
        if (cancelled) return;
        setDataUrl("");
        setError("无可用链接");
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError("");
      }

      try {
        const url = await QRCode.toDataURL(v, {
          margin: 1,
          scale: 8,
          color: { dark: "#2C2C24", light: "#FDFCF8" },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setError("二维码生成失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void generate();
    return () => {
      cancelled = true;
    };
  }, [open, value]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title || "订阅链接"}
      description="复制链接 / 扫码导入（shortCode + secret 等同密码）"
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="rounded-[2rem] border border-border/60 bg-muted/60 p-5 shadow-[var(--shadow-soft)]">
          <div className="font-heading text-sm font-extrabold tracking-tight">
            二维码
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            部分客户端支持扫码导入订阅
          </div>

          <div className="mt-4 grid place-items-center rounded-[2rem] border border-border/60 bg-background/70 p-4 shadow-[var(--shadow-soft)]">
            {loading ? (
              <div className="text-sm text-muted-foreground">生成中…</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="订阅链接二维码"
                className="h-64 w-64 rounded-[1.5rem] border border-border/60 bg-background"
              />
            ) : (
              <div className="text-sm text-muted-foreground">无内容</div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <CopyField
            label="订阅链接"
            description="建议只分享给自己；如果泄露，可随时重置 secret。"
            value={value}
            monospace
            copyText="一键复制"
            actions={
              <>
                {value.trim() ? (
                  <ButtonAnchor
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                  >
                    打开
                  </ButtonAnchor>
                ) : null}
                {downloadLink ? (
                  <ButtonAnchor href={downloadLink} variant="secondary">
                    下载
                  </ButtonAnchor>
                ) : null}
                {clashInstallLink ? (
                  <ButtonAnchor href={clashInstallLink} variant="primary">
                    一键导入
                  </ButtonAnchor>
                ) : null}
              </>
            }
          />
        </div>
      </div>
    </Dialog>
  );
}
