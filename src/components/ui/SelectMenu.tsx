"use client";

import * as React from "react";

import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { ListItemButton } from "@/components/ui/ListItemButton";
import { cn } from "@/lib/ui/cn";

export type SelectMenuOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type SelectMenuGroup<T extends string> = {
  label: string;
  options: Array<SelectMenuOption<T>>;
};

export type SelectMenuProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options?: Array<SelectMenuOption<T>>;
  groups?: Array<SelectMenuGroup<T>>;
  placeholder?: string;
  disabled?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
};

/**
 * 用 Dialog 实现的“可搜索下拉选择器”（移动端友好）。
 *
 * - 支持平铺 options 或分组 groups（二选一）
 * - 可选启用搜索：按 label/description 过滤
 * - `T extends string` 让 value 在 TS 里保持强类型
 */
function ArrowIcon() {
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
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
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
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function allOptions<T extends string>(
  options: Array<SelectMenuOption<T>> | undefined,
  groups: Array<SelectMenuGroup<T>> | undefined
): Array<SelectMenuOption<T>> {
  if (Array.isArray(groups) && groups.length > 0) {
    return groups.flatMap((g) => g.options);
  }
  return Array.isArray(options) ? options : [];
}

function findSelected<T extends string>(
  value: T,
  options: Array<SelectMenuOption<T>> | undefined,
  groups: Array<SelectMenuGroup<T>> | undefined
): SelectMenuOption<T> | null {
  const list = allOptions(options, groups);
  return list.find((o) => o.value === value) || null;
}

/** 入口组件：按钮触发 → Dialog 列表选择。 */
export function SelectMenu<T extends string>({
  value,
  onValueChange,
  options,
  groups,
  placeholder = "请选择…",
  disabled = false,
  title,
  description,
  searchable = false,
  searchPlaceholder = "搜索…",
  className,
  triggerClassName,
}: SelectMenuProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const selected = React.useMemo(
    () => findSelected(value, options, groups),
    [groups, options, value]
  );

  const normalized = q.trim().toLowerCase();

  const renderedGroups = React.useMemo(() => {
    const baseGroups: Array<SelectMenuGroup<T>> =
      Array.isArray(groups) && groups.length > 0 ? groups : [{ label: "", options: options || [] }];

    if (!normalized) return baseGroups;

    const match = (o: SelectMenuOption<T>) => {
      const hay = `${o.label} ${o.description || ""}`.toLowerCase();
      return hay.includes(normalized);
    };

    return baseGroups
      .map((g) => ({ ...g, options: g.options.filter(match) }))
      .filter((g) => g.options.length > 0);
  }, [groups, normalized, options]);

  const onPick = (next: T) => {
    onValueChange(next);
    setOpen(false);
    setQ("");
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "w-full h-12 rounded-full px-5 text-sm",
          "bg-input text-foreground",
          "border border-border/60",
          "shadow-(--shadow-soft)",
          "transition-all duration-300 ease-(--ease-organic)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "flex items-center justify-between gap-3",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-(--shadow-soft-hover)",
          triggerClassName
        )}
      >
        <span className={cn("min-w-0 truncate text-left", selected ? "" : "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="shrink-0 text-muted-foreground">
          <ArrowIcon />
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQ("");
        }}
        title={title ?? "请选择"}
        description={description}
        size="md"
        closeLabel="关闭"
      >
        <div className="grid gap-4">
          {searchable ? (
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
            />
          ) : null}

          <div className="max-h-[52vh] overflow-auto pr-1">
            <div className="grid gap-3">
              {renderedGroups.length === 0 ? (
                <div className="rounded-4xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground shadow-(--shadow-soft)">
                  没有匹配项
                </div>
              ) : (
                renderedGroups.map((g, idx) => (
                  <div key={`${g.label}-${idx}`} className="grid gap-2">
                    {g.label ? (
                      <div className="px-2 text-xs font-semibold text-muted-foreground">
                        {g.label}
                      </div>
                    ) : null}

                    {g.options.map((o) => {
                      const isSelected = o.value === value;
                      return (
                        <ListItemButton
                          key={o.value}
                          onClick={() => onPick(o.value)}
                          disabled={o.disabled}
                          selected={isSelected}
                          className={cn(
                            "flex items-start justify-between gap-3",
                            o.disabled ? "opacity-60 cursor-not-allowed" : ""
                          )}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-heading text-sm font-extrabold">
                              {o.label}
                            </div>
                            {o.description ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {o.description}
                              </div>
                            ) : null}
                          </div>
                          <div className={cn("shrink-0 pt-1", isSelected ? "text-primary" : "text-transparent")}>
                            <CheckIcon />
                          </div>
                        </ListItemButton>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
