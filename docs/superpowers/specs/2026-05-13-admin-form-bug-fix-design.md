# Admin Form Bug Fix (B1) Design

**Tarih:** 2026-05-13
**Sub-project:** B1 (parent: 2026-05-13 admin paneli iyileştirme sweep'i)
**Hedef branch (planlı):** `feat/admin-form-bug-fix`

## Problem

Kullanıcı admin paneli ürün düzenleme formunda kaydet'e bastığında "Form geçersiz" mesajı alıyor ama hangi alanın yanlış olduğunu görmüyor. Ek olarak iki UX sorunu raporlandı: "Demo modu" yazıları yanıltıcı (gerçek mode supabase), yabancı tedarikçi sitelerinin (örn. solinved.com) görsel URL'leri Next.js `<Image>`'da renderlanmıyor.

## Hedef davranışlar

- Admin form Zod validasyon hatası verdiğinde, formun ÜSTÜNDE TÜM hatalı alanların Türkçe etiketleri ve mesajları toplu listelenir.
- `lowStockThreshold = 0` artık geçerli (alert kapalı anlamına gelir).
- "Demo modu" yazıları mode-bağımsız ifadelerle değiştirilir.
- Herhangi bir HTTPS hostname'inden gelen görsel URL'leri Next.js `<Image>` ile sorunsuz render edilir.

## Mimari değişiklikler

### Bug B1.a — Tüm Zod hatalarını formun tepesinde özet kutu

**Dosya:** `components/admin/product-form.tsx`

`state.error && Object.keys(state.fieldErrors ?? {}).length > 0` koşulunda, kaydet butonunun **üstünde** (existing `{state.error && ...}` bloğunun yerine) bir özet kutu render et:

```tsx
{state.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
  <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
    <p className="font-semibold text-danger">Düzeltilmesi gereken alanlar:</p>
    <ul className="mt-2 space-y-0.5 text-xs text-danger">
      {Object.entries(state.fieldErrors).map(([field, msg]) => (
        <li key={field}>
          • <span className="font-medium">{fieldLabel(field)}</span>: {msg}
        </li>
      ))}
    </ul>
  </div>
)}
```

Existing `{state.error && ...}` bloğu kalır (Zod dışı server-side error'lar için — örn. DB hatası).

### Yardımcı: `fieldLabel(field: string)`

**Dosya:** `lib/admin/field-labels.ts` (yeni)

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

export function productFieldLabel(field: string): string {
  // media.0.url → "1. medya URL'i"
  const m = /^media\.(\d+)\.(url|altText|thumbnailUrl|type)$/.exec(field);
  if (m) {
    const idx = Number(m[1]) + 1;
    const sub = { url: "URL", altText: "alt metin", thumbnailUrl: "küçük görsel", type: "tip" }[m[2]] ?? m[2];
    return `${idx}. medya ${sub}`;
  }
  return PRODUCT_FIELD_LABELS[field] ?? field;
}
```

Saf, test edilebilir, kolayca genişletilir.

### Bug B1.b — `lowStockThreshold` min(0)

**Dosya:** `lib/validations/product.ts`

Mevcut:
```ts
lowStockThreshold: z.coerce.number().int().min(1).default(3),
```

Yeni:
```ts
lowStockThreshold: z.coerce.number().int().min(0).default(3),
```

Davranış: 0 = "düşük stok uyarısı yok"; pozitif sayı = mevcut davranış. Empty input → default 3.

### Bug B1.c — "Demo modu" yazılarını mode-bağımsız çevir

**Dosya:** `components/shop/cart-view.tsx:389-393`

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

**Dosya:** `components/admin/media-list-editor.tsx:71-73`

Mevcut:
```tsx
<Label className="mt-2 block">
  Demo modda dosya yükleme yok — URL yapıştırın (örn. picsum.photos veya kendi CDN&apos;iniz).
</Label>
```

Yeni:
```tsx
<Label className="mt-2 block">
  Görsel/video/PDF URL'i yapıştırın. Disk'ten yükleme yakında.
</Label>
```

(Disk yükleme F-2 sub-project'inde implement edilecek; o zaman bu yazı tamamen kaldırılır.)

### Bug B1.d — Image hostname wildcard

**Dosya:** `next.config.ts`

Mevcut:
```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "picsum.photos" },
    { protocol: "https", hostname: "images.unsplash.com" },
  ],
},
```

Yeni:
```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "**" },
  ],
},
```

Davranış: Herhangi bir HTTPS hostname'den gelen görsel `<Image>` ile optimize edilir. Sadece adminler URL ekleyebildiği için saldırı yüzeyi düşük.

## Test stratejisi (TDD)

Vitest mevcut. Yeni test dosyaları:

### `lib/admin/field-labels.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { productFieldLabel } from "./field-labels";

