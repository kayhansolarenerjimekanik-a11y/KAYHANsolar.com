# Test + Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aşama aşama her sayfa/akışı manuel + CLI doğrulamasıyla test et, ortaya çıkan bug'ları aynı görev içinde düzelt. Bilinen iki bug (kampanya date + redirect) öncelikli; keşif sırasında çıkan diğerleri de planın içinde fix edilir.

**Architecture:** Otomatik test yok (master plan §3.9). Test = `curl` ile HTTP smoke + Supabase'e doğrudan SQL/SDK sorgusu + browser manuel adımları (kullanıcı paralel çalıştırır). Her görev: ön doğrulama → bug varsa fix → yeniden doğrulama → commit. Swap-flag mimari (`AUTH_MODE`/`DATA_MODE=supabase`) korunuyor.

**Tech Stack:** Next.js 16 (App Router + Turbopack), Supabase (RLS), `@supabase/supabase-js` v2, `tsx --env-file`, Zustand cart, repo pattern (`lib/data/index.ts`), proxy.ts middleware.

---

## Bilinen sorunlar (öncelikli)

1. **Kampanya `endDate` geçmişte** — `lib/mock/data.ts:407` campaign `c-1` için `endDate: "2025-06-30"`. Bugün 2026-05-11 → `isActiveNow()` false → "4 panel alana 5.si %70" hiç değerlendirilmiyor. (Bug 1 kök neden)
2. **Kampanya kart tıklaması filtre üretmiyor** — `components/home/campaign-strip.tsx:28` linki `/magaza?kampanya=<slug>` ama `components/shop/shop-view.tsx`'te `kampanya` query param hiç işlenmiyor. Kullanıcı tıklayınca filtresiz mağaza sayfasını görüyor. (Bug 2 kök neden)

---

## File Structure

**Modify (bug fix):**
- `lib/mock/data.ts` — campaign endDate'leri güncel
- `scripts/refresh-campaign-dates.ts` (NEW) — Supabase'deki kampanya endDate'lerini one-shot script ile günceller
- `components/shop/shop-view.tsx` — `kampanya` query param işleme + filtre
- `app/(public)/magaza/page.tsx` — `repo.listCampaigns()` ekle, ShopView'a geç
- `components/home/campaign-strip.tsx` — smart redirect (single-product target → /urun/<slug>)

**Modify (keşifte ortaya çıkabilecek):**
- `proxy.ts` — admin/protected rota dolaşımı sırasında 307 davranışı doğrulanır; kırıksa düzeltilir
- `app/(admin)/kayhan-yonetim/(protected)/*/actions/*.ts` — server action'larda revalidatePath eksikse eklenir
- `lib/data/supabase/*.ts` — mapper hatası bulunursa düzeltilir
- `app/api/search/route.ts` — kampanya/galeri kapsamı eksikse genişletilir

**Create:**
- `scripts/refresh-campaign-dates.ts` — kampanya endDate yenileyici (kullanıcı tekrar çalıştırabilir)
- `scripts/_test-rls.ts` — anon role ile RLS doğrulama (geçici, plan sonunda silinir)
- `scripts/_test-side-effects.ts` — bildirim trigger doğrulama (geçici, plan sonunda silinir)
- `docs/verification/2026-05-11-test-ve-buglar.md` — final raporu

---

## Test araçları (her görevde kullanılır)

```bash
# Dev server (Task 1'de başlatılır, plan boyunca açık kalır)
pnpm dev   # → http://localhost:3001 (port 3000 başkasının elinde)

# Page smoke
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3001/<path>"

# Server action / API
curl -s -X POST "http://localhost:3001/api/<path>" -H "Content-Type: application/json" -d '{...}'

# Supabase SDK script
npx tsx --env-file=.env.local scripts/<name>.ts

# Server log (görev sırasında hata aramak için)
tail -50 "C:/Users/Lenovo/AppData/Local/Temp/claude/c--SOLAR-S1TE/<session>/tasks/<task-id>.output"
```

---

## Sub-Phase A — Recon + setup

### Task 1: Dev server boot + baseline doğrulama

**Files:** none

- [ ] **Step 1: Dev server başlat (Supabase modunda)**

```bash
pnpm dev
```

Beklenen: `✓ Ready in <2s`, port 3001 (3000 başka process'te). Hata yok.

- [ ] **Step 2: 6 public + 1 admin sayfa curl smoke**

```bash
for p in / /magaza /galeri /teklif-al /hakkimizda /iletisim /kayhan-yonetim/giris; do
  echo "$p: $(curl -s -o /dev/null -w "HTTP %{http_code}" "http://localhost:3001$p")"
done
```

Beklenen: hepsi `HTTP 200`. Beklenmeyen bir sayfa 500 verirse, dev server log'unda traceback yakalanıp bir sonraki task'a not olarak eklenir.

- [ ] **Step 3: Protected redirect**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-redirs 0 "http://localhost:3001/kayhan-yonetim"
```

Beklenen: `HTTP 307` (login'e redirect).

- [ ] **Step 4: Commit (baseline marker)**

```bash
git commit --allow-empty -m "checkpoint: test-ve-buglar plani baslangic"
```

---

### Task 2: Mevcut kampanya verisini Supabase'den doğrula

**Files:** none (read-only)

- [ ] **Step 1: Aktif kampanya sayısını doğrula**

```bash
cat > scripts/_check-campaigns.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data } = await sb.from("campaigns").select("id, slug, title, rule_type, applicable_to, target_ids, start_date, end_date, is_active");
  console.table(data);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-campaigns.ts
