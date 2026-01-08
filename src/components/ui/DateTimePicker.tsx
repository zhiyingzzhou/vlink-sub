"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/ui/cn";

export type DateTimePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
};

/**
 * ISO 时间字符串 ↔ 本地日期/时间输入框之间的转换。
 *
 * 注意：`toISOString()` 输出为 UTC，但这里的构造使用本地时间，
 * 因此能保证“用户选择的本地时间”在服务端存储/展示时一致。
 */
function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 2v3M16 2v3M3 9h18M5 6h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 将 ISO 字符串转成 `<input type="date|time">` 需要的本地字符串。 */
function isoToLocalParts(iso: string): { date: string; time: string } {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return { date: "", time: "" };
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * 将本地日期/时间输入拼回 ISO 字符串。
 *
 * 返回 null 表示输入不完整或非法。
 */
function localPartsToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(t[1]);
  const minute = Number(t[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/** 以本地时区格式化展示（用于触发按钮文案）。 */
function formatLocal(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 轻量时间选择器：按钮触发 → Dialog → date/time 输入。
 *
 * 适用：订阅到期时间（expires_at）。
 */
export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "未设置",
  title = "选择时间",
  description,
  className,
  triggerClassName,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const [draftDate, setDraftDate] = React.useState("");
  const [draftTime, setDraftTime] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (!value) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setDraftDate(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      );
      setDraftTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
      return;
    }
    const p = isoToLocalParts(value);
    setDraftDate(p.date);
    setDraftTime(p.time);
  }, [open, value]);

  const canApply = Boolean(localPartsToIso(draftDate, draftTime));

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "w-full h-12 rounded-full px-5 text-sm",
          "bg-input text-foreground",
          "border border-border/60",
          "shadow-[var(--shadow-soft)]",
          "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "flex items-center justify-between gap-3",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-[var(--shadow-soft-hover)]",
          triggerClassName
        )}
      >
        <span className={cn("min-w-0 truncate text-left", value ? "" : "text-muted-foreground")}>
          {value ? formatLocal(value) : placeholder}
        </span>
        <span className="shrink-0 text-muted-foreground">
          <CalendarIcon />
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        size="sm"
        closeLabel="关闭"
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              disabled={disabled}
            >
              清除
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  const iso = localPartsToIso(draftDate, draftTime);
                  if (!iso) return;
                  onChange(iso);
                  setOpen(false);
                }}
                disabled={!canApply}
              >
                确认
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-muted-foreground">日期</div>
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-muted-foreground">时间</div>
              <Input
                type="time"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
            将按本地时区写入到期时间；导出时会出现在 Subscription-Userinfo 的 expire 字段中。
          </div>
        </div>
      </Dialog>
    </div>
  );
}
