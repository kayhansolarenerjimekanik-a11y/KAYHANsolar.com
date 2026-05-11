import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { CampaignForm } from "@/components/admin/campaign-form";
import { repo } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: Props) {
  const { id } = await params;
  const [campaign, categories] = await Promise.all([
    repo.getCampaignById(id),
    repo.listCategories(),
  ]);
  if (!campaign) notFound();

  const boundUpdate = updateCampaignAction.bind(null, id);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/kampanyalar" className="text-xs text-muted hover:text-foreground">
          ← Kampanyalara dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Kampanyayı Düzenle
        </h1>
      </header>
      <CampaignForm
        initial={campaign}
        categories={categories}
        action={boundUpdate}
        submitLabel="Değişiklikleri Kaydet"
      />
    </div>
  );
}
