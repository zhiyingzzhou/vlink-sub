"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/ui/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "neutral" | "primary" | "secondary" | "accent" | "danger";
  interactive?: boolean;
};

function shapeFor(tone: CardProps["tone"]): string {
  if (tone === "primary") return "rounded-[2rem] rounded-tl-[3.25rem]";
  if (tone === "secondary") return "rounded-[2rem] rounded-tr-[3.25rem]";
  if (tone === "accent") return "rounded-[2rem] rounded-bl-[3.25rem]";
  if (tone === "danger") return "rounded-[2rem] rounded-br-[3.25rem]";
  return "rounded-[2rem]";
}

function toneClass(tone: CardProps["tone"]): string {
  if (tone === "primary") return "border-primary/25 bg-primary/5";
  if (tone === "secondary") return "border-secondary/25 bg-secondary/5";
  if (tone === "accent") return "border-border/60 bg-accent/30";
  if (tone === "danger") return "border-destructive/25 bg-destructive/5";
  return "border-border/60 bg-card/80";
}

export function Card({
  className,
  tone = "neutral",
  interactive = false,
  style,
  ...props
}: CardProps) {
  const classes = cn(
    "relative overflow-hidden border",
    "bg-card/70 backdrop-blur-md",
    "p-7 md:p-8",
    "shadow-[var(--shadow-soft)]",
    "transition-all duration-300 [transition-timing-function:var(--ease-organic)]",
    shapeFor(tone),
    toneClass(tone),
    className
  );
  const mergedStyle = { ...(style || {}) };

  if (interactive) {
    const {
      onDrag: _onDrag,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      onAnimationStart: _onAnimationStart,
      ...rest
    } = props;
    void _onDrag;
    void _onDragStart;
    void _onDragEnd;
    void _onAnimationStart;
    return (
      <motion.div
        whileHover={{ y: -4, rotate: 1, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
        className={classes}
        style={mergedStyle}
        {...rest}
      />
    );
  }

  return <div className={classes} style={mergedStyle} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("font-heading text-lg font-extrabold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-2 text-sm text-muted-foreground", className)} {...props} />
  );
}
