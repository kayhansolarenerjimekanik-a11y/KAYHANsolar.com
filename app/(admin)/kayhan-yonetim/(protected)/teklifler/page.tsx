import { Plus } from "lucide-react";
import Link from "next/link";

import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import type { OfferStatus } from "@/lib/data/types";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const TABS: { value: OfferStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "in_review", label: "İnceleniyor" },
  { value: "responded", label: "Yanıtlandı" },
  { value: "closed", label: "Kapalı" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.status as OfferStatus | undefined) ?? undefined;
  const all = await repo.listOffers();
  const filtered =
    filterStatus && TABS.some((t) => t.value === filterStatus)
      ? all.filter((o) => o.status === filterStatus)
      : all;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teklifler</h1>
          <p className="mt-1 text-sm text-muted">{all.length} toplam</p>
        </div>
        <Link href="/kayhan-yonetim/teklifler/yeni">
          <Button size="sm" variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Teklif
          </Button>
        </Link>
      </header>

      <nav
        aria-label="Durum filtresi"
        className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-elevated p-1"
      >
        {TABS.map((t) => {
          const isActive =
            (t.value === "all" && !filterStatus) || filterStatus === t.value;
          const count =
            t.value === "all" ? all.length : all.filter((o) => o.status === t.value).length;
          return (
            <Link
              key={t.value}
              href={
                t.value === "all"
                  ? "/kayhan-yonetim/teklifler"
                  : `/kayhan-yonetim/teklifler?status=${t.value}`
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-lime-primary text-black"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-black/10 px-1.5 text-[10px] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Bu kriterde teklif yok.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Müşteri</TH>
              <TH className="hidden md:table-cell">Konum</TH>
              <TH className="hidden md:table-cell">Yer</TH>
              <TH>Durum</TH>
              <TH className="hidden sm:table-cell">Tarih</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Link
                    href={`/kayhan-yonetim/teklifler/${o.id}`}
                    className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
                  >
                    {o.fullName}
                  </Link>
                  <p className="text-xs text-subtle">{o.phone}</p>
                </TD>
                <TD className="hidden md:table-cell text-muted">
                  {o.city} / {o.district}
                </TD>
                <TD className="hidden md:table-cell text-muted">
                  {o.installationLocation === "roof"
                    ? "Çatı"
                    : o.installationLocation === "land"
                      ? "Arazi"
                      : "Diğer"}
                </TD>
                <TD>
                  <OfferStatusPill status={o.status} />
                </TD>
                <TD className="hidden sm:table-cell text-xs text-subtle">
                  {formatDate(o.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
