import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

import { CampaignSliderClient, type SlideData } from "./campaign-slider-client";

const MAX_SLIDES = 5;
const DEFAULT_CTA = "Detayları Gör";

export async function CampaignSlider() {
  const [campaigns, products, categories] = await Promise.all([
    repo.listCampaigns(),
    repo.listProducts(),
    repo.listCategories({ onlyActive: true }),
  ]);

  const eligible = campaigns
    .filter((c) => c.isActive && c.displayOnHomepage && c.coverImageUrl)
    .sort((a, b) => b.displayPriority - a.displayPriority)
    .slice(0, MAX_SLIDES);

  if (eligible.length === 0) return null;

  const slides: SlideData[] = eligible.map((c) => {
    let href = `/magaza?kampanya=${c.slug}`;
    if (c.applicableTo === "product" && c.targetIds.length === 1) {
      const p = products.find((p) => p.id === c.targetIds[0]);
      if (p) href = `/urun/${p.slug}`;
    } else if (c.applicableTo === "category" && c.targetIds.length === 1) {
      const cat = categories.find((cat) => cat.id === c.targetIds[0]);
      if (cat) href = `/magaza?kategori=${cat.slug}&kampanya=${c.slug}`;
    }

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      coverImageUrl: c.coverImageUrl!,
      href,
      ctaLabel: c.ctaLabel || DEFAULT_CTA,
      ctaSecondaryLabel: c.ctaSecondaryLabel,
    };
  });

  return (
    <section className="border-t border-border bg-elevated/30">
      <Container className="py-10 lg:py-14">
        <CampaignSliderClient slides={slides} />
      </Container>
    </section>
  );
}
