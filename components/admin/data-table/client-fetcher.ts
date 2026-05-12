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

    // Filtre alanlari (tabs / chips / select)
    for (const f of config.filters) {
      if (f.type === "search") continue;
      const v = state.filters[f.id];
      if (!v || !f.predicate) continue;
      working = working.filter((row) => f.predicate!(row, v));
    }

    const total = working.length;

    // Siralama
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
