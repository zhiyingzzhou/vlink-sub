"use client";

import Link from "next/link";
import * as React from "react";

import type { ButtonSize, ButtonVariant } from "@/components/ui/Button";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/ui/cn";

export type AppLinkProps = Omit<React.ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

export function AppLink({ className, ...props }: AppLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        "font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
        className
      )}
    />
  );
}

export type ButtonLinkProps = Omit<React.ComponentProps<typeof Link>, "className"> & {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return <Link {...props} className={buttonClassName({ variant, size, className })} />;
}

