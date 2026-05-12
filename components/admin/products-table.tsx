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
