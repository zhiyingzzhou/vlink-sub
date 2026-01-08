"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export type { ButtonVariant, ButtonSize };

const base =
  "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-semibold " +
  "rounded-full px-8 " +
  "transition-all duration-300 [transition-timing-function:var(--ease-organic)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const byVariant: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft-hover)] hover:scale-105 active:scale-95",
  secondary:
    "bg-transparent text-secondary border-2 border-secondary/70 shadow-none hover:bg-secondary/10 hover:scale-105 active:scale-95",
  ghost:
    "bg-transparent text-primary border border-transparent shadow-none hover:bg-primary/10 hover:scale-105 active:scale-95",
  destructive:
    "bg-destructive text-destructive-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-soft-hover)] hover:scale-105 active:scale-95",
};

const bySize: Record<ButtonSize, string> = {
  sm: "h-10 text-sm px-6",
  md: "h-12 text-sm px-8",
  lg: "h-14 text-base px-10",
};

export function buttonClassName(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const variant = opts?.variant ?? "primary";
  const size = opts?.size ?? "md";
  return cn(base, byVariant[variant], bySize[size], opts?.className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", leftIcon, rightIcon, children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={buttonClassName({ variant, size, className })}
        {...props}
      >
        {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </button>
    );
  }
);

export type ButtonAnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const ButtonAnchor = React.forwardRef<HTMLAnchorElement, ButtonAnchorProps>(
  function ButtonAnchor(
    { className, variant = "primary", size = "md", leftIcon, rightIcon, children, ...props },
    ref
  ) {
    return (
      <a ref={ref} className={buttonClassName({ variant, size, className })} {...props}>
        {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </a>
    );
  }
);
