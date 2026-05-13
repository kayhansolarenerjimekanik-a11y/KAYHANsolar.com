// app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OffersTable } from "@/components/admin/offers-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

interface Props {
  searchParams: Promise<{ status?: string; durum?: string }>;
}

// Eski ?status= linkleri ?durum='a yonlendirilir. Allowlist guvenlik gerekcesi:
// rastgele/zararli deger redirect URL'ine inject edilmesin.
const VALID_OFFER_STATUSES = new Set(["new", "in_review", "responded", "closed"]);

export default async function AdminOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  if (params.status && !params.durum) {
    const safe = VALID_OFFER_STATUSES.has(params.status) ? params.status : "";
    const target = safe
      ? `/kayhan-yonetim/teklifler?durum=${encodeURIComponent(safe)}`
      : `/kayhan-yonetim/teklifler`;
    redirect(target);
  }

  const offers = await repo.listOffers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teklifler"
        subtitle={`${offers.length} toplam`}
        action={
          <Link href="/kayhan-yonetim/teklifler/yeni">
            <Button size="sm" variant="primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Teklif
            </Button>
          </Link>
        }
      />
      <OffersTable allRows={offers} />
    </div>
  );
}
