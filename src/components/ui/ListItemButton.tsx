"use client";

import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type ListItemButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const ListItemButton = React.forwardRef<HTMLButtonElement, ListItemButtonProps>(
  function ListItemButton({ className, selected = false, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "w-full text-left",
          "cursor-pointer disabled:cursor-not-allowed",
          "rounded-[2rem] border border-border/60 bg-card p-4",
          "shadow-[var(--shadow-soft)]",
          "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
          "hover:-translate-y-1 hover:shadow-[var(--shadow-soft-hover)]",
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
