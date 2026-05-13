# Product Badges — Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürün etiketleri (`Product.badges` array'i) yerine, etiketleri gerçek veri alanlarından otomatik türetmek — admin "Kargo Bedava" işaretlerse hem etiket görünsün hem kargo gerçekten 0₺ olsun.

**Architecture:** İki yeni alan eklenir (`hasFreeShipping: boolean`, `warrantyYears: number | null`); etiket dizisi tamamen kaldırılır; saf `deriveBadges()` fonksiyonu var olan alanlardan (`isFeatured`, `isNewArrival`, `stockQuantity`/`lowStockThreshold` dahil) etiketleri hesaplar. Cart hesaplaması `hasFreeShipping`'i okur. Vitest test framework'ü ilk kez kurulur ve saf fonksiyonlar TDD ile yazılır.

**Tech Stack:** Next.js 16.2.6 App Router + TypeScript strict + React 19 + Zod 4 + Supabase + Zustand 5 + Vitest 2 (yeni).

**Spec:** `docs/superpowers/specs/2026-05-13-product-badges-sot-design.md`

**Önemli pre-existing durumlar:**
- Branch'imiz `feat/product-badges-sot` (main'den çıktı).
- Çalışma dizininde paralel oturumdan kalma orphan dosyalar olabilir (`components/admin/orders-table.tsx`, vs.). **ASLA `git add -A` / `git add .` / `git add docs/`** kullanma. Sadece targeted `git add <path>`.
- AGENTS.md uyarısı: Next.js 16. Server-only kodda `import "server-only";` mevcut. Korunsun.
- Test framework yok (bu plan kuruyor). Doğrulama: `pnpm test` (yeni) + `pnpm exec tsc --noEmit` + `pnpm lint` + manuel smoke.

---

## Dosya Haritası