```

Beklenen: 3 satır. Her satırın `end_date`'ine bak.

- [ ] **Step 2: `isActiveNow()` kontrolü için tarih karşılaştır**

```bash
node -e "console.log('today:', new Date().toISOString())"
```

Bugünü kampanyaların `end_date`'iyle karşılaştır. Beklenen bulgu: `c-1` (Bahar Kampanyası) `2025-06-30`'da bitmiş, yani **şu an inaktif**. Bu, bug 1'in kök nedenidir.

- [ ] **Step 3: Script'i sil ve commit**

```bash
rm scripts/_check-campaigns.ts
git commit --allow-empty -m "recon: kampanya verisi dogrulandi - c-1 endDate gecmis"
```

---

### Task 3: Campaign rule engine'i oku ve bug 1'in mantık katmanını doğrula

**Files:** none (read-only)

- [ ] **Step 1: `lib/campaigns/rules.ts` oku**

`applyBuyXGetY` fonksiyonu (satır 49-80): cart'taki tüm matching item'ların unit fiyatları flat array'e açılıyor, sıralanıyor, `groupSize=buyQty+getQty` ile gruplanıyor, her grubun en ucuz `getQty` tanesine indirim uygulanıyor.

Beklenen analiz: 5 panel × 100 TL → matchingUnitPrices=[100,100,100,100,100], groupSize=5, groupCount=1, discount=100×0.7=70 TL. **Mantık doğru.** Tek sorun: `isActiveNow()` false döndüğü için `evaluateCampaign` `null` dönüyor (satır 138).

- [ ] **Step 2: Plan kararı yaz**

Bug 1 fix = kampanya `endDate`'ini ileri tarihe çekmek. Aday tarih: `2027-12-31T23:59:59Z`. Bu hem demo seed dosyasına (`lib/mock/data.ts`) hem de Supabase tablosuna uygulanmalı.

- [ ] **Step 3: Commit (analiz checkpoint)**

```bash
git commit --allow-empty -m "recon: buy_x_get_y mantigi dogru, fix = endDate'i ileri al"
```

---

## Sub-Phase B — Bug fix: kampanya date + smart redirect

### Task 4: Mock seed + Supabase'deki kampanya tarihlerini yenile

**Files:**
- Modify: `lib/mock/data.ts:407` (c-1 endDate)
- Modify: `lib/mock/data.ts` (varsa c-2, c-3 için de — Step 1'de tara)
- Create: `scripts/refresh-campaign-dates.ts`

- [ ] **Step 1: Mock veride hangi kampanyaların `endDate`'i geçmişte tara**

```bash
grep -nE "endDate:" lib/mock/data.ts
```

Her `endDate` için bugünden eski mi kontrol et.

- [ ] **Step 2: `lib/mock/data.ts` içinde geçmiş `endDate`'leri `"2027-12-31T23:59:59Z"` yap**

```typescript
// lib/mock/data.ts:407 (örnek, gerçek satır numarası grep çıktısına göre düzelt)
endDate: "2027-12-31T23:59:59Z",
```

- [ ] **Step 3: Yenileyici script oluştur**

```typescript
// scripts/refresh-campaign-dates.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const NEW_END = "2027-12-31T23:59:59Z";
  const { data, error } = await sb
    .from("campaigns")
    .update({ end_date: NEW_END })
    .lt("end_date", new Date().toISOString())
    .select("id, slug, end_date");
  if (error) { console.error(error); process.exit(1); }
  console.log("Refreshed:", data);
}
main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: `package.json` script'i ekle**

```json
"scripts": {
  "...": "...",
  "refresh:campaigns": "tsx --env-file=.env.local scripts/refresh-campaign-dates.ts"
}
```

- [ ] **Step 5: Script'i çalıştır**

```bash
pnpm run refresh:campaigns
```

Beklenen: `Refreshed: [{ id, slug, end_date: '2027-12-31T23:59:59Z' }, ...]` (en az `c-1`).

- [ ] **Step 6: Doğrula — kampanya artık aktif mi**

```bash
curl -s "http://localhost:3001/" | grep -c "Bahar Kampanyası"
```

Beklenen: `1` veya daha fazla (campaign strip'te görünüyor).

- [ ] **Step 7: Commit**

```bash
git add lib/mock/data.ts scripts/refresh-campaign-dates.ts package.json
git commit -m "fix(campaigns): endDate'leri yenile (c-1 expire olmustu) + refresh:campaigns scripti"
```

---

### Task 5: Sepette buy-x-get-y kampanyası uygulanıyor mu — doğrulama

**Files:** none (sadece test) — eğer kırıksa Step 4'te `lib/campaigns/rules.ts` düzeltilir

- [ ] **Step 1: 5 panel'i sepete eklemek için zustand store'u dolduran test script**

Tarayıcıda manuel:
1. `http://localhost:3001/magaza?kategori=paneller` aç
2. Bir panel'in "Sepete Ekle" tuşuna 5 kez bas (veya 1 kere bas, sepete git, qty'i 5 yap)
3. `/sepet` aç

Beklenen: "Bahar Kampanyası" satırı sepette görünür, indirim ≈ paneller içindeki en ucuzun %70'i kadar (1 birim için).

CLI tarafı (script ile cart hesabını taklit et):

```bash
cat > scripts/_test-cart-campaign.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
import { evaluateCampaign } from "../lib/campaigns/rules";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: campaigns } = await sb.from("campaigns").select("*");
  const { data: products } = await sb.from("products").select("id, category_id, name, current_price").limit(2);
  const panels = (products ?? []).slice(0, 1);
  const items = panels.flatMap(p => Array.from({ length: 5 }, () => ({
    productId: p.id, price: Number(p.current_price), quantity: 1,
  }))).map((x, i, arr) => ({ ...x, quantity: 1 }));
  const merged: Record<string, { productId: string; price: number; quantity: number }> = {};
  for (const it of items) {
    merged[it.productId] = merged[it.productId]
      ? { ...merged[it.productId], quantity: merged[it.productId].quantity + 1 }
      : it;
  }
  const cartItems = Object.values(merged);
  const productCategoryById: Record<string, string> = {};
  for (const p of products ?? []) productCategoryById[p.id] = p.category_id;
  const input = { items: cartItems, productCategoryById };
  console.log("cart items:", cartItems);
  for (const c of campaigns ?? []) {
    // mapping: snake → camel for engine
    const campaign = {
      id: c.id, slug: c.slug, title: c.title, description: c.description,
      ruleType: c.rule_type, ruleConfig: c.rule_config, applicableTo: c.applicable_to,
      targetIds: c.target_ids, startDate: c.start_date, endDate: c.end_date,
      isActive: c.is_active, displayOnHomepage: c.display_on_homepage,
    };
    const r = evaluateCampaign(campaign as any, input);
    console.log(c.title, "→", r ? r.result : "INAKTIF veya UYGULAMA YOK");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx --env-file=.env.local scripts/_test-cart-campaign.ts
```

Beklenen: "Bahar Kampanyası" satırı `{ discountAmount: <birim_fiyat * 0.7>, freeShipping: false }`. Aksi takdirde mantığı debug et.

- [ ] **Step 2: Test scriptini sil**

```bash
rm scripts/_test-cart-campaign.ts
```

- [ ] **Step 3: Tarayıcıda sepet doğrula**

`/sepet` aç → kampanya satırı `Uygulanan Kampanya: Bahar Kampanyası — −X TL` görünmeli.

- [ ] **Step 4: Commit (test geçti marker)**

```bash
git commit --allow-empty -m "verify: buy_x_get_y sepette uygulaniyor"
```

---

### Task 6: Kampanya kartı tıklaması smart redirect

**Files:**
- Modify: `components/home/campaign-strip.tsx`
- Modify: `components/shop/shop-view.tsx` — `kampanya` query param işle
- Modify: `app/(public)/magaza/page.tsx` — `repo.listCampaigns()` ekle, ShopView'a `campaigns` geç

