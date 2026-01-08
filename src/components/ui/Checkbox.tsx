"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> & {
  children?: React.ReactNode;
};

/** 受控/非受控均可用的 checkbox（隐藏原生 input，展示自定义样式）。 */
export function Checkbox({ className, children, id, ...props }: CheckboxProps) {
  const autoId = React.useId();
  const cid = id || autoId;

  return (
    <label
      htmlFor={cid}
      className={cn(
        "flex cursor-pointer select-none items-center gap-3 text-sm text-foreground",
        className
      )}
    >
      <input id={cid} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          "grid size-6 place-items-center rounded-2xl bg-input",
          "border border-border/60",
          "shadow-[var(--shadow-soft)]",
          "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
          "peer-checked:bg-primary peer-checked:border-primary/60",
          "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        )}
        aria-hidden="true"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
