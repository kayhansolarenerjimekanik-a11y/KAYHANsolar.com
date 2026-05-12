// components/admin/data-table/data-table-toolbar.tsx
"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { FilterDef, TableState } from "./types";

interface Props<T> {
  filters: FilterDef<T>[];
  state: TableState;
  counts: Record<string, number>; // tabs/chips icin secenek sayisi (key: `${filterId}:${value}`)
  onPatch: (delta: Partial<TableState>) => void;
}

export function DataTableToolbar<T>({ filters, state, counts, onPatch }: Props<T>) {
  return (
    <div className="space-y-3">
      {filters
        .filter((f) => f.type === "search")
        .map((f) => (
          <SearchInput
            key={f.id}
            placeholder={f.placeholder ?? "Ara..."}
            value={state.q}
            onChange={(q) => onPatch({ q })}
          />
        ))}

      <div className="flex flex-wrap items-center gap-2">
        {filters
          .filter((f) => f.type !== "search")
          .map((f) => {
            if (f.type === "tabs") {
              return (
                <TabsFilter
                  key={f.id}
                  filter={f}
                  value={state.filters[f.id] ?? ""}
                  counts={counts}
                  onChange={(v) =>
                    onPatch({ filters: { ...state.filters, [f.id]: v } })
                  }
                />
              );
            }
            if (f.type === "chips") {
              return (
                <ChipsFilter
                  key={f.id}
                  filter={f}
                  value={state.filters[f.id] ?? ""}
                  counts={counts}
                  onChange={(v) =>
                    onPatch({ filters: { ...state.filters, [f.id]: v } })
                  }
                />
              );
            }
            // select
            return (
              <SelectFilter
                key={f.id}
                filter={f}
                value={state.filters[f.id] ?? ""}
                onChange={(v) =>
                  onPatch({ filters: { ...state.filters, [f.id]: v } })
                }
              />
            );
          })}
      </div>
    </div>
  );
}

function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="relative max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        strokeWidth={2.2}
      />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-9 text-sm placeholder:text-subtle focus:border-lime-primary focus:outline-none"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-elevated"
          aria-label="Aramayı temizle"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

function TabsFilter<T>({
  filter,
  value,
  counts,
  onChange,
}: {
  filter: FilterDef<T>;
  value: string;
  counts: Record<string, number>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-elevated p-1">
      {(filter.options ?? []).map((opt) => {
        const isActive = value === opt.value || (!value && opt.value === "");
        const count = counts[`${filter.id}:${opt.value}`];
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-lime-primary text-black"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            {opt.label}
            {typeof count === "number" && (
              <span className="rounded-full bg-black/10 px-1.5 text-[10px] tabular-nums">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ChipsFilter<T>({
  filter,
  value,
  counts,
  onChange,
}: {
  filter: FilterDef<T>;
  value: string;
  counts: Record<string, number>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-subtle">{filter.label}:</span>
      {(filter.options ?? []).map((opt) => {
        const isActive = value === opt.value || (!value && opt.value === "");
        const count = counts[`${filter.id}:${opt.value}`];
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isActive
                ? "border-lime-primary bg-lime-primary/15 text-foreground"
                : "border-border bg-surface text-muted hover:border-lime-primary/40 hover:text-foreground",
            )}
          >
            {opt.label}
            {typeof count === "number" && (
              <span className="rounded-full bg-black/10 px-1.5 text-[10px] tabular-nums dark:bg-white/10">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SelectFilter<T>({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef<T>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span>{filter.label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm focus:border-lime-primary focus:outline-none"
      >
        {(filter.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
