# Admin Form Bug Fix (B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin ürün formundaki "Form geçersiz" mesajının hangi alandan kaynaklandığını user'a göster, `lowStockThreshold = 0` sessiz hatasını çöz, "Demo modu" yanıltıcı yazılarını temizle, herhangi HTTPS hostname'inden gelen görsel URL'lerini desteklemesi için `next/image` whitelist'ini wildcard yap.

**Architecture:** Tek branch `feat/admin-form-bug-fix` (spec dosyası önceden commit edildi). Saf yardımcı `productFieldLabel(field)` Türkçe form alan etiketleri üretir; Zod `fieldErrors` form tepesinde özetlenir. Iki UI copy değişikliği + bir Zod min ayarı + bir Next.js config ayarı. Vitest mevcut, iki yeni test dosyası eklenir.

**Tech Stack:** Next.js 16.2.6 App Router + TypeScript strict + React 19 + Zod 4 + Vitest 2.

**Spec:** `docs/superpowers/specs/2026-05-13-admin-form-bug-fix-design.md`

**Önemli:**
- Branch: `feat/admin-form-bug-fix` (zaten oluşturuldu, spec commit'i `70e898d` üzerinde).
- Çalışma dizininde paralel oturum kaynaklı orphan dosyalar olabilir. **Targeted `git add <path>` only** — `git add -A` / `git add .` / `git add docs/` ASLA.
- Mode: `AUTH_MODE=supabase`, `DATA_MODE=supabase`. Production-benzeri test mümkün.
- Plan TDD-first. Saf yardımcı `productFieldLabel` ve Zod schema testleri önce yazılır.

---

## Dosya Haritası

| Dosya | Durum | Faz | Sorumluluğu |
|---|---|---|---|
| `lib/admin/field-labels.ts` | **YENİ** | 1 | Saf fonksiyon: Zod `fieldErrors` path'ini Türkçe etikete çevir |
| `lib/admin/field-labels.test.ts` | **YENİ** | 1 | TDD test |
| `lib/validations/product.test.ts` | **YENİ** | 2 | Zod schema test |
| `lib/validations/product.ts` | Modify (1 line) | 2 | `lowStockThreshold.min(1)` → `min(0)` |
| `components/admin/product-form.tsx` | Modify | 3 | Form tepesine error summary kutu ekle |
| `components/shop/cart-view.tsx` | Modify (1 block) | 4 | "Demo modu" → "Ödeme akışı" |
| `components/admin/media-list-editor.tsx` | Modify (1 line) | 4 | "Demo modda yükleme yok" → "Disk'ten yükleme yakında" |
| `next.config.ts` | Modify | 5 | `remotePatterns: [{ protocol: "https", hostname: "**" }]` |
| `docs/verification/2026-05-13-admin-form-bug-fix.md` | **YENİ** | 6 | Closure raporu |

**6 commit:**

1. `feat(admin): add productFieldLabel helper for form error display`
2. `fix(validation): lowStockThreshold allows 0; add product schema tests`
3. `feat(admin): surface all Zod field errors at form top`
4. `chore(ui): replace "Demo modu" hardcoded labels with neutral copy`
5. `chore(config): allow any HTTPS hostname for next/image`
6. `docs(verification): admin form bug fix closure report`

---

## Faz 1: productFieldLabel Helper (TDD)

### Task 1.1: Failing test yaz

**Files:**
- Create: `lib/admin/field-labels.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { productFieldLabel } from "./field-labels";

describe("productFieldLabel", () => {
  it("returns Turkish label for known field", () => {
    expect(productFieldLabel("lowStockThreshold")).toBe("Düşük stok eşiği");
    expect(productFieldLabel("categoryId")).toBe("Kategori");
    expect(productFieldLabel("currentPrice")).toBe("Satış fiyatı");
    expect(productFieldLabel("warrantyYears")).toBe("Garanti (yıl)");
    expect(productFieldLabel("hasFreeShipping")).toBe("Kargo bedava");
    expect(productFieldLabel("media")).toBe("Medya listesi");
  });

  it("parses media.N.url path to '1-indexed medya URL'", () => {
    expect(productFieldLabel("media.0.url")).toBe("1. medya URL");
    expect(productFieldLabel("media.2.url")).toBe("3. medya URL");
  });

  it("parses media.N.altText", () => {
    expect(productFieldLabel("media.0.altText")).toBe("1. medya alt metin");
  });

  it("parses media.N.thumbnailUrl", () => {
    expect(productFieldLabel("media.1.thumbnailUrl")).toBe("2. medya küçük görsel");
  });

  it("parses media.N.type", () => {
    expect(productFieldLabel("media.0.type")).toBe("1. medya tip");
  });

  it("falls back to raw field name for unknown", () => {
    expect(productFieldLabel("foobar")).toBe("foobar");
    expect(productFieldLabel("technicalSpecs.someKey")).toBe("technicalSpecs.someKey");
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: FAIL with "Cannot find module './field-labels'".

### Task 1.2: Implement `productFieldLabel`

**Files:**
- Create: `lib/admin/field-labels.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: "Ürün adı",
  slug: "Slug (URL)",
  shortDescription: "Kısa açıklama",
  longDescription: "Detaylı açıklama",
  metaTitle: "SEO başlığı",
  metaDescription: "SEO açıklaması",
  categoryId: "Kategori",
  brand: "Marka",
  supplierUrl: "Tedarikçi URL",
  supplierPrice: "Tedarikçi fiyatı",
  markupPercentage: "Kar marjı",
  currentPrice: "Satış fiyatı",
  compareAtPrice: "Eski fiyat",
  stockQuantity: "Stok adedi",
  lowStockThreshold: "Düşük stok eşiği",
  warrantyYears: "Garanti (yıl)",
  hasFreeShipping: "Kargo bedava",
  isActive: "Aktif",
  isFeatured: "Öne çıkar",
  isNewArrival: "Yeni gelen",
  media: "Medya listesi",
  technicalSpecs: "Teknik özellikler",
};

