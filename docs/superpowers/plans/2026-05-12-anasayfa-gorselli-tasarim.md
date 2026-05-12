# Anasayfa Görselli Tasarım Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KAYHAN Solar anasayfasını görselli zenginleştir — eski metin-tabanlı `CampaignStrip` yerine tam genişlik kampanya slider'ı ve mi.com tarzı bento düzenli galeri showcase bölümü ekle. Admin tarafında kampanya formuna 3 yeni görsel alanı tanıt.

**Architecture:** Mevcut hero ve "Öne Çıkan Ürünler" grid'i dokunulmaz. Yeni iki bölüm server component olarak veri çeker (client interaktivitesi sadece slider için ayrı dosyada). Campaign tablosu 3 yeni opsiyonel kolonla genişler (`cover_image_url`, `cta_label`, `cta_secondary_label`). Tip, mapper, mock data, zod validation ve admin form senkronize güncellenir.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind 4, Supabase (Postgres + RLS), pnpm, Windows + PowerShell. `next/image` görseller için (picsum.photos `next.config.ts:9`'da kayıtlı).

**Referans spec:** `docs/superpowers/specs/2026-05-12-anasayfa-gorselli-tasarim-design.md`

---

## File Structure

**Yeni dosyalar:**
- `supabase/migrations/20260512_005_campaign_visuals.sql` — yeni kolonlar
- `components/home/campaign-slider.tsx` — server component, veri çeker
- `components/home/campaign-slider-client.tsx` — client component, auto-play + nav
- `components/home/gallery-showcase.tsx` — server component, bento grid

**Değişen dosyalar:**
- `types/index.ts` — Campaign interface'e 3 alan
- `lib/data/mappers.ts` — `rowToCampaign` + `campaignToInsert`
- `lib/mock/data.ts` — 3 demo kampanyaya cover URL + CTA label
- `lib/validations/campaign.ts` — zod schema'ya 3 alan
- `app/(admin)/kayhan-yonetim/actions/campaigns.ts` — parse fonksiyonu + createCampaign/updateCampaign çağrıları
- `components/admin/campaign-form.tsx` — 3 yeni input + preview
- `app/(public)/page.tsx` — `CampaignStrip` import → `CampaignSlider`, `GalleryShowcase` ekle

**Silinen dosyalar:**
- `components/home/campaign-strip.tsx`

---

## Pre-Flight

- [ ] **Step 0.1: Spec dosyasını oku**

```
docs/superpowers/specs/2026-05-12-anasayfa-gorselli-tasarim-design.md
```

Plan boyunca tüm tasarım kararları bu spec'e dayanır.

- [ ] **Step 0.2: AGENTS.md ve mevcut dev sunucusu durumu kontrol**

`AGENTS.md` Next.js 16 breaking changes notu. Dev sunucusu çalışıyorsa kapat:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "c:\SOLAR S1TE\kayhan-solar\.next\dev\lock" -ErrorAction SilentlyContinue
```

---

### Task 1: Schema, tip, mapper, mock data

Görsel için gerekli veri yapısını ayağa kaldır. Diğer tüm task'lar bunun üzerine inşa edilir.

**Files:**
- Create: `supabase/migrations/20260512_005_campaign_visuals.sql`
- Modify: `types/index.ts:63-78`
- Modify: `lib/data/mappers.ts:102-136`
- Modify: `lib/mock/data.ts:403-444` (3 demo kampanya bloğu)

- [ ] **Step 1.1: Migration dosyasını oluştur**

`supabase/migrations/20260512_005_campaign_visuals.sql`:

```sql
-- 20260512_005_campaign_visuals.sql
-- Anasayfa kampanya slider'ı için görsel + CTA alanları ekler.
-- banner_image_url mevcut, dokunulmuyor (ileride mini banner için saklı).

alter table public.campaigns
  add column if not exists cover_image_url     text,
  add column if not exists cta_label           text,
  add column if not exists cta_secondary_label text;

comment on column public.campaigns.cover_image_url is
  'Anasayfa slider tam genişlik görseli. NULL ise kampanya slider''da gösterilmez.';