| Dosya | Durum | Faz |
|---|---|---|
| `package.json` | Modify (`vitest` devDep, `test` script) | 1 |
| `vitest.config.ts` | **YENİ** | 1 |
| `lib/products/badges.ts` | **YENİ** (saf fonksiyon) | 2 |
| `lib/products/badges.test.ts` | **YENİ** (TDD) | 2 |
| `supabase/migrations/20260513_007_product_badge_fields.sql` | **YENİ** | 3 |
| `types/index.ts` | Modify (Product type) | 4 |
| `lib/validations/product.ts` | Modify (Zod schema) | 4 |
| `lib/data/mappers.ts` | Modify (rowToProduct + productToInsert) | 4 |
| `lib/mock/data.ts` | Modify (mock products) | 4 |
| `lib/campaigns/types.ts` | Modify (CartItem'a `hasFreeShipping`) | 5 |
| `lib/campaigns/index.ts` | Modify (free-shipping mantığı) | 5 |
| `lib/campaigns/index.test.ts` | **YENİ** (TDD) | 5 |
| `types/cart.ts` | Modify (CartItem'a `hasFreeShipping`) | 5 |
| `store/cart.ts` | Modify (snapshot) | 5 |
| `components/shop/add-to-cart.tsx` | Modify (addItem'e ekle) | 5 |
| `components/shop/cart-view.tsx` | Modify (campaign input'una ekle) | 5 |
| `components/admin/product-form.tsx` | Modify (checkbox kaldır, switch+input ekle) | 6 |
| `app/(admin)/kayhan-yonetim/actions/products.ts` | Modify (parseFormData) | 6 |
| `components/shop/product-card.tsx` | Modify (deriveBadges kullan) | 7 |
| `app/(public)/urun/[slug]/page.tsx` | Modify (deriveBadges kullan) | 7 |
| `types/index.ts` | Modify tekrar (badges field'ı sil) | 8 |
| `lib/validations/product.ts` | Modify tekrar (badges schema sil) | 8 |
| `lib/data/mappers.ts` | Modify tekrar (badges line sil) | 8 |
| `lib/mock/data.ts` | Modify tekrar (badges line sil) | 8 |
| `docs/verification/2026-05-13-product-badges-sot.md` | **YENİ** | 9 |

**9 commit:**

1. `chore(deps): add vitest test framework`
2. `feat(products): add deriveBadges pure function`
3. `feat(db): add product has_free_shipping + warranty_years columns + backfill`
4. `feat(product): add hasFreeShipping + warrantyYears fields alongside badges`
5. `feat(cart): free shipping when any item has hasFreeShipping flag`
6. `feat(admin): hasFreeShipping switch + warrantyYears input with derived preview`
7. `refactor(shop): use deriveBadges instead of product.badges for display`
8. `refactor(product): remove legacy badges array field`
9. `docs(verification): product badges single source of truth closure report`

---

## Faz 1: Test Infrastructure

### Task 1.1: Vitest paketini kur

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Kurulum**

Çalıştır:

```powershell
pnpm add -D vitest@^2 @vitest/ui@^2
```

Beklenen: `package.json`'da `devDependencies` altına `vitest` + `@vitest/ui`, `pnpm-lock.yaml` güncellenir.

- [ ] **Step 2: Test script'leri ekle**

`package.json`'ın `scripts` bloğunu **mevcut script'lerin SONUNA** iki yeni script ekleyerek güncelle:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "db:migrate": "tsx --env-file=.env.local scripts/apply-migrations.ts",
  "seed:ai": "tsx --env-file=.env.local scripts/seed-ai-knowledge.ts",
  "create:admin": "tsx --env-file=.env.local scripts/create-admin.ts",
  "seed:supabase": "tsx --env-file=.env.local scripts/seed-supabase.ts",
  "refresh:campaigns": "tsx --env-file=.env.local scripts/refresh-campaign-dates.ts",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Vitest config dosyası**

`vitest.config.ts` (yeni) dosyasını proje köküne oluştur:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["lib/**/*.test.ts", "components/**/*.test.ts", "components/**/*.test.tsx"],
  },
});
```

- [ ] **Step 4: Smoke test — vitest çalışıyor mu**

Çalıştır:

```powershell
pnpm test
```

Beklenen: `No test files found` ile çıkar (exit 0). Hata verirse config'i kontrol et.

- [ ] **Step 5: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS (pre-existing noise olabilir; sadece YENİ kodun temiz olduğunu doğrula).

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml vitest.config.ts
git status
```

`git status`'in sadece bu 3 dosyayı staged göstermesini doğrula. Sonra:

```powershell
git commit -m "chore(deps): add vitest test framework"
```

---

## Faz 2: deriveBadges (TDD)

### Task 2.1: Failing test'i yaz

**Files:**
- Create: `lib/products/badges.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { deriveBadges } from "./badges";

const base = {
  hasFreeShipping: false,
  isFeatured: false,
  isNewArrival: false,
  stockQuantity: 100,
  lowStockThreshold: 3,
  warrantyYears: null,
} as const;

describe("deriveBadges", () => {
  it("returns empty array when no flags are set", () => {
    expect(deriveBadges(base)).toEqual([]);
  });

  it("returns kargo_bedava when hasFreeShipping is true", () => {
    expect(deriveBadges({ ...base, hasFreeShipping: true })).toEqual([
      "kargo_bedava",
    ]);
  });

  it("returns yeni when isNewArrival is true", () => {
    expect(deriveBadges({ ...base, isNewArrival: true })).toEqual(["yeni"]);
  });

  it("returns tercih_edilen when isFeatured is true", () => {
    expect(deriveBadges({ ...base, isFeatured: true })).toEqual([
      "tercih_edilen",
    ]);
  });

  it("returns stokta_son when stockQuantity > 0 and <= lowStockThreshold", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 3, lowStockThreshold: 3 }),
    ).toEqual(["stokta_son"]);
    expect(
      deriveBadges({ ...base, stockQuantity: 1, lowStockThreshold: 3 }),
    ).toEqual(["stokta_son"]);
  });

  it("does NOT return stokta_son when stockQuantity is 0", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 0, lowStockThreshold: 3 }),
    ).toEqual([]);
  });

  it("does NOT return stokta_son when stockQuantity > threshold", () => {
    expect(
      deriveBadges({ ...base, stockQuantity: 4, lowStockThreshold: 3 }),
    ).toEqual([]);
  });

  it("returns 5_yil_garanti only for warrantyYears === 5", () => {
    expect(deriveBadges({ ...base, warrantyYears: 5 })).toEqual([
      "5_yil_garanti",
    ]);
  });

  it("returns 10_yil_garanti only for warrantyYears === 10", () => {
    expect(deriveBadges({ ...base, warrantyYears: 10 })).toEqual([
      "10_yil_garanti",
    ]);
  });

  it("returns no warranty badge for other warranty values", () => {
    expect(deriveBadges({ ...base, warrantyYears: 3 })).toEqual([]);
    expect(deriveBadges({ ...base, warrantyYears: 0 })).toEqual([]);
    expect(deriveBadges({ ...base, warrantyYears: null })).toEqual([]);
  });

  it("composes multiple badges in stable order", () => {
    expect(
      deriveBadges({
        hasFreeShipping: true,
        isFeatured: true,
        isNewArrival: true,
        stockQuantity: 2,
        lowStockThreshold: 3,
        warrantyYears: 5,
      }),
    ).toEqual([
      "kargo_bedava",
      "yeni",
      "tercih_edilen",
      "stokta_son",
      "5_yil_garanti",
    ]);
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

Çalıştır:

```powershell
pnpm test
```

Beklenen: FAIL with "Cannot find module './badges'" (henüz implementasyon yok).

### Task 2.2: deriveBadges fonksiyonunu yaz

**Files:**
- Create: `lib/products/badges.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import type { Product, ProductBadge } from "@/types";

export type BadgeSourceFields = Pick<
  Product,
  | "hasFreeShipping"
  | "isFeatured"
  | "isNewArrival"
  | "stockQuantity"
  | "lowStockThreshold"
  | "warrantyYears"
>;

export function deriveBadges(p: BadgeSourceFields): ProductBadge[] {
  const out: ProductBadge[] = [];
  if (p.hasFreeShipping) out.push("kargo_bedava");
  if (p.isNewArrival) out.push("yeni");
  if (p.isFeatured) out.push("tercih_edilen");
  if (p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold) {
    out.push("stokta_son");
  }
  if (p.warrantyYears === 5) out.push("5_yil_garanti");
  if (p.warrantyYears === 10) out.push("10_yil_garanti");
  return out;
}
```

NOT: Bu noktada `Product` type'ında `hasFreeShipping` ve `warrantyYears` alanları YOK; TypeScript bu dosyada hata verecek. Bu beklendi — Faz 4'te type güncellenecek. Şimdilik:

- TypeScript hata vermesin diye type'ları geçici inline tanımla:

```ts
import type { ProductBadge } from "@/types";

export interface BadgeSourceFields {
  hasFreeShipping: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  warrantyYears: number | null;
}

export function deriveBadges(p: BadgeSourceFields): ProductBadge[] {
  const out: ProductBadge[] = [];
  if (p.hasFreeShipping) out.push("kargo_bedava");
  if (p.isNewArrival) out.push("yeni");
  if (p.isFeatured) out.push("tercih_edilen");
  if (p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold) {
    out.push("stokta_son");
  }
  if (p.warrantyYears === 5) out.push("5_yil_garanti");
  if (p.warrantyYears === 10) out.push("10_yil_garanti");
  return out;
}
```

Faz 8'de `Pick<Product, ...>` formatına döneceğiz (Product type genişlediği için).

- [ ] **Step 2: Test'in geçtiğini doğrula**

Çalıştır:

```powershell
pnpm test
```

Beklenen: 11/11 PASS.

- [ ] **Step 3: tsc + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS for new files.

- [ ] **Step 4: Commit**

```powershell
git add lib/products/badges.ts lib/products/badges.test.ts
git commit -m "feat(products): add deriveBadges pure function"
```

---

## Faz 3: SQL Migration

### Task 3.1: Migration dosyasını oluştur

**Files:**
- Create: `supabase/migrations/20260513_007_product_badge_fields.sql`

- [ ] **Step 1: Dosyayı oluştur**

```sql
-- Add badge-source fields to products table
-- Replaces the manual badges[] array with derived fields

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warranty_years INT NULL;

-- Backfill from existing badges array (idempotent)
UPDATE products
  SET has_free_shipping = TRUE
  WHERE 'kargo_bedava' = ANY(badges) AND has_free_shipping = FALSE;

UPDATE products
  SET warranty_years = 5
  WHERE '5_yil_garanti' = ANY(badges) AND warranty_years IS DISTINCT FROM 5;

UPDATE products
  SET warranty_years = 10
  WHERE '10_yil_garanti' = ANY(badges) AND warranty_years IS DISTINCT FROM 10;

-- Note: 'yeni' and 'tercih_edilen' already have backing columns
-- (is_new_arrival, is_featured); 'stokta_son' is computed at read time;
-- no backfill needed for those.
```

- [ ] **Step 2: Migration'ı uygula (eğer Supabase mode'daysın)**

`.env.local`'da `DATA_MODE=supabase` ise:

```powershell
pnpm db:migrate
```

Beklenen: Migration başarıyla uygulanır. Hata olursa Supabase Dashboard → SQL Editor'dan elle çalıştır.

`DATA_MODE=demo` ise: bu adımı atla.

- [ ] **Step 3: Doğrulama (sadece Supabase mode)**

Supabase SQL Editor'da:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('has_free_shipping', 'warranty_years');
```

Beklenen 2 satır:
- `has_free_shipping | boolean | NO | false`
- `warranty_years | integer | YES | NULL`

Backfill kontrolü:

```sql
SELECT slug, badges, has_free_shipping, warranty_years
FROM products
WHERE 'kargo_bedava' = ANY(badges) OR has_free_shipping = TRUE
LIMIT 5;
```

Beklenen: `kargo_bedava` etiketli ürünlerde `has_free_shipping = TRUE`.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260513_007_product_badge_fields.sql
git commit -m "feat(db): add product has_free_shipping + warranty_years columns + backfill"
```

---

## Faz 4: Type + Validation + Mapper + Mock

Tek commit'te dört dosyayı koordineli güncelliyoruz. **`badges` alanı henüz silinmiyor** — sadece yeni alanlar ekleniyor. tsc strict bu fazda hâlâ geçer çünkü tüm tüketiciler eski `badges` alanını kullanmaya devam ediyor.

### Task 4.1: Product type'ına yeni alanlar

**Files:**
- Modify: `types/index.ts:32-56`

- [ ] **Step 1: Type'ı güncelle**

Mevcut `Product` interface'i (lines 32-56'da):

```ts
export interface Product {
  id: string;
  slug: string;
  // ... mevcut alanlar
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

`isNewArrival: boolean;` satırının HEMEN ALTINA iki yeni alan ekle:

```ts
  isNewArrival: boolean;
  hasFreeShipping: boolean;
  warrantyYears: number | null;
  media: ProductMedia[];
```

`badges: ProductBadge[]` satırına dokunma (henüz).

### Task 4.2: Zod schema'ya yeni alanlar

**Files:**
- Modify: `lib/validations/product.ts:20-45`

- [ ] **Step 1: Schema'yı güncelle**

`productInputSchema`'da `isNewArrival: z.coerce.boolean().default(false),` satırının HEMEN ALTINA ekle:

```ts
  isNewArrival: z.coerce.boolean().default(false),
  hasFreeShipping: z.coerce.boolean().default(false),
  warrantyYears: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.literal(null), z.number().int().min(0).max(20)]),
  ).default(null),
```

`badges: z.array(badgeEnum).default([])` satırına dokunma.

### Task 4.3: Mock data'ya yeni alanlar

**Files:**
- Modify: `lib/mock/data.ts` (tüm mock product nesnelerine)

- [ ] **Step 1: Mock product'lara alan ekle**

`lib/mock/data.ts`'i aç. Her mock product nesnesinde `isNewArrival: true/false,` satırının HEMEN ALTINA `hasFreeShipping: <doğru değer>,` ve `warrantyYears: <doğru değer>,` ekle.

Pratik kural:
- Eğer mevcut `badges` array'i `"kargo_bedava"` içeriyorsa → `hasFreeShipping: true,`. Değilse → `hasFreeShipping: false,`.
- Eğer mevcut `badges` array'i `"5_yil_garanti"` içeriyorsa → `warrantyYears: 5,`. `"10_yil_garanti"` ise → `warrantyYears: 10,`. Hiçbiri yoksa → `warrantyYears: null,`.

(Dosyada ~10-20 mock product var. Hepsini gözden geçir; her birinde mevcut `badges` array'ine bak ve yeni iki alanı eklem el. `badges`'ı silme.)

### Task 4.4: Mapper'a yeni alanlar

**Files:**
- Modify: `lib/data/mappers.ts:24-78`

- [ ] **Step 1: `rowToProduct`'a oku**

Mevcut `rowToProduct` (lines 24-53). `isNewArrival` satırından (line 41) sonra ekle:

```ts
    isNewArrival: (row.is_new_arrival as boolean | null) ?? false,
    hasFreeShipping: (row.has_free_shipping as boolean | null) ?? false,
    warrantyYears: (row.warranty_years as number | null) ?? null,
    metaTitle: (row.meta_title as string | null) ?? undefined,
```

- [ ] **Step 2: `productToInsert`'a yaz**

Mevcut `productToInsert` (lines 55-78). `is_new_arrival: p.isNewArrival,` satırından sonra ekle:

```ts
    is_new_arrival: p.isNewArrival,
    has_free_shipping: p.hasFreeShipping,
    warranty_years: p.warrantyYears,
    meta_title: p.metaTitle ?? null,
```

`badges: p.badges` satırına dokunma (Faz 8'de silinir).

### Task 4.5: Doğrulama + commit

- [ ] **Step 1: tsc**

Çalıştır:

```powershell
pnpm exec tsc --noEmit
```

Beklenen: PASS. Eğer hata verirse — büyük olasılıkla mock data'da bir product'ta yeni alanları eklemeyi unutmuşundur. Kontrol et.

- [ ] **Step 2: Existing test'leri çalıştır**

```powershell
pnpm test
```

Beklenen: 11/11 PASS (deriveBadges testleri hâlâ geçiyor).

- [ ] **Step 3: Lint**

```powershell
pnpm lint
```

Beklenen: PASS.

- [ ] **Step 4: Commit**

```powershell
git add types/index.ts lib/validations/product.ts lib/data/mappers.ts lib/mock/data.ts
git commit -m "feat(product): add hasFreeShipping + warrantyYears fields alongside badges"
```

---

## Faz 5: Cart Shipping Logic (TDD)

### Task 5.1: Failing test — applyCampaigns hasFreeShipping davranışı

**Files:**
- Create: `lib/campaigns/index.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { applyCampaigns } from "./index";

const noCampaigns: never[] = [];

describe("applyCampaigns — hasFreeShipping per item", () => {
  it("free shipping when at least one cart item has hasFreeShipping=true", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 1, price: 1000, hasFreeShipping: true },
          { productId: "p2", quantity: 1, price: 2000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1", p2: "c2" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(0);
    expect(result.total).toBe(3000);
  });

  it("normal shipping when no item has hasFreeShipping", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 1, price: 1000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(500);
    expect(result.total).toBe(1500);
  });

  it("subtotal threshold still kicks in even without hasFreeShipping", () => {
    const result = applyCampaigns(
      {
        items: [
          { productId: "p1", quantity: 100, price: 1000, hasFreeShipping: false },
        ],
        productCategoryById: { p1: "c1" },
        baseShippingCost: 500,
        freeShippingThreshold: 50000,
      },
      noCampaigns,
    );
    expect(result.shippingCost).toBe(0); // 100*1000 >= 50000
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

```powershell
pnpm test
```

Beklenen: FAIL. TypeScript şikayeti: `hasFreeShipping` is not on `CartCalculationInput.items[]`.

### Task 5.2: `CartCalculationInput` tipine `hasFreeShipping` ekle

**Files:**
- Modify: `lib/campaigns/types.ts:9-14`

- [ ] **Step 1: Tipi güncelle**

Mevcut:

```ts
export interface CartCalculationInput {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  // ...
}
```

Yeni:

```ts
export interface CartCalculationInput {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    hasFreeShipping: boolean;
  }>;
  // ...
}
```

### Task 5.3: `applyCampaigns`'ı güncelle

**Files:**
- Modify: `lib/campaigns/index.ts:28-35`

- [ ] **Step 1: Free shipping mantığını genişlet**

Mevcut (lines 28-35):

```ts
  const freeShipping = applied.some((a) => a.freeShipping);

  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const shippingCost = freeShipping
    ? 0
    : discountedSubtotal >= input.freeShippingThreshold
      ? 0
      : input.baseShippingCost;
```

Yeni:

```ts
  const hasItemWithFreeShipping = input.items.some((i) => i.hasFreeShipping);
  const freeShipping =
    hasItemWithFreeShipping || applied.some((a) => a.freeShipping);

  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const shippingCost = freeShipping
    ? 0
    : discountedSubtotal >= input.freeShippingThreshold
      ? 0
      : input.baseShippingCost;
```

- [ ] **Step 2: Test geçer mi**

```powershell
pnpm test
```

Beklenen: Önceki 11 + 3 yeni = 14/14 PASS.

### Task 5.4: `CartItem` tipine `hasFreeShipping` ekle

**Files:**
- Modify: `types/cart.ts`

- [ ] **Step 1: CartItem'ı güncelle**

Mevcut:

```ts
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  stockQuantity: number;
}
```

Yeni (alt satıra ekle):

```ts
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  stockQuantity: number;
  hasFreeShipping: boolean;
}
```

### Task 5.5: `add-to-cart.tsx`'te `addItem`'a alan ekle

**Files:**
- Modify: `components/shop/add-to-cart.tsx:72-90`

- [ ] **Step 1: handleAddToCart'da hasFreeShipping geç**

Mevcut `handleAddToCart` içinde `addItem({...})` çağrısına `hasFreeShipping: product.hasFreeShipping,` satırı ekle:

```ts
  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.currentPrice,
      imageUrl: product.media[0]?.url,
      stockQuantity: product.stockQuantity,
      hasFreeShipping: product.hasFreeShipping,
      quantity,
    });
    // ...
  };
