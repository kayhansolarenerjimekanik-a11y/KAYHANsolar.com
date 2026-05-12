# Admin DataTable Pilot (Ürünler) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürünler admin sayfasını yeniden kullanılabilir `<DataTable>` ile dönüştür — arama, kategori/durum/stok filtresi, kolon sıralama, sayfalama, toplu işlem ve URL-yansımalı state. Bileşen ailesi gelecekte 6 diğer liste sayfasına yayılacak şekilde jenerik kalır.

**Architecture:** Yeni `components/admin/data-table/` ailesi (generic `<DataTable<T>>` + toolbar + bulk-bar + pagination + empty/error/skeleton + URL-state hook). Ürünler sayfasına özel kolon/filtre/sıralama tanımı `components/admin/products-table.tsx` içinde. Server component (`urunler/page.tsx`) `repo.listProducts()` sonucunu olduğu gibi DataTable'a verir; filtre/sıralama/sayfalama tarayıcıda `client-fetcher` üzerinden uygulanır. `fetcher` prop'u soyutlama olarak duruyor — yarın Supabase server-side aramaya geçilirse sadece bu adapter değişir. Toplu işlem için `products-bulk.ts` server action revalidate eder.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, TypeScript strict, Tailwind 4, lucide-react ikonlar, sonner (toast), zod, class-variance-authority. **Test runner yok** — doğrulama TypeScript + ESLint + manuel smoke.

**Spec:** `docs/superpowers/specs/2026-05-12-admin-datatable-urunler-pilot-design.md`

**Verification per task:** Her görev sonunda:
```
pnpm exec tsc --noEmit && pnpm lint
```
sıfır hata + sıfır uyarı vermeli. Görev belirtirse manuel smoke testi yap. Sonra commit.

---

## Task 1: `<PageHeader>` bileşeni

Bu bileşeni en önce ekliyoruz çünkü hem mevcut sayfaların başlık tekrarını sade hale getiriyor hem de Task 11'de Ürünler sayfasının yeni başlık yapısı bunu kullanacak.

**Files:**
- Create: `components/admin/page-header.tsx`

- [ ] **Step 1: Bileşen dosyasını oluştur**

```tsx
// components/admin/page-header.tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/page-header.tsx
git commit -m "feat(admin): PageHeader bileseni"
```

---

## Task 2: DataTable tip tanımları

Tüm DataTable ailesi bu tipleri import edecek. Önce tipleri sabitliyoruz.

**Files:**
- Create: `components/admin/data-table/types.ts`

- [ ] **Step 1: Tip dosyasını oluştur**

```ts
// components/admin/data-table/types.ts
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface ColumnDef<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  align?: "left" | "right";
}

export type FilterType = "search" | "tabs" | "chips" | "select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef<T> {
  id: string; // URL anahtari
  type: FilterType;
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  searchAccessor?: (row: T) => string;
  predicate?: (row: T, value: string) => boolean;
}

export interface SortDef<T> {
  id: string; // URL "siralama" degeri
  label: string;
  compare: (a: T, b: T) => number;
}

export interface BulkActionConfirm {
  title: string;
  description: (count: number) => string;
  confirmLabel: string;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "danger";
  confirm?: BulkActionConfirm;
  run: (rows: T[]) => Promise<void>;
}

export interface TableState {
  q: string;
  filters: Record<string, string>;
  sort: string;
  page: number;
}

export interface FetcherResult<T> {
  rows: T[];
  total: number;
}

export type Fetcher<T> = (state: TableState) => Promise<FetcherResult<T>>;

export interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/types.ts
git commit -m "feat(admin/data-table): tip tanimlari"
```

---

## Task 3: URL-state hook (`use-table-state`)

URL searchParams ↔ TableState arasında çift yönlü senkron. Hem server (`parseTableState`) hem client (`useTableState`) aynı parse mantığını paylaşır.

**Files:**
- Create: `components/admin/data-table/use-table-state.ts`

- [ ] **Step 1: Hook dosyasını oluştur**

```ts
// components/admin/data-table/use-table-state.ts
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

export function useTableState<T>(config: ParseConfig<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => parseTableState(searchParams, config), [searchParams, config]);

  const setState = useCallback(
    (next: TableState) => {
      const sp = buildSearchParams(next, config);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, config],
  );

  const patch = useCallback(
    (partial: Partial<TableState> | ((s: TableState) => Partial<TableState>)) => {
      const delta = typeof partial === "function" ? partial(state) : partial;
      // Filtre/arama/sıralama değişirse sayfa 1'e dön
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
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/use-table-state.ts
git commit -m "feat(admin/data-table): useTableState + URL parse/build"
```

