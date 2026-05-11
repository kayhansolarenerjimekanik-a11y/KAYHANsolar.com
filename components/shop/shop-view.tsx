"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Filters, type FiltersState } from "@/components/shop/filters";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mockCategories, mockProducts } from "@/lib/mock/data";

type SortOption = "yeni" | "fiyat-artan" | "fiyat-azalan";

const sortLabels: Record<SortOption, string> = {
  yeni: "Yeni Gelenler",
  "fiyat-artan": "Fiyat: Artan",
  "fiyat-azalan": "Fiyat: Azalan",
};

export function ShopView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const allBrands = useMemo(
    () => Array.from(new Set(mockProducts.map((p) => p.brand).filter(Boolean) as string[])).sort(),
    [],
  );

  const priceRange = useMemo<[number, number]>(() => {
    const prices = mockProducts.map((p) => p.currentPrice);
    return [Math.min(...prices), Math.max(...prices)];
  }, []);

  const filters: FiltersState = useMemo(() => {
    const brandsParam = searchParams.get("markalar");
    return {
      categorySlug: searchParams.get("kategori"),
      brands: brandsParam ? brandsParam.split(",").filter(Boolean) : [],
      minPrice: searchParams.get("min")
        ? Number(searchParams.get("min"))
        : null,
      maxPrice: searchParams.get("max")
        ? Number(searchParams.get("max"))
        : null,
      inStockOnly: searchParams.get("stokta") === "1",
    };
  }, [searchParams]);

  const sortBy: SortOption =
    (searchParams.get("siralama") as SortOption) || "yeni";
  const query = searchParams.get("q") || "";

  const updateUrl = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      updater(params);
      const qs = params.toString();
      router.replace(qs ? `/magaza?${qs}` : "/magaza", { scroll: false });
    },
    [router, searchParams],
  );

  const handleFilterChange = useCallback(
    (next: Partial<FiltersState>) => {
      updateUrl((p) => {
        if ("categorySlug" in next) {
          if (next.categorySlug) p.set("kategori", next.categorySlug);
          else p.delete("kategori");
        }
        if ("brands" in next) {
          if (next.brands && next.brands.length > 0)
            p.set("markalar", next.brands.join(","));
          else p.delete("markalar");
        }
        if ("minPrice" in next) {
          if (next.minPrice !== null && next.minPrice !== undefined)
            p.set("min", String(next.minPrice));
          else p.delete("min");
        }
        if ("maxPrice" in next) {
          if (next.maxPrice !== null && next.maxPrice !== undefined)
            p.set("max", String(next.maxPrice));
          else p.delete("max");
        }
        if ("inStockOnly" in next) {
          if (next.inStockOnly) p.set("stokta", "1");
          else p.delete("stokta");
        }
      });
    },
    [updateUrl],
  );

  const handleReset = useCallback(() => {
    router.replace("/magaza", { scroll: false });
  }, [router]);

  const handleSearchChange = useCallback(
    (value: string) => {
      updateUrl((p) => {
        if (value.trim()) p.set("q", value);
        else p.delete("q");
      });
    },
    [updateUrl],
  );

  const handleSortChange = useCallback(
    (value: SortOption) => {
      updateUrl((p) => {
        if (value !== "yeni") p.set("siralama", value);
        else p.delete("siralama");
      });
    },
    [updateUrl],
  );

  const filtered = useMemo(() => {
    let list = [...mockProducts];

    if (filters.categorySlug) {
      const cat = mockCategories.find((c) => c.slug === filters.categorySlug);
      if (cat) list = list.filter((p) => p.categoryId === cat.id);
    }
    if (filters.brands.length > 0) {
      list = list.filter((p) => p.brand && filters.brands.includes(p.brand));
    }
    if (filters.minPrice !== null) {
      list = list.filter((p) => p.currentPrice >= filters.minPrice!);
    }
    if (filters.maxPrice !== null) {
      list = list.filter((p) => p.currentPrice <= filters.maxPrice!);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.stockQuantity > 0);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q),
      );
    }

    if (sortBy === "fiyat-artan") list.sort((a, b) => a.currentPrice - b.currentPrice);
    else if (sortBy === "fiyat-azalan") list.sort((a, b) => b.currentPrice - a.currentPrice);
    else list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

    return list;
  }, [filters, query, sortBy]);

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  return (
    <Container className="py-10 lg:py-14">
      <header className="flex flex-col gap-2 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Mağaza
        </h1>
        <p className="text-muted">
          Güneş enerjisi sistemleri için panel, batarya, inverter ve hazır
          paket çözümler.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-72 shrink-0 lg:block">
          <Filters
            categories={mockCategories}
            allBrands={allBrands}
            priceRange={priceRange}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
            resultCount={filtered.length}
          />
        </div>

        <div className="flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                strokeWidth={2.2}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Ürün ara..."
                className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.2} />
                Filtreler
              </Button>

              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-lime-primary focus:outline-none"
              >
                {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                  <option key={key} value={key}>
                    {sortLabels[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            {filtered.length} ürün listeleniyor
          </p>

          {filtered.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="text-base font-semibold">Sonuç bulunamadı</p>
              <p className="max-w-md text-sm text-muted">
                Aradığınız kriterlere uygun ürün yok. Filtreleri sıfırlayıp
                tekrar deneyin.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Filtreleri Sıfırla
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">
                Filtreler
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Kapat"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
            <Filters
              categories={mockCategories}
              allBrands={allBrands}
              priceRange={priceRange}
              filters={filters}
              onChange={handleFilterChange}
              onReset={() => {
                handleReset();
                setMobileFiltersOpen(false);
              }}
              resultCount={filtered.length}
            />
          </div>
        </div>
      )}
    </Container>
  );
}
