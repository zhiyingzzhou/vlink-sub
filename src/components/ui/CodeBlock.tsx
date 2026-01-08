"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/ui/cn";

export type CodeBlockProps = {
  label?: React.ReactNode;
  description?: React.ReactNode;
  value: string;
  maxHeightClassName?: string;
  copyable?: boolean;
  className?: string;
};

/**
 * 代码块展示组件（可选一键复制）。
 *
 * 适用：展示模板 YAML、配置预览、JSON 等内容。
 */
export function CodeBlock({
  label,
  description,
  value,
  maxHeightClassName = "max-h-80",
  copyable = true,
  className,
}: CodeBlockProps) {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);
  const resetTimerRef = React.useRef<number | null>(null);

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

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>{label}</Label>
          {copyable ? (
            <Button variant="secondary" size="sm" onClick={onCopy} disabled={!canCopy}>
              {copied ? "已复制" : "复制"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}

      <pre
        className={cn(
          "overflow-auto rounded-[2rem]",
          "border border-border/60 bg-background/70",
          "p-4 sm:p-5 font-mono text-xs leading-5 text-foreground",
          "shadow-[var(--shadow-soft)]",
          maxHeightClassName
        )}
      >
        {value}
      </pre>
    </div>
  );
}
