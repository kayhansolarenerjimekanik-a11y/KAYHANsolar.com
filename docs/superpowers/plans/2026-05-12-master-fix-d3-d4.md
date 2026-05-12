# Master Fix D3 + D4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Master Fix audit'inden kalan iki açık bug'ı kapatmak — D3 (checkout'ta order DB'ye yazılmıyor) ve D4 (products SEO meta_title/meta_description end-to-end eksik).

**Architecture:** İki bağımsız sub-phase. **D3** için yeni `POST /api/orders` route oluştur, `cart-view.tsx onSubmit` bu endpoint'i çağırıp sonra WhatsApp linkini açsın (sıra korunur, hata durumunda WhatsApp yine açılır — kullanıcı checkout'u kaybetmesin). **D4** için type + mapper + admin form + `generateMetadata` zincirinin 4 katmanını da meta_title/meta_description için tamamla; DB kolonları zaten mevcut (`supabase/migrations/20260511_003_core_schema.sql:78-79`).

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, Zustand 5, Supabase (admin client server-only), Zod (validation), TypeScript 5, react-hook-form.

**Audit referansı:** `feat/master-fix-d3-d4` branch'i bu plan için açıldı. D1, D2, E1, E2 zaten kapatılmış (audit'te doğrulandı), bu plan'da ele alınmıyor.

**Test stratejisi:** Test framework yok. Doğrulama = `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm build` + manuel smoke (D3: demo + supabase mode'da sipariş, admin paneli `/kayhan-yonetim/siparisler`'de yeni order görmek; D4: admin form'dan kaydet, `/urun/[slug]` `<head>`'de görmek).

---

## Dosya Haritası