comment on column public.campaigns.cta_label is
  'Primary CTA buton metni. NULL ise UI''da default "Detayları Gör" gösterilir.';
comment on column public.campaigns.cta_secondary_label is
  'İkincil CTA metni. NULL ise ikinci buton hiç gösterilmez.';
```

- [ ] **Step 1.2: Migration'ı uygula**

Run:

```powershell
pnpm run db:migrate
```

Expected: Hata yok, "Applied 20260512_005_campaign_visuals" benzeri çıktı. Supabase paneli > Table Editor > campaigns tablosunda 3 yeni kolon görünmeli.

- [ ] **Step 1.3: Campaign tipini genişlet**

`types/index.ts`, mevcut `Campaign` interface'i (satır 63-78). `bannerImageUrl` satırının hemen altına 3 alan ekle:

```ts
export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description?: string;
  bannerImageUrl?: string;
  coverImageUrl?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  ruleType: CampaignRuleType;
  ruleConfig: Record<string, unknown>;
  applicableTo: "all" | "category" | "product";
  targetIds: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  displayOnHomepage: boolean;
  displayPriority: number;
}
```

- [ ] **Step 1.4: `rowToCampaign` mapper'ı genişlet**

`lib/data/mappers.ts:102-119`, `rowToCampaign` fonksiyonu içinde `bannerImageUrl` satırının altına ekle:

```ts
export function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    bannerImageUrl: (row.banner_image_url as string | null) ?? undefined,
    coverImageUrl: (row.cover_image_url as string | null) ?? undefined,
    ctaLabel: (row.cta_label as string | null) ?? undefined,
    ctaSecondaryLabel: (row.cta_secondary_label as string | null) ?? undefined,
    ruleType: row.rule_type as CampaignRuleType,
    ruleConfig: (row.rule_config as Record<string, unknown>) ?? {},
    applicableTo: row.applicable_to as Campaign["applicableTo"],
    targetIds: (row.target_ids as string[] | null) ?? [],
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? undefined,
    isActive: (row.is_active as boolean | null) ?? true,
    displayOnHomepage: (row.display_on_homepage as boolean | null) ?? false,
    displayPriority: (row.display_priority as number | null) ?? 0,
  };
}
```

- [ ] **Step 1.5: `campaignToInsert` mapper'ı genişlet**

Aynı dosyada `campaignToInsert` (satır 120-136), `banner_image_url` satırının altına ekle:

```ts
export function campaignToInsert(c: Omit<Campaign, "id">) {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description ?? null,
    banner_image_url: c.bannerImageUrl ?? null,
    cover_image_url: c.coverImageUrl ?? null,
    cta_label: c.ctaLabel ?? null,
    cta_secondary_label: c.ctaSecondaryLabel ?? null,
    rule_type: c.ruleType,
    rule_config: c.ruleConfig,
    applicable_to: c.applicableTo,
    target_ids: c.targetIds,
    start_date: c.startDate,
    end_date: c.endDate ?? null,
    is_active: c.isActive,
    display_on_homepage: c.displayOnHomepage,
    display_priority: c.displayPriority,
  };
}
```

- [ ] **Step 1.6: Demo kampanyalara görsel alan ekle**

`lib/mock/data.ts`, `c-1` (satır 403-417), `c-2` (418-431), `c-3` (432-444) bloklarında `description` satırının altına ekle:

`c-1` için:
```ts
    coverImageUrl: "https://picsum.photos/seed/kampanya-1/1600/900",
    ctaLabel: "Panelleri İncele",
    ctaSecondaryLabel: "Tüm Kampanyalar",
```

`c-2` için:
```ts
    coverImageUrl: "https://picsum.photos/seed/kampanya-2/1600/900",
    ctaLabel: "Paketleri Gör",
```

`c-3` için:
```ts
    coverImageUrl: "https://picsum.photos/seed/kampanya-3/1600/900",
    ctaLabel: "Bataryalar",
    ctaSecondaryLabel: "Mağazaya Git",
