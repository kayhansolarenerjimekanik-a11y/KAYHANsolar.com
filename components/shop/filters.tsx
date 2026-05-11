"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import type { Category } from "@/types";

interface FiltersState {
  categorySlug: string | null;
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
}

interface FiltersProps {
  categories: Category[];
  allBrands: string[];
  priceRange: [number, number];
  filters: FiltersState;
  onChange: (next: Partial<FiltersState>) => void;
  onReset: () => void;
  resultCount: number;
  className?: string;
}

export function Filters({
  categories,
  allBrands,
  priceRange,
  filters,
  onChange,
  onReset,
  resultCount,
  className,
}: FiltersProps) {
  const [minLimit, maxLimit] = priceRange;
  const activeFilterCount =
    (filters.categorySlug ? 1 : 0) +
    filters.brands.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0);

  return (
    <aside
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Filtreler</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <X className="h-3 w-3" strokeWidth={2.4} />
            Temizle ({activeFilterCount})
          </button>
        )}
      </div>

      <p className="text-xs text-muted">
        {resultCount} ürün listeleniyor
      </p>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Kategori
        </p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onChange({ categorySlug: null })}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              filters.categorySlug === null
                ? "bg-lime-primary text-black"
                : "text-foreground hover:bg-elevated",
            )}
          >
            Tüm Kategoriler
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => onChange({ categorySlug: cat.slug })}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm transition-colors",
                filters.categorySlug === cat.slug
                  ? "bg-lime-primary text-black"
                  : "text-foreground hover:bg-elevated",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Fiyat Aralığı
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={formatPrice(minLimit)}
            value={filters.minPrice ?? ""}
            min={minLimit}
            max={maxLimit}
            onChange={(e) =>
              onChange({
                minPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
          />
          <span className="text-muted">—</span>
          <input
            type="number"
            placeholder={formatPrice(maxLimit)}
            value={filters.maxPrice ?? ""}
            min={minLimit}
            max={maxLimit}
            onChange={(e) =>
              onChange({
                maxPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
          Marka
        </p>
        <div className="flex flex-col gap-1.5">
          {allBrands.map((brand) => {
            const checked = filters.brands.includes(brand);
            return (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    onChange({
                      brands: e.target.checked
                        ? [...filters.brands, brand]
                        : filters.brands.filter((b) => b !== brand),
                    });
                  }}
                  className="h-4 w-4 cursor-pointer accent-lime-primary"
                />
                <span>{brand}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm">
        <span className="font-medium text-foreground">Sadece stokta olanlar</span>
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => onChange({ inStockOnly: e.target.checked })}
          className="h-4 w-4 cursor-pointer accent-lime-primary"
        />
      </label>

      <Button variant="outline" size="sm" onClick={onReset} className="w-full">
        Filtreleri Sıfırla
      </Button>
    </aside>
  );
}

export type { FiltersState };