```

### Task 5.6: `cart-view.tsx` — applyCampaigns'a hasFreeShipping geçir

**Files:**
- Modify: `components/shop/cart-view.tsx:39-55`

- [ ] **Step 1: Items mapping'i güncelle**

Mevcut `useMemo` içindeki `items.map((i) => ({ productId, quantity, price }))`:

```ts
items: items.map((i) => ({
  productId: i.productId,
  quantity: i.quantity,
  price: i.price,
})),
```

Yeni:

```ts
items: items.map((i) => ({
  productId: i.productId,
  quantity: i.quantity,
  price: i.price,
  hasFreeShipping: i.hasFreeShipping,
})),
```

### Task 5.7: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: hepsi PASS.

- [ ] **Step 2: Manuel smoke**

(Dev server zaten çalışıyorsa kullan. Yoksa: `pnpm dev`.)

1. Mock'ta `hasFreeShipping: true` olan bir ürünü sepete at (örn. `solar-bahce-lambasi-set` eğer mevcut `badges`'inde `kargo_bedava` varsa — mock güncellemesi sonrası `hasFreeShipping: true` olmuş olmalı).
2. Sepete git → kargo "Bedava" görünmeli, total = ara toplam (kargo 0₺).
3. Sadece `hasFreeShipping: false` olan bir ürünü sepete at → kargo 500₺.

- [ ] **Step 3: Commit**

```powershell
git add lib/campaigns/types.ts lib/campaigns/index.ts lib/campaigns/index.test.ts types/cart.ts components/shop/add-to-cart.tsx components/shop/cart-view.tsx
git commit -m "feat(cart): free shipping when any item has hasFreeShipping flag"
```

NOT: `store/cart.ts`'i değiştirmedik. Zustand `addItem` sığa olarak `Omit<CartItem, "quantity">` kabul ediyor, biz de `hasFreeShipping`'i `CartItem`'a eklediğimiz için otomatik kabul ediyor. Existing cart entries (localStorage'da kayıtlı) `hasFreeShipping` alanına sahip olmayabilir — TS strict bunu yakalamayacak çünkü `as` cast'leri var. Çözüm: cart store'da rehydration sonrasında undefined → false coerce. Bu küçük güvenlik adımı:

`store/cart.ts`'de `onRehydrateStorage` callback'i güncelle:

```ts
onRehydrateStorage: () => (state) => {
  if (state) {
    state.items = state.items.map((i) => ({
      ...i,
      hasFreeShipping: i.hasFreeShipping ?? false,
    }));
    state.setHydrated();
  }
},
```

Bu adımı da Task 5.7 Step 3'ten ÖNCE Step 2.5 olarak ekle:

- [ ] **Step 2.5: Cart store rehydration'da hasFreeShipping default**

`store/cart.ts` `onRehydrateStorage` callback'ini yukarıdaki gibi güncelle. `store/cart.ts`'i de commit'e ekle:

```powershell
git add lib/campaigns/types.ts lib/campaigns/index.ts lib/campaigns/index.test.ts types/cart.ts components/shop/add-to-cart.tsx components/shop/cart-view.tsx store/cart.ts
git commit -m "feat(cart): free shipping when any item has hasFreeShipping flag"
```

---

## Faz 6: Admin Form

### Task 6.1: Badge checkbox bloğunu sil, yeni kontroller ekle

**Files:**
- Modify: `components/admin/product-form.tsx`

- [ ] **Step 1: ALL_BADGES constant'ını ve toggleBadge handler'ını sil**

Üstte:

```tsx
const ALL_BADGES: { value: ProductBadge; label: string }[] = [
  // ... 6 entry
];
```

ve içeride:

```tsx
const [selectedBadges, setSelectedBadges] = useState<ProductBadge[]>(
  initial?.badges ?? [],
);
const toggleBadge = (b: ProductBadge) =>
  setSelectedBadges((cur) =>
    cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b],
  );
