import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

export async function CampaignStrip() {
  const [campaigns, products, categories] = await Promise.all([
    repo.listCampaigns(),
    repo.listProducts(),
    repo.listCategories(),
  ]);
  const active = campaigns.filter((c) => c.isActive && c.displayOnHomepage);
  if (active.length === 0) return null;

  function targetHref(c: (typeof active)[number]): string {
    if (c.applicableTo === "product" && c.targetIds.length === 1) {
      const p = products.find((p) => p.id === c.targetIds[0]);
      if (p) return `/urun/${p.slug}`;
    }
    if (c.applicableTo === "category" && c.targetIds.length === 1) {
      const cat = categories.find((cat) => cat.id === c.targetIds[0]);
      if (cat) return `/magaza?kategori=${cat.slug}&kampanya=${c.slug}`;
    }
    return `/magaza?kampanya=${c.slug}`;
  }

  return (
    <section className="border-t border-border bg-elevated">
      <Container className="py-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Sparkles className="h-4 w-4 text-lime-primary" strokeWidth={2.2} />
            Güncel Kampanyalar
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {active.map((campaign) => (
              <Link
                key={campaign.id}
                href={targetHref(campaign)}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-lime-primary hover:shadow-lg hover:shadow-lime-primary/10"
              >
                <div className="flex-1">
                  <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                    {campaign.title}
                  </h3>
                  {campaign.description && (
                    <p className="mt-1 text-xs text-muted">{campaign.description}</p>
                  )}
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-foreground"
                  strokeWidth={2.2}
                />
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