---

## Task 4: Client-side fetcher

Bütün satırlar + kolon/filtre/sıralama tanımlarından, `TableState` parametresine göre filter+sort+slice yapan fonksiyon. Gelecekte Supabase server-side fetcher buraya alternatif olarak eklenebilir.

**Files:**
- Create: `components/admin/data-table/client-fetcher.ts`

- [ ] **Step 1: Fetcher dosyasını oluştur**

```ts
// components/admin/data-table/client-fetcher.ts
import type { Fetcher, FilterDef, SortDef, TableState } from "./types";

export interface ClientFetcherConfig<T> {
  rows: T[];
  filters: FilterDef<T>[];
  sorts: SortDef<T>[];
  pageSize: number;
}

export function createClientFetcher<T>(config: ClientFetcherConfig<T>): Fetcher<T> {
  return async (state: TableState) => {
    let working = config.rows.slice();

    // Search
    const searchFilter = config.filters.find((f) => f.type === "search");
    if (searchFilter && state.q && searchFilter.searchAccessor) {
      const needle = state.q.toLocaleLowerCase("tr-TR");
      working = working.filter((row) =>
        searchFilter.searchAccessor!(row).toLocaleLowerCase("tr-TR").includes(needle),
      );
    }

    // Filtre alanları (tabs / chips / select)
    for (const f of config.filters) {
      if (f.type === "search") continue;
      const v = state.filters[f.id];
      if (!v || !f.predicate) continue;
      working = working.filter((row) => f.predicate!(row, v));
    }

    const total = working.length;

    // Sıralama
    const sortDef = config.sorts.find((s) => s.id === state.sort);
    if (sortDef) {
      working = working.slice().sort(sortDef.compare);
    }

    // Sayfalama
    const start = (state.page - 1) * config.pageSize;
    const paged = working.slice(start, start + config.pageSize);

    return { rows: paged, total };
  };
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/client-fetcher.ts
git commit -m "feat(admin/data-table): createClientFetcher"
```

---

## Task 5: DataTable iskelet / boş / hata bileşenleri

Üç küçük dosya: tutarlı durum görsellerinin tek kaynağı.

**Files:**
- Create: `components/admin/data-table/data-table-skeleton.tsx`
- Create: `components/admin/data-table/data-table-empty.tsx`
- Create: `components/admin/data-table/data-table-error.tsx`

- [ ] **Step 1: Skeleton dosyasını oluştur**

```tsx
// components/admin/data-table/data-table-skeleton.tsx
interface Props {
  columns: number;
  rows?: number;
}

export function DataTableSkeleton({ columns, rows = 5 }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-subtle">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-border" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-elevated" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Empty dosyasını oluştur**

```tsx
// components/admin/data-table/data-table-empty.tsx
import type { EmptyStateConfig } from "./types";

interface Props {
  config: EmptyStateConfig;
}

export function DataTableEmpty({ config }: Props) {
  const Icon = config.icon;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-elevated p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface text-muted">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{config.title}</p>
        <p className="mt-1 text-sm text-muted">{config.description}</p>
      </div>
      {config.action && <div className="mt-2">{config.action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Error dosyasını oluştur**

```tsx
// components/admin/data-table/data-table-error.tsx
"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
}

export function DataTableError({ message }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className="text-sm font-semibold text-foreground">Bir hata oluştu</p>
      {message && <p className="text-sm text-muted">{message}</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
        <RefreshCcw className="h-4 w-4" strokeWidth={2.2} />
        Yeniden Dene
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 5: Commit**

```bash
git add components/admin/data-table/data-table-skeleton.tsx components/admin/data-table/data-table-empty.tsx components/admin/data-table/data-table-error.tsx
git commit -m "feat(admin/data-table): skeleton + empty + error"
```

---

## Task 6: Toolbar bileşeni (arama + filtreler)

Toolbar arama kutusu (300ms debounce) + her filtre tipini render eder (tabs/chips/select). URL-state değişimini `useTableState.patch` üzerinden tetikler.

**Files:**
- Create: `components/admin/data-table/data-table-toolbar.tsx`

- [ ] **Step 1: Toolbar dosyasını oluştur**

```tsx
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

  // value prop disardan degisirse (or. clear) yansit
  useEffect(() => setLocal(value), [value]);

  // 300ms debounce
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 300);
    return () => clearTimeout(t);
    // onChange & value icin lint'i susturmuyoruz; bilincli kararla bagimliliklari local'a indiriyoruz
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
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/data-table-toolbar.tsx
git commit -m "feat(admin/data-table): toolbar (arama + tabs/chips/select)"
```

---

## Task 7: Pagination bileşeni

Önceki / Sonraki + "Sayfa N / M". Toplam pageSize'tan küçükse hiç render edilmez.

**Files:**
- Create: `components/admin/data-table/data-table-pagination.tsx`

- [ ] **Step 1: Pagination dosyasını oluştur**

```tsx
// components/admin/data-table/data-table-pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function DataTablePagination({ page, total, pageSize, onChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span className="tabular-nums">
        Sayfa <span className="font-semibold text-foreground">{page}</span> / {pageCount} ·{" "}
        <span className="tabular-nums">{total}</span> kayıt
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          Önceki
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(Math.min(pageCount, page + 1))}
        >
          Sonraki
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/data-table-pagination.tsx
git commit -m "feat(admin/data-table): pagination"
```

---

## Task 8: Bulk action bar

Seçim olduğunda alttan sticky çıkan bar. Confirm modal için basit `window.confirm` yerine kendi onay UI'sini kullanıyoruz (modal primitive yok, ekrana ufak overlay kart açıyoruz).

**Files:**
- Create: `components/admin/data-table/data-table-bulk-bar.tsx`

- [ ] **Step 1: Bulk bar dosyasını oluştur**

```tsx
// components/admin/data-table/data-table-bulk-bar.tsx
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BulkAction } from "./types";

