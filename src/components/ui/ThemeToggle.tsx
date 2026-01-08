"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/theme";
import { cn } from "@/lib/ui/cn";

/** 主题切换顺序：system → light → dark → system。 */
function nextPreference(p: ThemePreference): ThemePreference {
  if (p === "system") return "light";
  if (p === "light") return "dark";
  return "system";
}

function labelFor(p: ThemePreference) {
  if (p === "system") return "系统";
  if (p === "light") return "浅色";
  return "深色";
}

/** 小图标组件（不引入额外依赖）。 */
function Icon({ name }: { name: "sun" | "moon" | "monitor" }) {
  if (name === "moon") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M21 13.2A8.5 8.5 0 0 1 10.8 3a7 7 0 1 0 10.2 10.2z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "monitor") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 5h16v11H4V5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 21h8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 16v5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 顶部/菜单中的主题切换按钮。 */
export function ThemeToggle({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { preference, resolved, setPreference } = useTheme();

  const iconName =
    preference === "system" ? "monitor" : resolved === "dark" ? "moon" : "sun";

  const onClick = () => setPreference(nextPreference(preference));
  const layoutClassName = showLabel ? "gap-2 px-4" : "h-9 w-9 px-0";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(layoutClassName, className)}
      aria-label={`主题：${labelFor(preference)}（点击切换）`}
      title={`主题：${labelFor(preference)}（点击切换）`}
    >
      <Icon name={iconName} />
      {showLabel ? (
        <span className="hidden sm:inline">主题：{labelFor(preference)}</span>
      ) : null}
    </Button>
  );
}
