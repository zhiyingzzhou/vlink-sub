export const THEME_STORAGE_KEY = "vlink.theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/** 判断值是否为合法主题偏好（用于读取 localStorage/dataset 时做保护）。 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * 由用户偏好 + 系统暗色偏好推导出最终主题。
 *
 * 说明：当 preference 为 `system` 时，才会跟随系统。
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}