interface Props<T> {
  selected: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}

export function DataTableBulkBar<T>({ selected, actions, onClear }: Props<T>) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<BulkAction<T> | null>(null);

  if (selected.length === 0) return null;

  const run = async (action: BulkAction<T>) => {
    setPending(action.id);
    try {
      await action.run(selected);
      onClear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`İşlem başarısız: ${msg}`);
    } finally {
      setPending(null);
      setConfirmFor(null);
    }
  };

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm font-medium tabular-nums">
          {selected.length} seçili
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1 text-muted hover:bg-elevated"
          aria-label="Seçimi temizle"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.id}
                type="button"
                size="sm"
                variant={a.variant === "danger" ? "danger" : "outline"}
                disabled={pending !== null}
                onClick={() => (a.confirm ? setConfirmFor(a) : run(a))}
              >
                {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>

      {confirmFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="text-base font-semibold">{confirmFor.confirm!.title}</h3>
            <p className="mt-2 text-sm text-muted">
              {confirmFor.confirm!.description(selected.length)}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmFor(null)}
                disabled={pending !== null}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                variant={confirmFor.variant === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={() => run(confirmFor)}
                disabled={pending !== null}
                className={cn(pending === confirmFor.id && "opacity-70")}
              >
                {confirmFor.confirm!.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/data-table-bulk-bar.tsx
git commit -m "feat(admin/data-table): bulk action bar + confirm modal"
```

---

## Task 9: Ana `<DataTable>` bileşeni

Toolbar + tablo + pagination + bulk bar'ı birleştirir. Generic `<T>` ile çalışır. `counts` toolbar'a verilmek üzere full rows üzerinden hesaplanır (filtre opsiyon sayaçları için).

**Files:**
- Create: `components/admin/data-table/data-table.tsx`

- [ ] **Step 1: DataTable dosyasını oluştur**

```tsx
// components/admin/data-table/data-table.tsx
"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { DataTableBulkBar } from "./data-table-bulk-bar";
import { DataTableEmpty } from "./data-table-empty";
import { DataTableError } from "./data-table-error";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableSkeleton } from "./data-table-skeleton";
import { DataTableToolbar } from "./data-table-toolbar";
import { useTableState } from "./use-table-state";
import type {
  BulkAction,
  ColumnDef,
  EmptyStateConfig,
  Fetcher,
  FilterDef,
  SortDef,
} from "./types";

interface Props<T> {
  allRows: T[];                      // sayac hesabi icin tam liste
  columns: ColumnDef<T>[];
  filters: FilterDef<T>[];
  sorts: SortDef<T>[];
  defaultSort: string;
  fetcher: Fetcher<T>;
  pageSize?: number;
  bulkActions?: BulkAction<T>[];
  getRowId: (row: T) => string;
  emptyState: EmptyStateConfig;
  emptyFilteredState: EmptyStateConfig;
}

export function DataTable<T>({
  allRows,
  columns,
  filters,
  sorts,
  defaultSort,
  fetcher,
  pageSize = 25,
  bulkActions = [],
  getRowId,
  emptyState,
  emptyFilteredState,
}: Props<T>) {
  const { state, patch, clear } = useTableState({ filters, defaultSort });
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher(state)
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state, fetcher]);

  // Filtre option sayaclari (filtre uygulanmamis tum rows uzerinden)
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of filters) {
      if (f.type === "search" || !f.predicate) continue;
      for (const opt of f.options ?? []) {
        const key = `${f.id}:${opt.value}`;
        if (opt.value === "") {
          out[key] = allRows.length;
        } else {
          out[key] = allRows.filter((r) => f.predicate!(r, opt.value)).length;
        }
      }
    }
    return out;
  }, [allRows, filters]);

  const isFiltering =
    state.q !== "" || Object.values(state.filters).some((v) => v !== "");

  const selectedRows = useMemo(() => {
    if (selectedIds.size === 0) return [] as T[];
    return rows.filter((r) => selectedIds.has(getRowId(r)));
  }, [rows, selectedIds, getRowId]);

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(getRowId(r)));

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const r of rows) next.delete(getRowId(r));
      } else {
        for (const r of rows) next.add(getRowId(r));
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortNext = (columnId: string) => {
    // Kolon icin "<columnId>-az/za" veya "-artan/azalan" varyasyonlarini secim sirasiyla cevir.
    const candidates = sorts.filter((s) => s.id.startsWith(`${columnId}-`));
    if (candidates.length === 0) return;
    const idx = candidates.findIndex((s) => s.id === state.sort);
    const next = candidates[(idx + 1) % candidates.length];
    patch({ sort: next.id });
  };

  return (
    <div className="space-y-4">
      <DataTableToolbar
        filters={filters}
        state={state}
        counts={counts}
        onPatch={patch}
      />

      {loading ? (
        <DataTableSkeleton columns={columns.length + (bulkActions.length > 0 ? 1 : 0)} />
      ) : error ? (
        <DataTableError message={error} />
      ) : total === 0 ? (
        isFiltering ? (
          <DataTableEmpty
            config={{
              ...emptyFilteredState,
              action: (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-lime-dark hover:underline dark:text-lime-primary"
                >
                  Filtreleri temizle
                </button>
              ),
            }}
          />
        ) : (
          <DataTableEmpty config={emptyState} />
        )
      ) : (
        <>
          <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-subtle">
                <tr>
                  {bulkActions.length > 0 && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Sayfadakileri seç"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                      />
                    </th>
                  )}
                  {columns.map((col) => {
                    const isSorted = sorts.some(
                      (s) => s.id.startsWith(`${col.id}-`) && s.id === state.sort,
                    );
                    const dir = isSorted
                      ? state.sort.endsWith("-azalan") ||
                        state.sort.endsWith("-za") ||
                        state.sort.endsWith("-eski")
                        ? "desc"
                        : "asc"
                      : null;
                    return (
                      <th
                        key={col.id}
                        className={cn(
                          "px-4 py-3 font-semibold",
                          col.align === "right" && "text-right",
                          col.className,
                        )}
                      >
                        {col.sortable ? (
                          <button
                            type="button"
                            onClick={() => sortNext(col.id)}
                            className={cn(
                              "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                              col.align === "right" && "flex-row-reverse",
                            )}
                          >
                            {col.header}
                            {dir === "asc" ? (
                              <ChevronUp className="h-3 w-3" strokeWidth={2.4} />
                            ) : dir === "desc" ? (
                              <ChevronDown className="h-3 w-3" strokeWidth={2.4} />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-50" strokeWidth={2.4} />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const id = getRowId(row);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "transition-colors hover:bg-elevated/50",
                        isSelected && "bg-lime-primary/5",
                      )}
                    >
                      {bulkActions.length > 0 && (
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label="Satır seç"
                            checked={isSelected}
                            onChange={() => toggleRow(id)}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={cn(
                            "px-4 py-3 align-middle",
                            col.align === "right" && "text-right",
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DataTablePagination
            page={state.page}
            total={total}
            pageSize={pageSize}
            onChange={(page) => patch({ page })}
          />
        </>
      )}

      <DataTableBulkBar
        selected={selectedRows}
        actions={bulkActions}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/data-table/data-table.tsx
git commit -m "feat(admin/data-table): ana DataTable bileseni"
```

---

## Task 10: Toplu işlem server action'ı

Toplu aktif yap / pasif yap / sil için. Mevcut `app/(admin)/kayhan-yonetim/actions/products.ts` dosyasını DRY tutmak için yeni `products-bulk.ts` ekliyoruz; revalidate mantığı `revalidateCatalog`'la aynı yolları tetikler (kopya kabul, küçük dosya, bağımsızlık değerli).

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/products-bulk.ts`

- [ ] **Step 1: Server action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/products-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
  error?: string;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/urunler");
}

export async function bulkSetProductActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.updateProduct(id, { isActive });
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  revalidateCatalog();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteProductsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteProduct(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  revalidateCatalog();
  return { ok: failed === 0, succeeded, failed };
}
```

> **Doğrulama notu:** `repo.updateProduct(id, { isActive })` çağrısı şu an mevcut `updateProductAction`'da tam objeyle yapılıyor. Partial update'i `repo.updateProduct` desteklemiyor olabilir — Step 2'de tip hatası alırsan, repo imzasını kontrol et: `lib/data/index.ts` veya `lib/data/repo.ts`. Eğer `Partial<Product>` kabul etmiyorsa, çözüm: `const before = await repo.getProductById(id); await repo.updateProduct(id, { ...before, isActive });` şeklinde değiştir.

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.
**Eğer `repo.updateProduct` tip hatası verirse:** Yukarıdaki "Doğrulama notu"daki çözümü uygula, sonra tekrar çalıştır.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/products-bulk.ts
git commit -m "feat(admin): toplu urun aktif/pasif/sil server actions"
```

---

## Task 11: Ürünler için DataTable adaptörü (`products-table.tsx`)

Ürünler'e özel kolon/filtre/sıralama/bulk action tanımları + `<DataTable>` kurulumu burada. Server component'tan `allRows`, `categories`, `initialState` alır.

**Files:**
- Create: `components/admin/products-table.tsx`

- [ ] **Step 1: Adapter dosyasını oluştur**

```tsx
// components/admin/products-table.tsx
"use client";

import { Eye, EyeOff, Package, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  bulkDeleteProductsAction,
  bulkSetProductActiveAction,
} from "@/app/(admin)/kayhan-yonetim/actions/products-bulk";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Category, Product } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

interface Props {
  allRows: Product[];
  categories: Category[];
}

export function ProductsTable({ allRows, categories }: Props) {
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "media",
        header: "Görsel",
        className: "w-16",
        cell: (p) => (
          <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-elevated">
            {p.media[0]?.url && (
              <Image src={p.media[0].url} alt={p.name} fill sizes="40px" className="object-cover" />
            )}
          </div>
        ),
      },
      {
        id: "isim",
        header: "Ürün",
        sortable: true,
        cell: (p) => (
          <>
            <Link
              href={`/kayhan-yonetim/urunler/${p.id}`}
              className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
            >
              {p.name}
            </Link>
            {p.brand && <p className="text-xs text-subtle">{p.brand}</p>}
          </>
        ),
      },
      {
        id: "category",
        header: "Kategori",
        className: "hidden md:table-cell text-muted",
        cell: (p) => categoryName(p.categoryId),
      },
      {
        id: "fiyat",
        header: "Fiyat",
        sortable: true,
        align: "right",
        className: "tabular-nums",
        cell: (p) => formatPrice(p.currentPrice),
      },
      {
        id: "stok",
        header: "Stok",
        sortable: true,
        align: "right",
        className: "tabular-nums",
        cell: (p) =>
          p.stockQuantity === 0 ? (
            <span className="text-danger">0</span>
          ) : p.stockQuantity <= p.lowStockThreshold ? (
            <span className="text-warning">{p.stockQuantity}</span>
          ) : (
            p.stockQuantity
          ),
      },
      {
        id: "status",
        header: "Durum",
        className: "hidden sm:table-cell",
        cell: (p) =>
          p.isActive ? (
            <Badge tone="success">Aktif</Badge>
          ) : (
            <Badge tone="neutral">Pasif</Badge>
          ),
      },
      {
        id: "tarih",
        header: "Eklenme",
        sortable: true,
        className: "hidden lg:table-cell text-xs text-subtle",
        cell: (p) =>
          new Date(p.createdAt).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          }),
      },
      {
        id: "actions",
        header: "İşlem",
        className: "w-32 text-right",
        cell: (p) => <ProductRowActions productId={p.id} productName={p.name} />,
      },
    ],
    // categories degisirse yeniden hesapla
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  const filters = useMemo<FilterDef<Product>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Ürün, marka veya slug ara…",
        searchAccessor: (p) => `${p.name} ${p.brand ?? ""} ${p.slug}`,
      },
      {
        id: "kategori",
        type: "select",
        label: "Kategori",
        options: [
          { value: "", label: "Tüm kategoriler" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ],
        predicate: (p, v) => p.categoryId === v,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: [
          { value: "", label: "Tümü" },
          { value: "aktif", label: "Aktif" },
          { value: "pasif", label: "Pasif" },
        ],
        predicate: (p, v) =>
          v === "aktif" ? p.isActive : v === "pasif" ? !p.isActive : true,
      },
      {
        id: "stok",
        type: "chips",
        label: "Stok",
        options: [
          { value: "", label: "Hepsi" },
          { value: "stokta", label: "Stokta" },
          { value: "dusuk", label: "Düşük" },
          { value: "tukendi", label: "Tükendi" },
        ],
        predicate: (p, v) => {
          if (v === "stokta") return p.stockQuantity > p.lowStockThreshold;
          if (v === "dusuk")
            return p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;
          if (v === "tukendi") return p.stockQuantity === 0;
          return true;
        },
      },
    ],
    [categories],
  );

  const sorts = useMemo<SortDef<Product>[]>(
    () => [
      { id: "isim-az", label: "İsim A→Z", compare: (a, b) => a.name.localeCompare(b.name, "tr") },
      { id: "isim-za", label: "İsim Z→A", compare: (a, b) => b.name.localeCompare(a.name, "tr") },
      { id: "fiyat-artan", label: "Fiyat artan", compare: (a, b) => a.currentPrice - b.currentPrice },
      { id: "fiyat-azalan", label: "Fiyat azalan", compare: (a, b) => b.currentPrice - a.currentPrice },
      { id: "stok-artan", label: "Stok artan", compare: (a, b) => a.stockQuantity - b.stockQuantity },
      { id: "stok-azalan", label: "Stok azalan", compare: (a, b) => b.stockQuantity - a.stockQuantity },
      {
        id: "tarih-yeni",
        label: "Yeni eklenenler",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski eklenenler",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Product>[]>(
    () => [
      {
        id: "activate",
        label: "Aktif yap",
        icon: Eye,
        run: async (rows) => {
          const res = await bulkSetProductActiveAction(rows.map((r) => r.id), true);
          if (res.ok) toast.success(`${res.succeeded} ürün aktif edildi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "deactivate",
        label: "Pasif yap",
        icon: EyeOff,
        run: async (rows) => {
          const res = await bulkSetProductActiveAction(rows.map((r) => r.id), false);
          if (res.ok) toast.success(`${res.succeeded} ürün pasifleştirildi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "delete",
        label: "Sil",
        icon: Trash2,
        variant: "danger",
        confirm: {
          title: "Toplu silme",
          description: (n) => `${n} ürün silinecek. Bu işlem geri alınamaz.`,
          confirmLabel: "Sil",
        },
        run: async (rows) => {
          const res = await bulkDeleteProductsAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} ürün silindi.`);
          else toast.warning(`${res.succeeded} silindi, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Product>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(p) => p.id}
      emptyState={{
        icon: Package,
        title: "Henüz ürün yok",
        description: "Katalogda henüz ürün bulunmuyor. İlk ürünü ekleyerek başla.",
        action: (
          <Link href="/kayhan-yonetim/urunler/yeni">
            <Button size="sm">Yeni Ürün Ekle</Button>
          </Link>
        ),
      }}
      emptyFilteredState={{
        icon: Package,
        title: "Bu kriterde ürün bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/products-table.tsx
git commit -m "feat(admin): ProductsTable (DataTable adapter)"
```

---

## Task 12: Per-route loading & error

`/kayhan-yonetim/urunler` için iskelet ve hata sınırı.

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/urunler/loading.tsx`
- Create: `app/(admin)/kayhan-yonetim/(protected)/urunler/error.tsx`

- [ ] **Step 1: Loading dosyasını oluştur**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/urunler/loading.tsx
import { DataTableSkeleton } from "@/components/admin/data-table/data-table-skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <header>
        <div className="h-7 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-elevated" />
      </header>
      <div className="space-y-3">
        <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-elevated" />
        <div className="flex gap-2">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-elevated" />
          <div className="h-9 w-40 animate-pulse rounded-xl bg-elevated" />
        </div>
      </div>
      <DataTableSkeleton columns={9} />
    </div>
  );
}
```

- [ ] **Step 2: Error dosyasını oluştur**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/urunler/error.tsx
"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Urunler sayfasi hatasi:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ürünler</h1>
      </header>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <p className="text-sm font-semibold text-foreground">Ürünler yüklenirken bir hata oluştu</p>
        <p className="text-sm text-muted">{error.message || "Bilinmeyen hata"}</p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RefreshCcw className="h-4 w-4" strokeWidth={2.2} />
          Yeniden Dene
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/\(protected\)/urunler/loading.tsx app/\(admin\)/kayhan-yonetim/\(protected\)/urunler/error.tsx
git commit -m "feat(admin/urunler): per-route loading + error"
```

---

## Task 13: Ürünler sayfasını DataTable'a taşı

Mevcut `urunler/page.tsx`'i `PageHeader` + `ProductsTable` ile yeniden yaz. Veri çekimi server-side kalır; client'a tüm satırlar verilir.

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/urunler/page.tsx`

- [ ] **Step 1: Sayfa dosyasını yeniden yaz**

`app/(admin)/kayhan-yonetim/(protected)/urunler/page.tsx` içeriğinin **tamamını** şununla değiştir:

```tsx
import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminProductListPage() {
  const [products, categories] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün`}
        action={
          <Link href="/kayhan-yonetim/urunler/yeni">
            <Button size="sm">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Ürün
            </Button>
          </Link>
        }
      />
      <ProductsTable allRows={products} categories={categories} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/\(protected\)/urunler/page.tsx
git commit -m "feat(admin/urunler): DataTable kullanimi (pilot)"
```

---

## Task 14: Uçtan uca manuel smoke testi

Spec'in §4.1 akışını gerçek tarayıcıda doğrula. Bu görev tek başına commit üretmez ama bulduğun her aksaklık ya bir sonraki düzeltme görevini doğurur ya da plan tamamlanmış sayılır.

- [ ] **Step 1: Dev server'ı başlat**

Run:
```
pnpm dev
```
Beklenen: `http://localhost:3000` ayağa kalkar, derleme hatasız.

- [ ] **Step 2: Admin'e giriş yap**

Tarayıcıda `http://localhost:3000/kayhan-yonetim/giris` aç ve mevcut admin hesabıyla giriş yap. Sonra `http://localhost:3000/kayhan-yonetim/urunler` aç.

Beklenen: Liste, eski sayfadakiyle aynı tüm ürünleri gösteriyor; üstte arama kutusu + Kategori dropdown + Durum sekmeleri + Stok chip'leri görünüyor.

- [ ] **Step 3: Arama akışı**

Adımlar:
1. Arama kutusuna mevcut bir ürün adının bir kısmını yaz (ör. "panel").
2. 300ms bekle.

Beklenen:
- Liste sadece eşleşenleri gösterir.
- URL'de `?q=panel` görünür.
- Kutudaki "X" tıklanınca arama sıfırlanır ve `?q` URL'den çıkar.

- [ ] **Step 4: Kategori filtresi**

Adımlar:
1. Kategori dropdown'undan bir kategori seç.

Beklenen:
- URL'de `?kategori=<id>` görünür.
- Liste sadece o kategorideki ürünleri gösterir.
- "Tüm kategoriler" seçilince `?kategori` URL'den çıkar.

- [ ] **Step 5: Durum sekmesi + sayaç**

Adımlar:
1. "Aktif" sekmesine tıkla.

Beklenen:
- URL'de `?durum=aktif`.
- Liste sadece aktif ürünleri gösterir.
- Her sekmenin yanındaki sayaç rozet doğru sayıyı gösterir (Tümü = tüm ürün, Aktif = aktif ürün sayısı, Pasif = pasif ürün sayısı).

- [ ] **Step 6: Stok chip'leri**

Adımlar:
1. "Düşük" chip'ine tıkla.

Beklenen:
- URL'de `?stok=dusuk`.
- Liste sadece 0 < stok ≤ threshold ürünleri gösterir.
- Sayaç rozetleri (Stokta/Düşük/Tükendi) doğru.

- [ ] **Step 7: Kolon sıralama**

Adımlar:
1. "Fiyat" kolon başlığına tıkla. Tekrar tıkla.

Beklenen:
- İlk tıklamada `?siralama=fiyat-artan`, ok ↑ ikonu.
- İkinci tıklamada `?siralama=fiyat-azalan`, ok ↓ ikonu.
- "Stok" ve "Eklenme" kolonları da aynı şekilde davranır.

- [ ] **Step 8: Sayfa değişimi**

Adımlar (≥26 ürün gerekiyor — yoksa demo modda lib/mock veriye geçici ekleme yapabilir veya bu adımı atlayabilirsin):
1. "Sonraki" butonuna tıkla.

Beklenen:
- URL'de `?sayfa=2`.
- "Sayfa 2 / N" gösterimi.
- "Önceki" aktifleşir.

- [ ] **Step 9: URL paylaşımı + tarayıcı geri**

Adımlar:
1. Tüm filtreleri uygulayıp URL'yi kopyala.
2. Yeni sekmede aynı URL'yi aç.
3. Tarayıcı geri butonuyla önceki state'e dön.

Beklenen:
- Yeni sekme aynı görünümü açar.
- Geri butonu URL'yi ve görünümü geri alır.

- [ ] **Step 10: Toplu işlem — aktif/pasif**

Adımlar:
1. 2-3 ürünü checkbox ile seç.
2. Alttaki sticky barda "Pasif yap" tıkla.

Beklenen:
- Toast: "N ürün pasifleştirildi."
- Liste tazelenir, seçim temizlenir, durumlar güncellenir.
- "Aktif" sekme sayacı azalır.

- [ ] **Step 11: Toplu işlem — sil (confirm)**

Adımlar:
1. 1 ürün seç. (Test ürünü olmalı — kalıcı veri silmemek için demo modda yap.)
2. "Sil" tıkla → confirm modal açılır.
3. "Vazgeç" → modal kapanır, ürün silinmez.
4. Tekrar "Sil" → "Sil" onayı.

Beklenen:
- Toast: "1 ürün silindi."
- Ürün listeden gider.

- [ ] **Step 12: Boş (filtreli) durum**

Adımlar:
1. Aramaya hiç eşleşmeyecek bir şey yaz (ör. "xyzasdfqwer").

Beklenen:
- "Bu kriterde ürün bulunamadı" kartı görünür.
- "Filtreleri temizle" butonu çalışır, URL temizlenir, tam liste döner.

- [ ] **Step 13: Eski özelliklerin korunduğunu doğrula**

Adımlar:
1. Bir satırdaki kalem ikonuna (`ProductRowActions`) tıkla → düzenleme sayfası açılır.
2. Liste'ye dön → üç-nokta ikonuna tıkla → "Sil" → tek tek silme çalışır.

Beklenen: İkisi de eskisi gibi çalışır.

- [ ] **Step 14: Diğer admin sayfaları regresyon**

Adımlar:
1. `/kayhan-yonetim` (Panel) aç.
2. `/kayhan-yonetim/teklifler`, `/kayhan-yonetim/siparisler`, `/kayhan-yonetim/kampanyalar` sırayla aç.

Beklenen: Hepsi eskisi gibi çalışır, hata yok.

- [ ] **Step 15: Karanlık tema**

Adımlar:
1. Topbar'daki tema toggle ile karanlık temaya geç.
2. Tüm filtre/sıralama/sayfalama/bulk akışını yeniden gözden geçir (Adım 3-11).

Beklenen: Tüm renkler okunaklı, ok ikonları, chip arka planları, modal kontrast doğru.

- [ ] **Step 16: Mobil (DevTools 375px)**

Adımlar:
1. DevTools'da 375px genişliğe ayarla.
2. Listeyi gez.

Beklenen:
- Kategori/Durum/Eklenme kolonları `hidden md:table-cell` ile gizleniyor.
- Toolbar (arama + filtreler) sığmazsa yatay yumuşak wrap yapıyor.
- Bulk bar sticky kalıyor.

- [ ] **Step 17: Dev server'ı durdur, doğrulama raporu yaz**

`docs/verification/2026-05-12-admin-datatable-urunler-pilot.md` dosyasını oluştur. Her smoke adımının sonucunu (✓/✗ + ekran görüntüsü almasan da gözlem notu) yaz. Atlanan adımları neden atlandığını belirt.

```bash
git add docs/verification/2026-05-12-admin-datatable-urunler-pilot.md
git commit -m "docs: admin datatable pilot verification raporu"
```

- [ ] **Step 18: Son TypeScript + lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

---

## Plan Sonu

Pilot tamamlandığında elinde olacaklar:
- `components/admin/data-table/` altında 9 dosyalık yeniden kullanılabilir aile.
- `components/admin/page-header.tsx` ortak başlık bileşeni.
- `components/admin/products-table.tsx` Ürünler'e özel adaptör (diğer sayfalar için referans).
- `app/(admin)/kayhan-yonetim/actions/products-bulk.ts` toplu işlem server action'ları.
- `urunler/page.tsx` + per-route `loading.tsx` + `error.tsx`.
- `docs/verification/2026-05-12-admin-datatable-urunler-pilot.md` smoke raporu.

Sonraki adım (bu plan dışında): pilot başarılıysa Teklifler/Siparişler/Kampanyalar/Bildirimler/Galeri/Stok Bildirimleri sayfalarına aynı deseni uygulayan ayrı planlar.
