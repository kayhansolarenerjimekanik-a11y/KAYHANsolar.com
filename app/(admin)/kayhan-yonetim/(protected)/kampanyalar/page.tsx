import { Plus } from "lucide-react";
import Link from "next/link";

import { CampaignRowActions } from "@/components/admin/campaign-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";

export default async function AdminCampaignsPage() {
  const campaigns = await repo.listCampaigns();
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampanyalar</h1>
          <p className="mt-1 text-sm text-muted">{campaigns.length} kampanya</p>
        </div>
        <Link href="/kayhan-yonetim/kampanyalar/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Kampanya
          </Button>
        </Link>
      </header>

      <Table>
        <THead>
          <TR>
            <TH>Başlık</TH>
            <TH className="hidden md:table-cell">Slug</TH>
            <TH className="hidden md:table-cell">Kural</TH>
            <TH>Durum</TH>
            <TH className="hidden sm:table-cell">Anasayfa</TH>
            <TH className="w-32 text-right">İşlem</TH>
          </TR>
        </THead>
        <TBody>
          {campaigns.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium">{c.title}</TD>
              <TD className="hidden md:table-cell text-muted">/{c.slug}</TD>
              <TD className="hidden md:table-cell text-muted">{c.ruleType}</TD>
              <TD>
                {c.isActive ? <Badge tone="success">Aktif</Badge> : <Badge>Pasif</Badge>}
              </TD>
              <TD className="hidden sm:table-cell">
                {c.displayOnHomepage ? <Badge tone="lime">Evet</Badge> : <Badge>Hayır</Badge>}
              </TD>
              <TD>
                <CampaignRowActions id={c.id} title={c.title} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
