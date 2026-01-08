"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type ListItemButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

/** 列表项按钮：用于 SelectMenu/NodesPreview 等“可点击列表”场景。 */
export const ListItemButton = React.forwardRef<HTMLButtonElement, ListItemButtonProps>(
  function ListItemButton({ className, selected = false, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "w-full text-left",
          "cursor-pointer disabled:cursor-not-allowed",
          "rounded-4xl border border-border/60 bg-card p-4",
          "shadow-(--shadow-soft)",
          "transition-all duration-300 ease-(--ease-organic)",
          "hover:-translate-y-1 hover:shadow-(--shadow-soft-hover)",
          "active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          selected ? "bg-accent/30 border-primary/30" : "",
          className
        )}
        {...props}
      />
    );
  }
);