```

Bu blokları tamamen sil.

`import` listesinden `ProductBadge` import'unu da kaldır:

```tsx
import type { Category, Product, ProductBadge } from "@/types";
```

→

```tsx
import type { Category, Product } from "@/types";
```

- [ ] **Step 2: Form state'i güncelle — yeni alanlar için**

ALL_BADGES + toggleBadge yerine, derived preview için form state ekle (form'un içinde):

```tsx
const [hasFreeShipping, setHasFreeShipping] = useState<boolean>(
  initial?.hasFreeShipping ?? false,
);
const [warrantyYears, setWarrantyYears] = useState<string>(
  initial?.warrantyYears != null ? String(initial.warrantyYears) : "",
);
const [isFeatured, setIsFeatured] = useState<boolean>(
  initial?.isFeatured ?? false,
);
const [isNewArrival, setIsNewArrival] = useState<boolean>(
  initial?.isNewArrival ?? false,
);
const [stockQuantity, setStockQuantity] = useState<string>(
  String(initial?.stockQuantity ?? 0),
);
const [lowStockThreshold, setLowStockThreshold] = useState<string>(
  String(initial?.lowStockThreshold ?? 3),
);
```

(NOT: Form mevcut bazı alanlar için `defaultValue` kullanıyordu — şimdi controlled hale getiriyoruz ki derived preview anlık güncellensin.)

`deriveBadges`'i import et:

```tsx
import { deriveBadges } from "@/lib/products/badges";
import { productBadgeLabels } from "@/lib/mock/data";
```

- [ ] **Step 3: Etiketler fieldset'ini yeni kontrollerle değiştir**

Mevcut "Etiketler" fieldset (lines ~230-251):

```tsx
<fieldset className="rounded-xl border border-border bg-elevated p-3">
  <legend className="px-1 text-xs font-medium text-muted">Etiketler</legend>
  <div className="mt-2 flex flex-wrap gap-3">
    {ALL_BADGES.map((b) => ( ... ))}
  </div>
  <input type="hidden" name="badges" value={JSON.stringify(selectedBadges)} />
