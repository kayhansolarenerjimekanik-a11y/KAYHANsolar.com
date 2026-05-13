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

export default async function AdminOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  // Geriye uyum: eski ?status=... linkleri ?durum=...'a yonlendir.
  if (params.status && !params.durum) {
    redirect(`/kayhan-yonetim/teklifler?durum=${params.status}`);
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