- [ ] **Step 1: `components/home/campaign-strip.tsx`'i smart redirect olacak şekilde güncelle**

```tsx
// components/home/campaign-strip.tsx
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
                <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-colors group-hover:text-foreground" strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: `app/(public)/magaza/page.tsx`'e campaigns ekle**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { ShopView } from "@/components/shop/shop-view";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "Güneş panelleri, bataryalar, inverterler, aydınlatma ve paket sistemler.",
};

export default async function ShopPage() {
  const [products, categories, campaigns] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
    repo.listCampaigns(),
  ]);
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopView products={products} categories={categories} campaigns={campaigns} />
    </Suspense>
  );
}

function ShopFallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-8 w-32 animate-pulse rounded-md bg-elevated" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-elevated" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/shop/shop-view.tsx`'e kampanya filter logic ekle**

`ShopViewProps` interface'i ve filter logic'i değişir. Patch:

```tsx
// interface güncelle
interface ShopViewProps {
  products: Product[];
  categories: Category[];
  campaigns: Campaign[];   // YENİ
}

// import güncelle
import type { Campaign, Category, Product } from "@/types";

// destructure
export function ShopView({ products, categories, campaigns }: ShopViewProps) {
```

`filtered` `useMemo` içine (line 125 civarı, `filters.categorySlug` block'unun hemen üstüne) ekle:

```tsx
const campaignSlug = searchParams.get("kampanya");
// ...
const filtered = useMemo(() => {
  let list = [...products];

  // YENİ: kampanya filtresi
  if (campaignSlug) {
    const c = campaigns.find((c) => c.slug === campaignSlug);
    if (c) {
      if (c.applicableTo === "product") {
        list = list.filter((p) => c.targetIds.includes(p.id));
      } else if (c.applicableTo === "category") {
        list = list.filter((p) => c.targetIds.includes(p.categoryId));
      }
      // applicableTo='all' → tüm liste, filtre yok
    }
  }

  if (filters.categorySlug) { ... } // mevcut
  // ... rest unchanged
}, [filters, query, sortBy, products, categories, campaignSlug, campaigns]);
```

Ayrıca kampanya seçiliyse listenin üstüne bir banner ekle:

```tsx
const activeCampaign = campaignSlug
  ? campaigns.find((c) => c.slug === campaignSlug)
  : null;

// JSX'te <header>'ın hemen altına:
{activeCampaign && (
  <div className="mb-6 rounded-2xl border border-lime-primary/40 bg-lime-primary/5 p-4">
    <p className="text-sm font-medium text-foreground">
      Kampanya filtresi: <span className="text-lime-primary">{activeCampaign.title}</span>
    </p>
    {activeCampaign.description && (
      <p className="mt-1 text-xs text-muted">{activeCampaign.description}</p>
    )}
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("kampanya");
        const qs = params.toString();
        router.replace(qs ? `/magaza?${qs}` : "/magaza", { scroll: false });
      }}
      className="mt-2 text-xs text-muted underline hover:text-foreground"
    >
      Filtreyi kaldır
    </button>
  </div>
)}
```

- [ ] **Step 4: tsc temizliği**

```bash
npx tsc --noEmit
```

Beklenen: 0 hata.

- [ ] **Step 5: Manuel doğrulama**

1. `http://localhost:3001/` aç → "Bahar Kampanyası" kartına tıkla
2. URL `/magaza?kategori=paneller&kampanya=bahar-kampanyasi-2025` olmalı (cat-panel tek kategori)
3. Listede sadece paneller görünmeli + yeşil banner "Bahar Kampanyası" yazısıyla
4. "Filtreyi kaldır" tuşuna bas → URL temizlenir

- [ ] **Step 6: Curl smoke**

```bash
curl -s "http://localhost:3001/magaza?kampanya=bahar-kampanyasi-2025" | grep -c "Kampanya filtresi:"
```

Beklenen: `1`.

- [ ] **Step 7: Commit**

```bash
git add components/home/campaign-strip.tsx components/shop/shop-view.tsx app/\(public\)/magaza/page.tsx
git commit -m "fix(campaigns): kampanya kartlari smart redirect + magaza ?kampanya= filtresi"
```

---

## Sub-Phase C — Public site test sweep

> **Her görevde**: önce curl ile HTTP smoke + dev log'da hata ara. Sonra kullanıcıya tarayıcı adımlarını "manuel doğrula" olarak ilet. Bug çıkarsa aynı görev içinde düzelt, retest, commit. Çıkmazsa boş commit ile checkpoint at.

### Task 7: Anasayfa (`/`)

**Files:** (sorun çıkarsa) `app/(public)/page.tsx`, `components/home/*`

- [ ] **Step 1: HTTP + bölüm sayım**

```bash
curl -s "http://localhost:3001/" > /tmp/home.html
echo "size: $(wc -c < /tmp/home.html) bytes"
for s in "Güncel Kampanyalar" "Öne Çıkan" "Kategoriler" "Bahar Kampanyası" "Jinko"; do
  echo "$s: $(grep -c "$s" /tmp/home.html)"
done
```

Beklenen: hepsi >=1.

- [ ] **Step 2: Dev log error scan**

```bash
tail -100 <dev-log-file> | grep -iE "error|warn|fail" | grep -v "Turbopack" | head -10
```

Beklenen: 0 satır.

- [ ] **Step 3: Manuel adım listesi** (kullanıcıya ilet)

- Anasayfayı aç (`/`)
- Hero görüntülenmeli (CTA tuşları çalışmalı: "Hesapla", "Mağaza")
- Kategori grid (5 kategori card) görünmeli, her birine tıklayınca `/magaza?kategori=<slug>` açılmalı
- Featured products grid 4-6 ürün göstermeli, "Sepete Ekle" tuşu çalışmalı (toast)
- Campaign strip 3 kampanya göstermeli, kart tıklaması Task 6'daki smart redirect ile çalışmalı
- Footer linkleri (KVKK, mesafeli satış, iade, gizlilik, çerez, sss) doğru sayfaya gitmeli

Kullanıcı bir bug rapor ederse, "Step 4: Fix" eklenir, gerekli dosya düzeltilir, retest, sonra Step 5 commit.

- [ ] **Step 4: Commit checkpoint**

```bash
git commit --allow-empty -m "test: anasayfa smoke (gozden gecirildi)"
```

---

### Task 8: `/magaza` filtreler + sort + arama

**Files:** (bug çıkarsa) `components/shop/shop-view.tsx`, `components/shop/filters.tsx`

- [ ] **Step 1: Tüm filtre kombinasyonlarını curl ile dene**

```bash
for url in \
  "/magaza" \
  "/magaza?kategori=paneller" \
  "/magaza?siralama=fiyat-artan" \
  "/magaza?siralama=fiyat-azalan" \
  "/magaza?q=jinko" \
  "/magaza?stokta=1" \
  "/magaza?min=10000&max=50000" \
  "/magaza?markalar=Jinko"; do
  code=$(curl -s -o /tmp/m.html -w "%{http_code}" "http://localhost:3001$url")
  count=$(grep -oc "ProductCard\|product-card\|/urun/" /tmp/m.html)
  echo "$url → $code ($count card linki)"
done
```

Beklenen: hepsi 200. `q=jinko` Jinko ürünlerini filtrelemeli. `stokta=1` stokQuantity>0 olanları göstermeli.

- [ ] **Step 2: Boş sonuç senaryosu**

```bash
curl -s "http://localhost:3001/magaza?q=zzzzz" | grep -c "Sonuç bulunamadı"
```

Beklenen: `1`.

- [ ] **Step 3: Manuel kullanıcı testi**

- Filtreler panelinde "Stokta" checkbox'ı çalışmalı (URL'e `stokta=1` ekleniyor mu)
- Marka multi-select işlemeli
- Min/max fiyat input'u yazınca URL güncellenmeli
- Sıralama dropdown'u değişince liste yeniden sıralanmalı
- Mobile: filtre overlay açılmalı, body scroll lock olmalı
- "Filtreleri Sıfırla" tuşu URL'i temizlemeli