</fieldset>
```

Bunu komple değiştir:

```tsx
<fieldset className="rounded-xl border border-border bg-elevated p-3">
  <legend className="px-1 text-xs font-medium text-muted">Etiket Kaynakları</legend>
  <div className="mt-2 space-y-3">
    <Switch
      id="hasFreeShipping"
      name="hasFreeShipping"
      label="Kargo bedava"
      checked={hasFreeShipping}
      onCheckedChange={setHasFreeShipping}
    />
    <div className="space-y-1.5">
      <Label htmlFor="warrantyYears">Garanti (yıl)</Label>
      <Input
        id="warrantyYears"
        name="warrantyYears"
        type="number"
        min={0}
        max={20}
        value={warrantyYears}
        onChange={(e) => setWarrantyYears(e.target.value)}
        placeholder="Örn. 5 veya 10. Boş bırakırsanız garanti etiketi görünmez."
      />
    </div>
  </div>
</fieldset>
```

Mevcut "Aktif/Featured/NewArrival" Switch'lerini de controlled hâle getir (sağ sütunda):

```tsx
<div className="space-y-3 rounded-xl border border-border bg-elevated p-3">
  <Switch
    id="isActive"
    name="isActive"
    label="Aktif (yayında)"
    defaultChecked={initial?.isActive ?? true}
  />
  <Switch
    id="isFeatured"
    name="isFeatured"
    label="Anasayfada öne çıkar"
    checked={isFeatured}
    onCheckedChange={setIsFeatured}
  />
  <Switch
    id="isNewArrival"
    name="isNewArrival"
    label="Yeni gelen"
    checked={isNewArrival}
    onCheckedChange={setIsNewArrival}
  />
