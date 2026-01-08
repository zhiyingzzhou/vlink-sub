"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/ui/cn";

export type CopyFieldProps = {
  label?: React.ReactNode;
  description?: React.ReactNode;
  value: string;
  monospace?: boolean;
  copyText?: string;
  copiedText?: string;
  actions?: React.ReactNode;
  layout?: "inline" | "stacked";
  className?: string;
  inputClassName?: string;
};

/**
 * 只读输入框 + 一键复制。
 *
 * - 使用 `navigator.clipboard`，失败时用 toast 提示用户手动复制。
 * - 适用于订阅链接、shortCode 等“需要复制”的场景。
 */
export function CopyField({
  label,
  description,
  value,
  monospace = false,
  copyText = "复制",
  copiedText = "已复制",
  actions,
  layout = "inline",
  className,
  inputClassName,
}: CopyFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const resetTimerRef = React.useRef<number | null>(null);
  const toast = useToast();

  const canCopy = Boolean((value || "").trim());

  React.useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  const onCopy = React.useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null;
        setCopied(false);
      }, 1200);
    } catch {
      toast.error("复制失败", "请手动选择并复制");
    }
  }, [canCopy, toast, value]);

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={onCopy} disabled={!canCopy}>
        {copied ? copiedText : copyText}
      </Button>
      {actions}
    </div>
  );

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <Label>{label}</Label> : null}
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}

      {layout === "stacked" ? (
        <div className="grid gap-3">
          <Input
            readOnly
            value={value}
            className={cn(monospace ? "font-mono text-xs" : "", inputClassName)}
          />
          {actionButtons}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            readOnly
            value={value}
            className={cn(monospace ? "font-mono text-xs" : "", inputClassName)}
          />
          {actionButtons}
        </div>
      )}
    </div>
  );
}
