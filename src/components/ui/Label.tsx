"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  requiredMark?: boolean;
};

/** 表单标签组件（可选必填星号）。 */
export function Label({ className, requiredMark, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-semibold text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      {requiredMark ? <span className="ml-1 text-secondary">*</span> : null}
    </label>
  );
}
