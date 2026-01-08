"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "primary" | "secondary" | "accent" | "muted" | "danger" | "neutral";
};

const toneClass: Record<NonNullable<BadgeProps["tone"]>, string> = {
  primary: "bg-primary/15 text-primary border-primary/20",
  secondary: "bg-secondary/15 text-secondary border-secondary/25",
  accent: "bg-accent text-accent-foreground border-border/50",
  muted: "bg-muted text-muted-foreground border-border/50",
  danger: "bg-destructive/15 text-destructive border-destructive/20",
  neutral: "bg-card text-foreground border-border/50",
};

/** 小型徽标组件，用于标签/状态展示。 */
export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        "border shadow-[var(--shadow-soft)]",
        toneClass[tone],
        className
      )}
      {...props}
    />
  );
}