</div>
```

(NOT: `Switch` component'in `checked` ve `onCheckedChange` prop'larını kabul ettiğinden emin ol. Eğer etmiyorsa — `defaultChecked` kalsın, derived preview yerine submit-sonrası hesaplamayla yetinilsin. Switch component'inin tipi `components/ui/switch.tsx`'i kontrol et; uncontrolled-only ise: bu task'i daha basit yap — sadece `defaultChecked` kullan ve derived preview çıkar. Subagent burada karar versin.)

**Eğer Switch controlled prop'ları desteklemiyorsa, basitleştirilmiş yol:** Yukarıdaki controlled state'leri kullan, ama Switch'leri DOM event'leri ile değil form submit sırasında oku. Derived preview'ı form'da göstermek yerine, `Aktif etiketler (önizleme)` yerine kaydet butonunun yanında bir not göster:

> "Etiketler kaydederken otomatik hesaplanır."

- [ ] **Step 4: Derived preview kutusu ekle**

Form'un altında, "Kaydet" butonunun ÜSTÜNE (mevcut `{state.error && ...}` bloğundan ÖNCE):

```tsx
{/* Derived badges preview */}
<div className="rounded-xl border border-border bg-elevated p-3 text-xs">
  <span className="font-medium text-muted">Önizleme — kaydedince görünecek etiketler:</span>{" "}
  {(() => {
    const previewBadges = deriveBadges({
      hasFreeShipping,
      isFeatured,
      isNewArrival,
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 3,
      warrantyYears: warrantyYears === "" ? null : Number(warrantyYears),
    });
    if (previewBadges.length === 0) return <span className="italic text-subtle">(etiket yok)</span>;
    return previewBadges.map((b) => productBadgeLabels[b]).join(" · ");
  })()}
</div>
```

- [ ] **Step 5: `stockQuantity` ve `lowStockThreshold` input'larını controlled yap**

Mevcut `Input` bileşenlerinin `defaultValue={initial?.stockQuantity}` gibi şeyleri yerine, controlled state'i kullan:

```tsx
<Input
  id="stockQuantity"
  name="stockQuantity"
  type="number"
  min={0}
  value={stockQuantity}
  onChange={(e) => setStockQuantity(e.target.value)}
  required
/>
```

Aynısı `lowStockThreshold` için.

(Bu derived preview için gerekli — stok değişince anlık update.)

### Task 6.2: Server action'da parseFormData güncelle

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/actions/products.ts:24-65`

- [ ] **Step 1: badges parse bloğunu sil, yeni alanları handle et**

Mevcut:

```ts
function parseFormData(formData: FormData): ProductInput | { error: string; fieldErrors: Record<string, string> } {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());

  if (typeof raw.badges === "string") {
    try {
      raw.badges = JSON.parse(raw.badges as string);
    } catch {
      raw.badges = [];
    }
  }
  // ... media + technicalSpecs parse ...
  raw.isActive = formData.get("isActive") === "on" || raw.isActive === "true";
  raw.isFeatured = formData.get("isFeatured") === "on" || raw.isFeatured === "true";
  raw.isNewArrival = formData.get("isNewArrival") === "on" || raw.isNewArrival === "true";

  const parsed = productInputSchema.safeParse(raw);
  // ...
}
```

