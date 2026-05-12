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
