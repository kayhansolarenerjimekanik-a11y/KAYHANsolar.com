# Custom Badges (B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin'in serbest metinli pazarlama etiketleri tanımlayıp ürünlere atayabileceği bir sistem ekle — preset 6 etikete (Sub-project A) paralel, salt görsel.

**Architecture:** İki yeni DB tablosu (`product_labels` ve `product_label_assignments`) + saf `labelColorClasses` yardımcısı + Zod schema. `Product.customLabels: ProductLabel[]` mapper'da JOIN ile dolar. Yeni admin sayfası `/kayhan-yonetim/etiketler` etiket CRUD'i yapar; mevcut ürün formuna "Özel Etiketler" bölümü eklenir. `CustomLabelChip` display component'i ürün kartında ve detay sayfasında derived badge'lerin yanına render edilir.

**Tech Stack:** Next.js 16.2.6 + TypeScript strict + React 19 + Zod 4 + Supabase + Vitest 2.

**Spec:** `docs/superpowers/specs/2026-05-13-custom-badges-design.md`

**Branch:** `feat/custom-badges` (zaten oluşturuldu, spec commit'i `4e49277` üzerinde).

**Önemli:**
- Targeted `git add <path>` only. NEVER `git add -A` / `.` / `docs/`.
- `AUTH_MODE=supabase`, `DATA_MODE=supabase` — gerçek DB hedef.
- Pre-existing test count: 28 (sub-project A + B1).
- 6 renk paleti sabit: `lime`, `red`, `yellow`, `blue`, `purple`, `gray`.

---

## Dosya Haritası

| Dosya | Durum | Faz | Sorumluluğu |
|---|---|---|---|
| `supabase/migrations/20260513_008_product_labels.sql` | **YENİ** | 1 | İki tablo + index |
| `lib/products/label-colors.ts` | **YENİ** | 2 | `labelColorClasses` + `ALL_LABEL_COLORS` |
| `lib/products/label-colors.test.ts` | **YENİ** | 2 | TDD |
| `lib/validations/product-label.ts` | **YENİ** | 3 | Zod `labelInputSchema` |
| `lib/validations/product-label.test.ts` | **YENİ** | 3 | TDD |
| `types/index.ts` | Modify | 4 | `ProductLabel`, `ProductLabelColor`, `Product.customLabels` |
| `lib/data/mappers.ts` | Modify | 4 | `rowToProductLabel` + `rowToProduct.customLabels=[]` |
| `lib/data/repository.ts` | Modify | 4 | 6 yeni metod imza + createProduct customLabelIds param |
| `lib/data/demo-repository.ts` | Modify | 4 | Demo in-memory impl |
| `lib/data/supabase-repository.ts` | Modify | 4 | Supabase wrapper |
| `lib/data/supabase/labels.ts` | **YENİ** | 4 | Supabase label sorguları |
| `lib/mock/data.ts` | Modify | 4 | `mockProductLabels` + mock atamalar |
| `components/shop/custom-label-chip.tsx` | **YENİ** | 5 | Display chip |
| `components/shop/product-card.tsx` | Modify | 5 | Custom labels render |
| `app/(public)/urun/[slug]/page.tsx` | Modify | 5 | Custom labels render |
| `app/(admin)/kayhan-yonetim/actions/labels.ts` | **YENİ** | 6 | create/update/delete actions |
| `app/(admin)/kayhan-yonetim/(protected)/etiketler/page.tsx` | **YENİ** | 6 | Liste sayfası |
| `app/(admin)/kayhan-yonetim/(protected)/etiketler/new/page.tsx` | **YENİ** | 6 | Yeni etiket formu |
| `app/(admin)/kayhan-yonetim/(protected)/etiketler/[id]/duzenle/page.tsx` | **YENİ** | 6 | Düzenleme |
| `components/admin/label-form.tsx` | **YENİ** | 6 | Reusable form (name + renk paleti) |
| `components/admin/product-form.tsx` | Modify | 7 | "Özel Etiketler" section |
| `app/(admin)/kayhan-yonetim/actions/products.ts` | Modify | 7 | parseFormData `customLabelIds` |
| `app/(admin)/kayhan-yonetim/(protected)/urunler/yeni/page.tsx` | Modify | 7 | allLabels server-side fetch |
| `app/(admin)/kayhan-yonetim/(protected)/urunler/[id]/duzenle/page.tsx` | Modify | 7 | allLabels + initialSelected |
| `docs/verification/2026-05-13-custom-badges.md` | **YENİ** | 8 | Closure raporu |

**8 commit:**

1. `feat(db): product_labels + product_label_assignments tables`
2. `feat(products): labelColorClasses helper for custom badge styling`
3. `feat(validation): productLabel schema (name + color enum)`
4. `feat(product): customLabels field + repository methods`
5. `feat(shop): CustomLabelChip + display in product card and detail`
6. `feat(admin): product labels CRUD page`
7. `feat(admin): custom labels section in product form`
8. `docs(verification): custom badges closure report`

---

## Faz 1: SQL Migration

### Task 1.1: Migration dosyasını oluştur

**Files:**
- Create: `supabase/migrations/20260513_008_product_labels.sql`

- [ ] **Step 1: Dosyayı oluştur**

```sql
-- Custom product labels — marketing badges managed by admin

CREATE TABLE IF NOT EXISTS product_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL CHECK (color IN ('lime','red','yellow','blue','purple','gray')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_label_assignments (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES product_labels(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_pla_product ON product_label_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_pla_label ON product_label_assignments(label_id);
```

- [ ] **Step 2: Migration'ı uygula**

Çalıştır:

```powershell
pnpm db:migrate
```

Beklenen: Çıktıda `20260513_008_product_labels.sql ✓ Applied` görünür.

- [ ] **Step 3: Doğrulama**

Supabase Dashboard → SQL Editor:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('product_labels','product_label_assignments')
ORDER BY table_name, ordinal_position;
```

Beklenen: 5 satır product_labels (id/name/color/created_at/updated_at), 3 satır product_label_assignments (product_id/label_id/assigned_at).

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260513_008_product_labels.sql
git status
```

Confirm ONLY this 1 file staged. Then:

```powershell
git commit -m "feat(db): product_labels + product_label_assignments tables"
```

---

## Faz 2: labelColorClasses Helper (TDD)

### Task 2.1: Failing test yaz

**Files:**
- Create: `lib/products/label-colors.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { ALL_LABEL_COLORS, labelColorClasses } from "./label-colors";

describe("labelColorClasses", () => {
  it("returns lime classes", () => {
    expect(labelColorClasses("lime")).toBe("bg-lime-primary/95 text-black");
  });

  it("returns red classes", () => {
    expect(labelColorClasses("red")).toBe("bg-danger/90 text-white");
  });

  it("returns yellow classes", () => {
    expect(labelColorClasses("yellow")).toBe("bg-warning/90 text-white");
  });

  it("returns blue classes", () => {
    expect(labelColorClasses("blue")).toBe("bg-info/90 text-white");
  });

  it("returns purple classes", () => {
    expect(labelColorClasses("purple")).toBe("bg-purple-500/90 text-white");
  });

  it("returns gray classes with border", () => {
    expect(labelColorClasses("gray")).toBe(
      "bg-surface/95 text-foreground border border-border",
    );
  });
});

describe("ALL_LABEL_COLORS", () => {
  it("contains exactly 6 unique colors", () => {
    expect(ALL_LABEL_COLORS).toHaveLength(6);
    expect(new Set(ALL_LABEL_COLORS).size).toBe(6);
  });

  it("contains expected colors in order", () => {
    expect(ALL_LABEL_COLORS).toEqual([
      "lime",
      "red",
      "yellow",
      "blue",
      "purple",
      "gray",
    ]);
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: FAIL with "Cannot find module './label-colors'".

### Task 2.2: Implement label-colors.ts

**Files:**
- Create: `lib/products/label-colors.ts`

- [ ] **Step 1: Dosyayı oluştur**

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
  "lime",
  "red",
  "yellow",
  "blue",
  "purple",
  "gray",
];
```

NOT: `ProductLabelColor` tipi henüz `types/index.ts`'de YOK (Faz 4'te ekleniyor). Şimdilik `lib/products/label-colors.ts`'de inline tanımla:

