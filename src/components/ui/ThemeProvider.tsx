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

function applyTheme(preference: ThemePreference) {
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  const resolved = resolveTheme(preference, Boolean(mql?.matches));
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = preference;
  return resolved;
}

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
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    setResolved(applyTheme(preference));

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = () => {
      if (preference !== "system") return;
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

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider />");
  return ctx;
}
