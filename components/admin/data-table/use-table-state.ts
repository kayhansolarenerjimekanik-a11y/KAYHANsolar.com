"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { FilterDef, TableState } from "./types";

export interface ParseConfig<T> {
  filters: FilterDef<T>[];
  defaultSort: string;
}

export function parseTableState<T>(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  config: ParseConfig<T>,
): TableState {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) return params.get(key) ?? "";
    const v = (params as Record<string, string | string[] | undefined>)[key];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };

  const q = get("q").trim();
  const filters: Record<string, string> = {};
  for (const f of config.filters) {
    if (f.type === "search") continue;
    const raw = get(f.id);
    if (raw) filters[f.id] = raw;
  }
  const sort = get("siralama") || config.defaultSort;
  const pageRaw = parseInt(get("sayfa"), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return { q, filters, sort, page };
}

export function buildSearchParams<T>(
  state: TableState,
  config: ParseConfig<T>,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  for (const f of config.filters) {
    if (f.type === "search") continue;
    const v = state.filters[f.id];
    if (v) sp.set(f.id, v);
  }
  if (state.sort && state.sort !== config.defaultSort) sp.set("siralama", state.sort);
  if (state.page > 1) sp.set("sayfa", String(state.page));
  return sp;
}

export function useTableState<T>(filters: FilterDef<T>[], defaultSort: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Why: parent passes a new { filters, defaultSort } object every render.
  // Depend on the destructured stable refs (filters useMemo'd by caller, defaultSort
  // is a string literal) so this memo doesn't invalidate on every render and trigger
  // the fetch effect in DataTable infinitely.
  const state = useMemo(
    () => parseTableState(searchParams, { filters, defaultSort }),
    [searchParams, filters, defaultSort],
  );

  const setState = useCallback(
    (next: TableState) => {
      const sp = buildSearchParams(next, { filters, defaultSort });
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, filters, defaultSort],
  );

  const patch = useCallback(
    (partial: Partial<TableState> | ((s: TableState) => Partial<TableState>)) => {
      const delta = typeof partial === "function" ? partial(state) : partial;
      const resetPage =
        ("q" in delta || "filters" in delta || "sort" in delta) && !("page" in delta);
      setState({
        ...state,
        ...delta,
        ...(resetPage ? { page: 1 } : {}),
      } as TableState);
    },
    [state, setState],
  );

  const clear = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { state, setState, patch, clear };
}
