import * as React from "react";

import { cn } from "@/lib/ui/cn";

/** 全局背景装饰（点阵 + 渐变 blobs）。纯视觉效果，`aria-hidden`。 */
export function BackgroundDecor({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(color-mix(in_srgb,var(--app-border)_35%,transparent)_1px,transparent_1px)] [background-size:24px_24px]" />
      {/* Ambient blobs (Organic / Natural) */}
      <div className="blob-1 absolute -left-40 -top-40 h-[34rem] w-[34rem] bg-primary/25 blur-3xl" />
      <div className="blob-2 absolute -right-44 -top-24 h-[32rem] w-[32rem] bg-secondary/20 blur-3xl" />
      <div className="blob-3 absolute bottom-[-18rem] left-[8%] h-[34rem] w-[34rem] bg-accent/60 blur-3xl opacity-90" />
      <div className="blob-2 absolute bottom-[-16rem] right-[10%] h-[30rem] w-[30rem] bg-primary/15 blur-3xl" />

      {/* Subtle vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_50%_0%,color-mix(in_srgb,var(--app-primary)_12%,transparent)_0%,transparent_60%)]" />
    </div>
  );
}
