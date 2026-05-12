# Anasayfa Görselli Tasarım — Design Spec

**Tarih:** 2026-05-12
**Durum:** Brainstorming tamamlandı, plan yazılacak
**Kapsam:** Public anasayfa (`app/(public)/page.tsx`) ve admin kampanya form'una görsel destek

## Amaç

KAYHAN Solar anasayfasını modern e-ticaret stilinde görselli zenginleştirmek. Hedef referans: mi.com/tr düzen karakteri (büyük banner + asimetrik showcase bloklar). Mevcut tasarım dili (Tailwind 4, lime-primary aksent, dark/light tema, glass kart) bozulmadan, iki yeni görselli bölüm eklenir.

## Kapsam dışı

- Hero alanı (mevcut "Geleceğin Enerjisini Bugün Üretiyoruz") — dokunulmaz.
- Öne Çıkan Ürünler grid'i — mevcut 4'lü grid kalır.
- Neden KAYHAN ve CTA bölümleri — dokunulmaz.
- Ürün detay sayfası, teklif akışı, admin panel genel UX (sadece kampanya form'una 3 yeni alan eklenir).

## Yeni anasayfa sıralaması

```
1. Hero                  (DEĞİŞMİYOR)
2. Kampanya Slider       (YENİ — eski CampaignStrip yerini alır)
3. Category Grid         (DEĞİŞMİYOR)
4. Galeri Showcase       (YENİ — "Bizden Projeler", bento düzen)
5. Featured Products     (DEĞİŞMİYOR)
6. Neden KAYHAN          (DEĞİŞMİYOR)
7. Bize Söyleyin CTA     (DEĞİŞMİYOR)
```

Mevcut `components/home/campaign-strip.tsx` silinir; yerine iki yeni bileşen eklenir.

## Bileşenler

### `components/home/campaign-slider.tsx` (server component)

**Sorumluluk:** Anasayfada gösterilecek aktif kampanyaları büyük tek-slide carousel olarak render eder. Hepsiburada/Trendyol stili tam genişlik banner.

**Veri:**
- `Promise.all([repo.listCampaigns(), repo.listProducts(), repo.listCategories({ onlyActive: true })])`
- Filtre: `campaign.isActive && campaign.displayOnHomepage && campaign.coverImageUrl`
- Sıralama: `displayPriority desc`
- Üst sınır: `slice(0, 5)`

**Smart redirect:** Mevcut `CampaignStrip.targetHref` mantığı aynen taşınır (product → `/urun/[slug]`, category → `/magaza?kategori=...&kampanya=...`, all → `/magaza?kampanya=...`).

**Render:** Görseli olan en az 1 kampanya yoksa `null` döner — bölüm hiç render edilmez.

**Slide içeriği:**
- Background: `cover_image_url` (`next/image`, `fill`, `priority` ilk slide, sonrakiler lazy, blur placeholder).
- Overlay: dark-to-transparent gradient (sol alt köşede metnin okunabilirliği için).
- Sol alt: başlık (büyük, beyaz) + açıklama + primary CTA (`ctaLabel || "Detayları Gör"`) + opsiyonel secondary CTA (`ctaSecondaryLabel` doluysa).
- Aspect ratio: `aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5]`.

**Navigasyon (client kısmı):** `components/home/campaign-slider-client.tsx` — server component'ten `slides` prop'unu alır:
- Auto-play 5sn aralıkla, hover'da durur.
- Sol/sağ ok butonları.
- Alt nokta navigasyonu (aktif olan dolu).
- `prefers-reduced-motion: reduce` → auto-play kapanır, sadece manuel.
- Keyboard: ←/→ ok tuşları.

### `components/home/gallery-showcase.tsx` (server component, saf)

**Sorumluluk:** Galeri/Bizden Projeler bölümü. mi.com tarzı bento grid.

**Veri:**
- `repo.listGalleryPosts()` (mevcut metod; yoksa eklenecek — implementation aşamasında doğrulanır).
- Filtre: `post.isActive && post.isFeatured`
- Sıralama: `displayOrder asc`
- Üst sınır: `slice(0, 5)`

**Render:**
- Hiç featured post yoksa `null` döner.
- Grid (lg+):
  ```
  lg:grid-cols-3 lg:grid-rows-2
  [post 1] col-span-2 row-span-2  → büyük spotlight (sol 2/3, 2 satır yükseklik)
  [post 2-5] her biri tek hücre   → sağda 2x2
  ```
- Mobilde: `grid-cols-1` (tüm kartlar üst üste).
- Az post durumu (lg+):
  - 5 post: 1 büyük (col-span-2 row-span-2) + 4 küçük (sağda 2x2). Tam dolu.
  - 4 post: 1 büyük + 3 küçük (sağdaki 4. hücre boş kalır; CSS grid otomatik boşluk verir, tasarım kabul edilebilir).
  - 3 post: 1 büyük + 2 küçük (sağdaki alt satır boş kalır).
  - 2 post: 1 büyük + 1 küçük.
  - 1 post: Sadece büyük (col-span-3 row-span-2 tam genişlik).
  - 0 post: Bölüm `null` döner, hiç render edilmez.
- Implementation: post sayısına göre koşullu grid class değil, doğal CSS grid akışıyla bırakılır. Az post sayısında küçük boşluk kabul edilebilir; "perfect-fit" optimizasyonu YAGNI.

**Kart içeriği:**
- Görsel: `post.media[0].url` (yoksa siyah placeholder + başlık).
- `next/image` lazy load (fold altı).
- Alt overlay: dark gradient + başlık + lokasyon + sistem gücü (kW, varsa).
- Hover: hafif zoom + overlay koyulaşma.

**Başlık satırı:** "Bizden Projeler" + sağda "Tümünü Gör" → `/galeri`.

### Silinecek dosyalar

- `components/home/campaign-strip.tsx`

### Güncellenecek dosyalar

- `app/(public)/page.tsx` — `CampaignStrip` import → `CampaignSlider`, ayrıca `GalleryShowcase` eklenir.

## Schema değişikliği

**Yeni migration:** `supabase/migrations/20260512_005_campaign_visuals.sql`

```sql
alter table public.campaigns
  add column if not exists cover_image_url     text,
  add column if not exists cta_label           text,
  add column if not exists cta_secondary_label text;
```

**Alan anlamları:**
- `cover_image_url`: Slider'da kullanılacak büyük tam genişlik görsel. NULL ise o kampanya slider'da gösterilmez.
- `cta_label`: Primary CTA buton metni. NULL ise UI'da default "Detayları Gör" gösterilir.
- `cta_secondary_label`: Opsiyonel ikinci CTA. NULL ise ikinci buton hiç gösterilmez.
- `banner_image_url`: Mevcut alan, dokunulmuyor. İleride başka yerde (e.g. mini banner kart) kullanılabilir.

**Uygulama:** `pnpm run db:migrate`

## Tip & mapper güncellemeleri

### `types/index.ts` — `Campaign` interface

```ts
export interface Campaign {
  // ... mevcut alanlar
  bannerImageUrl?: string;
  coverImageUrl?: string;        // YENİ
  ctaLabel?: string;             // YENİ
  ctaSecondaryLabel?: string;    // YENİ
  // ...
}
```

### `lib/data/mappers.ts` — `rowToCampaign` ve `campaignToInsert`

- `rowToCampaign`: `coverImageUrl`, `ctaLabel`, `ctaSecondaryLabel` snake → camel.
- `campaignToInsert`: aynı alanlar camel → snake, boş string `null` normalize.

### `lib/mock/data.ts` — demo kampanyalar

`Campaign` tipi genişlediği için TypeScript zorunlu kılmaz (yeni alanlar opsiyonel), ama demo modda slider'ın çalışması için 3 demo kampanyaya örnek değerler eklenir:
```ts
coverImageUrl: "https://picsum.photos/seed/kampanyaN/1600/900",
ctaLabel: "Hemen İncele",
```
Demo galeri post'larında zaten media[0] mevcut — galeri showcase için ek veri gerekmez.

## Admin form

### `components/admin/campaign-form.tsx` (genişletilir)

Mevcut form yapısı korunur, 3 yeni alan eklenir:

| Alan | Tip | Yardım metni |
|---|---|---|
| Cover Görsel URL | text | "Boş ise slider'da gösterilmez. Picsum/Supabase Storage URL'i yapıştırın." |
| CTA Buton Metni | text | "Boş ise 'Detayları Gör' yazar." |
| İkincil CTA Metni | text | "Boş ise ikinci buton hiç görünmez." |

**Preview:** `coverImageUrl` doluysa form altında küçük `<img>` (basit `<img>`, `next/image` değil; admin için hızlı önizleme yeterli). `onError` → "Görsel yüklenemedi" mesajı.

**Validation:** Tüm 3 alan opsiyonel string. Zod schema'da `.optional()`.

### `app/admin/campaigns/actions.ts` (server action)

`FormData` parse → boş string → `null` normalize → `campaignToInsert` mapper'a aktarılır.

## Hata yönetimi

| Durum | Davranış |
|---|---|
| Aktif/displayOnHomepage kampanya yok | `CampaignSlider` `null` döner — render edilmez |
| Kampanyalar var ama `coverImageUrl` hiçbirinde yok | `CampaignSlider` `null` döner |
| `cover_image_url` 404/bozuk | `next/image` blur placeholder kalır, sessiz |
| Featured galeri post yok | `GalleryShowcase` `null` döner |
| Featured post < 5 | Mevcutlar gösterilir, grid sıkıştırılır |
| Galeri post'un `media[0]` yok | Kart siyah placeholder + başlık |
| Supabase erişim hatası | Mevcut error boundary (`error.tsx`) yakalar |

## Performans

- Slider ilk slide: `priority` (LCP optimizasyonu).
- Diğer slide görselleri: lazy load.
- Galeri görselleri: lazy load (fold altı).
- Blur placeholder tüm görsellerde.
- LCP hedefi: < 2.5s.

## Test & doğrulama

**TypeScript:** `pnpm exec tsc --noEmit` → 0 hata.
**Lint:** `pnpm exec next lint` → 0 uyarı.

**Manuel smoke (her görev sonu):**
1. `pnpm run db:migrate` → migration sorunsuz.
2. `pnpm dev` → ELIFECYCLE / lock hatası yok.
3. `http://localhost:3000/` → hero görünür → slider görselli + ok/nokta nav çalışır → auto-play 5sn → hover'da durur → CTA doğru URL'ye gider.
4. Bir galeri post'a `isFeatured=true` set et → anasayfa galeri bölümü görünür → bento düzen doğru.
5. Mobil 375px viewport → tek sütun düzeni bozulmuyor.
6. Admin kampanya formu → cover URL ekle → kaydet → slider'da görünür.
7. Tüm `coverImageUrl` boş bırak → slider tamamen gizlenir.

**Smoke curl:** `curl -s http://localhost:3000/ | grep -i "campaign-slider"` → bileşen render doğrulanır.

## Commit stratejisi

4 küçük commit, her biri kendi içinde geri alınabilir:

1. `feat(db): add campaign visual fields (cover_image_url, cta_label, cta_secondary_label)`
   — migration + Campaign tip + mapper + demo veri.
2. `feat(home): replace campaign strip with full-width campaign slider`
   — `CampaignSlider` (server) + `CampaignSliderClient` + page güncellemesi + eski `CampaignStrip` silinir.
3. `feat(home): add gallery showcase bento section`
   — `GalleryShowcase` + page güncellemesi (gerekirse `repo.listGalleryPosts` eklenir).
4. `feat(admin): add visual fields to campaign form with preview`
   — admin form + server action + zod schema.

## Açık varsayımlar (implementation'da doğrulanır)

- `repo.listGalleryPosts` metodu mevcut mu? Yoksa data layer'a eklenecek.
- Admin kampanya formunun mevcut zod schema'sı `.optional()` alan eklemeye uygun mu?
- `lib/mock/data.ts` demo kampanya formatı — mevcut yapı korunarak yeni alanlar eklenir.

## İlgili memory & dokümanlar

- `[[project_kayhan_solar]]` — master plan
- `[[feedback_demo_mode]]` — demo modunda picsum URL placeholder kullan
- `[[project_integrations]]` — Supabase live, anonim okuma kampanya tablosu için açık
- AGENTS.md — Next.js 16 breaking changes
