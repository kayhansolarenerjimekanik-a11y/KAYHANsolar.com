# Product Badges — Single Source of Truth (SoT) Design

**Tarih:** 2026-05-13
**Sub-project:** A (parent: 2026-05-13 UX consistency sweep)
**Hedef branch (planlı):** `feat/product-badges-sot`

## Problem

`Product.badges` alanı bugün admin tarafından manuel seçilen, sadece görsel bir etiket dizisi. Gerçek davranışa (kargo hesaplama, yeni ürün listesi, öne çıkarma, garanti, stok düşüklüğü) hiçbir bağı yok. Sonuç:

- Bir ürünün detay sayfasında "Kargo Bedava" etiketi görünebiliyor, ama sepete atınca 500₺ kargo ücreti çıkıyor. Müşteri yanılıyor.
- "Yeni" etiketi ile `isNewArrival` flag'i ayrı tutuluyor — admin bir tarafı doldurup diğerini unutabilir.
- "Tercih Edilen" etiketi ile `isFeatured` flag'i de aynı şekilde paralel.
- "Stokta Son" etiketi `lowStockThreshold` mekanizmasına bağlı değil — admin yanlış zamanlama yapabilir.
- "5/10 Yıl Garanti" etiketleri için altta hiç veri yok — sadece görsel.

Bu sub-project tek bir doğruluk kaynağı (single source of truth) prensibiyle problemi çözer: **admin gerçek davranışı belirleyen alanları doldurur, etiketler bu alanlardan otomatik türetilir.**

## Hedef davranışlar

- Admin "Kargo Bedava" switch'ini aktif eder → ürün listede + detayda otomatik "Kargo Bedava" etiketi görünür → sepette o ürün varsa kargo 0₺.
- Admin "Garanti (yıl): 5" yazar → "5 Yıl Garanti" etiketi görünür. "10" yazar → "10 Yıl Garanti". Boş/0 → garanti etiketi yok.
- `isFeatured` / `isNewArrival` mevcut switch'leri "Tercih Edilen" / "Yeni" etiketlerini sürer.
- Stok düştüğünde (>0 ama `<= lowStockThreshold`) "Stokta Son" etiketi otomatik görünür.
- Admin etiketleri DOĞRUDAN seçemez — yalnızca alttaki veriyi yönetir; etiket onun yansımasıdır.

## Mimari değişiklikler

### Veri modeli (Product)

**Eklenen:**

| Alan | TS tipi | SQL kolonu | Açıklama |
|---|---|---|---|
| `hasFreeShipping` | `boolean` | `has_free_shipping BOOLEAN NOT NULL DEFAULT FALSE` | Kargo bedava bayrağı |
| `warrantyYears` | `number \| null` | `warranty_years INT NULL` | Garanti süresi (yıl) |

**Silinen:**

| Alan | Sebep |
|---|---|
| `badges: ProductBadge[]` | Artık türetilen veri — kaynakta tutulmaz. Migration sonrasında DROP COLUMN. |

**Mevcut, dokunulmaz:** `isFeatured`, `isNewArrival`, `stockQuantity`, `lowStockThreshold`.

### Yeni saf fonksiyon: `deriveBadges`

Yer: `lib/products/badges.ts` (yeni dosya)