const MEDIA_SUB_LABELS: Record<string, string> = {
  url: "URL",
  altText: "alt metin",
  thumbnailUrl: "küçük görsel",
  type: "tip",
};

export function productFieldLabel(field: string): string {
  const mediaMatch = /^media\.(\d+)\.([a-zA-Z]+)$/.exec(field);
  if (mediaMatch) {
    const idx = Number(mediaMatch[1]) + 1;
    const sub = MEDIA_SUB_LABELS[mediaMatch[2]] ?? mediaMatch[2];
    return `${idx}. medya ${sub}`;
  }
  return PRODUCT_FIELD_LABELS[field] ?? field;
}
```

- [ ] **Step 2: Test'in geçtiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: önceki 14 test + 6 yeni = **20/20 PASS**.

- [ ] **Step 3: tsc + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS (pre-existing `product-lightbox.tsx` warning OK).

- [ ] **Step 4: Commit**

```powershell
git add lib/admin/field-labels.ts lib/admin/field-labels.test.ts
git status
```

Confirm ONLY 2 files staged. Then:

```powershell
git commit -m "feat(admin): add productFieldLabel helper for form error display"
```

---

## Faz 2: Zod Schema Test + lowStockThreshold Fix

### Task 2.1: Failing test yaz

**Files:**
- Create: `lib/validations/product.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { productInputSchema } from "./product";

const validBase = {
  slug: "test-urun",
  name: "Test Ürün",
  shortDescription: "abc12",
  categoryId: "cat-1",
  currentPrice: 100,
  stockQuantity: 5,
  lowStockThreshold: 3,
  media: [{ type: "image", url: "https://example.com/a.jpg" }],
};

describe("productInputSchema — lowStockThreshold", () => {
  it("accepts lowStockThreshold = 0 (means no low-stock alert)", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects lowStockThreshold = -1", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts lowStockThreshold = 3 (default)", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: 3 });
    expect(result.success).toBe(true);
  });
});

describe("productInputSchema — warrantyYears preprocess", () => {
  it("accepts empty string and converts to null", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warrantyYears).toBeNull();
  });

  it("accepts numeric string '5'", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warrantyYears).toBe(5);
  });

  it("rejects warrantyYears > 20", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: 25 });
    expect(result.success).toBe(false);
  });
});

