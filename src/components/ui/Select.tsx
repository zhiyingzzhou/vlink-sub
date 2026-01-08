"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

const selectBase =
  "w-full h-12 appearance-none rounded-full px-5 pr-12 text-sm " +
  "bg-input text-foreground " +
  "border border-border/60 " +
  "shadow-(--shadow-soft) " +
  "transition-all duration-300 ease-(--ease-organic) " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** 原生 `<select>` 的统一样式封装（非弹窗版本）。 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(selectBase)} {...props}>
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
});