```ts
import type { Product, ProductBadge } from "@/types";

export function deriveBadges(p: Pick<Product,
  | "hasFreeShipping"
  | "isFeatured"
  | "isNewArrival"
  | "stockQuantity"
  | "lowStockThreshold"
  | "warrantyYears"
>): ProductBadge[] {
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

Saf, deterministik, kolay test edilir. Sıralama yukarıdan aşağıya sabit — UI'da tahmin edilebilir.

### Kullanım yerleri (gözden geçirilecek)

`product.badges`'i okuyan her dosyada artık `deriveBadges(product)` çağırılacak veya badge prop'u upstream'de hesaplanıp aşağıya geçirilecek:

- `app/(public)/urun/[slug]/page.tsx:135-141` — ürün detay sayfası
- `components/shop/product-card.tsx` (varsa) — magaza listeleme kartı
- `components/admin/products-table.tsx` (varsa) — admin tablosu satırları
- `app/(public)/magaza/page.tsx` (varsa) — listeleme

Backend tarafında `lib/data/mappers.ts` `rowToProduct` artık `badges` kolonundan değil, yeni `has_free_shipping` + `warranty_years` + mevcut flag'lerden çekecek. `productToInsert` ise `badges` kolonuna hiç yazmayacak.

### Cart kargo hesaplama

`components/shop/cart-view.tsx` ve `lib/campaigns/index.ts:applyCampaigns`:

`CartCalculationInput.items`'a yeni alan:

```ts
items: Array<{
  productId: string;
  quantity: number;
  price: number;
  hasFreeShipping: boolean;  // YENİ
}>;
```

`applyCampaigns` çıktısı:

```ts
const hasAnyFreeShippingItem = input.items.some((i) => i.hasFreeShipping);
const baseShipping = hasAnyFreeShippingItem ? 0 : input.baseShippingCost;
// ... mevcut campaign-based freeShipping kontrolleri baseShipping üzerinde uygulansın
```

Davranış kuralı (kullanıcı seçimi): **sepette tek bir "kargo bedava" ürün varsa, tüm siparişin kargosu bedava.**

Cart store (`store/cart.ts`) item snapshot'ı: sepete eklenen anda `hasFreeShipping` değeri de tutulacak (price ve quantity gibi). Ürünün sonradan bu alanı değiştirilirse mevcut sepetteki snapshot kalır — sipariş anındaki söz tutulur.

### Admin form değişiklikleri

`components/admin/product-form.tsx`:

**Sil:**
- 234-251. satırlardaki "Etiketler" fieldset'i (6 checkbox + hidden input).

**Ekle (mevcut "Aktif/Featured/NewArrival" switch'lerinin yanına):**
- "Kargo bedava" switch — `name="hasFreeShipping"`, `defaultChecked={initial?.hasFreeShipping ?? false}`
- "Garanti (yıl)" number input — `name="warrantyYears"`, `min={0}`, `max={20}`. Boş veya 0 → null gönder.

**Ekle (read-only önizleme):**
Form altında, kaydet butonunun yakınında küçük bir kutu:

> **Aktif etiketler:** Kargo Bedava · Yeni · 5 Yıl Garanti

`deriveBadges` ile formun mevcut değerlerinden anlık hesaplanır (`useFormState` veya `useState`'in mevcut alanlarından). Admin kaydetmeden önce neyin görüneceğini görür — net önizleme.

### Zod validation

`lib/validations/product.ts`:
- `badges` alanını sil
- Ekle:
  - `hasFreeShipping: z.coerce.boolean()` (form'dan "on" string'i gelir, coerce gerekir)
  - `warrantyYears: z.coerce.number().int().min(0).max(20).nullable()` veya `.optional().transform(v => v || null)` — boş input → null

### Server action (`app/(admin)/kayhan-yonetim/actions/products.ts`)

Mevcut create/update action:
- Zod parse'ta yeni alanlar gelecek.
- `repo.createProduct({ ...parsed.data })` ve `updateProduct` artık `hasFreeShipping` + `warrantyYears` alanlarını geçirecek; `badges` referansları silinecek.

### Migration (SQL)

İki ayrı migration dosyası — geri alabilirlik için:

**Migration 1: `20260513_007_product_badge_fields_add.sql`**

```sql
ALTER TABLE products
  ADD COLUMN has_free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN warranty_years INT NULL;

-- Backfill from existing badges array
UPDATE products
  SET has_free_shipping = TRUE
  WHERE 'kargo_bedava' = ANY(badges);

UPDATE products
  SET warranty_years = 5
  WHERE '5_yil_garanti' = ANY(badges);

UPDATE products
  SET warranty_years = 10
  WHERE '10_yil_garanti' = ANY(badges);
