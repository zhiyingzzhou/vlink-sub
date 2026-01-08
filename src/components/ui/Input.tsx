"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

const base =
  "w-full h-12 rounded-full px-5 text-sm " +
  "bg-input text-foreground placeholder:text-muted-foreground " +
  "border border-border/60 " +
  "shadow-[var(--shadow-soft)] " +
  "transition-all duration-300 [transition-timing-function:var(--ease-organic)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});
