// app/(admin)/kayhan-yonetim/(protected)/kampanyalar/page.tsx
import { Plus } from "lucide-react";
import Link from "next/link";

import { CampaignsTable } from "@/components/admin/campaigns-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminCampaignsPage() {
  const campaigns = await repo.listCampaigns();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kampanyalar"
        subtitle={`${campaigns.length} kampanya`}
        action={
          <Link href="/kayhan-yonetim/kampanyalar/yeni">
            <Button size="sm">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Kampanya
            </Button>
          </Link>
        }
      />
      <CampaignsTable allRows={campaigns} />
    </div>
  );
}
