import { ArrowRight, Sparkles, Sun, Zap } from "lucide-react";
import Link from "next/link";

import { CampaignSlider } from "@/components/home/campaign-slider";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedProducts } from "@/components/home/featured-products";
import { GalleryShowcase } from "@/components/home/gallery-showcase";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const trustItems = [
  {
    icon: Sun,
    title: "Anahtar Teslim Kurulum",
    description:
      "Saha ölçümünden devreye almaya kadar tek elden profesyonel kurulum.",
  },
  {
    icon: Zap,
    title: "Yüksek Verim Bileşenler",
    description:
      "Yalnızca sertifikalı, garantili paneller, inverterler ve bataryalar.",
  },
  {
    icon: Sparkles,
    title: "7/24 Teknik Destek",
    description:
      "Sistem performansını izliyor, sorulara aynı gün dönüş yapıyoruz.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -top-32 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-lime-primary/20 blur-3xl" />
          <div className="absolute inset-0 grain opacity-50" />
        </div>

        <Container className="flex min-h-[78vh] flex-col items-start justify-center gap-8 py-20 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
            Demo — KAYHAN Solar deneyim sürümü
          </span>

          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Güneşin Gücü,{" "}
            <span className="bg-gradient-to-br from-lime-primary to-lime-dark bg-clip-text text-transparent">
              Senin Kontrolünde
            </span>
          </h1>

          <p className="max-w-2xl text-balance text-lg leading-relaxed text-muted">
            Konut, tarım ve işletme için anahtar teslim güneş enerjisi
            sistemleri. Ücretsiz keşif, şeffaf fiyatlandırma ve uzun ömürlü
            ekipman garantisi.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teklif-al">
              <Button size="lg" variant="primary">
                Ücretsiz Teklif Al
                <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
              </Button>
            </Link>
            <Link href="/magaza">
              <Button size="lg" variant="secondary">
                Mağazaya Git
              </Button>
            </Link>
          </div>

          <div className="mt-6 grid w-full grid-cols-2 gap-4 sm:max-w-xl sm:grid-cols-3">
            {[
              { value: "500+", label: "Tamamlanan Sistem" },
              { value: "12 yıl", label: "Sektör Deneyimi" },
              { value: "%21+", label: "Panel Verimliliği" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-surface/40 p-4 backdrop-blur"
              >
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CampaignSlider />

      <CategoryGrid />

      <GalleryShowcase />

      <FeaturedProducts />

      <section className="border-t border-border">
        <Container className="py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Neden KAYHAN Solar?
            </h2>
            <p className="mt-4 text-muted">
              Yatırımınızın 25+ yıllık verim ürettiğinden emin olmak için her
              kademede teknik özen.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {trustItems.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 transition-colors hover:border-lime-primary"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border">
        <Container className="py-20">
          <div className="glass rounded-3xl p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Bize Söyleyin, Biz Hesaplayalım
                </h2>
                <p className="mt-4 max-w-xl text-muted">
                  Kullandığınız cihazları ve kurulum yerinizi paylaşın. Kaç
                  panel, hangi inverter ve batarya gerektiğini detaylı bir
                  teklif ile size sunalım.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/teklif-al">
                    <Button size="lg">
                      Teklif Formunu Aç
                      <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                    </Button>
                  </Link>
                  <Link href="/galeri">
                    <Button size="lg" variant="outline">
                      Kurulumlarımızı Gör
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                {[
                  "Bağımsız olarak çalışan off-grid sistemler",
                  "Şebekeye satış yapan on-grid çözümler",
                  "Tarımsal sulama için özel paketler",
                  "Konut için 5–15 kW anahtar teslim sistemler",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-border bg-surface/40 px-3 py-3"
                  >
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-lime-primary" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
