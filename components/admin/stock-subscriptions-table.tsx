// components/admin/stock-subscriptions-table.tsx
"use client";

import { Bell, BellRing, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  bulkDeleteStockSubscriptionsAction,
  bulkMarkStockNotifiedAction,
} from "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk";
import { Badge } from "@/components/ui/badge";
import type { StockSubscription } from "@/lib/data/types";
import type { Product } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: StockSubscription[];
  productById: Record<string, Product | undefined>;
}

export function StockSubscriptionsTable({ allRows, productById }: Props) {
  const productName = (id: string) => productById[id]?.name ?? "Bilinmeyen ürün";
  const productSlug = (id: string) => productById[id]?.slug ?? "";

  const columns = useMemo<ColumnDef<StockSubscription>[]>(
    () => [
      {
        id: "product",
        header: "Ürün",
        cell: (s) => {
          const slug = productSlug(s.productId);
          const label = productName(s.productId);
          return slug ? (
            <Link
              href={`/urun/${slug}`}
              className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
            >
              {label}
            </Link>
          ) : (
            <span className="font-medium">{label}</span>
          );
        },
      },
      {
        id: "channel",
        header: "Kanal",
        className: "text-muted",
        cell: (s) =>
          s.email ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
              {s.email}
            </span>
          ) : s.pushSubscriptionJson ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <BellRing className="h-3.5 w-3.5" strokeWidth={2.2} />
              Web Push
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "status",
        header: "Durum",
        cell: (s) =>
          s.isNotified ? (
            <Badge tone="success">Gönderildi</Badge>
          ) : (
            <Badge tone="warning">Bekliyor</Badge>
          ),
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (s) => fmt(s.createdAt),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productById],
  );

  const filters = useMemo<FilterDef<StockSubscription>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Ürün adı veya e-posta ara…",
        searchAccessor: (s) => `${productName(s.productId)} ${s.email ?? ""}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: [
          { value: "", label: "Tümü" },
          { value: "bekliyor", label: "Bekliyor" },
          { value: "gonderildi", label: "Gönderildi" },
        ],
        predicate: (s, v) =>
          v === "bekliyor" ? !s.isNotified : v === "gonderildi" ? s.isNotified : true,
      },
      {
        id: "kanal",
        type: "chips",
        label: "Kanal",
        options: [
          { value: "", label: "Hepsi" },
          { value: "email", label: "E-posta" },
          { value: "push", label: "Web Push" },
        ],
        predicate: (s, v) =>
          v === "email" ? Boolean(s.email) : v === "push" ? Boolean(s.pushSubscriptionJson) : true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productById],
  );

  const sorts = useMemo<SortDef<StockSubscription>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni abonelikler",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski abonelikler",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<StockSubscription>[]>(
    () => [
      {
        id: "mark-notified",
        label: "Gönderildi işaretle",
        icon: Bell,
        run: async (rows) => {
          const res = await bulkMarkStockNotifiedAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} abonelik gönderildi olarak işaretlendi.`);
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
          description: (n) => `${n} abonelik silinecek. Bu işlem geri alınamaz.`,
          confirmLabel: "Sil",
        },
        run: async (rows) => {
          const res = await bulkDeleteStockSubscriptionsAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} abonelik silindi.`);
          else toast.warning(`${res.succeeded} silindi, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<StockSubscription>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(s) => s.id}
      emptyState={{
        icon: Bell,
        title: "Henüz abonelik yok",
        description: "Müşteri ürün sayfasından 'Stoğa girince haber ver' tıklayınca burada listelenir.",
      }}
      emptyFilteredState={{
        icon: Bell,
        title: "Bu kriterde abonelik bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