describe("productFieldLabel", () => {
  it("returns Turkish label for known field", () => {
    expect(productFieldLabel("lowStockThreshold")).toBe("Düşük stok eşiği");
  });
  it("parses media.N.url path", () => {
    expect(productFieldLabel("media.0.url")).toBe("1. medya URL");
  });
  it("parses media.N.altText path", () => {
    expect(productFieldLabel("media.2.altText")).toBe("3. medya alt metin");
  });
  it("falls back to raw field name for unknown", () => {
    expect(productFieldLabel("foobar")).toBe("foobar");
  });
});
```

### `lib/validations/product.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { productInputSchema } from "./product";

const validBase = {
  slug: "test",
  name: "Test",
  shortDescription: "abc12",
  categoryId: "cat-1",
  currentPrice: 100,
  stockQuantity: 5,
  lowStockThreshold: 3,
  media: [{ type: "image", url: "https://example.com/a.jpg" }],
};

describe("productInputSchema", () => {
  it("accepts lowStockThreshold = 0", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: 0 });
    expect(result.success).toBe(true);
  });
  it("rejects lowStockThreshold = -1", () => {
    const result = productInputSchema.safeParse({ ...validBase, lowStockThreshold: -1 });
    expect(result.success).toBe(false);
  });
  it("accepts empty string warrantyYears (becomes null)", () => {
    const result = productInputSchema.safeParse({ ...validBase, warrantyYears: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warrantyYears).toBeNull();
  });
  it("accepts any HTTPS hostname in media URL", () => {
    const result = productInputSchema.safeParse({
      ...validBase,
      media: [{ type: "image", url: "https://www.solinved.com/abc.jpg" }],
    });
    expect(result.success).toBe(true);
  });
});
```

### Manuel doğrulama

- `pnpm test` — yeni testler PASS
- `pnpm exec tsc --noEmit` — PASS
- `pnpm lint` — PASS
- `pnpm build` — PASS
- Manuel admin smoke:
  - Yeni ürün ekle → kategori seçmeden Kaydet'e bas → form tepesinde "Kategori: Kategori seçin" listesinde görmeli
  - lowStockThreshold = 0 yap → kayıt başarılı
  - Medya URL = solinved.com'dan bir image URL'i → kayıt başarılı + ürün detayda görsel render
  - cart-view'da "Ödeme akışı:" mesajını gör (artık "Demo modu" değil)

## Kapsam dışı

- **B2 — Custom etiketler** (admin serbest metin label ekleme)
- **B3 — Disk'ten dosya yükleme** (gerçek file upload → Supabase Storage)
- **B4 — Tedarikçi entegrasyonu (direkt)** (server-side scrape + cron)
- **B5 — Tedarikçi entegrasyonu (Make/Apify)** (external scenario push)

Bunlar bu sub-project'te ele alınmaz; ayrı plan'lar gerekir.

## Plan'a geçiş

Kullanıcı onayından sonra `superpowers:writing-plans` skill ile `docs/superpowers/plans/2026-05-13-admin-form-bug-fix.md` yazılacak. TDD ile saf yardımcı (`productFieldLabel`) ve Zod schema testleri önce yazılır, sonra implement edilir. Kalan UI/copy değişiklikleri direkt edit.