- [ ] **Step 4: Commit checkpoint**

```bash
git commit --allow-empty -m "test: magaza filtre/sort/arama smoke"
```

---

### Task 9: Ürün detay sayfası

**Files:** (bug çıkarsa) `app/(public)/urun/[slug]/page.tsx`, `components/shop/product-gallery.tsx`, `components/shop/add-to-cart.tsx`

- [ ] **Step 1: Curl smoke — birkaç ürün için**

```bash
for slug in "jinko-550w-monokristal-panel" "deye-5kw-hibrit-inverter" "luminer-100ah-lityum-batarya"; do
  echo "$slug: $(curl -s -o /dev/null -w "HTTP %{http_code}" "http://localhost:3001/urun/$slug")"
done
```

Beklenen: 3'ü de 200 (eğer mock seed'de bu slug'lar varsa; yoksa `repo.listProducts()`'tan ilk 3 slug'ı al).

- [ ] **Step 2: Sayfa içeriği kontrol**

```bash
curl -s "http://localhost:3001/urun/jinko-550w-monokristal-panel" > /tmp/p.html
for s in "Sepete Ekle" "Teknik" "Açıklama" "TL" "<title"; do
  echo "$s: $(grep -c "$s" /tmp/p.html)"
done
```

Beklenen: hepsi >=1.

- [ ] **Step 3: 404 senaryosu**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3001/urun/yok-boyle-urun"
```

Beklenen: 404.

- [ ] **Step 4: Manuel adım listesi**

- Galeri swipe / thumbnail click çalışmalı
- Tab'lar (Genel, Teknik Özellikler, Açıklama) içerik değiştirmeli
- "Sepete Ekle" tuşu toast göstermeli, header'daki sepet sayısı artmalı
- Miktar input'u +/- tuşları çalışmalı
- Stok 0 ise "Stok bildirimine kaydol" formu görünmeli
- İlgili ürünler bölümü görünmeli (varsa)

- [ ] **Step 5: Commit checkpoint**

```bash
git commit --allow-empty -m "test: urun detay smoke"
```

---

### Task 10: Sepet + WhatsApp checkout

**Files:** (bug çıkarsa) `components/shop/cart-view.tsx`, `app/(public)/sepet/page.tsx`, cart action

- [ ] **Step 1: Sepet sayfası HTTP smoke**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3001/sepet"
```

Beklenen: 200.

- [ ] **Step 2: Manuel akış**