| Dosya | Durum | Sub-phase |
|---|---|---|
| `app/api/orders/route.ts` | **YENİ** | D3 |
| `components/shop/cart-view.tsx` | Modify | D3 |
| `lib/validations/order.ts` | **YENİ** (Zod schema) | D3 |
| `types/index.ts` | Modify (Product'a metaTitle/metaDescription ekle) | D4 |
| `lib/data/mappers.ts` | Modify (rowToProduct + productToInsert) | D4 |
| `lib/validations/product.ts` | Modify (Zod schema'ya iki alan ekle) | D4 |
| `components/admin/product-form.tsx` | Modify (2 input alanı) | D4 |
| `app/(admin)/kayhan-yonetim/actions/products.ts` | Modify (create/update'te alanları geçir) | D4 |
| `app/(public)/urun/[slug]/page.tsx` | Modify (generateMetadata fallback'i) | D4 |

D3 ve D4 ayrı commit'ler:
- `feat(checkout): persist order to DB before WhatsApp link`
- `feat(seo): products meta_title + meta_description end-to-end`

---

## Sub-phase D3: Order Persistence

### Task 1.1: Zod validation schema oluştur

**Files:**
- Create: `lib/validations/order.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  appliedCampaignIds: z.array(z.string()),
  customerName: z.string().min(3),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.object({
    city: z.string().min(1),
    district: z.string().min(1),
    detailedAddress: z.string().min(10),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 1.2: API route oluştur

**Files:**
- Create: `app/api/orders/route.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { NextResponse } from "next/server";

import { repo } from "@/lib/data";
import { createOrderSchema } from "@/lib/validations/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz sipariş verisi" },
        { status: 400 },
      );
    }
    const order = await repo.createOrder({
      ...parsed.data,
      status: "pending",
      paymentMethod: "whatsapp",
    });
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  } catch (err) {
    console.error("[/api/orders] failed", err);
    return NextResponse.json(
      { ok: false, error: "Sipariş kaydedilemedi" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 1.3: `cart-view.tsx` — onSubmit'i güncelle

**Files:**
- Modify: `components/shop/cart-view.tsx:61-69` (mevcut `onSubmit` handler)

- [ ] **Step 1: onSubmit'i değiştir**

Mevcut:

```ts
  const onSubmit = handleSubmit((data) => {
    const link = buildOrderWhatsAppLink(
      settings.whatsappNumber,
      items,
      calc.total - calc.shippingCost,
      data,
    );
    window.open(link, "_blank", "noopener,noreferrer");
  });
```

Yerine:

```ts
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    const link = buildOrderWhatsAppLink(
      settings.whatsappNumber,
      items,
      calc.total - calc.shippingCost,
      data,
    );
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            brand: i.brand,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
          subtotal: calc.subtotal,
          shippingCost: calc.shippingCost,
          total: calc.total,
          discountAmount: calc.totalDiscount,
          appliedCampaignIds: calc.appliedCampaigns.map((a) => a.campaignId),
          customerName: data.fullName,
          customerPhone: data.phone,
          shippingAddress: {
            city: data.city,
            district: data.district,
            detailedAddress: data.detailedAddress,
          },
        }),
      });
    } catch (err) {
      console.warn("[cart] order persistence failed; opening WhatsApp anyway", err);
    } finally {
      window.open(link, "_blank", "noopener,noreferrer");
      setSubmitting(false);
    }
  });
```

**Not 1:** `setSubmitting` state'i için import şu an yetersiz — `useState` import edilmiş mi kontrol et. Dosyanın üstünde zaten `import { useMemo, useState } from "react";` var, ek import gerekmiyor.

**Not 2:** `calc.totalDiscount` ve `calc.appliedCampaigns` `applyCampaigns` çıktısı; `calc.appliedCampaigns` her madde `{ campaignId, title, discountAmount, freeShipping }` shape'ine sahip — `lib/campaigns.ts`'i kontrol etmen gerekebilir.

- [ ] **Step 2: Submit butonu disabled state'i**

Mevcut:

```tsx
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!formState.isValid}
                >
                  WhatsApp ile Siparişi Tamamla
                </Button>
```

Yerine:

```tsx
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!formState.isValid || submitting}
                >
                  {submitting ? "Gönderiliyor..." : "WhatsApp ile Siparişi Tamamla"}
                </Button>
```

- [ ] **Step 3: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 1.4: D3 commit

- [ ] **Step 1: Stage + commit**

```powershell
git add app/api/orders/route.ts components/shop/cart-view.tsx lib/validations/order.ts
git commit -m "feat(checkout): persist order to DB before WhatsApp link"
```

---

## Sub-phase D4: Product SEO Meta Fields

### Task 2.1: `types/index.ts` — Product'a alanlar ekle

**Files:**
- Modify: `types/index.ts:32-54` (`Product` interface)

- [ ] **Step 1: Interface'e iki opsiyonel alan ekle**

Mevcut Product interface'inde (line 32-54), `createdAt: string;` satırının ÖNCESİNE şu iki satırı ekle:

```ts
  metaTitle?: string;
  metaDescription?: string;
```

Final interface şöyle olmalı:

```ts
export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription?: string;
  technicalSpecs?: Record<string, string>;
  categoryId: string;
  brand?: string;
  supplierUrl?: string;
  supplierPrice?: number;
  markupPercentage?: number;
  currentPrice: number;
  compareAtPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  badges: ProductBadge[];
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  media: ProductMedia[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
}
```

### Task 2.2: `lib/data/mappers.ts` — Mapper güncelle

**Files:**
- Modify: `lib/data/mappers.ts:18-74` (`rowToProduct` + `productToInsert`)

- [ ] **Step 1: `rowToProduct` içine iki alan ekle**

`rowToProduct` return objesinde, `createdAt: row.created_at as string,` satırından ÖNCE şu iki satırı ekle:

```ts
    metaTitle: (row.meta_title as string | null) ?? undefined,
    metaDescription: (row.meta_description as string | null) ?? undefined,
```

- [ ] **Step 2: `productToInsert` içine iki alan ekle**

`productToInsert` return objesinde, `is_new_arrival: p.isNewArrival,` satırından SONRA şu iki satırı ekle:

```ts
    meta_title: p.metaTitle ?? null,
    meta_description: p.metaDescription ?? null,
```

### Task 2.3: `lib/validations/product.ts` — Zod schema'ya iki alan ekle

**Files:**
- Modify: `lib/validations/product.ts`

- [ ] **Step 1: Schema'ya iki opsiyonel alan ekle**

Dosyayı aç. `productInputSchema` içinde, en sonda (`technicalSpecs` veya başka opsiyonel alanlarla aynı bölgede) şu iki satırı ekle:

```ts
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
```

(maxLength upper bound 120/320 — UI'da 60/160 önerilir ama hard limit daha geniş.)

### Task 2.4: `components/admin/product-form.tsx` — İki form alanı ekle

**Files:**
- Modify: `components/admin/product-form.tsx`

Form pattern'i (mevcut): Server Action + `<form action={formAction}>`, her field native `<Input>` / `<Textarea>` ile `name="..."` attribute. `defaultValue={initial?.X ?? ""}`. Hata gösterimi `errFor(fieldName)`.

Mevcut `longDescription` bloğunun (line 84-92) hemen ardından, kategori bloğundan (line 93-105) ÖNCE yeni bir bölüm ekle:

- [ ] **Step 1: longDescription bloğundan sonra iki alan ekle**

`longDescription` bloğu kapanışından (line 92'deki `</div>`) sonra, ama `categoryId` bloğu öncesinden, **aynı `grid` içinde** şu iki div'i ekle:

```tsx
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="metaTitle">SEO başlığı (opsiyonel)</Label>
            <Input
              id="metaTitle"
              name="metaTitle"
              defaultValue={initial?.metaTitle ?? ""}
              maxLength={120}
              placeholder="Boş bırakılırsa ürün adı kullanılır"
            />
            {errFor("metaTitle") && (
              <p className="text-xs text-danger">{errFor("metaTitle")}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="metaDescription">SEO açıklaması (opsiyonel)</Label>
            <Textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              defaultValue={initial?.metaDescription ?? ""}
              maxLength={320}
              placeholder="Arama sonuçlarında görünecek metin. Boşsa kısa açıklama kullanılır."
            />
            {errFor("metaDescription") && (
              <p className="text-xs text-danger">{errFor("metaDescription")}</p>
            )}
          </div>
```

### Task 2.5: `actions/products.ts` — create/update'te alanları geçir

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/actions/products.ts`

- [ ] **Step 1: createProductAction güncelle**

Mevcut `repo.createProduct({...})` çağrısının object literal'ında, `longDescription: result.longDescription || undefined,` satırının altına şu iki satırı ekle:

```ts
    metaTitle: result.metaTitle || undefined,
    metaDescription: result.metaDescription || undefined,
```

- [ ] **Step 2: updateProductAction güncelle**

Mevcut `repo.updateProduct(id, {...})` çağrısının object literal'ında, aynı şekilde `longDescription: result.longDescription || undefined,` satırının altına iki satır ekle:

```ts
    metaTitle: result.metaTitle || undefined,
    metaDescription: result.metaDescription || undefined,
```

- [ ] **Step 3: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 2.6: `generateMetadata` fallback'i güncelle

**Files:**
- Modify: `app/(public)/urun/[slug]/page.tsx:26-43` (`generateMetadata`)

- [ ] **Step 1: Fallback'i güncelle**

Mevcut:

```tsx
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.media[0]?.url
        ? [{ url: product.media[0].url, alt: product.name }]
        : undefined,
    },
  };
}
```

Yerine:

```tsx
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  const title = product.metaTitle ?? product.name;
  const description = product.metaDescription ?? product.shortDescription;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.media[0]?.url
        ? [{ url: product.media[0].url, alt: product.name }]
        : undefined,
    },
  };
}
```

### Task 2.7: D4 commit

- [ ] **Step 1: Stage + commit**

```powershell
git add types/index.ts lib/data/mappers.ts lib/validations/product.ts components/admin/product-form.tsx "app/(admin)/kayhan-yonetim/actions/products.ts" "app/(public)/urun/[slug]/page.tsx"
git commit -m "feat(seo): products meta_title + meta_description end-to-end"
```

---

## Final Doğrulama

### Task 3.1: Toplu doğrulama

- [ ] **Step 1: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

- [ ] **Step 2: Build**

```powershell
pnpm build
```

Expected: başarılı.

---

## Manuel Smoke (kullanıcı tarafı)

**D3 — Order persistence:**
1. `/magaza` → ürün sepete ekle → `/sepet` → "Siparişi Tamamla" → adres formu doldur → "WhatsApp ile Siparişi Tamamla".
2. WhatsApp linki açılmalı (eski davranış korundu).
3. `/kayhan-yonetim/siparisler` admin paneline git → yeni sipariş listede görünmeli, `discount_amount` ve `applied_campaigns` doğru olmalı.
4. **Demo mode**: in-memory store'a yazılır, server restart ile kaybolur.
5. **Supabase mode**: DB'ye gerçekten yazılır.
6. **Hata simülasyonu**: Network kes → "WhatsApp ile Siparişi Tamamla" → WhatsApp yine açılmalı (catch fallback).

**D4 — Product SEO:**
1. Admin'de bir ürünü aç → "metaTitle" + "metaDescription" alanları görünmeli.
2. Doldur → kaydet → liste sayfasından geri gel → yine dolu olmalı.
3. `/urun/<slug>` aç → tarayıcıda View Page Source → `<title>` ve `<meta name="description">` yeni değerleri içermeli.
4. Boş bırak → fallback'e dön: `<title>` = product.name, description = shortDescription.

---

## Risk Notları

- **D3 createOrder server-only:** `lib/data/supabase/orders.ts` `adminSupabase` kullanıyor (`server-only` package import'lu). Client'tan direkt çağırılamaz — API route şart. Demo repo client-side çalışabilir ama tutarlılık için API kullan.
- **D3 hata fallback'i:** Order kayıt başarısız olsa bile WhatsApp linki yine açılır. Kullanıcı checkout deneyimini kaybetmez. `console.warn` ile loglanır.
- **D3 ödeme yöntemi enum:** Order type `paymentMethod: "whatsapp" | "iyzico" | "bank_transfer"`. Bu turda hep `"whatsapp"`.
- **D4 DB kolonları:** Schema'da zaten var (`supabase/migrations/20260511_003_core_schema.sql:78-79`). Migration eklenmiyor.
- **D4 fallback davranışı:** metaTitle/metaDescription boşsa product.name / product.shortDescription kullanılır — backward compatible, mevcut ürünler bozulmaz.
- **Idempotency:** Aynı sipariş 2 kez submit olursa 2 ayrı order yaratır. Şimdilik kabul (kullanıcı UI'da double-click korunmuş — submit butonu `disabled` state'i).

---

## Spec Dışı

- Email confirmation gönderimi (D3 sonrası — Resend ile, Faz 6'da)
- Order tracking sayfası (kullanıcı için `/siparis/[orderNumber]`)
- Stripe / İyzico entegrasyonu (Faz 6+)
- robots.txt güncelleme (D4 ile alakasız)
- OpenGraph image generation per-product (gelecek)
- Sitemap'e meta fields ekleme (gelecek)
