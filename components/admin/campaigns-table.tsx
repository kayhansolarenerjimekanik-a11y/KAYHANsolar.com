// components/admin/campaigns-table.tsx
"use client";

import { Eye, EyeOff, Megaphone, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  bulkDeleteCampaignsAction,
  bulkSetCampaignActiveAction,
} from "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk";
import { CampaignRowActions } from "@/components/admin/campaign-row-actions";
import { Badge } from "@/components/ui/badge";
import type { Campaign } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

interface Props {
  allRows: Campaign[];
}

export function CampaignsTable({ allRows }: Props) {
  const ruleTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of allRows) set.add(c.ruleType);
    return Array.from(set).sort();
  }, [allRows]);

  const columns = useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        id: "title",
        header: "Başlık",
        sortable: true,
        className: "font-medium",
        cell: (c) => c.title,
      },
      {
        id: "slug",
        header: "Slug",
        className: "hidden md:table-cell text-muted",
        cell: (c) => `/${c.slug}`,
      },
      {
        id: "ruleType",
        header: "Kural",
        className: "hidden md:table-cell text-muted",
        cell: (c) => c.ruleType,
      },
      {
        id: "status",
        header: "Durum",
        cell: (c) =>
          c.isActive ? <Badge tone="success">Aktif</Badge> : <Badge>Pasif</Badge>,
      },
      {
        id: "homepage",
        header: "Anasayfa",
        className: "hidden sm:table-cell",
        cell: (c) =>
          c.displayOnHomepage ? <Badge tone="lime">Evet</Badge> : <Badge>Hayır</Badge>,
      },
      {
        id: "actions",
        header: "İşlem",
        className: "w-32 text-right",
        cell: (c) => <CampaignRowActions id={c.id} title={c.title} />,
      },
    ],
    [],
  );

  const filters = useMemo<FilterDef<Campaign>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Başlık veya slug ara…",
        searchAccessor: (c) => `${c.title} ${c.slug}`,
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
        predicate: (c, v) =>
          v === "aktif" ? c.isActive : v === "pasif" ? !c.isActive : true,
      },
      {
        id: "anasayfa",
        type: "chips",
        label: "Anasayfa",
        options: [
          { value: "", label: "Hepsi" },
          { value: "evet", label: "Anasayfada" },
          { value: "hayir", label: "Anasayfada değil" },
        ],
        predicate: (c, v) =>
          v === "evet" ? c.displayOnHomepage : v === "hayir" ? !c.displayOnHomepage : true,
      },
      {
        id: "kural",
        type: "select",
        label: "Kural tipi",
        options: [
          { value: "", label: "Tüm kurallar" },
          ...ruleTypes.map((r) => ({ value: r, label: r })),
        ],
        predicate: (c, v) => c.ruleType === v,
      },
    ],
    [ruleTypes],
  );

  const sorts = useMemo<SortDef<Campaign>[]>(
    () => [
      {
        id: "title-az",
        label: "Başlık A→Z",
        compare: (a, b) => a.title.localeCompare(b.title, "tr"),
      },
      {
        id: "title-za",
        label: "Başlık Z→A",
        compare: (a, b) => b.title.localeCompare(a.title, "tr"),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Campaign>[]>(
    () => [
      {
        id: "activate",
        label: "Aktif yap",
        icon: Eye,
        run: async (rows) => {
          const res = await bulkSetCampaignActiveAction(rows.map((r) => r.id), true);
          if (res.ok) toast.success(`${res.succeeded} kampanya aktif edildi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "deactivate",
        label: "Pasif yap",
        icon: EyeOff,
        run: async (rows) => {
          const res = await bulkSetCampaignActiveAction(rows.map((r) => r.id), false);
          if (res.ok) toast.success(`${res.succeeded} kampanya pasifleştirildi.`);
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
          description: (n) => `${n} kampanya silinecek. Bu işlem geri alınamaz.`,
          confirmLabel: "Sil",
        },
        run: async (rows) => {
          const res = await bulkDeleteCampaignsAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} kampanya silindi.`);
          else toast.warning(`${res.succeeded} silindi, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Campaign>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="title-az"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(c) => c.id}
      emptyState={{
        icon: Megaphone,
        title: "Henüz kampanya yok",
        description: "İlk kampanyayı ekleyerek mağazada görünür hale getir.",
      }}
      emptyFilteredState={{
        icon: Megaphone,
        title: "Bu kriterde kampanya bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
