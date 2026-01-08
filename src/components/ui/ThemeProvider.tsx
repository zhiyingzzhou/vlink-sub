"use client";

import * as React from "react";

import {
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/**
 * 从 localStorage 读取主题偏好。
 *
 * 失败时返回 null（例如隐私模式/禁用 storage）。
 */
function readStoredPreference(): ThemePreference | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readDatasetPreference(): ThemePreference | null {
  const raw = document.documentElement.dataset.themePref;
  return isThemePreference(raw) ? raw : null;
}

function readDatasetResolved(): ResolvedTheme | null {
  const raw = document.documentElement.dataset.theme;
  return raw === "dark" || raw === "light" ? raw : null;
}

/**
 * 将主题写入 `<html data-theme/data-theme-pref>`，并返回 resolved theme。
 *
 * 说明：
 * - `src/app/layout.tsx` 会在首屏同步注入同一套逻辑，避免闪烁（FOUC）。
 */
function applyTheme(preference: ThemePreference) {
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  const resolved = resolveTheme(preference, Boolean(mql?.matches));
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = preference;
  return resolved;
}

/** 主题 Provider：提供 preference/resolved，并在系统主题变化时跟随（仅 system 模式）。 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(() => {
    if (typeof document === "undefined") return "system";
    return readDatasetPreference() ?? readStoredPreference() ?? "system";
  });

  const [resolved, setResolved] = React.useState<ResolvedTheme>(() => {
    if (typeof document === "undefined") return "light";
    return readDatasetResolved() ?? applyTheme(preference);
  });

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(applyTheme(next));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    setResolved(applyTheme(preference));
    if (preference !== "system") return;

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = () => {
      setResolved(applyTheme(preference));
    };

    try {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      // Safari < 14
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, [preference]);

  const value = React.useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 获取主题上下文（必须在 ThemeProvider 内使用）。 */
export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider />");
  return ctx;
}