```ts
export type ProductLabelColor = "lime" | "red" | "yellow" | "blue" | "purple" | "gray";
```

Faz 4'te `types/index.ts`'e taşınacak; bu dosyadaki inline tanım `import type { ProductLabelColor } from "@/types"` ile değişecek.

GÜNCELLENMİŞ versiyon (Faz 2 için):

```ts
export type ProductLabelColor = "lime" | "red" | "yellow" | "blue" | "purple" | "gray";

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
  "lime",
  "red",
  "yellow",
  "blue",
  "purple",
  "gray",
];
```

- [ ] **Step 2: Test'lerin geçtiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: önceki 28 + 8 yeni = **36/36 PASS**.

- [ ] **Step 3: tsc + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS (pre-existing warning OK).

- [ ] **Step 4: Commit**

```powershell
git add lib/products/label-colors.ts lib/products/label-colors.test.ts
git commit -m "feat(products): labelColorClasses helper for custom badge styling"
```

---

## Faz 3: Zod Schema (TDD)

### Task 3.1: Failing test yaz

**Files:**
- Create: `lib/validations/product-label.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { labelInputSchema } from "./product-label";

describe("labelInputSchema", () => {
  it("accepts valid input", () => {
    const result = labelInputSchema.safeParse({ name: "Yılbaşı", color: "red" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = labelInputSchema.safeParse({ name: "A", color: "lime" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 30 chars", () => {
    const result = labelInputSchema.safeParse({
      name: "A".repeat(31),
      color: "lime",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = labelInputSchema.safeParse({ name: "  Pop  ", color: "blue" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Pop");
  });

  it("rejects invalid color", () => {
    const result = labelInputSchema.safeParse({ name: "Test", color: "orange" });
    expect(result.success).toBe(false);
  });

  it("accepts each of 6 colors", () => {
    for (const c of ["lime", "red", "yellow", "blue", "purple", "gray"] as const) {
      const result = labelInputSchema.safeParse({ name: "Test", color: c });
      expect(result.success).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: FAIL with "Cannot find module './product-label'".

### Task 3.2: Implement product-label.ts

**Files:**
- Create: `lib/validations/product-label.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { z } from "zod";

export const productLabelColors = ["lime", "red", "yellow", "blue", "purple", "gray"] as const;

export const labelInputSchema = z.object({
  name: z.string().trim().min(2, "En az 2 karakter").max(30, "En fazla 30 karakter"),
  color: z.enum(productLabelColors),
});