```

- [ ] **Step 1.7: TypeScript ve lint kontrolü**

Run:

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

Run:

```powershell
pnpm exec next lint
```

Expected: 0 uyarı.

- [ ] **Step 1.8: Smoke — Supabase'den okuma**

Dev sunucuyu kısa süre aç, kontrolden sonra kapat:

```powershell
pnpm dev
```

Başka bir terminalde:

```powershell
curl -s http://localhost:3000/ -o $null -w "%{http_code}`n"
```

Expected: 200. Sayfa hata vermeden render olur (slider henüz eklenmediği için görsel yok, mevcut CampaignStrip hâlâ aktif).

Dev sunucuyu kapat:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 1.9: Commit**

```powershell
git add supabase/migrations/20260512_005_campaign_visuals.sql `
        types/index.ts `
        lib/data/mappers.ts `
        lib/mock/data.ts
git commit -m @'
feat(db): add campaign visual fields (cover_image_url, cta_label, cta_secondary_label)

Anasayfa kampanya slider'ı için 3 opsiyonel kolon eklendi.
banner_image_url mevcut alan korundu. Campaign tipi, mapper'lar
ve mock veri senkronize güncellendi.
'@
```

---

### Task 2: CampaignSlider — server + client component

Tam genişlik tek slide carousel. Hero'nun hemen altına gelir, eski `CampaignStrip`'in yerini alır.

**Files:**
- Create: `components/home/campaign-slider.tsx` (server)
- Create: `components/home/campaign-slider-client.tsx` (client)
- Modify: `app/(public)/page.tsx:4,96`
- Delete: `components/home/campaign-strip.tsx`

- [ ] **Step 2.1: Slider client component'i yaz**

`components/home/campaign-slider-client.tsx`:

```tsx
"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface SlideData {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
  href: string;
  ctaLabel: string;
  ctaSecondaryLabel?: string;
}

interface Props {
  slides: SlideData[];
}

const AUTOPLAY_MS = 5000;

export function CampaignSliderClient({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, slides.length, paused]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-border bg-elevated"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.coverImageUrl}
              alt={slide.title}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 1280px"
              className="object-cover"
              placeholder="empty"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
              <div className="max-w-2xl">
                <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-5xl">
                  {slide.title}
                </h2>
                {slide.description && (
                  <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
                    {slide.description}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={slide.href}>
                    <Button size="lg" variant="primary">
                      {slide.ctaLabel}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                    </Button>
                  </Link>
                  {slide.ctaSecondaryLabel && (
                    <Link href="/magaza">
                      <Button size="lg" variant="outline">
                        {slide.ctaSecondaryLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Önceki slayt"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Sonraki slayt"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slayt ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2.2: Slider server component'i yaz**

`components/home/campaign-slider.tsx`:

```tsx
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
```

- [ ] **Step 2.3: Anasayfada slider'ı CampaignStrip yerine kullan**

`app/(public)/page.tsx`:
- Satır 4: `import { CampaignStrip } from "@/components/home/campaign-strip";` → `import { CampaignSlider } from "@/components/home/campaign-slider";`
- Satır 96: `<CampaignStrip />` → `<CampaignSlider />`

```tsx
// Üst kısım imports
import { CampaignSlider } from "@/components/home/campaign-slider";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedProducts } from "@/components/home/featured-products";
```

```tsx
// JSX, hero'nun altında
<CampaignSlider />
<CategoryGrid />
<FeaturedProducts />
```

- [ ] **Step 2.4: Eski CampaignStrip'i sil**

```powershell
Remove-Item "c:\SOLAR S1TE\kayhan-solar\components\home\campaign-strip.tsx"
```

- [ ] **Step 2.5: TypeScript ve lint**

```powershell
pnpm exec tsc --noEmit
pnpm exec next lint
```

Expected: 0 hata, 0 uyarı.

- [ ] **Step 2.6: Manuel smoke — slider çalışıyor mu**

```powershell
pnpm dev
```

Tarayıcıda `http://localhost:3000/` aç:

