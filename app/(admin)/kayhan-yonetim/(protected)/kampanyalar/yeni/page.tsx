import Link from "next/link";

import { createCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { CampaignForm } from "@/components/admin/campaign-form";
import { repo } from "@/lib/data";

export default async function NewCampaignPage() {
  const categories = await repo.listCategories();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/kampanyalar" className="text-xs text-muted hover:text-foreground">
          ← Kampanyalara dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Yeni Kampanya</h1>
      </header>
      <CampaignForm categories={categories} action={createCampaignAction} submitLabel="Kampanyayı Kaydet" />
    </div>
  );
}