1. 5 adet Jinko panel ekle (Task 9'daki "Sepete Ekle" + qty=5)
2. `/sepet` aç
3. Alt toplam doğru mu
4. "Uygulanan Kampanyalar" bölümünde "Bahar Kampanyası" görünmeli (Task 5'te zaten doğrulandı)
5. İndirimli toplam doğru hesaplanmalı
6. Free shipping kampanyası varsa "Kargo Ücretsiz" satırı
7. Adet artır/azalt çalışmalı
8. Ürün sil çalışmalı
9. "WhatsApp ile sipariş ver" tuşu `https://wa.me/<phone>?text=<encoded-order-summary>` linkini açmalı

- [ ] **Step 3: WhatsApp link içerik kontrolü**

Tarayıcıda inspect element ile WhatsApp link'in href'ini al, URL decode et. Beklenen format:
```
Merhaba, KAYHAN Solar'dan sipariş vermek istiyorum:
- 5x Jinko 550W Monokristal Panel — 50,000 TL
Toplam: 50,000 TL (Bahar Kampanyası indirimi -7,000 TL)
Net: 43,000 TL
```

- [ ] **Step 4: Sipariş kaydı (admin tarafında görünecek)**

WhatsApp tuşu aslında bir server action tetikliyorsa, Supabase `orders` tablosuna kayıt atılmalı. Eğer atmıyorsa (sadece dış link), bu davranış kabul — yorum olarak not et.

Supabase'i kontrol et:

```bash
cat > scripts/_check-orders.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("orders").select("id, order_number, status, total_amount, created_at").order("created_at", { ascending: false }).limit(5);
  console.table(data);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-orders.ts
rm scripts/_check-orders.ts
```

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: sepet + whatsapp checkout smoke"
```

---

### Task 11: `/teklif-al` 6 adımlı wizard

**Files:** (bug çıkarsa) `components/offer-wizard/*`, `app/(public)/teklif-al/actions/*`

- [ ] **Step 1: HTTP smoke**

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:3001/teklif-al"
```

Beklenen: 200.

- [ ] **Step 2: 6 adımı manuel doldur**

1. **Welcome** — başla tuşu
2. **Personal** — ad, telefon, email, mesaj
3. **Location** — il/ilçe, kurulum yeri (çatı/arazi), medya yükleme (opsiyonel, master plan §6.5)
4. **System** — cihaz listesi (appliance-list-editor)
5. **Confirm** — KVKK checkbox + Cloudflare Turnstile (env-driven, demo'da devre dışı)
6. **Success** — "Teklifin alındı, 24 saat içinde dönüş" mesajı

- [ ] **Step 3: Form gönder + Supabase'de offer satırı doğrula**

```bash
cat > scripts/_check-offer.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: offers } = await sb.from("offers").select("*").order("created_at", { ascending: false }).limit(3);
  console.log("offers:", offers);
  const { data: notif } = await sb.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(3);
  console.log("notifications:", notif);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-offer.ts
rm scripts/_check-offer.ts
```

Beklenen: `offers` tablosunda yeni satır + `admin_notifications` tablosunda `kind='new_offer'` satır.

- [ ] **Step 4: Validation senaryoları**

Zorunlu alanlar boş bırakılınca form submit edilemiyor mu (zod schema). Email yanlış format ise hata mesajı.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: teklif-al wizard 6 adim smoke + offer kaydi dogrulandi"
```

---

### Task 12: `/galeri` + `/galeri/[slug]`

**Files:** (bug çıkarsa) `app/(public)/galeri/page.tsx`, `app/(public)/galeri/[slug]/page.tsx`

- [ ] **Step 1: Liste sayfası**

```bash
curl -s "http://localhost:3001/galeri" > /tmp/g.html
echo "size: $(wc -c < /tmp/g.html)"
grep -c "/galeri/" /tmp/g.html
```

Beklenen: birden fazla `/galeri/<slug>` linki.

- [ ] **Step 2: İlk galeri post'unun slug'ını al, detay sayfasını çek**

```bash
SLUG=$(grep -oE "/galeri/[a-z0-9-]+" /tmp/g.html | head -1 | sed 's|/galeri/||')
curl -s -o /dev/null -w "$SLUG → HTTP %{http_code}\n" "http://localhost:3001/galeri/$SLUG"
```

Beklenen: 200.

- [ ] **Step 3: Manuel kontrol**

- Liste sayfası grid layout, her post için kapak görseli + başlık
- Post'a tıklayınca detay açılmalı: gallery media slider, açıklama, ilgili ürünler (varsa)
- Back button çalışmalı

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test: galeri liste + detay smoke"
```

---

### Task 13: Site genelinde arama

**Files:** (bug çıkarsa) `components/search/search-dialog.tsx`, `lib/search.ts`, `app/api/search/route.ts`

- [ ] **Step 1: API endpoint smoke**

```bash
curl -s "http://localhost:3001/api/search?q=jinko" | python -c "import sys, json; d=json.load(sys.stdin); print('total:', sum(len(v) for v in d.values()) if isinstance(d, dict) else len(d)); print(json.dumps(d, ensure_ascii=False)[:500])"
```

Beklenen: en az 1 Jinko sonucu (products).

- [ ] **Step 2: Boş query**

```bash
curl -s "http://localhost:3001/api/search?q=" | head -c 200
```

Beklenen: empty results object veya 400 (zarif handle).

- [ ] **Step 3: Manuel**

- Header'da arama ikonu / kısayol (Cmd+K) çalışmalı
- Yazınca autocomplete açılmalı (debounce var)
- Sonuçta product, gallery post, ve sayfa kategorisi olmalı
- Bir sonuca tıklayınca doğru sayfaya gitmeli
- "Sonuç yok" mesajı boş query için

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test: site arama (api+dialog) smoke"
```

---

### Task 14: AI chat (FAB)

**Files:** (bug çıkarsa) `components/ai/chat-fab.tsx`, `components/ai/chat-panel.tsx`, `app/api/ai/chat/route.ts`, `lib/gemini/*`

- [ ] **Step 1: Chat endpoint smoke (consent gating)**

```bash
curl -s -X POST "http://localhost:3001/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Merhaba, 5 kW sistem ne kadar?"}]}' \
  | head -c 1000
```

Beklenen: stream chunk'ları (text/event-stream). KVKK consent gerekli ise 403 dönüyor olmalı.

- [ ] **Step 2: KVKK consent öncesi davranış**

Tarayıcı first-load → cookie banner görünmeli. Reddederse chat FAB hala görünür ama mesaj yollanamamalı (hata mesajı veya disabled).

- [ ] **Step 3: Manuel chat senaryosu**

1. KVKK consent ver (analytics + chat cookie'lerini onayla)
2. Sağ alttaki chat FAB'a tıkla
3. "Bahar kampanyası ne kadar?" yaz
4. Yanıt stream'lemeli (Gemini Flash → RAG retrieval'den ai_knowledge tablosundan)
5. TTS tuşu (varsa) yanıtı okumalı
6. Konuşma geçmişi panel kapanıp tekrar açılınca korunmalı

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test: ai chat stream + consent gating smoke"
```

---

### Task 15: Statik sayfalar + theme toggle + KVKK consent

**Files:** (bug çıkarsa) `app/(public)/{hakkimizda,iletisim,kvkk,gizlilik,iade,sss,mesafeli-satis,cerez-politikasi}/page.tsx`, `components/shared/theme-toggle.tsx`, `components/consent/cookie-banner.tsx`

- [ ] **Step 1: Statik sayfa HTTP smoke**

```bash
for p in /hakkimizda /iletisim /kvkk /gizlilik /iade /sss /mesafeli-satis /cerez-politikasi /hesabim; do
  echo "$p: $(curl -s -o /dev/null -w "HTTP %{http_code}" "http://localhost:3001$p")"
done
```

Beklenen: hepsi 200.

- [ ] **Step 2: Manuel**

- Theme toggle: header'daki ay/güneş ikonu → dark/light arası geçiş; `localStorage`'da kalıcı
- Cookie banner: ilk ziyarette görünmeli, "Kabul" / "Reddet" tuşları çalışmalı
- "Sadece zorunlu" seçilince analytics + AI chat çağrıları yapılmamalı
- `/cerez-politikasi`'nda hangi cookie'lerin set edildiği listelenmeli

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "test: statik sayfalar + theme toggle + kvkk consent smoke"
```

---

## Sub-Phase D — Admin panel test sweep

> **Önce login ol**, sonra her admin sayfasını gez. Tarayıcı session'ını koru.

### Task 16: Admin login + protected redirect

**Files:** (bug çıkarsa) `proxy.ts`, `lib/auth/supabase-provider.ts`, `app/(admin)/kayhan-yonetim/actions/auth.ts`

- [ ] **Step 1: Yanlış şifre**

`/kayhan-yonetim/giris` → `admin@kayhansolar.com` / `yanlis` → form altı "Hatalı email veya şifre" hata göstermeli, 200 ile aynı sayfada kalmalı.

- [ ] **Step 2: Doğru şifre**

`admin@kayhansolar.com` / `kayhan2026` → `/kayhan-yonetim` (dashboard) yönlendirmeli. HMAC session cookie set edilmeli.

- [ ] **Step 3: Cookie set kontrolü**

Browser devtools → Application → Cookies → `kayhan_session` cookie'i 8 saat TTL ile set edildiğini gör.

- [ ] **Step 4: Logout**

Topbar'daki çıkış ikonu → `/kayhan-yonetim` rotaları artık `/giris`'e redirect ediyor.

- [ ] **Step 5: Non-admin user senaryosu** (gelişmiş, opsiyonel)

`profiles` tablosunda role='customer' bir user oluştur (`scripts/_test-non-admin.ts`), o credential ile login deneyin → "Bu hesap admin değil" tarzı hata göstermeli.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "test: admin login + protected + logout smoke"
```

---

### Task 17: Dashboard

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/page.tsx`, `components/admin/notification-bell.tsx`

- [ ] **Step 1: HTTP smoke (authenticated)**

Browser'da `/kayhan-yonetim` aç. 4 KPI kart görünmeli: Yeni Teklif, Bekleyen Sipariş, Düşük Stok, Aktif Kampanya.

- [ ] **Step 2: KPI sayım doğrulama (Supabase)**

```bash
cat > scripts/_check-kpis.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: newOffers } = await sb.from("offers").select("*", { head: true, count: "exact" }).gte("created_at", today.toISOString()).eq("status", "new");
  const { count: pendingOrders } = await sb.from("orders").select("*", { head: true, count: "exact" }).in("status", ["pending", "processing"]);
  const { data: lowStock } = await sb.from("products").select("id").lte("stock_quantity", 5);
  const { count: activeCampaigns } = await sb.from("campaigns").select("*", { head: true, count: "exact" }).eq("is_active", true);
  console.log({ newOffers, pendingOrders, lowStock: lowStock?.length, activeCampaigns });
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-kpis.ts
rm scripts/_check-kpis.ts
```

Dashboard'daki sayılarla karşılaştır. Eşleşmezse hangi sorgu yanlış yazılmış, bul ve düzelt.

- [ ] **Step 3: Notification bell**

Topbar'daki zil ikonu → tıklanınca son 10 bildirim açılmalı, her birinin `kind` (new_offer / new_order / low_stock), title, created_at. "Okundu" tuşu çalışmalı.

- [ ] **Step 4: Son teklif/sipariş listeleri**

Dashboard altındaki "Son Teklifler" ve "Son Siparişler" tabloları en yeni 5 satırı göstermeli, her satırın "Görüntüle" linki doğru detay sayfasına gitmeli.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: admin dashboard kpi + bell + lists smoke"
```

---

### Task 18: Ürünler CRUD + revalidatePath

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/urunler/actions/*.ts`, `components/admin/product-form.tsx`

- [ ] **Step 1: Create**

`/kayhan-yonetim/urunler/yeni` → form doldur (ad, slug, kategori, fiyat, stok, brand, açıklama, en az 1 medya URL). "Kaydet" tuşu.

Beklenen: `/kayhan-yonetim/urunler` listesine yönlenir, yeni ürün görünür. Public taraf `/magaza` da revalidate olmalı.

- [ ] **Step 2: Public revalidate doğrula**

```bash
# Ürünü kaydettikten ~3sn sonra
curl -s "http://localhost:3001/magaza?q=<yeni-urun-adi>" | grep -c "<yeni-urun-adi>"
```

Beklenen: 1+. Eğer 0 ise server action içinde `revalidatePath('/magaza')` ve `revalidatePath('/')` çağrıları eksik olabilir.

- [ ] **Step 3: Update — stok=1 ile low-stock notification tetikle**

Listeden ürünü düzenle → stok=1 yap → kaydet.

```bash
cat > scripts/_check-lowstock.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("admin_notifications").select("*").eq("kind", "low_stock").order("created_at", { ascending: false }).limit(3);
  console.log(data);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-lowstock.ts
rm scripts/_check-lowstock.ts
```

Beklenen: yeni `low_stock` bildirimi listede.

- [ ] **Step 4: Delete**

Yeni oluşturduğun test ürünü sil. Listeden kaybolmalı, `/urun/<slug>` 404 dönmeli.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: admin urunler crud + revalidate + low-stock trigger"
```

---

### Task 19: Kategoriler CRUD

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/kategoriler/*`

- [ ] **Step 1: Inline create / edit / delete**

Kategoriler sayfasında inline form (ad, slug, sıralama).

- Yeni kategori ekle → liste güncellenir
- Mevcut kategoriyi düzenle (sıralama numarasını değiştir) → kaydet → görünüm güncellenir
- Test kategorisini sil → listeden kaybolur

- [ ] **Step 2: Magaza filtre revalidate**

Yeni kategori `/magaza` filter panel'inde görünmeli (revalidate).

```bash
curl -s "http://localhost:3001/magaza" | grep -c "<yeni-kategori-adi>"
```

Beklenen: 1+.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "test: admin kategoriler crud smoke"
```

---

### Task 20: Kampanyalar CRUD

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/kampanyalar/*`, `components/admin/campaign-form.tsx`

- [ ] **Step 1: 5 rule type da formla create edebiliyor mu**

Her ruleType için yeni kampanya yarat (test_ önekiyle):
- `percent_off` — discountPercent=20
- `buy_x_get_y_discount` — buyQty=2, getQty=1, discountPercent=50
- `bundle_discount` — requiredProductIds=[id1,id2], discountAmount=5000
- `free_shipping` — applicableTo=all
- `fixed_amount_off` — discountAmount=1000

- [ ] **Step 2: Anasayfa kampanya şeridinde görünüm**

`displayOnHomepage=true` set ettiklerin `/`'da görünmeli.

- [ ] **Step 3: Sepette uygulanma** (test_buy_x kampanyasını dene)

Public'te 3 panel sepete ekle (test_buy_x kampanyasının applicableTo bağlı olduğu kategori için), sepet sayfasında indirim satırı görünmeli.

- [ ] **Step 4: Test kampanyalarını sil**

5 test_ kampanyasını sil.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: admin kampanyalar crud (5 rule type) smoke"
```

---

### Task 21: Galeri CRUD

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/galeri/*`

- [ ] **Step 1: Yeni post oluştur**

`/kayhan-yonetim/galeri/yeni` → title, slug, description, cover image URL, media URL(s), associated product IDs.

- [ ] **Step 2: Public sayfada görünüm**

`/galeri` listesinde + `/galeri/<slug>` detayında yeni post görünmeli.

- [ ] **Step 3: Sil**

Test post'unu sil, listeden ve detaydan kaybolmalı.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test: admin galeri crud smoke"
```

---

### Task 22: Teklifler — incoming, status, response

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/teklifler/*`

- [ ] **Step 1: Task 11'de oluşturulan teklifin admin listesinde görünmesi**

`/kayhan-yonetim/teklifler` → status tab "Yeni" altında Task 11'de yollanan teklif olmalı.

- [ ] **Step 2: Detay aç + solar calculator**

Teklife tıkla → müşteri bilgileri, cihaz listesi, hesaplama aracı (`lib/solar-calculator.ts`'ten gelen kW/panel/inverter/batarya tahmini), yanıt formu.

- [ ] **Step 3: Status değiştir**

Status'u "İnceleniyor"a çek → liste tab'ı güncellenir, teklif "İnceleniyor" tab'ında görünür.

- [ ] **Step 4: WhatsApp / email butonları**

Müşteri telefon → `wa.me/<number>` linki açılmalı. Email → `mailto:<email>` linki.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: admin teklifler liste + detay + status + actions smoke"
```

---

### Task 23: Siparişler

**Files:** (bug çıkarsa) `app/(admin)/kayhan-yonetim/(protected)/siparisler/*`

- [ ] **Step 1: Liste**

`/kayhan-yonetim/siparisler` → varsa Task 10'daki sipariş kayıtları (WhatsApp gönderim sonrası server action çalıştıysa).

- [ ] **Step 2: 7 status değiştir**

Inline dropdown ile her statüye sırayla geç: pending → processing → packed → shipped → out_for_delivery → delivered → cancelled. Her değişiklikten sonra Supabase'i kontrol et:

```bash
cat > scripts/_check-orders-status.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("orders").select("order_number, status").order("updated_at", { ascending: false }).limit(3);
  console.table(data);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_check-orders-status.ts
rm scripts/_check-orders-status.ts
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "test: admin siparisler liste + status smoke"
```

---

### Task 24: Stok bildirimleri + AI eğitim + Analitik + Kullanıcılar + Ayarlar

**Files:** (bug çıkarsa) ilgili admin sayfa dosyaları

- [ ] **Step 1: Stok bildirimleri**

`/kayhan-yonetim/stok-bildirimleri` → public'te bir stoğu tükenmiş ürün için bildirim formu doldur → admin sayfasında kayıt görünmeli. "Bildirim Yolla" tuşu (Resend entegrasyonu varsa email gönderir, demo'da yalnızca status güncelleyebilir).

- [ ] **Step 2: AI eğitim**

`/kayhan-yonetim/ai-egitim` → mevcut knowledge chunk'ları listelenir (Task 1'de count=8 idi). "Yeni içerik yükle" → text yapıştır → kaydet → embedding üretildiğini gör (Supabase `ai_knowledge` count artmalı).

- [ ] **Step 3: Analitik**

`/kayhan-yonetim/analitik` → KVKK consent + analytics_events tablosundan SVG chart'lar (master plan §11). Public tarafta sayfa ziyareti yap → analytics_events tablosunda kayıt artmalı → admin chart güncellemeli (revalidate / refresh).

- [ ] **Step 4: Kullanıcılar**

`/kayhan-yonetim/kullanicilar` → en az 1 admin satır. Demo modda extra user yok, supabase modda Task 16'da oluşturduğumuz non-admin user (varsa) burada listelenir.

- [ ] **Step 5: Ayarlar**

`/kayhan-yonetim/ayarlar` → telefon/email/whatsapp/adres + 4 sosyal medya. Bir değer değiştir (örn telefon) → kaydet → public footer'da güncel telefon görünmeli (revalidate).

```bash
curl -s "http://localhost:3001/" | grep -A2 "telefon\|tel:" | head -5
```

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "test: admin (stok/ai/analitik/kullanicilar/ayarlar) smoke"
```

---

## Sub-Phase E — Backend / RLS / side-effects

### Task 25: RLS politika doğrulaması (anon role)

**Files:** Create temporary `scripts/_test-rls.ts`, sil sonunda.

- [ ] **Step 1: Anon role ile public tabloları SELECT yapabiliyor mu**

```typescript
// scripts/_test-rls.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // SELECT public tables (should work)
  for (const t of ["products", "categories", "campaigns", "gallery_posts", "site_settings"]) {
    const { data, error } = await anon.from(t).select("id").limit(1);
    console.log(`anon SELECT ${t}:`, error?.message ?? `OK (${data?.length} rows)`);
  }

  // SELECT private tables (should fail)
  for (const t of ["profiles", "admin_notifications", "offers", "orders"]) {
    const { data, error } = await anon.from(t).select("*").limit(1);
    console.log(`anon SELECT ${t}:`, error ? `BLOCKED: ${error.message}` : `LEAKED: ${data?.length} rows`);
  }

  // INSERT offers (should work — anonymous submission)
  const { error: oErr } = await anon.from("offers").insert({
    name: "RLS Test", phone: "0000000000", email: "rls@test.com",
    city: "Test", install_location: "roof", message: "test",
    appliances: [], status: "new",
  });
  console.log("anon INSERT offers:", oErr?.message ?? "OK");

  // INSERT orders (should work)
  const { error: orErr } = await anon.from("orders").insert({
    order_number: `TEST-${Date.now()}`, customer_name: "RLS Test",
    customer_phone: "0000000000", items: [], total_amount: 0,
    status: "pending",
  });
  console.log("anon INSERT orders:", orErr?.message ?? "OK");

  // UPDATE products (should fail — admin only)
  const { data: p } = await anon.from("products").select("id").limit(1);
  if (p?.[0]) {
    const { error: uErr } = await anon.from("products").update({ name: "HACK" }).eq("id", p[0].id);
    console.log("anon UPDATE products:", uErr ? `BLOCKED: ${uErr.message}` : "LEAKED!");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
```

```bash
npx tsx --env-file=.env.local scripts/_test-rls.ts
```

Beklenen tablo:

| Test | Beklenen |
|---|---|
| anon SELECT products | OK |
| anon SELECT categories | OK |
| anon SELECT campaigns | OK |
| anon SELECT gallery_posts | OK |
| anon SELECT site_settings | OK |
| anon SELECT profiles | BLOCKED |
| anon SELECT admin_notifications | BLOCKED |
| anon SELECT offers | BLOCKED |
| anon SELECT orders | BLOCKED |
| anon INSERT offers | OK |
| anon INSERT orders | OK |
| anon UPDATE products | BLOCKED |

Eşleşmeyen satır = RLS politikası kırık. Hangi migration'da olduğu bulunur, düzeltilir, `pnpm run db:migrate` ile reapply edilir.

- [ ] **Step 2: Test scriptini sil**

```bash
rm scripts/_test-rls.ts
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "verify: rls politikalari anon/admin matrisi dogrulandi"
```

---

### Task 26: Side-effect bildirim trigger'ları (low-stock, new-offer, new-order)

**Files:** Create `scripts/_test-side-effects.ts`, sil sonunda. (Eğer trigger eksikse `lib/data/supabase/{products,offers,orders}.ts` düzeltilir.)

- [ ] **Step 1: low_stock trigger (Task 18'de zaten denendi, burada otomatik doğrulama)**

```typescript
// scripts/_test-side-effects.ts
import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 1. low_stock: bir ürünün stoğunu 2'ye düşür (admin clientla)
  const { data: products } = await sb.from("products").select("id, name, stock_quantity").limit(1);
  const p = products?.[0];
  if (!p) { console.log("no products"); return; }
  const before = await sb.from("admin_notifications").select("id", { head: true, count: "exact" }).eq("kind", "low_stock");
  // ÖNEMLİ: trigger app-katmanında çalışıyor (lib/data/supabase/products.ts içinde),
  // doğrudan sb.from('products').update() ile çalışmayabilir. Bu yüzden HTTP üzerinden server action tetiklenmeli.
  // Skip: low_stock'u Task 18 manuel doğruladı. Burada sadece son N saatte oluşan low_stock kayıt sayısını rapor et.
  const since = new Date(Date.now() - 24*3600*1000).toISOString();
  const { count } = await sb.from("admin_notifications").select("*", { head: true, count: "exact" }).eq("kind", "low_stock").gte("created_at", since);
  console.log("low_stock bildirimi (son 24h):", count);

  // 2. new_offer count
  const { count: nOff } = await sb.from("admin_notifications").select("*", { head: true, count: "exact" }).eq("kind", "new_offer").gte("created_at", since);
  console.log("new_offer bildirimi (son 24h):", nOff);

  // 3. new_order count
  const { count: nOrd } = await sb.from("admin_notifications").select("*", { head: true, count: "exact" }).eq("kind", "new_order").gte("created_at", since);
  console.log("new_order bildirimi (son 24h):", nOrd);
}
main();
```

```bash
npx tsx --env-file=.env.local scripts/_test-side-effects.ts
```

Beklenen: 3 satır da `>=1` (Task 11, 18, 22'den geldi).

- [ ] **Step 2: Test scriptini sil**

```bash
rm scripts/_test-side-effects.ts
```

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "verify: low_stock + new_offer + new_order trigger'lari calisiyor"
```

---

### Task 27: Mapper round-trip integrity

**Files:** (bug çıkarsa) `lib/data/mappers.ts`, ilgili `lib/data/supabase/*.ts`

- [ ] **Step 1: Manuel — admin'de bir ürün create + Supabase'den fetch + repo'dan fetch**

```bash
cat > scripts/_test-mapper.ts << 'EOF'
import { createClient } from "@supabase/supabase-js";
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from("products").select("*").limit(1);
  console.log("RAW row:", data?.[0]);
}
main();
EOF
npx tsx --env-file=.env.local scripts/_test-mapper.ts
rm scripts/_test-mapper.ts
```

Çıktıda snake_case kolonlar (current_price, stock_quantity, supplier_price, vs). Admin product list sayfasındaki ürün kartlarıyla karşılaştır (camelCase domain). Tüm alanlar eşleşmeli.

- [ ] **Step 2: Birkaç entity için aynı şey**

Her entity için kısa kontrol (offer, order, gallery_post, campaign): admin sayfasında bir record aç → console.log ile değerleri kıyasla. Eksik alan varsa mapper'a ekle.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "verify: mapper round-trip integrity (products/offers/orders/campaigns/gallery)"
```

---

## Sub-Phase F — Final wrap-up

### Task 28: Full build + tsc + lint

**Files:** none (verification)

- [ ] **Step 1: tsc**

```bash
npx tsc --noEmit
```

Beklenen: 0 hata.

- [ ] **Step 2: eslint**

```bash
pnpm run lint
```

Beklenen: 0 hata, 0 uyarı.

- [ ] **Step 3: Production build**

```bash
pnpm build
```

Beklenen: tüm sayfalar derlendi, `✓ Generating static pages`, hata yok. Bir sayfa build'de hata verirse o sayfayı düzelt, retest.

- [ ] **Step 4: Commit (build cleanliness checkpoint)**

```bash
git commit --allow-empty -m "verify: build + tsc + lint clean"
```

---

### Task 29: Verification doc

**Files:**
- Create: `docs/verification/2026-05-11-test-ve-buglar.md`

- [ ] **Step 1: Mevcut faz raporlarının formatını referans al**

```bash
head -30 docs/verification/2026-05-11-faz-5.md
```

- [ ] **Step 2: Yeni rapor yaz**

Yapısı:
- Header (tarih, plan ref, görev sayısı, supabase mode)
- "Düzeltilen buglar" listesi (Bug 1, Bug 2, ve keşifte ortaya çıkanlar)
- "Test edildi" tablosu — her görev için PASS/FAIL + kısa not
- "Manuel doğrulama gerekiyor" listesi (kullanıcı son onayı için)
- "Bilinen eksikler" (sonraki adımlar)

İçeriği plan içindeki gerçek sonuçlara göre yaz — şablon copy-paste değil.

- [ ] **Step 3: Commit**

```bash
git add docs/verification/2026-05-11-test-ve-buglar.md
git commit -m "docs: test-ve-buglar verification raporu"
```

---

### Task 30: GitHub push

**Files:** none

- [ ] **Step 1: Push**

```bash
git push origin main
```

Beklenen: tüm yeni commit'ler GitHub'a gider, `main` advance olur.

Eğer permission hatası verirse, daha önceki cutover'da çözüldüğü gibi GitHub'da collaborator yetkisi doğrula.

- [ ] **Step 2: Boş checkpoint commit + push**

```bash
git commit --allow-empty -m "checkpoint: test-ve-buglar tamamlandi"
git push origin main
```

---

## Done criteria

- [ ] Bug 1 (kampanya endDate) düzeltildi, "Bahar Kampanyası" anasayfa şeridinde görünüyor ve sepette indirim uygulanıyor
- [ ] Bug 2 (kampanya redirect) düzeltildi, kampanya kartına tıklayınca doğru filtreli/yönlendirilmiş sayfa açılıyor
- [ ] Tüm public sayfalar (7 statik + 5 dinamik) HTTP 200 ve manuel akış geçer
- [ ] Tüm admin sayfaları (dashboard + 12 alt sayfa) CRUD round-trip geçer
- [ ] RLS matrisi: anon public oku evet / private oku hayır / offers+orders insert evet / mutation hayır
- [ ] Bildirim trigger'ları (low_stock, new_offer, new_order) çalışıyor
- [ ] `pnpm build && pnpm exec tsc --noEmit && pnpm run lint` hepsi 0 hata
- [ ] Verification raporu yazıldı, commit edildi, push edildi

## Rollback

Bir görev içindeki fix bozulma yaratırsa: `git revert <commit-hash>` ile son commit'i geri al. Sub-Phase B'deki bug fix'leri toplu revert için: `git revert <T4>..<T6>`. Demo moda geçici dönüş: `.env.local`'de `AUTH_MODE=demo`, `DATA_MODE=demo`, restart.
