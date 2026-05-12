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
  allRows: T[];
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
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
      const allSelected = rows.length > 0 && rows.every((r) => prev.has(getRowId(r)));
      const next = new Set(prev);
      if (allSelected) {
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
