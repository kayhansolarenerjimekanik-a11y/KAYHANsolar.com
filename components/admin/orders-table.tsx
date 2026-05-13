// components/admin/orders-table.tsx
"use client";

import { CheckCircle2, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { bulkSetOrderStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/orders-bulk";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import type { Order, OrderItem } from "@/lib/data/types";
import { formatPrice } from "@/lib/utils";
import type { Campaign } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "Tüm durumlar" },
  { value: "pending", label: "Beklemede" },
  { value: "whatsapp_sent", label: "WhatsApp Gönderildi" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "preparing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargolandı" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal" },
];

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: Order[];
  campaigns: Campaign[];
}

export function OrdersTable({ allRows, campaigns }: Props) {
  const campaignTitleById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.title])),
    [campaigns],
  );

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "orderNumber",
        header: "Sipariş No",
        sortable: true,
        className: "font-mono text-xs",
        cell: (o) => o.orderNumber,
      },
      {
        id: "customer",
        header: "Müşteri",
        cell: (o) => (
          <>
            <p className="font-medium">{o.customerName}</p>
            <p className="text-xs text-subtle">{o.customerPhone}</p>
          </>
        ),
      },
      {
        id: "items",
        header: "Adet",
        className: "hidden md:table-cell text-muted",
        cell: (o) =>
          `${o.items.reduce((s: number, i: OrderItem) => s + i.quantity, 0)} ürün`,
      },
      {
        id: "toplam",
        header: "Toplam",
        sortable: true,
        align: "right",
        className: "tabular-nums",
        cell: (o) => (
          <>
            {formatPrice(o.total)}
            {o.discountAmount > 0 && (
              <p className="text-xs font-medium text-success">
                −{formatPrice(o.discountAmount)}
                {o.appliedCampaignIds.length > 0 && (
                  <span className="ml-1 text-subtle">
                    (
                    {o.appliedCampaignIds
                      .map((id: string) => campaignTitleById.get(id) ?? "kampanya")
                      .join(", ")}
                    )
                  </span>
                )}
              </p>
            )}
          </>
        ),
      },
      {
        id: "status",
        header: "Durum",
        className: "w-44",
        cell: (o) => <OrderStatusControl orderId={o.id} current={o.status} />,
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (o) => fmt(o.createdAt),
      },
    ],
    [campaignTitleById],
  );

  const filters = useMemo<FilterDef<Order>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Sipariş no, müşteri veya telefon ara…",
        searchAccessor: (o) =>
          `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.customerEmail ?? ""}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: STATUS_OPTIONS,
        predicate: (o, v) => o.status === v,
      },
    ],
    [],
  );

  const sorts = useMemo<SortDef<Order>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni siparişler",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski siparişler",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
      {
        id: "toplam-azalan",
        label: "Toplam azalan",
        compare: (a, b) => b.total - a.total,
      },
      {
        id: "toplam-artan",
        label: "Toplam artan",
        compare: (a, b) => a.total - b.total,
      },
      {
        id: "orderNumber-az",
        label: "Sipariş no A→Z",
        compare: (a, b) => a.orderNumber.localeCompare(b.orderNumber, "tr"),
      },
      {
        id: "orderNumber-za",
        label: "Sipariş no Z→A",
        compare: (a, b) => b.orderNumber.localeCompare(a.orderNumber, "tr"),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Order>[]>(
    () => [
      {
        id: "confirm",
        label: "Onaylandı yap",
        icon: CheckCircle2,
        run: async (rows) => {
          const res = await bulkSetOrderStatusAction(
            rows.map((r) => r.id),
            "confirmed",
          );
          if (res.ok) toast.success(`${res.succeeded} sipariş onaylandı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "ship",
        label: "Kargolandı yap",
        icon: Truck,
        run: async (rows) => {
          const res = await bulkSetOrderStatusAction(
            rows.map((r) => r.id),
            "shipped",
          );
          if (res.ok) toast.success(`${res.succeeded} sipariş kargolandı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Order>
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
        icon: CheckCircle2,
        title: "Henüz sipariş yok",
        description: "Müşteri sepetinden sipariş geldiğinde burada listelenir.",
      }}
      emptyFilteredState={{
        icon: CheckCircle2,
        title: "Bu kriterde sipariş bulunamadı",
        description: "Arama veya filtreyi değiştirip tekrar dene.",
        action: (
          <Link
            href="/kayhan-yonetim/siparisler"
            className="text-xs font-medium text-lime-dark hover:underline dark:text-lime-primary"
          >
            Tümünü göster
          </Link>
        ),
      }}
    />
  );
}