Şu şekilde değiştir — `badges` parse bloğunu **silme** (Faz 8'de silinecek), sadece YENİ alanları ekle:

```ts
  raw.isActive = formData.get("isActive") === "on" || raw.isActive === "true";
  raw.isFeatured = formData.get("isFeatured") === "on" || raw.isFeatured === "true";
  raw.isNewArrival = formData.get("isNewArrival") === "on" || raw.isNewArrival === "true";
  raw.hasFreeShipping =
    formData.get("hasFreeShipping") === "on" || raw.hasFreeShipping === "true";
  // warrantyYears: number-or-null preprocess in Zod schema handles ""

  const parsed = productInputSchema.safeParse(raw);
```

- [ ] **Step 2: createProductAction ve updateProductAction'ı kontrol et**

Mevcut `repo.createProduct({ ...result, ... })` çağrısında `result.hasFreeShipping` ve `result.warrantyYears` otomatik gider (`...result` spread). Yine de DB insert sırasında Mapper bu alanları okur (Faz 4'te eklendi). Hiçbir değişiklik gerekmez burada.

### Task 6.3: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: PASS.

- [ ] **Step 2: Manuel smoke**

1. Admin paneline gir: `/kayhan-yonetim/urunler/<bir-id>/duzenle`.
2. "Kargo bedava" switch'i, "Garanti (yıl)" input'u görünür.
3. Aşağıda "Önizleme" kutusu doğru etiketleri listeler (formu değiştirdikçe güncellenir).
4. Garanti'yi 5 yap → önizlemede "5 Yıl Garanti" çıkar. 10 yap → "10 Yıl Garanti". Boş bırak → yok.
5. Kaydet → mağaza sayfasında etiketler doğru görünür (Faz 7'de display consumer'lar henüz güncellenmediği için `product.badges` array'i hâlâ render ediliyor — bu kabul edilebilir geçici state).

- [ ] **Step 3: Commit**

```powershell
git add components/admin/product-form.tsx "app/(admin)/kayhan-yonetim/actions/products.ts"
git commit -m "feat(admin): hasFreeShipping switch + warrantyYears input with derived preview"
```

---

## Faz 7: Display Consumer'ları deriveBadges'e Çevir

### Task 7.1: `product-card.tsx`

**Files:**
- Modify: `components/shop/product-card.tsx:1-10, 45`

- [ ] **Step 1: Import ve render'ı güncelle**

Üstteki import'lara ekle:

```tsx
import { deriveBadges } from "@/lib/products/badges";
```

Component içinde, `const primaryImage = ...` satırının altına ekle:

```tsx
const badges = deriveBadges(product);
```

Mevcut `{product.badges.length > 0 && ( ... )}` blok (line 45):

```tsx
{product.badges.length > 0 && (
  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
    {product.badges.slice(0, 2).map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

Şuna değiştir:

```tsx
{badges.length > 0 && (
  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
    {badges.slice(0, 2).map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

### Task 7.2: `urun/[slug]/page.tsx`

**Files:**
- Modify: `app/(public)/urun/[slug]/page.tsx:7-9, 135-141`

- [ ] **Step 1: Import + render güncelle**

Mevcut import'lara ekle:

```tsx
import { deriveBadges } from "@/lib/products/badges";
```

`hasDiscount`'un altına ekle (line ~76 civarı):

```tsx
const discountPercent = hasDiscount ? Math.round(...) : 0;
const badges = deriveBadges(product);
```

Mevcut `{product.badges.length > 0 && (...)}` blok (lines 135-141):

```tsx
{product.badges.length > 0 && (
  <div className="flex flex-wrap gap-1.5 pt-1">
    {product.badges.map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

Şuna değiştir:

```tsx
{badges.length > 0 && (
  <div className="flex flex-wrap gap-1.5 pt-1">
    {badges.map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

### Task 7.3: Diğer kullanım yerlerini ara

- [ ] **Step 1: Grep kontrol**

Çalıştır:

```powershell
pnpm exec grep -rn "product\.badges\|\.badges\.map\|\.badges\.slice" --include="*.tsx" --include="*.ts" app components 2>$null
```

(veya editor'da `product.badges` ara.)

Beklenen: yalnızca `lib/data/mappers.ts` (silinmedi, OK), `lib/validations/product.ts` (silinmedi, OK), `app/(admin)/kayhan-yonetim/actions/products.ts` (silinmedi, OK), ve mock data (silinmedi, OK).

Eğer başka bir display dosyası varsa (örn. `mobile-buy-bar.tsx`, admin tabloları), onu da `deriveBadges(product)`'a çevir.

### Task 7.4: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: PASS.

- [ ] **Step 2: Manuel smoke**

1. `/magaza` → kartlarda etiketler doğru ürünlerde görünüyor.
2. `/urun/solar-bahce-lambasi-set` (veya kullanıcının raporladığı buggy ürün) → "Kargo Bedava" etiketi şimdi sadece `hasFreeShipping=true` ise görünüyor. (Mock data güncellendi, eski yanlış konfigürasyon temizlendi.)
3. Sepete bu ürünü at → kargo bedava (Faz 5'in sonucu).

- [ ] **Step 3: Commit**

```powershell
git add components/shop/product-card.tsx "app/(public)/urun/[slug]/page.tsx"
git commit -m "refactor(shop): use deriveBadges instead of product.badges for display"
```

---

## Faz 8: Legacy `badges` Alanını Sil

Artık badges array'i hiçbir display kodu tarafından okunmuyor. Server action `badges` form alanını parse ediyor ama hidden input gönderilmiyor (Faz 6'da silindi) — yani `badges` parse bloğu artık ölü kod.

### Task 8.1: Type'tan `badges` sil

**Files:**
- Modify: `types/index.ts:48`

- [ ] **Step 1: Satırı sil**

`Product` interface'inden `badges: ProductBadge[];` satırını sil.

`ProductBadge` type EXPORT'una dokunma — hâlâ `lib/products/badges.ts`'in dönüş tipi olarak kullanılıyor.

### Task 8.2: Zod schema'dan `badges` sil

**Files:**
- Modify: `lib/validations/product.ts:3-10, 40`

- [ ] **Step 1: badgeEnum ve badges field'ını sil**

Üstteki `const badgeEnum = z.enum([...]);` (lines 3-10) satırını sil.

`productInputSchema` içinden `badges: z.array(badgeEnum).default([]),` satırını sil.

### Task 8.3: Mapper'dan `badges` sil

**Files:**
- Modify: `lib/data/mappers.ts:38, 71`

- [ ] **Step 1: rowToProduct'tan oku-satırını sil**

`badges: (row.badges as ProductBadge[] | null) ?? [],` satırını sil.

Import'tan `ProductBadge` referansını da kontrol et — sadece bu satırda kullanıldıysa kaldır:

```ts
import type {
  Category,
  Product,
  // ProductBadge -- bu satırı sil
  ...
} from "@/types";
```

- [ ] **Step 2: productToInsert'tan yaz-satırını sil**

`badges: p.badges,` satırını sil.

### Task 8.4: Mock data'dan `badges` sil

**Files:**
- Modify: `lib/mock/data.ts`

- [ ] **Step 1: Her mock product'tan badges array satırını sil**

Her mock product nesnesinde `badges: [...]` satırını sil. (Yeni alanlar `hasFreeShipping` + `warrantyYears` Faz 4'te eklenmişti, onlar kalsın.)

Find/replace ile: `badges: \[.*\],?\n` regex'i ile bul ve sil (manuel kontrolle).

### Task 8.5: Server action'dan `badges` parse bloğunu sil

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/actions/products.ts:27-33`

- [ ] **Step 1: badges parse bloğunu sil**

```ts
if (typeof raw.badges === "string") {
  try {
    raw.badges = JSON.parse(raw.badges as string);
  } catch {
    raw.badges = [];
  }
}
```

Bu 7 satırı sil.

### Task 8.6: badge-source preview için Pick<Product> kullanımı

**Files:**
- Modify: `lib/products/badges.ts`

- [ ] **Step 1: BadgeSourceFields'ı Product'tan türet**

Faz 2'de inline interface kullanmıştık. Şimdi Product type'ında alanlar var, Pick'e dönelim:

```ts
import type { Product, ProductBadge } from "@/types";

export type BadgeSourceFields = Pick<
  Product,
  | "hasFreeShipping"
  | "isFeatured"
  | "isNewArrival"
  | "stockQuantity"
  | "lowStockThreshold"
  | "warrantyYears"
>;

export function deriveBadges(p: BadgeSourceFields): ProductBadge[] {
  // ... aynı body
}
```

### Task 8.7: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: PASS. Eğer `product.badges` referansı kalmışsa tsc yakalayacak — düzelt.

- [ ] **Step 2: Build**

```powershell
pnpm build
```

Beklenen: PASS (orphan `components/admin/orders-table.tsx` hâlâ build'i blokluyor olabilir — F-1 verification raporunda not edilmişti; aynı durum geçerli; bu plan o orphan'ı çözmez).

Eğer SADECE orphan dosyalardan hata varsa, kabul et ve devam et. Eğer F-1/F-2'ye ait gerçek hata varsa, düzelt.

- [ ] **Step 3: Manuel smoke**

1. `/magaza` → etiketler doğru.
2. `/urun/<slug>` → etiketler doğru.
3. Admin → ürün düzenle → kaydet → mağazada etiketler güncel.
4. Sepete `hasFreeShipping=true` ürün at → kargo 0₺.

- [ ] **Step 4: Commit**

```powershell
git add types/index.ts lib/validations/product.ts lib/data/mappers.ts lib/mock/data.ts "app/(admin)/kayhan-yonetim/actions/products.ts" lib/products/badges.ts
git commit -m "refactor(product): remove legacy badges array field"
```

---

## Faz 9: Verification Report

### Task 9.1: Verification raporu yaz

**Files:**
- Create: `docs/verification/2026-05-13-product-badges-sot.md`

- [ ] **Step 1: Raporu yaz**

Şu şablonu kullan:

```markdown
# Product Badges SoT Verification Report

**Tarih:** 2026-05-13
**Plan:** `docs/superpowers/plans/2026-05-13-product-badges-sot.md`
**Spec:** `docs/superpowers/specs/2026-05-13-product-badges-sot-design.md`
**Branch:** `feat/product-badges-sot`

## Commit listesi

[Tüm 9 commit'in SHA + mesajını listele — `git log --oneline main..HEAD`]

## Doğrulama

- `pnpm test`: [N/N PASS]
- `pnpm exec tsc --noEmit`: [PASS / pre-existing noise only]
- `pnpm lint`: [PASS / 1 pre-existing warning]
- `pnpm build`: [PASS / blocked by pre-existing orphan]

## Manuel smoke

- [ ] Mağaza listede etiketler doğru ürünlerde
- [ ] Ürün detayda etiketler doğru
- [ ] Kargo bedava ürünü sepete attığında kargo 0₺
- [ ] Admin formda derived preview gerçek değerle eşleşiyor
- [ ] Migration uygulandı, has_free_shipping kolonu DB'de

## Bilinen sınırlamalar

- Eski `products.badges` SQL kolonu DB'de duruyor (kullanılmıyor). DROP COLUMN ayrı bir PR'da yapılacak.
- Mevcut `Switch` component'i controlled prop'ları desteklemiyorsa derived preview anlık güncellenmez (kaydetmeden önce statik).
```

- [ ] **Step 2: Commit**

```powershell
git add docs/verification/2026-05-13-product-badges-sot.md
git commit -m "docs(verification): product badges single source of truth closure report"
```

---

## Bittikten Sonra

- Branch'i main'e fast-forward merge et (kullanıcı onaylarsa).
- Memory güncelle: `project_master_fix_findings.md`'ye Sub-project A'nın kapandığını ekle.
- Kapsam dışı kalan: image hover-zoom (Sub-project B), legacy `products.badges` kolonu DROP migration'ı (ayrı PR).

---

## Self-review Notları (yazar için)

- ✅ Spec coverage: deriveBadges (Faz 2), free shipping davranışı (Faz 5), warranty alanı (Faz 4), admin form sadeleşmesi (Faz 6), migration (Faz 3), badges field silme (Faz 8) — hepsi var.
- ✅ Type tutarlılığı: `BadgeSourceFields` Faz 2'de inline, Faz 8'de `Pick<Product, ...>`'a dönüyor. Geçiş açık.
- ⚠️ Switch controlled-mod riski: Faz 6 Task 6.1 Step 3'te not edildi; subagent kararı bekleniyor.
- ⚠️ pnpm build orphan blocker: Faz 8'de not edildi.