```

**Migration 2 (sonraki adım, ayrı PR — bu plan kapsamında DEĞİL): `20260514_001_product_drop_badges.sql`**

```sql
ALTER TABLE products DROP COLUMN badges;
```

Migration 2 sadece backend bir süre `badges`'i hiç okumadıktan/yazmadıktan sonra (en az bir sprint) atılır. Bu plan'da YALNIZCA Migration 1 ve kod değişiklikleri var; `badges` kolonu DB'de kalır ama kullanılmaz.

### Demo store (`lib/mock/data.ts`)

- Mock product tipinden `badges` alanını sil
- Her mock product'a uygun `hasFreeShipping` (true/false) ve `warrantyYears` (null/5/10) ekle
- Mevcut `isFeatured` / `isNewArrival` korunur

## Test stratejisi (TDD)

Proje şu an test framework'süz. Bu sub-project Vitest'i kurar ve ilk test suite'ini ekler.

### Eklenen bağımlılıklar

- `vitest@^2` (devDep)
- `@vitest/ui@^2` (devDep, opsiyonel local UI için)

### Yeni script (`package.json`)

```json
"test": "vitest run",
"test:watch": "vitest"
```

### TDD ile yazılacak testler

`lib/products/badges.test.ts` — `deriveBadges`'in tüm kombinasyonları:
- Boş ürün → boş badge dizisi
- `hasFreeShipping=true` → `["kargo_bedava"]` içerir
- `warrantyYears=5` → `["5_yil_garanti"]`; `warrantyYears=10` → `["10_yil_garanti"]`; `warrantyYears=null` → garanti badge yok
- `stockQuantity=0` → `stokta_son` YOK; `stockQuantity=lowStockThreshold` → VAR
- Tüm flag'ler true → 6 badge ile beklenen sıra

`lib/campaigns/index.test.ts` (mevcut applyCampaigns'i test eder):
- Sepette `hasFreeShipping=true` tek bir item → toplam shipping=0
- Sepette hiçbir item'da yok ve subtotal < threshold → normal shipping
- `free_shipping` kampanya da matchlerse, çift indirim olmasın (idempotent)

`lib/data/mappers.test.ts`:
- `rowToProduct` artık `badges` kolonundan değil yeni alanlardan okuyor mu
- `productToInsert` `badges` yazmıyor mu

### Manuel doğrulama (test çalışsa bile bunlar gerek)

- `pnpm test` — yeni testler PASS
- `pnpm exec tsc --noEmit` — PASS
- `pnpm lint` — PASS
- Admin paneli smoke testi:
  - Bir ürün düzenle → "Kargo bedava" aç → kaydet → ürün detayda etiket görünür → sepete at → kargo 0₺
  - Garanti (yıl) = 5 yap → "5 Yıl Garanti" etiketi görünür
  - Stok'u `lowStockThreshold`'un altına düşür → "Stokta Son" etiketi görünür
- Listeleme smoke testi:
  - `/magaza`'da etiket çipleri doğru ürünlerde görünüyor mu
  - `/urun/[slug]` detay sayfası etiketleri doğru gösteriyor mu

## Hata sınırı ve geri alma

- Migration 1 idempotent değil (UPDATE'ler tek-yön). Yanlış backfill durumunda DB snapshot'tan restore + manuel SQL düzeltme.
- DROP COLUMN bu plan kapsamında YOK — geri dönüş kolay (kolon mevcut, sadece kod onu kullanmıyor).
- Yeni cart logic risk: eğer cart store'daki item snapshot eski (`hasFreeShipping` yok) olursa, kargo hesabı yanlış çıkar. Çözüm: store'da `isHydrated` check'i sonrasında item'lar varsa, undefined `hasFreeShipping`'i `false` kabul et.

## Kapsam dışı

- "5 Yıl / 10 Yıl"'dan başka garanti süreleri (örn. 3 yıl) badge olarak GÖRÜNTÜLENMEYECEK — sadece sayı `warrantyYears` ürün detayında yazılı olarak duracak. (Yeni badge tipleri ileride eklenir.)
- Migration 2 (DROP COLUMN) — ayrı bir takip işi.
- Image hover-zoom (Sub-project B) — ayrı plan.

## Plan'a geçiş

Kullanıcı onay verdikten sonra `superpowers:writing-plans` skill ile implementation plan'ı `docs/superpowers/plans/2026-05-13-product-badges-sot.md`'ye yazılacak. TDD prensibiyle: her saf fonksiyon önce test → sonra implementation.
