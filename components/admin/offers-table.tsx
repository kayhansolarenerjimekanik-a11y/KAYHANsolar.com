// components/admin/offers-table.tsx
"use client";

import { Eye, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { bulkSetOfferStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/offers-bulk";
import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import type { Offer } from "@/lib/data/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "in_review", label: "İnceleniyor" },
  { value: "responded", label: "Yanıtlandı" },
  { value: "closed", label: "Kapalı" },
];

const LOCATION_LABEL: Record<string, string> = {
  roof: "Çatı",
  land: "Arazi",
  other: "Diğer",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: Offer[];
}

export function OffersTable({ allRows }: Props) {
  const columns = useMemo<ColumnDef<Offer>[]>(
    () => [
      {
        id: "customer",
        header: "Müşteri",
        cell: (o) => (
          <>
            <Link
              href={`/kayhan-yonetim/teklifler/${o.id}`}
              className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
            >
              {o.fullName}
            </Link>
            <p className="text-xs text-subtle">{o.phone}</p>
          </>
        ),
      },
      {
        id: "konum",
        header: "Konum",
        className: "hidden md:table-cell text-muted",
        cell: (o) => `${o.city} / ${o.district}`,
      },
      {
        id: "yer",
        header: "Yer",
        className: "hidden md:table-cell text-muted",
        cell: (o) => LOCATION_LABEL[o.installationLocation] ?? "—",
      },
      {
        id: "status",
        header: "Durum",
        cell: (o) => <OfferStatusPill status={o.status} />,
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (o) => fmt(o.createdAt),
      },
    ],
    [],
  );

  const filters = useMemo<FilterDef<Offer>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "İsim, telefon, e-posta veya il/ilçe ara…",
        searchAccessor: (o) =>
          `${o.fullName} ${o.phone} ${o.email ?? ""} ${o.city} ${o.district}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: STATUS_OPTIONS,
        predicate: (o, v) => o.status === v,
      },
      {
        id: "yer",
        type: "chips",
        label: "Kurulum yeri",
        options: [
          { value: "", label: "Hepsi" },
          { value: "roof", label: "Çatı" },
          { value: "land", label: "Arazi" },
          { value: "other", label: "Diğer" },
        ],
        predicate: (o, v) => o.installationLocation === v,
      },
    ],
    [],
  );

  const sorts = useMemo<SortDef<Offer>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni başvurular",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski başvurular",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Offer>[]>(
    () => [
      {
        id: "in_review",
        label: "İnceleniyor yap",
        icon: Eye,
        run: async (rows) => {
          const res = await bulkSetOfferStatusAction(
            rows.map((r) => r.id),
            "in_review",
          );
          if (res.ok) toast.success(`${res.succeeded} teklif incelemeye alındı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "closed",
        label: "Kapat",
        icon: FileText,
        run: async (rows) => {
          const res = await bulkSetOfferStatusAction(
            rows.map((r) => r.id),
            "closed",
          );
          if (res.ok) toast.success(`${res.succeeded} teklif kapatıldı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Offer>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(o) => o.id}
      emptyState={{
        icon: FileText,
        title: "Henüz teklif yok",
        description: "Müşteri teklif formu doldurduğunda burada listelenir.",
      }}
      emptyFilteredState={{
        icon: FileText,
        title: "Bu kriterde teklif bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
