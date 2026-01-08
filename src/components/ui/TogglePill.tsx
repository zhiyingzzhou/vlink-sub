"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type TogglePillTone =
  | "primary"
  | "secondary"
  | "accent"
  | "muted"
  | "danger"
  | "neutral";

export type TogglePillProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
  tone?: TogglePillTone;
  size?: "sm" | "md";
};

const toneClass: Record<TogglePillTone, string> = {
  primary: "bg-primary/15 text-primary border-primary/20",
  secondary: "bg-secondary/15 text-secondary border-secondary/25",
  accent: "bg-accent text-accent-foreground border-border/50",
  muted: "bg-muted text-muted-foreground border-border/50",
  danger: "bg-destructive/15 text-destructive border-destructive/20",
  neutral: "bg-card/70 text-foreground border-border/50",
};

export function TogglePill({
  pressed = false,
  tone = "neutral",
  size = "sm",
  className,
  children,
  ...props
}: TogglePillProps) {
  const sizeClass = size === "md" ? "h-11 px-5 text-sm" : "h-10 px-4 text-xs";

  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center gap-2 select-none whitespace-nowrap rounded-full",
        "border",
        "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        sizeClass,
        pressed
          ? cn(
              "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft-hover)] hover:-translate-y-0.5",
              "active:translate-y-0 active:scale-95",
              toneClass[tone]
            )
          : cn(
              "bg-background/60 text-muted-foreground border-border/60",
              "shadow-none hover:shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
              "active:translate-y-0 active:scale-95"
            ),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

