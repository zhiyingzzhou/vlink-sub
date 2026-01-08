"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

const base =
  "w-full min-h-[180px] resize-y " +
  "rounded-[2rem] px-6 py-4 text-sm leading-6 " +
  "bg-input text-foreground placeholder:text-muted-foreground " +
  "border border-border/60 " +
  "shadow-[var(--shadow-soft)] " +
  "transition-all duration-300 [transition-timing-function:var(--ease-organic)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, className)} {...props} />;
  }
);
