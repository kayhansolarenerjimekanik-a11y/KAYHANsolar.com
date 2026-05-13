# Custom Badges (B2) Design

**Tarih:** 2026-05-13
**Sub-project:** B2 (parent: 2026-05-13 admin paneli iyileştirme sweep'i)
**Hedef branch:** `feat/custom-badges`

## Problem

Sub-project A (badge SoT) preset 6 etiketi gerçek veri alanlarından türetiyor. Ama admin müşterilere yönelik özel pazarlama etiketleri eklemek istiyor — "Yılbaşı Kampanyası", "Stok Bitiyor", "Yeni Sezon" gibi. Bu etiketler kampanya/stok logic'ine bağlı değil, sadece pazarlama mesajı.

## Hedef davranışlar

- Admin yeni bir sayfada (`/kayhan-yonetim/etiketler`) custom etiket ekler/düzenler/siler. Her etiketin bir adı ve bir paletten seçili rengi var.
- Admin ürün düzenleme formunda mevcut etiketlerden istediklerini tıklayarak seçer.
- Mağaza listesi ve ürün detay sayfasında custom etiketler derived badge'lerle aynı şerit içinde gösterilir.
- Etiket silinince → tüm ürünlerden otomatik kaldırılır (cascade).
- Etiket adı/rengi değişince → tüm ürünlerde otomatik güncellenir.

## Mimari değişiklikler

### Veri modeli

**Yeni 2 tablo:**

```sql
CREATE TABLE product_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL CHECK (color IN ('lime','red','yellow','blue','purple','gray')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_label_assignments (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES product_labels(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, label_id)
);

CREATE INDEX idx_pla_product ON product_label_assignments(product_id);
CREATE INDEX idx_pla_label ON product_label_assignments(label_id);
```

Migration dosyası: `supabase/migrations/20260513_008_product_labels.sql`.

**Renk paleti (sabit 6 değer):**

| Color enum | Tailwind class (chip) |
|---|---|
| `lime` | `bg-lime-primary/95 text-black` |
| `red` | `bg-danger/90 text-white` |
| `yellow` | `bg-warning/90 text-white` |
| `blue` | `bg-info/90 text-white` |
| `purple` | `bg-purple-500/90 text-white` |
| `gray` | `bg-surface/95 text-foreground border border-border` |

### TypeScript tipleri

```ts
// types/index.ts
export type ProductLabelColor = "lime" | "red" | "yellow" | "blue" | "purple" | "gray";

export interface ProductLabel {
  id: string;
  name: string;
  color: ProductLabelColor;
  createdAt: string;
}

export interface Product {
  // ... mevcut alanlar
  customLabels: ProductLabel[];  // YENİ
}
```

### Saf yardımcı: `labelColorClasses`

`lib/products/label-colors.ts`:

```ts
import type { ProductLabelColor } from "@/types";

const CLASSES: Record<ProductLabelColor, string> = {
  lime: "bg-lime-primary/95 text-black",
  red: "bg-danger/90 text-white",
  yellow: "bg-warning/90 text-white",
  blue: "bg-info/90 text-white",
  purple: "bg-purple-500/90 text-white",
  gray: "bg-surface/95 text-foreground border border-border",
};

export function labelColorClasses(color: ProductLabelColor): string {
  return CLASSES[color];
}

export const ALL_LABEL_COLORS: ProductLabelColor[] = [
  "lime", "red", "yellow", "blue", "purple", "gray",
];
```

Saf, test edilebilir.

### Display component: `CustomLabelChip`

`components/shop/custom-label-chip.tsx`:

```tsx
import { labelColorClasses } from "@/lib/products/label-colors";
import { cn } from "@/lib/utils";
import type { ProductLabel } from "@/types";

export function CustomLabelChip({
  label,
  className,
}: {
  label: ProductLabel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        labelColorClasses(label.color),
        className,
      )}
    >
      {label.name}
    </span>
  );
}
```

### Display yerleri

**`components/shop/product-card.tsx`** (mağaza listesi):

Mevcut derived badge slice'ından sonra custom labels da eklenir. Sınır: toplam max 3 chip (kart küçük). Sıra: önce derived sonra custom.

```tsx
const derivedBadges = deriveBadges(product);
const customLabels = product.customLabels;
const visibleSlots = 3;
const derivedShown = derivedBadges.slice(0, Math.min(derivedBadges.length, visibleSlots - Math.min(customLabels.length, 1)));
const customShown = customLabels.slice(0, visibleSlots - derivedShown.length);
```

(Daha basit alternatif — sadece kesip yapıştır: `derivedBadges.slice(0, 2)` + `customLabels.slice(0, 1)`. İmplementer karar verir, ikisi de OK.)

**`app/(public)/urun/[slug]/page.tsx`** (detay): tüm derived + tüm custom (max sınır yok).

### Admin yönetimi

#### Yeni sayfa: `/kayhan-yonetim/etiketler`

`app/(admin)/kayhan-yonetim/(protected)/etiketler/page.tsx` (yeni)

- Tüm etiketleri listele tablo görünümünde — ad + renk önizleme + atanan ürün sayısı + düzenle/sil
- "Yeni Etiket" butonu modal'ı veya inline form: isim input + 6-buton renk seçici

```tsx
// İçindeki form (yeni veya düzenleme)
<form action={createOrUpdateLabelAction}>
  <Input name="name" placeholder="Etiket adı" required maxLength={30} />
  <div className="flex gap-2">
    {ALL_LABEL_COLORS.map(c => (
      <button type="button" key={c} onClick={() => setColor(c)}
        className={cn("h-8 w-8 rounded-md ring-2", labelColorClasses(c), selectedColor === c && "ring-foreground")}
        aria-label={c}>
        <input type="hidden" name="color" value={selectedColor} />
      </button>
    ))}
  </div>
  <Button type="submit">Kaydet</Button>
</form>
```

(Form'da hidden input `name="color"` selected değeri taşır.)

#### Ürün formu güncellemesi

`components/admin/product-form.tsx` — yeni section "Özel Etiketler" (etiket kaynakları fieldset'inin altına):

```tsx
<section className="rounded-2xl border border-border bg-surface p-5">
  <h2 className="text-sm font-semibold tracking-tight">Özel Etiketler</h2>
  <div className="mt-4 flex flex-wrap gap-2">
    {allLabels.map(label => (
      <button
        type="button"
        key={label.id}
        onClick={() => toggleCustomLabel(label.id)}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-opacity",
          selectedCustomLabels.has(label.id)
            ? labelColorClasses(label.color)
            : "border border-border bg-surface text-muted opacity-60 hover:opacity-100",
        )}
      >
        {label.name}
      </button>
    ))}
    {allLabels.length === 0 && (
      <p className="text-xs text-muted">Henüz etiket yok. <Link href="/kayhan-yonetim/etiketler" className="underline">Buradan ekle.</Link></p>
    )}
  </div>
  <input type="hidden" name="customLabelIds" value={JSON.stringify([...selectedCustomLabels])} />
</section>
```

Form parent component `allLabels`'ı server-side fetch'le geçirir (`repo.listProductLabels()`).

### Server actions

**Yeni dosya: `app/(admin)/kayhan-yonetim/actions/labels.ts`**

```ts
export async function createLabelAction(_prev, formData): Promise<LabelActionState> {
  await requireAdmin();
  const parsed = labelInputSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: "Geçersiz", fieldErrors: ... };
  await repo.createProductLabel(parsed.data);
  revalidatePath("/kayhan-yonetim/etiketler");
  revalidatePath("/magaza");
  redirect("/kayhan-yonetim/etiketler");
}

export async function updateLabelAction(id: string, _prev, formData) { /* benzer */ }
export async function deleteLabelAction(id: string): Promise<void> { /* cascade */ }
```

**Mevcut `actions/products.ts` güncellemesi:**

`parseFormData` `customLabelIds` JSON parse eklenir:

```ts
if (typeof raw.customLabelIds === "string") {
  try { raw.customLabelIds = JSON.parse(raw.customLabelIds); }
  catch { raw.customLabelIds = []; }
}
```

`create`/`update` action sonunda atama tablosuna yazılır:

```ts
const created = await repo.createProduct({ ...result, customLabelIds: [] /* skip */ });
await repo.setProductLabels(created.id, result.customLabelIds);
```

Veya repo metodu `createProduct({..., customLabelIds})` direkt assignment'i yapsın — atomic.

### Repo arabirimi

`lib/data/repository.ts`'e eklenir:

```ts
listProductLabels(): Promise<ProductLabel[]>;
getProductLabelById(id: string): Promise<ProductLabel | null>;
createProductLabel(data: { name: string; color: ProductLabelColor }): Promise<ProductLabel>;
updateProductLabel(id: string, data: Partial<{ name: string; color: ProductLabelColor }>): Promise<ProductLabel>;
deleteProductLabel(id: string): Promise<void>;
setProductLabels(productId: string, labelIds: string[]): Promise<void>;
```

`demo-repository.ts` ve `supabase-repository.ts` implementasyonları. Supabase tarafında `setProductLabels`:
1. DELETE FROM product_label_assignments WHERE product_id = ?
2. INSERT INTO product_label_assignments (product_id, label_id) VALUES (?, ?), ...

Idempotent ve atomic.

### Zod validation

```ts
// lib/validations/product-label.ts
import { z } from "zod";

export const productLabelColors = ["lime","red","yellow","blue","purple","gray"] as const;

export const labelInputSchema = z.object({
  name: z.string().trim().min(2, "En az 2 karakter").max(30, "En fazla 30 karakter"),
  color: z.enum(productLabelColors),
});
```

### Mapper

`lib/data/mappers.ts` — yeni helper'lar:

```ts
export function rowToProductLabel(row: Record<string, unknown>): ProductLabel {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as ProductLabelColor,
    createdAt: row.created_at as string,
  };
}
```

Product mapper'ı (rowToProduct) artık `customLabels: []` default'la (JOIN ile dolar — repository katmanında merge edilir).

### Mock data

`lib/mock/data.ts` — `mockProductLabels: ProductLabel[]` (3-4 örnek etiket) eklenir. Her mock product'a 0-1 custom label atanır.

## Test stratejisi (TDD)

Vitest mevcut.

### Saf fonksiyon testleri

`lib/products/label-colors.test.ts`:
- `labelColorClasses("lime")` → "bg-lime-primary/95 text-black" döner
- `labelColorClasses("gray")` → border içerir
- `ALL_LABEL_COLORS` array uzunluğu 6, hepsi benzersiz

### Schema testi

`lib/validations/product-label.test.ts`:
- 2 karakterlik isim PASS, 1 karakter FAIL
- 30 karakter PASS, 31 karakter FAIL
- Trim çalışıyor: `"  test  "` → `"test"`
- Geçersiz color enum FAIL
- Geçerli color enum PASS

### Manuel doğrulama

- `pnpm test` — yeni testler PASS + mevcut 28
- `pnpm exec tsc --noEmit` — PASS
- `pnpm lint` — PASS
- `pnpm build` — PASS
- Admin smoke:
  - `/kayhan-yonetim/etiketler` → "Yeni Etiket" → "Yılbaşı Kampanyası" + kırmızı seç → kaydet → listede görünür
  - Ürün düzenle → "Özel Etiketler" bölümünde "Yılbaşı Kampanyası" buton görünür → tıkla → seçili olur → kaydet → mağazada chip görünür
  - Etiketi sil → ürünlerden otomatik kalkar (CASCADE)
  - Etiketin adını/rengini değiştir → tüm ürünlerde otomatik güncellenir

## Kapsam dışı

- **Label arama/filtreleme** (mağaza listesinde label'a göre filtreleme) — gelecek özellik
- **Drag-to-reorder etiketler** — sıra yok şu an, oluşturma tarihi sırası kullanılır
- **Label icon/emoji** — sadece renk + metin
- **Per-surface visibility** (admin-only vs public) — hepsi public şu an
- **B3 (disk upload), B4/B5 (tedarikçi entegrasyonu), image hover-zoom** — ayrı plan'lar

## Plan'a geçiş

Kullanıcı onayından sonra `superpowers:writing-plans` ile `docs/superpowers/plans/2026-05-13-custom-badges.md`. TDD: saf fonksiyon (`labelColorClasses`) ve Zod schema testleri önce yazılır, sonra implement.
