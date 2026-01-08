import * as React from "react";

import { cn } from "@/lib/ui/cn";

export type PageHeaderProps = {
  badge?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  badge,
  title,
  description,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden",
        "rounded-[3rem] border border-border/60 bg-card/60 backdrop-blur-md",
        "shadow-[var(--shadow-soft)]",
        "px-6 py-7 sm:px-8 sm:py-8 md:px-10 md:py-10",
        className
      )}
    >
      <div className="blob-2 pointer-events-none absolute -right-16 -top-16 h-64 w-64 bg-secondary/18 blur-3xl" />
      <div className="blob-1 pointer-events-none absolute -left-20 bottom-[-7rem] h-72 w-72 bg-primary/14 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4 md:items-end">
        <div className="min-w-0">
          {badge ? <div>{badge}</div> : null}
          <h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