export type LabelInput = z.infer<typeof labelInputSchema>;
```

- [ ] **Step 2: Test'in geçtiğini doğrula**

Çalıştır: `pnpm test`

Beklenen: önceki 36 + 6 yeni = **42/42 PASS**.

- [ ] **Step 3: tsc + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS.

- [ ] **Step 4: Commit**

```powershell
git add lib/validations/product-label.ts lib/validations/product-label.test.ts
git commit -m "feat(validation): productLabel schema (name + color enum)"
```

---

## Faz 4: Types + Mapper + Repository + Mock (Koordineli)

Bu faz, type sistemi-bağlı tüm değişiklikleri tek commit'te yapar. TypeScript strict atomic uyum gerektirir.

### Task 4.1: Types ekle

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: `ProductLabelColor` ve `ProductLabel` ekle**

`types/index.ts`'nin SONUNA ekle:

```ts
export type ProductLabelColor =
  | "lime"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "gray";

export interface ProductLabel {
  id: string;
  name: string;
  color: ProductLabelColor;
  createdAt: string;
}
```

- [ ] **Step 2: `Product` interface'ine `customLabels` ekle**

`Product` interface'inde `media: ProductMedia[];` satırının HEMEN ÜSTÜNE veya altına ekle:

```ts
  customLabels: ProductLabel[];
```

### Task 4.2: `label-colors.ts`'i `types/index.ts` import'una çevir

**Files:**
- Modify: `lib/products/label-colors.ts`

- [ ] **Step 1: Inline type tanımını sil, import et**

Mevcut:
```ts
export type ProductLabelColor = "lime" | ...;
```

Sil ve dosyanın başına ekle:

```ts
import type { ProductLabelColor } from "@/types";
```

`labelColorClasses` ve `ALL_LABEL_COLORS` aynı kalır.

- [ ] **Step 2: Hızlı tsc kontrol**

```powershell
pnpm exec tsc --noEmit
```

Beklenen: PASS (henüz mock data güncellenmedi, ama type'lar tutarlı).

NOT: Eğer hata varsa: bir mock product `customLabels` field'ı eksik diyor. O dosyayı 4.4'te güncelliyoruz, devam et.

### Task 4.3: Mapper güncellemesi

**Files:**
- Modify: `lib/data/mappers.ts`

- [ ] **Step 1: `rowToProductLabel` ekle**

Dosyanın sonuna ekle:

```ts
import type { Product, ProductLabel, ProductLabelColor, /* mevcut */ } from "@/types";
```

(Mevcut import'a `ProductLabel`, `ProductLabelColor` ekle.)

Mevcut helper'ların yanına:

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

- [ ] **Step 2: `rowToProduct`'a `customLabels` default ekle**

Mevcut `rowToProduct` çıktısının SONUNA, `createdAt: row.created_at as string,` SATIRININ ÖNCESİNE:

```ts
    customLabels: (row.custom_labels as ProductLabel[] | null) ?? [],
```

NOT: `row.custom_labels` Supabase SELECT'ten JSONB aggregat veya separate query ile gelir — repository'de doldurulur. Default `[]`.

`productToInsert` değişmez (customLabels assignment ayrı bir tablo).

### Task 4.4: Repository interface

**Files:**
- Modify: `lib/data/repository.ts`

- [ ] **Step 1: 6 yeni metod ekle**

Mevcut `Repository` interface'inin sonuna (mevcut metod listesinin altına) ekle:

```ts
  // Product labels
  listProductLabels(): Promise<ProductLabel[]>;
  getProductLabelById(id: string): Promise<ProductLabel | null>;
  createProductLabel(data: { name: string; color: ProductLabelColor }): Promise<ProductLabel>;
  updateProductLabel(id: string, data: { name?: string; color?: ProductLabelColor }): Promise<ProductLabel>;
  deleteProductLabel(id: string): Promise<void>;
  setProductLabels(productId: string, labelIds: string[]): Promise<void>;