- Hero altında tam genişlik kampanya slider görünüyor mu?
- Picsum görselleri yükleniyor mu?
- 5sn sonra sonraki slide'a otomatik geçiyor mu?
- Üzerine fareyle gelince duruyor mu?
- Sol/sağ ok butonları çalışıyor mu?
- Alt nokta navigasyonu doğru slide'ı vurguluyor mu?
- Primary CTA'ya tıkla → `/magaza?kategori=...` veya `/urun/...` URL'ine gidiyor mu?
- DevTools mobil görünüm (375px) → slider yatayda küçülüyor, metin okunuyor mu?

Dev sunucuyu kapat:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 2.7: Commit**

```powershell
git add components/home/campaign-slider.tsx `
        components/home/campaign-slider-client.tsx `
        app/(public)/page.tsx `
        components/home/campaign-strip.tsx
git commit -m @'
feat(home): replace campaign strip with full-width campaign slider

Eski metin-kart şeridi yerine Hepsiburada/Trendyol stili tam genişlik
carousel. Auto-play 5sn (hover'da durur), prefers-reduced-motion saygılı,
keyboard navigation (←/→). Smart redirect mantığı korundu.
'@
```

---

### Task 3: GalleryShowcase — bento düzeni "Bizden Projeler"

`isFeatured` galeri post'larından mi.com tarzı asimetrik grid. Öne Çıkan Ürünler'den önce gelir.

**Files:**
- Create: `components/home/gallery-showcase.tsx`
- Modify: `app/(public)/page.tsx` (yeni section ekle)

- [ ] **Step 3.1: GalleryShowcase server component'i yaz**

`components/home/gallery-showcase.tsx`:

```tsx
import { ArrowRight, MapPin, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

const MAX_POSTS = 5;

export async function GalleryShowcase() {
  const posts = await repo.listGalleryPosts({ onlyActive: true });
  const featured = posts
    .filter((p) => p.isFeatured)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, MAX_POSTS);

  if (featured.length === 0) return null;

  return (
    <section className="border-t border-border">
      <Container className="py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bizden Projeler
            </h2>
            <p className="mt-2 text-muted">
              Türkiye genelinde tamamladığımız güneş enerjisi kurulumları.
            </p>
          </div>
          <Link
            href="/galeri"
            className="hidden items-center gap-1 text-sm font-medium text-foreground hover:text-lime-dark sm:inline-flex dark:hover:text-lime-primary"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:[grid-auto-flow:dense]">
          {featured.map((post, i) => {
            const cover = post.media[0]?.url;
            const big = i === 0;
            return (
              <Link
                key={post.id}
                href={`/galeri/${post.slug}`}
                className={`group relative isolate overflow-hidden rounded-2xl border border-border bg-elevated transition-transform hover:-translate-y-0.5 ${
                  big ? "lg:col-span-2 lg:row-span-2" : ""
                }`}
              >
                <div className={`relative ${big ? "aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[4/3]"}`}>
                  {cover ? (
                    <Image
                      src={cover}
                      alt={post.title}
                      fill
                      sizes={big ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 1024px) 100vw, 33vw"}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-black/70 text-white/60 text-sm">
                      {post.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity group-hover:from-black/90" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className={`font-semibold tracking-tight text-white ${big ? "text-xl sm:text-2xl" : "text-base"}`}>
                    {post.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
                    {post.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" strokeWidth={2.2} />
                        {post.location}
                      </span>
                    )}
                    {post.systemPowerKw && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" strokeWidth={2.2} />
                        {post.systemPowerKw} kW
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3.2: Anasayfaya GalleryShowcase ekle**

`app/(public)/page.tsx`, `CategoryGrid` ile `FeaturedProducts` arasına `GalleryShowcase` yerleştir.

Önce import ekle:

```tsx
import { CampaignSlider } from "@/components/home/campaign-slider";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedProducts } from "@/components/home/featured-products";
import { GalleryShowcase } from "@/components/home/gallery-showcase";
```

Sonra JSX sıralamasını güncelle:

```tsx
<CampaignSlider />
<CategoryGrid />
<GalleryShowcase />
<FeaturedProducts />
```

- [ ] **Step 3.3: Galeri görsel host'larını next.config.ts kontrol et**

Supabase Storage URL'leri prod'da kullanılacak. Mevcut `next.config.ts:5-15`'te sadece `picsum.photos` ve `images.unsplash.com` var.

Demo modda picsum yeterli (demo galeri post'ları `https://picsum.photos/...` URL'leri kullanıyor — `lib/mock/data.ts` 450+ satırlar). Bu task'ta ek host eklemeye gerek yok. Prod Supabase Storage entegrasyonu ayrı bir task'ta yapılacak (bu spec dışı).

Demo galeri post'larının URL host'larını hızlı kontrol et:

```powershell
Select-String -Path "c:\SOLAR S1TE\kayhan-solar\lib\mock\data.ts" -Pattern "https://" | Select-Object -First 5
```

Expected: Tüm host'lar `picsum.photos` veya `images.unsplash.com` (zaten kayıtlı).

- [ ] **Step 3.4: Demo galeri post'larından en az 2 tane isFeatured=true olduğunu doğrula**

```powershell
Select-String -Path "c:\SOLAR S1TE\kayhan-solar\lib\mock\data.ts" -Pattern "isFeatured: true"
```

Expected: En az 2 satır. Yoksa Step 3.5'i ekle.

- [ ] **Step 3.5 (koşullu): Mock galeri post'larına isFeatured ekle**

Eğer Step 3.4'te < 2 sonuç çıkarsa: `lib/mock/data.ts` içindeki `g-1`, `g-2`, `g-3`, `g-4`, `g-5` post'larında `isFeatured: false` → `isFeatured: true` yap (ilk 5'ini). Bu adım sadece eksik veri durumunda.

- [ ] **Step 3.6: TypeScript ve lint**

```powershell
pnpm exec tsc --noEmit
pnpm exec next lint
```

Expected: 0 hata, 0 uyarı.

- [ ] **Step 3.7: Manuel smoke — galeri bölümü**

```powershell
pnpm dev
```

`http://localhost:3000/` aç:

- "Bizden Projeler" başlığı CategoryGrid'in altında, Öne Çıkan Ürünler'in üstünde görünüyor mu?
- 5 (veya daha az) post bento düzende: sol 1 büyük + sağ 4 küçük?
- Görseller yükleniyor (picsum), hover'da büyüyor mu?
- Lokasyon ve kW etiketleri görünüyor mu?
- Mobilde (375px) → tek sütun, üst üste 5 kart?
- Kart tıklamak `/galeri/<slug>` adresine götürüyor mu?

Dev kapat:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 3.8: Commit**

```powershell
git add components/home/gallery-showcase.tsx `
        app/(public)/page.tsx `
        lib/mock/data.ts
git commit -m @'
feat(home): add gallery showcase bento section

isFeatured galeri post'larından mi.com tarzı asimetrik grid
(1 büyük + 4 küçük). Lokasyon ve sistem gücü etiketleri,
hover zoom efekti. Mobilde tek sütun.
'@
```

---

### Task 4: Admin kampanya formuna görsel alanlar + preview

Admin kampanyaları görselle doldurabilsin. Zod validation, server action ve form senkronize.

**Files:**
- Modify: `lib/validations/campaign.ts:3-23`
- Modify: `app/(admin)/kayhan-yonetim/actions/campaigns.ts:42-58,70-75,90-95`
- Modify: `components/admin/campaign-form.tsx:32-61` (Genel bölümüne yeni alanlar)

- [ ] **Step 4.1: Zod schema'ya 3 alan ekle**

`lib/validations/campaign.ts`, `bannerImageUrl` satırının altına:

```ts
import { z } from "zod";

export const campaignInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3, "Başlık zorunlu"),
  description: z.string().optional(),
  bannerImageUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(40).optional().or(z.literal("")),
  ctaSecondaryLabel: z.string().max(40).optional().or(z.literal("")),
  ruleType: z.enum([
    "percent_off",
    "buy_x_get_y_discount",
    "bundle_discount",
    "free_shipping",
    "fixed_amount_off",
  ]),
  ruleConfig: z.record(z.string(), z.unknown()).default({}),
  applicableTo: z.enum(["all", "category", "product"]).default("all"),
  targetIds: z.array(z.string()).default([]),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(8)),
  endDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  displayOnHomepage: z.coerce.boolean().default(false),
  displayPriority: z.coerce.number().int().default(0),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;
```

- [ ] **Step 4.2: Server action parse + create/update fonksiyonlarını güncelle**

`app/(admin)/kayhan-yonetim/actions/campaigns.ts`, `parse()` fonksiyonu içindeki `safeParse` çağrısına 3 alan ekle (satır 48 civarı, `bannerImageUrl` satırının altına):

```ts
  return campaignInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    bannerImageUrl: formData.get("bannerImageUrl") || undefined,
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    ctaLabel: formData.get("ctaLabel") || undefined,
    ctaSecondaryLabel: formData.get("ctaSecondaryLabel") || undefined,
    ruleType: formData.get("ruleType"),
    ruleConfig,
    applicableTo: formData.get("applicableTo") ?? "all",
    targetIds,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    isActive: formData.get("isActive") === "on",
    displayOnHomepage: formData.get("displayOnHomepage") === "on",
    displayPriority: formData.get("displayPriority") || 0,
  });
```

Aynı dosyada `createCampaignAction` (satır 70-75 civarı):

```ts
  const created = await repo.createCampaign({
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    coverImageUrl: parsed.data.coverImageUrl || undefined,
    ctaLabel: parsed.data.ctaLabel || undefined,
    ctaSecondaryLabel: parsed.data.ctaSecondaryLabel || undefined,
    endDate: parsed.data.endDate || undefined,
  });
```

`updateCampaignAction` (satır 90-95 civarı), aynı şablonu uygula:

```ts
  const updated = await repo.updateCampaign(id, {
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    coverImageUrl: parsed.data.coverImageUrl || undefined,
    ctaLabel: parsed.data.ctaLabel || undefined,
    ctaSecondaryLabel: parsed.data.ctaSecondaryLabel || undefined,
    endDate: parsed.data.endDate || undefined,
  });
```

- [ ] **Step 4.3: Admin form'a 3 input + preview ekle**

`components/admin/campaign-form.tsx`, "Genel" bölümünün altına yeni bir section ekle (mevcut "Genel" section'ın `</section>` etiketinden hemen sonra, "Kural" section'ından önce). Ayrıca `useState` ile coverImageUrl preview state'i tutulur.

İlk olarak component'in başında state ekle (mevcut `ruleType`/`ruleConfig` state'lerinin altına):

```ts
  const [coverPreview, setCoverPreview] = useState<string>(initial?.coverImageUrl ?? "");
  const [coverError, setCoverError] = useState(false);
```

Sonra "Genel" section'dan sonra (mevcut `</section>` satırının altına) yeni section ekle:

```tsx
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Görsel & CTA (Anasayfa Slider)</h2>
        <p className="mt-1 text-xs text-muted">
          Bu alanlar dolu ise kampanya anasayfa slider&apos;ında görsel olarak gösterilir.
          Cover görsel boş ise slider&apos;da hiç görünmez.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="coverImageUrl">Cover görseli (tam genişlik URL)</Label>
            <Input
              id="coverImageUrl"
              name="coverImageUrl"
              defaultValue={initial?.coverImageUrl ?? ""}
              placeholder="https://picsum.photos/seed/kampanya/1600/900"
              onChange={(e) => {
                setCoverPreview(e.target.value);
                setCoverError(false);
              }}
            />
            <p className="text-xs text-muted">
              Önerilen oran 16:9 (örn. 1600x900). Boş ise anasayfada gösterilmez.
            </p>
            {coverPreview && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-elevated">
                {coverError ? (
                  <div className="p-4 text-xs text-danger">Görsel yüklenemedi (URL kontrol edin)</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt="Cover önizleme"
                    className="aspect-[16/9] w-full object-cover"
                    onError={() => setCoverError(true)}
                  />
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaLabel">Primary CTA metni</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              defaultValue={initial?.ctaLabel ?? ""}
              placeholder="Hemen İncele"
              maxLength={40}
            />
            <p className="text-xs text-muted">Boş ise &quot;Detayları Gör&quot; gösterilir.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaSecondaryLabel">İkincil CTA metni (opsiyonel)</Label>
            <Input
              id="ctaSecondaryLabel"
              name="ctaSecondaryLabel"
              defaultValue={initial?.ctaSecondaryLabel ?? ""}
              placeholder="Tüm Kampanyalar"
              maxLength={40}
            />
            <p className="text-xs text-muted">Boş ise ikinci buton hiç görünmez.</p>
          </div>
        </div>
      </section>
```

- [ ] **Step 4.4: TypeScript ve lint**

```powershell
pnpm exec tsc --noEmit
pnpm exec next lint
```

Expected: 0 hata, 0 uyarı. `<img>` için zaten inline eslint-disable yorumu var.

- [ ] **Step 4.5: Admin smoke — kampanya oluşturma/güncelleme**

```powershell
pnpm dev
```

`http://localhost:3000/kayhan-yonetim/kampanyalar` aç (admin gerekiyor — `requireAdmin()`). Yeni kampanya formu veya mevcut bir kampanyanın düzenleme sayfasını aç:

- "Görsel & CTA" bölümü "Genel" altında, "Kural" üstünde görünüyor mu?
- Cover URL'e `https://picsum.photos/seed/test/1600/900` yapıştır → form altında 16:9 önizleme görünüyor mu?
- Bozuk URL gir → "Görsel yüklenemedi" mesajı çıkıyor mu?
- Primary CTA: "Hemen İncele", İkincil CTA: "Mağazaya Git" gir.
- "Anasayfada göster" switch'ini aç + "Aktif" aç.
- Kaydet → kampanya listesi açılıyor mu?
- Anasayfaya git → slider'da yeni görselin göründüğünü kontrol et.

Dev kapat:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 4.6: Commit**

```powershell
git add lib/validations/campaign.ts `
        app/(admin)/kayhan-yonetim/actions/campaigns.ts `
        components/admin/campaign-form.tsx
git commit -m @'
feat(admin): add visual fields to campaign form with preview

Kampanya formuna cover görsel URL + iki CTA buton metni alanları
eklendi. Cover URL doluyken canlı önizleme; bozuk URL'de hata
mesajı. Zod schema ve server action senkronize.
'@
```

---

### Task 5: End-to-end smoke + verification kaydı

Her şey çalıştığını net doğrula ve sonucu `docs/verification/` altına yaz.

**Files:**
- Create: `docs/verification/2026-05-12-anasayfa-gorselli-tasarim.md`

- [ ] **Step 5.1: Tüm akışı manuel test et**

```powershell
pnpm dev
```

Kontrol listesi:

1. `http://localhost:3000/` → hero görünüyor (eski mesajla).
2. Hero altında kampanya slider tam genişlik, picsum görselleri ile dönüyor.
3. Slider 5sn'de otomatik geçiş yapıyor, hover'da duruyor.
4. Sol/sağ ok ve nokta navigasyonu çalışıyor.
5. Klavye ←/→ tuşları çalışıyor.
6. Slider altında CategoryGrid değişmemiş.
7. "Bizden Projeler" başlığı altında bento grid (1 büyük + küçükler).
8. Galeri kartlarında lokasyon + kW etiketleri okunuyor.
9. "Öne Çıkan Ürünler" 4'lü grid değişmemiş.
10. Mobil görünümde (DevTools 375px) tüm bölümler tek sütun veya küçülmüş düzgün.
11. Console'da hata yok (`F12 > Console`).
12. Network sekmesi → ilk slide görseli "high" priority, diğerleri lazy.
13. Admin formundan yeni kampanya oluştur → cover görsel URL ile → anasayfada görünüyor.
14. Admin'den bir kampanyayı `cover_image_url` boş bırakıp `displayOnHomepage=true` yap → anasayfada o slide görünmüyor.

- [ ] **Step 5.2: Tüm cover'ları sil testi (boş slider null)**

Admin'den tüm aktif anasayfa kampanyalarının `coverImageUrl` alanını sil. Anasayfaya git:

- Kampanya slider bölümü tamamen kayboluyor mu (DOM'da hiç yok)?

Sonra eski hâline geri al.

- [ ] **Step 5.3: TypeScript + lint final**

```powershell
pnpm exec tsc --noEmit
pnpm exec next lint
```

Expected: 0 hata, 0 uyarı.

- [ ] **Step 5.4: Dev sunucusunu kapat**

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

- [ ] **Step 5.5: Verification dokümanını yaz**

`docs/verification/2026-05-12-anasayfa-gorselli-tasarim.md`:

```markdown
# Anasayfa Görselli Tasarım — Verification

**Tarih:** 2026-05-12
**Plan:** docs/superpowers/plans/2026-05-12-anasayfa-gorselli-tasarim.md
**Spec:** docs/superpowers/specs/2026-05-12-anasayfa-gorselli-tasarim-design.md

## Kapsam

- Yeni `CampaignSlider` (server + client) — eski `CampaignStrip` yerine.
- Yeni `GalleryShowcase` — bento düzeni "Bizden Projeler".
- Schema: `campaigns` tablosuna `cover_image_url`, `cta_label`, `cta_secondary_label`.
- Admin form: 3 yeni alan + canlı önizleme.

## Doğrulama sonuçları

| Test | Sonuç |
|---|---|
| Migration uygulandı | ✓ |
| `tsc --noEmit` 0 hata | ✓ |
| `next lint` 0 uyarı | ✓ |
| Slider 5sn auto-play | ✓ |
| Hover'da slider duruyor | ✓ |
| Klavye ←/→ navigasyon | ✓ |
| Mobil (375px) düzen | ✓ |
| Bento grid 5 post (lg) | ✓ |
| Galeri tek sütun (mobil) | ✓ |
| Admin form 3 yeni alan | ✓ |
| Cover URL preview | ✓ |
| Bozuk URL hata mesajı | ✓ |
| Cover boş → slider gizli | ✓ |
| Anasayfa CTA smart redirect | ✓ |

## Bilinen sınırlamalar

- Prod Supabase Storage host'u `next.config.ts` remote patterns'a eklenmedi (demo modda picsum yeterli, ileride ayrı task).
- Slider içinde aynı anda max 5 slide. Daha fazla istenirse `MAX_SLIDES` sabiti güncellenir.

## Commit'ler

1. `feat(db): add campaign visual fields` — schema + tip + mapper + mock.
2. `feat(home): replace campaign strip with full-width campaign slider`.
3. `feat(home): add gallery showcase bento section`.
4. `feat(admin): add visual fields to campaign form with preview`.
5. `docs: verification for 2026-05-12 anasayfa görselli tasarım` (bu doküman).
```

- [ ] **Step 5.6: Final commit**

```powershell
git add docs/verification/2026-05-12-anasayfa-gorselli-tasarim.md
git commit -m @'
docs: verification for 2026-05-12 anasayfa görselli tasarım

Tüm smoke testlerinin geçtiğini ve tasarım kararlarının
spec ile uyumlu olduğunu kayıt altına alır.
'@
```

---

## Tamamlama kontrol listesi

- [ ] Tüm 5 task tamamlandı, her birinin commit'i atıldı.
- [ ] `pnpm exec tsc --noEmit` ve `pnpm exec next lint` final çağrılarda temiz.
- [ ] `docs/verification/2026-05-12-anasayfa-gorselli-tasarim.md` yazıldı ve commit edildi.
- [ ] Memory güncellemesi (opsiyonel): `MEMORY.md`'ye bu çalışmanın özetini bir satır olarak ekle.

## Geri alma planı (gerekirse)

Her commit kendi içinde geri alınabilir:

- Task 1 geri alma: `git revert <task1-hash>` + migration için `alter table public.campaigns drop column cover_image_url, drop column cta_label, drop column cta_secondary_label;` SQL elle.
- Task 2-4: `git revert <hash>`.
- Slider/galeri tek tek kapatma: `app/(public)/page.tsx`'den ilgili JSX satırını yorum yap.