describe("productInputSchema — media URL", () => {
  it("accepts any HTTPS hostname (admin chose Option A)", () => {
    const result = productInputSchema.safeParse({
      ...validBase,
      media: [{ type: "image", url: "https://www.solinved.com/400w-sokak-aydinlatmasi#photos-1" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = productInputSchema.safeParse({
      ...validBase,
      media: [{ type: "image", url: "not-a-url" }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Test'in (kısmen) fail ettiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: 1 test FAIL (`accepts lowStockThreshold = 0`) çünkü Zod hâlâ `min(1)`. Diğerleri PASS.

Tam çıktı: `7 passed, 1 failed (1 in product.test.ts)` veya benzeri. lowStockThreshold=0 testi failure ile gözlenir.

### Task 2.2: lowStockThreshold min'i 0'a düşür

**Files:**
- Modify: `lib/validations/product.ts:39`

- [ ] **Step 1: Tek satırı değiştir**

Mevcut:
```ts
  lowStockThreshold: z.coerce.number().int().min(1).default(3),
```

Yeni:
```ts
  lowStockThreshold: z.coerce.number().int().min(0).default(3),
```

- [ ] **Step 2: Test'in geçtiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: **26/26 PASS** (önceki 20 + 6 yeni schema testi).

- [ ] **Step 3: tsc + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS.

- [ ] **Step 4: Commit**

```powershell
git add lib/validations/product.test.ts lib/validations/product.ts
git status
```

Confirm ONLY 2 files staged. Then:

```powershell
git commit -m "fix(validation): lowStockThreshold allows 0; add product schema tests"
```

---

## Faz 3: Form Error Summary UI

### Task 3.1: `productFieldLabel`'ı form'a wire et + summary block ekle

**Files:**
- Modify: `components/admin/product-form.tsx`

- [ ] **Step 1: Import ekle**

`components/admin/product-form.tsx`'in üst kısmındaki import bloğuna, mevcut `@/lib/...` import'ları arasına alfabetik olarak ekle:

```tsx
import { productFieldLabel } from "@/lib/admin/field-labels";
```

(Mevcut sıra: `@/components/...` → `@/lib/...` → `@/types`. `field-labels` `@/lib/admin/`'de olduğu için diğer `@/lib/` import'larıyla beraber.)

- [ ] **Step 2: Error summary kutusunu ekle**

Mevcut formun sonunda (lines 309-313 civarı):

```tsx
{state.error && (
  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
    {state.error}
  </div>
)}
```

Bu bloğu OLDUĞU GİBİ TUT (Zod dışı server hataları için fallback olarak gerekir). Bu bloğun HEMEN ÜSTÜNE yeni summary bloğunu ekle:

```tsx
{state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
    <p className="font-semibold text-danger">Düzeltilmesi gereken alanlar:</p>
    <ul className="mt-2 space-y-0.5 text-xs text-danger">
      {Object.entries(state.fieldErrors).map(([field, msg]) => (
        <li key={field}>
          • <span className="font-medium">{productFieldLabel(field)}</span>: {msg}
        </li>
      ))}
    </ul>
  </div>
)}

{state.error && (
  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
    {state.error}
  </div>
)}
```

(Sırayla: önce fieldErrors detaylı listesi, sonra (varsa) generic state.error.)

- [ ] **Step 3: tsc + lint + test**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`

Beklenen: tüm önceki + 0 yeni test = **26/26 PASS**.

- [ ] **Step 4: Manuel smoke**

Dev server zaten çalışıyorsa kullan. `pnpm dev` ile başlat eğer yoksa.

1. `/kayhan-yonetim/urunler/yeni` (veya bir mevcut ürünü düzenle).
2. Kategori dropdown'unu "Seçin" (boş) bırak, kaydet'e bas.
3. Beklenen: Form sonunda **"Düzeltilmesi gereken alanlar:"** kutusunda "**Kategori:** Kategori seçin" görmelisin.
4. Beklenen: `categoryId` field'ının kendi `errFor("categoryId")` mesajı da görünür (mevcut davranış).

Eğer derived preview kutusu state.error/fieldErrors render'ından sonra geliyorsa (Önizleme — derived badges), o kutuyu yerini değiştirme — sadece error blokları arasına summary'i sok.

- [ ] **Step 5: Commit**

```powershell
git add components/admin/product-form.tsx
git status
```

Confirm ONLY 1 file staged. Then:

```powershell
git commit -m "feat(admin): surface all Zod field errors at form top"
```

---

## Faz 4: "Demo Modu" Yazılarını Temizle

### Task 4.1: `cart-view.tsx`'deki "Demo modu" kopyasını değiştir

**Files:**
- Modify: `components/shop/cart-view.tsx:389-393`

- [ ] **Step 1: Bloğu güncelle**

Mevcut:

```tsx
<div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-xs text-muted">
  <span className="font-semibold text-foreground">Demo modu:</span>{" "}
  Sipariş bilgileriniz WhatsApp linki olarak hazırlanır, gerçek bir
  ödeme alınmaz.
</div>
```

Yeni:

```tsx
<div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-xs text-muted">
  <span className="font-semibold text-foreground">Ödeme akışı:</span>{" "}
  Sipariş onayı ve ödeme detayları WhatsApp üzerinden tamamlanır.
</div>
```

### Task 4.2: `media-list-editor.tsx`'deki "Demo modda" kopyasını değiştir

**Files:**
- Modify: `components/admin/media-list-editor.tsx:71-73`

- [ ] **Step 1: Label'ı güncelle**

Mevcut:

```tsx
<Label className="mt-2 block">
  Demo modda dosya yükleme yok — URL yapıştırın (örn. picsum.photos veya kendi CDN&apos;iniz).
</Label>
```

Yeni:

```tsx
<Label className="mt-2 block">
  Görsel/video/PDF URL&apos;i yapıştırın. Disk&apos;ten yükleme yakında.
</Label>
```

### Task 4.3: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`

Beklenen: PASS, 26/26.

- [ ] **Step 2: Manuel smoke**

1. `/sepet` sayfasına git (sepette ürün varken). Sağ alttaki notu kontrol et — "Ödeme akışı:" görmelisin, "Demo modu" değil.
2. `/kayhan-yonetim/urunler/yeni` aç. Medya bölümünün altındaki etiketi kontrol et — "Disk'ten yükleme yakında" görmelisin.

- [ ] **Step 3: Commit**

```powershell
git add components/shop/cart-view.tsx components/admin/media-list-editor.tsx
git status
```

Confirm ONLY 2 files staged. Then:

```powershell
git commit -m "chore(ui): replace \"Demo modu\" hardcoded labels with neutral copy"
```

---

## Faz 5: Image Hostname Wildcard

### Task 5.1: `next.config.ts`'i güncelle

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: remotePatterns'ı wildcard'a değiştir**

Mevcut:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

Yeni:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
```

(NOT: Bir paralel oturum `feat/netlify-deploy` branch'inde Supabase Storage hostname'i eklemiş olabilir; conflict olursa bizim wildcard zaten o hostname'i kapsar — wildcard'ı koru.)

- [ ] **Step 2: tsc**

Çalıştır: `pnpm exec tsc --noEmit`

Beklenen: PASS.

- [ ] **Step 3: pnpm build (önemli)**

Çalıştır: `pnpm build`

Beklenen: PASS — 60+ sayfa generate eder. Build sırasında hostname yapılandırması yüklenir.

Eğer build başka bir nedenle (orphan dosya vb.) fail ederse, sadece bu wildcard değişikliğinden kaynaklanmadığını teyit et — diğer dosyalardan kaynaklı pre-existing hatayı not et ama düzeltme.

- [ ] **Step 4: Manuel smoke**

1. Bir ürünü admin paneline gir, Medya bölümünde URL alanına `https://www.solinved.com/cdn/shop/files/example.jpg` veya benzeri bir IMAGE URL'i yapıştır (gerçek bir image dosyası).
2. Kaydet.
3. Ürün detay sayfasında veya mağaza listesinde görsel render olmalı (önceden hata verirdi).

NOT: Eğer URL bir HTML sayfasına işaret ediyorsa (image dosyası değilse), yine resim görünmez — bu beklenen davranış (image content-type değil). User'a IMAGE URL'i kullanması gerektiği başka bir UX işi (B1 kapsamında değil).

- [ ] **Step 5: Commit**

```powershell
git add next.config.ts
git status
```

Confirm ONLY 1 file staged. Then:

```powershell
git commit -m "chore(config): allow any HTTPS hostname for next/image"
```

---

## Faz 6: Verification Report

### Task 6.1: Verification raporu yaz

**Files:**
- Create: `docs/verification/2026-05-13-admin-form-bug-fix.md`

- [ ] **Step 1: Raporu yaz**

Şu şablonu kullan, gerçek SHA'larla doldur:

```markdown
# Admin Form Bug Fix (B1) Verification Report

**Tarih:** 2026-05-13
**Plan:** `docs/superpowers/plans/2026-05-13-admin-form-bug-fix.md`
**Spec:** `docs/superpowers/specs/2026-05-13-admin-form-bug-fix-design.md`
**Branch:** `feat/admin-form-bug-fix`
**Sonuç:** ✅ APPROVED FOR MERGE

## Commit listesi

[git log --oneline main..HEAD çıktısını yapıştır — 6 commit + spec]

## Ne tamamlandı

**B1.a — Form tepesinde Zod hatalarının özet listesi:**
- `lib/admin/field-labels.ts` — `productFieldLabel(field)` saf yardımcı.
- `components/admin/product-form.tsx` — `state.fieldErrors`'i Türkçe etiketlerle döker.
- 6 yeni unit test (`field-labels.test.ts`).

**B1.b — `lowStockThreshold` min(0):**
- `lib/validations/product.ts` — `.min(1)` → `.min(0)`.
- 6 yeni schema testi (`product.test.ts`).

**B1.c — "Demo modu" yazıları temizlendi:**
- `cart-view.tsx`: "Demo modu" → "Ödeme akışı".
- `media-list-editor.tsx`: "Demo modda yükleme yok" → "Disk'ten yükleme yakında".

**B1.d — Image hostname wildcard:**
- `next.config.ts`: `remotePatterns: [{ protocol: "https", hostname: "**" }]`.

## Doğrulama

| Komut | Sonuç |
|---|---|
| `pnpm test` | ✅ 26/26 PASS |
| `pnpm exec tsc --noEmit` | ✅ PASS |
| `pnpm lint` | ✅ PASS |
| `pnpm build` | ✅ PASS / pre-existing X |

## Manuel smoke

- [ ] Admin formda kategori bırak boş → kaydet → "Düzeltilmesi gereken alanlar: Kategori: Kategori seçin" görünüyor.
- [ ] `lowStockThreshold = 0` kayıt geçiyor.
- [ ] `https://www.solinved.com/...jpg` URL'i ürün detayında render oluyor.
- [ ] `/sepet` ve admin medya bölümünde "Demo modu" yazısı yok.

## Bilinen sınırlamalar / kapsam dışı

- B2 (custom etiketler), B3 (disk upload), B4/B5 (tedarikçi entegrasyonu) — ayrı planlar gerek.
- "Demo modu" yazısı kaldırıldı ama gerçek dosya upload (F-2/B3) hâlâ implement edilmedi — user sadece URL girebilir.
```

- [ ] **Step 2: Commit**

```powershell
git add docs/verification/2026-05-13-admin-form-bug-fix.md
git commit -m "docs(verification): admin form bug fix closure report"
```

---

## Bittikten Sonra

- Branch'i main'e merge et (kullanıcı onaylarsa). Paralel oturum aktif olabilir — `git fetch && git merge` ile state'i tut.
- Memory'yi güncelle: `project_ux_consistency_sweep.md`'ye B1'in kapandığını ekle.
- Kapsam dışı: B2 (custom etiketler), B3 (disk upload), B4/B5 (tedarikçi entegrasyonu) — yeni brainstorm + plan'larla.

---

## Self-Review

- ✅ **Spec coverage:** B1.a (Faz 1+3), B1.b (Faz 2), B1.c (Faz 4), B1.d (Faz 5). Tüm spec gereksinimleri karşılandı.
- ✅ **No placeholders:** Her step tam kod + komut + beklenen çıktı içeriyor.
- ✅ **Type consistency:** `productFieldLabel(field: string): string` her yerde aynı. `state.fieldErrors?: Record<string, string>` mevcut tip — değişmiyor.
- ⚠️ **Bilinen risk:** Faz 3'te `product-form.tsx`'de mevcut "Önizleme" kutusu var (lines ~291-307). Summary kutu onun ÜSTÜNE/ALTINA değil — kaydet butonu öncesi yerleştirilir. Implementer dikkat etmeli ki Önizleme yerini bozmasın.
