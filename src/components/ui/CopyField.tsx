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
  className?: string;
  inputClassName?: string;
};

export function CopyField({
  label,
  description,
  value,
  monospace = false,
  copyText = "复制",
  copiedText = "已复制",
  actions,
  className,
  inputClassName,
}: CopyFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const toast = useToast();

  const canCopy = Boolean((value || "").trim());

  const onCopy = React.useCallback(async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("复制失败", "请手动选择并复制");
    }
  }, [canCopy, toast, value]);

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <Label>{label}</Label> : null}
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          readOnly
          value={value}
          className={cn(monospace ? "font-mono text-xs" : "", inputClassName)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onCopy} disabled={!canCopy}>
            {copied ? copiedText : copyText}
          </Button>
          {actions}
        </div>
      </div>
    </div>
  );
}