```

Import bloğunda `ProductLabel`, `ProductLabelColor` ekle.

- [ ] **Step 2: `createProduct` ve `updateProduct` imza'larına `customLabelIds` ekle**

Mevcut:
```ts
createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product>;
updateProduct(id: string, data: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product>;
```

Şu hâle getir:
```ts
createProduct(data: Omit<Product, "id" | "createdAt" | "customLabels"> & { customLabelIds?: string[] }): Promise<Product>;
updateProduct(id: string, data: Partial<Omit<Product, "id" | "createdAt" | "customLabels">> & { customLabelIds?: string[] }): Promise<Product>;
```

(Atomic assignment: hem product hem labels tek call'da. Returned `Product.customLabels` repository'de doldurur.)

### Task 4.5: Demo repository impl

**Files:**
- Modify: `lib/data/demo-repository.ts`

- [ ] **Step 1: Mevcut store'a yeni array ekle**

`store` objesinin tepesine bir alan ekle (mevcut `stockSubscriptions` vb. yanına):

```ts
  productLabels: ProductLabel[];
  productLabelAssignments: Array<{ productId: string; labelId: string }>;
```

Initial value: `[]`.

- [ ] **Step 2: 6 metod implementasyonu**

`demo-repository.ts` içine ekle (mevcut diğer ürün metodlarının yanına):

```ts
async listProductLabels(): Promise<ProductLabel[]> {
  return [...store.productLabels];
},

async getProductLabelById(id: string): Promise<ProductLabel | null> {
  return store.productLabels.find((l) => l.id === id) ?? null;
},

async createProductLabel(data: { name: string; color: ProductLabelColor }): Promise<ProductLabel> {
  const label: ProductLabel = {
    id: `label-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: data.name,
    color: data.color,
    createdAt: new Date().toISOString(),
  };
  store.productLabels.push(label);
  return label;
},

async updateProductLabel(id: string, data: { name?: string; color?: ProductLabelColor }): Promise<ProductLabel> {
  const idx = store.productLabels.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Etiket bulunamadı");
  const updated: ProductLabel = {
    ...store.productLabels[idx],
    ...(data.name !== undefined && { name: data.name }),
    ...(data.color !== undefined && { color: data.color }),
  };
  store.productLabels[idx] = updated;
  return updated;
},

async deleteProductLabel(id: string): Promise<void> {
  store.productLabels = store.productLabels.filter((l) => l.id !== id);
  store.productLabelAssignments = store.productLabelAssignments.filter((a) => a.labelId !== id);
},

async setProductLabels(productId: string, labelIds: string[]): Promise<void> {
  store.productLabelAssignments = store.productLabelAssignments.filter((a) => a.productId !== productId);
  for (const labelId of labelIds) {
    store.productLabelAssignments.push({ productId, labelId });
  }
},
```

- [ ] **Step 3: `createProduct`/`updateProduct` `customLabelIds` desteği**

Mevcut `createProduct` implementasyonunda, return etmeden ÖNCE:

```ts
const { customLabelIds, ...productData } = data;
const product = /* mevcut create logic */;
if (customLabelIds && customLabelIds.length > 0) {
  for (const labelId of customLabelIds) {
    store.productLabelAssignments.push({ productId: product.id, labelId });
  }
}
// product.customLabels doldur
product.customLabels = store.productLabels.filter(l =>
  store.productLabelAssignments.some(a => a.productId === product.id && a.labelId === l.id)
);
return product;
```

Aynı pattern `updateProduct` için.

`listProducts` ve `getProductBy*` metodları product nesnesini döndürmeden önce `customLabels`'i doldurur:

```ts
function attachCustomLabels(p: Product): Product {
  return {
    ...p,
    customLabels: store.productLabels.filter(l =>
      store.productLabelAssignments.some(a => a.productId === p.id && a.labelId === l.id)
    ),
  };
}
```

Tüm Product return path'lerinde `attachCustomLabels` çağrılır.

### Task 4.6: Supabase wrapper + queries

**Files:**
- Create: `lib/data/supabase/labels.ts`
- Modify: `lib/data/supabase-repository.ts`
- Modify: `lib/data/supabase/products.ts` (mevcut)

- [ ] **Step 1: Yeni dosya `lib/data/supabase/labels.ts`**

```ts
import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rowToProductLabel } from "@/lib/data/mappers";
import type { ProductLabel, ProductLabelColor } from "@/types";

export async function listProductLabels(): Promise<ProductLabel[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("product_labels")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToProductLabel);
}

export async function getProductLabelById(id: string): Promise<ProductLabel | null> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("product_labels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProductLabel(data) : null;
}

export async function createProductLabel(input: { name: string; color: ProductLabelColor }): Promise<ProductLabel> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("product_labels")
    .insert({ name: input.name, color: input.color })
    .select("*")
    .single();
  if (error) throw error;
  return rowToProductLabel(data);
}

export async function updateProductLabel(
  id: string,
  patch: { name?: string; color?: ProductLabelColor },
): Promise<ProductLabel> {
  const client = getSupabaseAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  const { data, error } = await client
    .from("product_labels")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToProductLabel(data);
}

export async function deleteProductLabel(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("product_labels").delete().eq("id", id);
  if (error) throw error;
}

export async function setProductLabels(productId: string, labelIds: string[]): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error: delError } = await client
    .from("product_label_assignments")
    .delete()
    .eq("product_id", productId);
  if (delError) throw delError;
  if (labelIds.length === 0) return;
  const rows = labelIds.map((labelId) => ({ product_id: productId, label_id: labelId }));
  const { error: insError } = await client.from("product_label_assignments").insert(rows);
  if (insError) throw insError;
}

export async function listLabelsForProducts(productIds: string[]): Promise<Map<string, ProductLabel[]>> {
  if (productIds.length === 0) return new Map();
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("product_label_assignments")
    .select("product_id, label:product_labels(*)")
    .in("product_id", productIds);
  if (error) throw error;
  const out = new Map<string, ProductLabel[]>();
  for (const row of data ?? []) {
    const pid = row.product_id as string;
    const labelRow = row.label as Record<string, unknown> | null;
    if (!labelRow) continue;
    const label = rowToProductLabel(labelRow);
    const list = out.get(pid) ?? [];
    list.push(label);
    out.set(pid, list);
  }
  return out;
}
```

- [ ] **Step 2: `supabase-repository.ts`'e wrapper'lar ekle**

Mevcut dosyaya, ürün metodlarının yanına ekle:

```ts
import * as Labels from "./supabase/labels";

// ... mevcut wrapper'lar arasına:

listProductLabels: Labels.listProductLabels,
getProductLabelById: Labels.getProductLabelById,
createProductLabel: Labels.createProductLabel,
updateProductLabel: Labels.updateProductLabel,
deleteProductLabel: Labels.deleteProductLabel,
setProductLabels: Labels.setProductLabels,
```

- [ ] **Step 3: `lib/data/supabase/products.ts` `listProducts` ve `getProductBy*` metodlarını customLabels ile zenginleştir**

`listProducts` impl'ini şu pattern'e dönüştür:

```ts
import { listLabelsForProducts } from "./labels";

export async function listProducts(): Promise<Product[]> {
  // ... mevcut SELECT
  const products = rows.map((r) => rowToProduct(r, mediaByProduct));
  const labelMap = await listLabelsForProducts(products.map((p) => p.id));
  return products.map((p) => ({ ...p, customLabels: labelMap.get(p.id) ?? [] }));
}
```

Aynı pattern `getProductBySlug` ve `getProductById` için. Single-product version'ları `listLabelsForProducts([id])` çağırır.

`createProduct` / `updateProduct` action sırasında:

```ts
export async function createProduct(data: ...): Promise<Product> {
  const { customLabelIds, ...productData } = data;
  // ... mevcut INSERT
  const created = /* INSERT result */;
  if (customLabelIds && customLabelIds.length > 0) {
    await setProductLabels(created.id, customLabelIds);
  }
  // Return with customLabels populated
  return getProductById(created.id) as Promise<Product>;
}
```

`updateProduct` için: `customLabelIds` undefined ise atamaları değiştirme; değilse `setProductLabels` ile yeniden ata.

### Task 4.7: Mock data güncellemesi

**Files:**
- Modify: `lib/mock/data.ts`

- [ ] **Step 1: `mockProductLabels` ekle**

Dosyanın sonuna ekle:

```ts
import type { ProductLabel } from "@/types";

export const mockProductLabels: ProductLabel[] = [
  {
    id: "label-yilbasi",
    name: "Yılbaşı Kampanyası",
    color: "red",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "label-yeni-sezon",
    name: "Yeni Sezon",
    color: "lime",
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "label-stokta-bitiyor",
    name: "Sınırlı Stok",
    color: "yellow",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];
```

(Eğer dosya başında zaten `import type { ... } from "@/types"` varsa, ProductLabel'i o satıra ekle.)

- [ ] **Step 2: Her mock product'a `customLabels: []` ekle**

Her mock product nesnesinde — `media:` field'ının HEMEN ÜZERİNE — ekle:

```ts
  customLabels: [],
```

Bazı 2-3 mock product'ta örnek atamalar:

```ts
  // İlk product'ta:
  customLabels: [mockProductLabels[0]],  // Yılbaşı Kampanyası
  
  // İkinci product'ta:
  customLabels: [mockProductLabels[1], mockProductLabels[2]],  // Yeni Sezon + Sınırlı Stok
```

Geri kalan tüm product'larda `customLabels: []`.

### Task 4.8: Doğrulama + commit

- [ ] **Step 1: tsc**

```powershell
pnpm exec tsc --noEmit
```

Beklenen: PASS. Hata varsa: muhtemelen bir mock product'ta `customLabels` eksik. Düzelt.

- [ ] **Step 2: Test'leri çalıştır**

```powershell
pnpm test
```

Beklenen: **42/42 PASS** (önceki 36 + 6 schema). Yeni test yok bu fazda.

- [ ] **Step 3: Lint**

```powershell
pnpm lint
```

Beklenen: PASS.

- [ ] **Step 4: Commit**

```powershell
git add types/index.ts lib/data/mappers.ts lib/data/repository.ts lib/data/demo-repository.ts lib/data/supabase-repository.ts lib/data/supabase/labels.ts lib/data/supabase/products.ts lib/mock/data.ts lib/products/label-colors.ts
git status
```

Confirm sadece bu dosyalar staged. Then:

```powershell
git commit -m "feat(product): customLabels field + repository methods"
```

---

## Faz 5: CustomLabelChip + Display Wiring

### Task 5.1: CustomLabelChip component

**Files:**
- Create: `components/shop/custom-label-chip.tsx`

- [ ] **Step 1: Dosyayı oluştur**

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

### Task 5.2: Product card'a wire et

**Files:**
- Modify: `components/shop/product-card.tsx`

- [ ] **Step 1: Import ekle**

`@/components/shop/...` import bloğuna ekle (alfabetik):

```tsx
import { CustomLabelChip } from "@/components/shop/custom-label-chip";
```

- [ ] **Step 2: Render bölümünü güncelle**

Mevcut derived badges render bloğu (lines ~45-51):

```tsx
{badges.length > 0 && (
  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
    {badges.slice(0, 2).map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

Şu hâle getir:

```tsx
{(badges.length > 0 || product.customLabels.length > 0) && (
  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
    {badges.slice(0, 2).map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
    {product.customLabels.slice(0, 1).map((label) => (
      <CustomLabelChip key={label.id} label={label} />
    ))}
  </div>
)}
```

Toplam max 3 chip kart üstünde (2 derived + 1 custom). Yoksa kart bozulur.

### Task 5.3: Ürün detayına wire et

**Files:**
- Modify: `app/(public)/urun/[slug]/page.tsx`

- [ ] **Step 1: Import ekle**

`@/components/shop/...` import bloğuna ekle:

```tsx
import { CustomLabelChip } from "@/components/shop/custom-label-chip";
```

- [ ] **Step 2: Render güncelle**

Mevcut badges render (lines ~135-141):

```tsx
{badges.length > 0 && (
  <div className="flex flex-wrap gap-1.5 pt-1">
    {badges.map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
  </div>
)}
```

Şu hâle getir:

```tsx
{(badges.length > 0 || product.customLabels.length > 0) && (
  <div className="flex flex-wrap gap-1.5 pt-1">
    {badges.map((badge) => (
      <ProductBadgeChip key={badge} badge={badge} />
    ))}
    {product.customLabels.map((label) => (
      <CustomLabelChip key={label.id} label={label} />
    ))}
  </div>
)}
```

Detay sayfasında sınır yok — tüm derived + tüm custom.

### Task 5.4: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: 42/42 PASS.

- [ ] **Step 2: Manuel smoke**

Dev server'da:
1. `/magaza` → mock product'lardan birinde "Yılbaşı Kampanyası" chip'i görünmeli (kırmızı).
2. `/urun/<o-product-slug>` → derived badges + custom labels yan yana.

- [ ] **Step 3: Commit**

```powershell
git add components/shop/custom-label-chip.tsx components/shop/product-card.tsx "app/(public)/urun/[slug]/page.tsx"
git commit -m "feat(shop): CustomLabelChip + display in product card and detail"
```

---

## Faz 6: Admin Labels CRUD

### Task 6.1: Server actions

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/labels.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { labelInputSchema } from "@/lib/validations/product-label";

export interface LabelActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/etiketler");
  revalidatePath("/kayhan-yonetim/urunler");
}

function parseFormData(fd: FormData): { error: string; fieldErrors: Record<string, string> } | { name: string; color: "lime" | "red" | "yellow" | "blue" | "purple" | "gray" } {
  const raw = { name: fd.get("name"), color: fd.get("color") };
  const parsed = labelInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Form geçersiz", fieldErrors };
  }
  return parsed.data;
}

export async function createLabelAction(_prev: LabelActionState, fd: FormData): Promise<LabelActionState> {
  await requireAdmin();
  const result = parseFormData(fd);
  if ("error" in result) return result;
  await repo.createProductLabel(result);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}

export async function updateLabelAction(id: string, _prev: LabelActionState, fd: FormData): Promise<LabelActionState> {
  await requireAdmin();
  const result = parseFormData(fd);
  if ("error" in result) return result;
  await repo.updateProductLabel(id, result);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}

export async function deleteLabelAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteProductLabel(id);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}
```

### Task 6.2: Label form bileşeni

**Files:**
- Create: `components/admin/label-form.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_LABEL_COLORS, labelColorClasses } from "@/lib/products/label-colors";
import { cn } from "@/lib/utils";
import type { ProductLabel, ProductLabelColor } from "@/types";

import type { LabelActionState } from "@/app/(admin)/kayhan-yonetim/actions/labels";

interface LabelFormProps {
  initial?: ProductLabel;
  action: (state: LabelActionState, fd: FormData) => Promise<LabelActionState>;
  submitLabel: string;
}

export function LabelForm({ initial, action, submitLabel }: LabelFormProps) {
  const [state, formAction, pending] = useActionState<LabelActionState, FormData>(action, {});
  const [color, setColor] = useState<ProductLabelColor>(initial?.color ?? "lime");

  const errFor = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Etiket adı</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          maxLength={30}
          required
        />
        {errFor("name") && <p className="text-xs text-danger">{errFor("name")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Renk</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={cn(
                "h-10 w-10 rounded-md ring-2 transition-all",
                labelColorClasses(c),
                color === c ? "ring-foreground" : "ring-transparent",
              )}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
        {errFor("color") && <p className="text-xs text-danger">{errFor("color")}</p>}
      </div>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/etiketler">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

### Task 6.3: Liste sayfası

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/etiketler/page.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
import { Plus } from "lucide-react";
import Link from "next/link";

import { CustomLabelChip } from "@/components/shop/custom-label-chip";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";
import { deleteLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

export default async function AdminLabelsPage() {
  const labels = await repo.listProductLabels();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Özel Etiketler</h1>
          <p className="text-sm text-muted">Müşterilere yönelik pazarlama etiketleri.</p>
        </div>
        <Link href="/kayhan-yonetim/etiketler/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Etiket
          </Button>
        </Link>
      </header>

      {labels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Henüz etiket eklenmemiş.
        </div>
      ) : (
        <ul className="space-y-2">
          {labels.map((label) => (
            <li
              key={label.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <CustomLabelChip label={label} />
              <div className="flex items-center gap-2">
                <Link href={`/kayhan-yonetim/etiketler/${label.id}/duzenle`}>
                  <Button type="button" variant="outline" size="sm">Düzenle</Button>
                </Link>
                <form action={deleteLabelAction.bind(null, label.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                  >
                    Sil
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Task 6.4: Yeni etiket sayfası

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/etiketler/new/page.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
import { LabelForm } from "@/components/admin/label-form";
import { createLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

export default function NewLabelPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Yeni Etiket</h1>
      <LabelForm action={createLabelAction} submitLabel="Oluştur" />
    </div>
  );
}
```

### Task 6.5: Düzenleme sayfası

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/etiketler/[id]/duzenle/page.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
import { notFound } from "next/navigation";

import { LabelForm } from "@/components/admin/label-form";
import { repo } from "@/lib/data";
import { updateLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLabelPage({ params }: Props) {
  const { id } = await params;
  const label = await repo.getProductLabelById(id);
  if (!label) notFound();

  const boundAction = updateLabelAction.bind(null, id);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Etiketi Düzenle</h1>
      <LabelForm
        initial={label}
        action={boundAction}
        submitLabel="Kaydet"
      />
    </div>
  );
}
```

### Task 6.6: Admin menüsüne link (eğer varsa)

**Files:**
- Modify (opsiyonel): `app/(admin)/kayhan-yonetim/(protected)/layout.tsx` veya admin sidebar component

- [ ] **Step 1: Sidebar'da link var mı kontrol et**

Admin layout'unda sidebar/nav menüde "Kategoriler", "Kampanyalar" gibi linkler varsa "Etiketler" linkini eklemeli. Yoksa bu adım atla.

Tipik pattern:

```tsx
<Link href="/kayhan-yonetim/etiketler">Etiketler</Link>
```

Bu task opsiyonel — bulamazsan concerns'e not düş.

### Task 6.7: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: 42/42 PASS.

- [ ] **Step 2: Manuel smoke**

1. `/kayhan-yonetim/etiketler` aç. Mevcut mock etiketler listede görünmeli (eğer demo mode'daysın).
2. "Yeni Etiket" → form aç → "Test Etiketi" + bir renk → Oluştur → listeye dönüş.
3. Düzenle → adı veya rengi değiştir → Kaydet → listede güncel.
4. Sil → listeden kalkar.

- [ ] **Step 3: Commit**

```powershell
git add "app/(admin)/kayhan-yonetim/actions/labels.ts" components/admin/label-form.tsx "app/(admin)/kayhan-yonetim/(protected)/etiketler/page.tsx" "app/(admin)/kayhan-yonetim/(protected)/etiketler/new/page.tsx" "app/(admin)/kayhan-yonetim/(protected)/etiketler/[id]/duzenle/page.tsx"
```

(Eğer Task 6.6'da admin layout'a link eklediysen onu da include et.)

```powershell
git commit -m "feat(admin): product labels CRUD page"
```

---

## Faz 7: Ürün Formuna "Özel Etiketler" Entegrasyonu

### Task 7.1: ProductForm'a labels prop'u + section ekle

**Files:**
- Modify: `components/admin/product-form.tsx`

- [ ] **Step 1: Props ve state'i güncelle**

Mevcut `ProductFormProps`:
```tsx
interface ProductFormProps {
  initial?: Product;
  categories: Category[];
  action: (state: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  submitLabel: string;
}
```

Şu hâle getir:
```tsx
interface ProductFormProps {
  initial?: Product;
  categories: Category[];
  allLabels: ProductLabel[];           // YENİ
  action: (state: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  submitLabel: string;
}
```

İmport listesine `ProductLabel` ekle:
```tsx
import type { Category, Product, ProductLabel } from "@/types";
```

Component içine state ekle (mevcut state'lerin yanına):

```tsx
const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
  new Set((initial?.customLabels ?? []).map((l) => l.id)),
);
const toggleLabel = (id: string) => {
  setSelectedLabelIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

Import `labelColorClasses`:
```tsx
import { labelColorClasses } from "@/lib/products/label-colors";
```

- [ ] **Step 2: Function signature güncelle**

```tsx
export function ProductForm({ initial, categories, allLabels, action, submitLabel }: ProductFormProps) {
```

- [ ] **Step 3: "Özel Etiketler" section ekle**

Mevcut "Etiketler & Görünürlük" section'ının HEMEN ALTINA, "Önizleme" derived-badges kutusunun ÖNCESİNE, yeni bir section ekle:

```tsx
<section className="rounded-2xl border border-border bg-surface p-5">
  <h2 className="text-sm font-semibold tracking-tight">Özel Etiketler</h2>
  {allLabels.length === 0 ? (
    <p className="mt-2 text-xs text-muted">
      Henüz etiket yok.{" "}
      <Link
        href="/kayhan-yonetim/etiketler/new"
        className="text-lime-dark underline hover:text-lime-primary"
      >
        Hemen ekle
      </Link>
      .
    </p>
  ) : (
    <div className="mt-4 flex flex-wrap gap-2">
      {allLabels.map((label) => {
        const isSelected = selectedLabelIds.has(label.id);
        return (
          <button
            key={label.id}
            type="button"
            onClick={() => toggleLabel(label.id)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-opacity",
              isSelected
                ? labelColorClasses(label.color)
                : "border border-border bg-surface text-muted opacity-60 hover:opacity-100",
            )}
          >
            {label.name}
          </button>
        );
      })}
    </div>
  )}
  <input
    type="hidden"
    name="customLabelIds"
    value={JSON.stringify([...selectedLabelIds])}
  />
</section>
```

`Link` import'u zaten dosyada var (mevcut `İptal` butonu için). `cn` da var.

### Task 7.2: Server action parseFormData güncelle

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/actions/products.ts`

- [ ] **Step 1: `customLabelIds` parse ekle**

`parseFormData` içinde, mevcut `if (typeof raw.media === "string") { ... }` bloğunun yanına benzer bir blok ekle:

```ts
if (typeof raw.customLabelIds === "string") {
  try {
    raw.customLabelIds = JSON.parse(raw.customLabelIds as string);
  } catch {
    raw.customLabelIds = [];
  }
}
```

- [ ] **Step 2: Zod schema'da `customLabelIds` field'ı**

`lib/validations/product.ts` güncelle:

`productInputSchema`'nın sonuna ekle:

```ts
  customLabelIds: z.array(z.string()).default([]),
```

- [ ] **Step 3: `createProductAction` ve `updateProductAction`'a `customLabelIds` geçir**

`repo.createProduct({...result})` zaten `...result` spread'iyle alır. TypeScript imzası `customLabelIds?: string[]` olduğundan otomatik geçer. Sadece confirm et — değişiklik yok.

### Task 7.3: Ürün ekleme/düzenleme sayfalarına allLabels fetch ekle

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/urunler/yeni/page.tsx`
- Modify: `app/(admin)/kayhan-yonetim/(protected)/urunler/[id]/duzenle/page.tsx`

- [ ] **Step 1: Yeni ürün sayfası**

Mevcut dosyaya bak. `categories` çekiliyorsa, yanına `allLabels` ekle:

```tsx
const [categories, allLabels] = await Promise.all([
  repo.listCategories(),
  repo.listProductLabels(),
]);
```

`<ProductForm>` çağrısında `allLabels={allLabels}` prop'unu geç.

- [ ] **Step 2: Düzenleme sayfası**

Aynı pattern: `repo.listProductLabels()` çek, prop olarak geç.

### Task 7.4: Doğrulama + commit

- [ ] **Step 1: tsc + lint + test**

```powershell
pnpm exec tsc --noEmit && pnpm lint && pnpm test
```

Beklenen: 42/42 PASS.

- [ ] **Step 2: Manuel smoke**

1. `/kayhan-yonetim/etiketler/new` → "Test" + yeşil → kaydet.
2. `/kayhan-yonetim/urunler/<bir-id>/duzenle` → "Özel Etiketler" section'ında "Test" buton görünür → tıkla → seçili olur → kaydet.
3. `/urun/<o-product-slug>` → "Test" chip'i görünür.
4. `/magaza` → kartta "Test" chip'i görünür.

- [ ] **Step 3: Build kontrol**

```powershell
pnpm build
```

Beklenen: PASS.

- [ ] **Step 4: Commit**

```powershell
git add components/admin/product-form.tsx "app/(admin)/kayhan-yonetim/actions/products.ts" lib/validations/product.ts "app/(admin)/kayhan-yonetim/(protected)/urunler/yeni/page.tsx" "app/(admin)/kayhan-yonetim/(protected)/urunler/[id]/duzenle/page.tsx"
git commit -m "feat(admin): custom labels section in product form"
```

---

## Faz 8: Verification Report

### Task 8.1: Raporu yaz

**Files:**
- Create: `docs/verification/2026-05-13-custom-badges.md`

- [ ] **Step 1: Şablonu doldur**

```markdown
# Custom Badges (B2) Verification Report

**Tarih:** 2026-05-13
**Plan:** `docs/superpowers/plans/2026-05-13-custom-badges.md`
**Spec:** `docs/superpowers/specs/2026-05-13-custom-badges-design.md`
**Branch:** `feat/custom-badges`
**Sonuç:** ✅ APPROVED FOR MERGE

## Commit listesi

[git log --oneline main..HEAD]

## Ne tamamlandı

- 2 yeni DB tablosu + index'ler
- `labelColorClasses` saf yardımcı + 8 unit test
- `labelInputSchema` Zod schema + 6 unit test
- `ProductLabel`, `ProductLabelColor` tipleri + `Product.customLabels`
- 6 yeni repo metodu (CRUD + setProductLabels)
- `CustomLabelChip` display component
- Ürün kartı ve detay sayfasında custom labels gösterimi
- `/kayhan-yonetim/etiketler` CRUD sayfaları (list/new/duzenle)
- Ürün formunda "Özel Etiketler" toggle bölümü

## Doğrulama

| Komut | Sonuç |
|---|---|
| `pnpm test` | 42/42 PASS |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS |
| `pnpm build` | PASS |

## Manuel smoke

- [ ] Yeni etiket oluştur
- [ ] Ürüne etiket ata
- [ ] Mağaza listesi/detayda etiket görünür
- [ ] Etiket silince ürünlerden otomatik kalkar
- [ ] Etiket adını değiştirince ürünlerde otomatik güncellenir

## Kapsam dışı

- Mağazada etikete göre filtreleme
- Drag-to-reorder
- B3 (disk upload), B4/B5 (tedarikçi entegrasyonu)
```

- [ ] **Step 2: Commit**

```powershell
git add docs/verification/2026-05-13-custom-badges.md
git commit -m "docs(verification): custom badges closure report"
```

---

## Bittikten Sonra

- main'e merge (kullanıcı onayıyla)
- Memory güncelle: `project_ux_consistency_sweep.md`'ye B2'nin kapandığını ekle
- Kapsam dışı: B3 (disk upload), B4/B5 (tedarikçi)

---

## Self-Review

- ✅ **Spec coverage:** Migration (Faz 1), labelColorClasses (Faz 2), Zod (Faz 3), types/mapper/repo/mock (Faz 4), display chip + wiring (Faz 5), admin CRUD (Faz 6), product form integration (Faz 7), verification (Faz 8). Tüm spec madde × task var.
- ✅ **No placeholders:** Her step tam kod ya da spesifik komut. Faz 4'teki "mock product'a customLabels: [] ekle" pattern net.
- ✅ **Type consistency:**
  - `ProductLabel { id, name, color, createdAt }` her yerde aynı.
  - `ProductLabelColor` enum 6 değer Faz 2/3/4'te tutarlı.
  - `setProductLabels(productId, labelIds)` imza tutarlı.
  - Repo arabirimi (Faz 4.4) ve demo/supabase implementasyonları (4.5/4.6) imza uyumlu.
- ⚠️ **Bilinen risk:** Faz 4'teki Supabase JOIN ile `customLabels` doldurma performansı — N+1 olmaması için `listLabelsForProducts` bulk query kullanıldı. Doğru. Pre-existing `lib/data/supabase/products.ts` `listProducts` impl'ini bilinmiyor olabilir — implementer dikkat etmeli, mevcut SELECT pattern'i takip etsin.
