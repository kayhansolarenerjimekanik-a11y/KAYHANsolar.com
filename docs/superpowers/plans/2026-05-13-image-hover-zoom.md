# Image Hover-Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürün detay sayfasında Trendyol tarzı side-by-side hover-zoom ekle — ana resme fare ile hover'da sağ tarafta büyütülmüş görüntü paneli açılsın, lens cursor'u ile hangi bölgenin büyütüldüğü gösterilsin. Mobilde mevcut click→lightbox davranışı korunur.

**Architecture:** Saf yardımcı `computeLensRect` (TDD) lens pozisyonunu/boyutunu cursor pozisyonu + zoom çarpanından hesaplar. Yeni `<ZoomImage>` client component'i mevcut `<Image>` + lens overlay + side panel (background-image ile cursor'a göre kayar) render eder. `hidden lg:block` ile sadece desktop'ta etkin. `product-gallery.tsx`'in ana image bloğunda `<Image>` yerine `<ZoomImage>` kullanılır; click→lightbox outer wrapper'da korunur.

**Tech Stack:** Next.js 16.2.6 + TypeScript strict + React 19 + Tailwind v4 + Vitest 2.

**Spec:** `docs/superpowers/specs/2026-05-13-image-hover-zoom-design.md`

**Branch:** `feat/image-hover-zoom` (zaten oluşturuldu, spec commit'i `7380552` üzerinde).

**Önemli:**
- Targeted `git add <path>` only. NEVER `git add -A` / `.`.
- Pre-existing test count: 42 (Sub-project A + B1 + B2).
- Side panel galeri sağına absolute konumlanır ve hover sırasında ürün info alanını overlay'ler — bilinçli tasarım kararı (Trendyol pattern).

---

## Dosya Haritası

| Dosya | Durum | Faz | Sorumluluğu |
|---|---|---|---|
| `lib/products/zoom-math.ts` | **YENİ** | 1 | `clamp01` + `computeLensRect` saf fonksiyonlar |
| `lib/products/zoom-math.test.ts` | **YENİ** | 1 | TDD (8 test) |
| `components/shop/zoom-image.tsx` | **YENİ** | 2 | Hover-zoom display component |
| `components/shop/product-gallery.tsx` | Modify | 3 | Ana image bloğunda `<Image>` → `<ZoomImage>` |
| `docs/verification/2026-05-13-image-hover-zoom.md` | **YENİ** | 4 | Closure raporu |

**4 commit:**

1. `feat(products): zoom-math helper for lens rect computation`
2. `feat(shop): ZoomImage component for side-by-side hover zoom`
3. `feat(shop): wire ZoomImage into product gallery main image`
4. `docs(verification): image hover-zoom closure report`

---

## Faz 1: zoom-math Helper (TDD)

### Task 1.1: Failing test yaz

**Files:**
- Create: `lib/products/zoom-math.test.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import { describe, expect, it } from "vitest";

import { clamp01, computeLensRect } from "./zoom-math";

describe("clamp01", () => {
  it("returns 0 for negative input", () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it("returns 1 for input above 1", () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("returns same value for input in 0..1 range", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});

describe("computeLensRect", () => {
  it("centers lens for center cursor at 2x zoom", () => {
    const r = computeLensRect(0.5, 0.5, 2);
    expect(r.widthPct).toBe(50);
    expect(r.heightPct).toBe(50);
    expect(r.leftPct).toBe(25);
    expect(r.topPct).toBe(25);
  });

  it("places lens at origin for top-left cursor at 2x zoom", () => {
    const r = computeLensRect(0, 0, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(0);
  });

  it("places lens at edge for bottom-right cursor at 2x zoom", () => {
    const r = computeLensRect(1, 1, 2);
    expect(r.leftPct).toBe(50);
    expect(r.topPct).toBe(50);
  });

  it("returns smaller lens at 3x zoom", () => {
    const r = computeLensRect(0.5, 0.5, 3);
    expect(r.widthPct).toBeCloseTo(33.333, 2);
    expect(r.heightPct).toBeCloseTo(33.333, 2);
  });

  it("clamps out-of-bounds cursor coordinates", () => {
    const r = computeLensRect(-0.5, 1.5, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(50);
  });
});
```

- [ ] **Step 2: Test'in fail ettiğini doğrula**

Run: `pnpm test`

Expected: FAIL with "Cannot find module './zoom-math'" or similar import error.

### Task 1.2: zoom-math.ts implement et

**Files:**
- Create: `lib/products/zoom-math.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface LensRect {
  widthPct: number;
  heightPct: number;
  leftPct: number;
  topPct: number;
}

export function computeLensRect(
  posX: number,
  posY: number,
  zoom: number,
): LensRect {
  const size = (1 / zoom) * 100;
  return {
    widthPct: size,
    heightPct: size,
    leftPct: clamp01(posX) * 100 * (1 - 1 / zoom),
    topPct: clamp01(posY) * 100 * (1 - 1 / zoom),
  };
}
```

- [ ] **Step 2: Test'in geçtiğini doğrula**

Run: `pnpm test`

Expected: **50/50 PASS** (previous 42 + 8 new).

- [ ] **Step 3: Verify tsc + lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`

Expected: PASS. Pre-existing `product-lightbox.tsx` warning OK.

- [ ] **Step 4: Commit**

```powershell
git add lib/products/zoom-math.ts lib/products/zoom-math.test.ts
git commit -m "feat(products): zoom-math helper for lens rect computation"
```

---

## Faz 2: ZoomImage Component

### Task 2.1: zoom-image.tsx oluştur

**Files:**
- Create: `components/shop/zoom-image.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { clamp01, computeLensRect } from "@/lib/products/zoom-math";
import { cn } from "@/lib/utils";

interface ZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Yakınlaşma çarpanı, varsayılan 2.5x */
  zoom?: number;
  /** Side panel boyutu (px), varsayılan 500 */
  panelSize?: number;
}

export function ZoomImage({
  src,
  alt,
  className,
  zoom = 2.5,
  panelSize = 500,
}: ZoomImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    });
  }

  const lens = computeLensRect(pos.x, pos.y, zoom);

  return (
    <div
      ref={ref}
      className={cn("relative h-full w-full", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={onMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className="object-cover"
      />

      {hovering && (
        <div
          aria-hidden
          className="pointer-events-none absolute hidden border-2 border-foreground/60 bg-foreground/10 lg:block"
          style={{
            width: `${lens.widthPct}%`,
            height: `${lens.heightPct}%`,
            left: `${lens.leftPct}%`,
            top: `${lens.topPct}%`,
          }}
        />
      )}

      {hovering && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-full top-0 z-30 ml-4 hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl lg:block"
          style={{
            width: `${panelSize}px`,
            height: `${panelSize}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
            backgroundPosition: `${pos.x * 100}% ${pos.y * 100}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify tsc + lint + test**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`

Expected: PASS. 50/50 tests.

- [ ] **Step 3: Commit**

```powershell
git add components/shop/zoom-image.tsx
git commit -m "feat(shop): ZoomImage component for side-by-side hover zoom"
```

---

## Faz 3: Product Gallery Entegrasyonu

### Task 3.1: ProductGallery'de ana image'ı ZoomImage'a değiştir

**Files:**
- Modify: `components/shop/product-gallery.tsx`

- [ ] **Step 1: Import ekle**

Mevcut import bloğunda `@/components/shop/...` altına alfabetik olarak ekle:

```tsx
import { ZoomImage } from "@/components/shop/zoom-image";
```

(Mevcut order: `@/components/shop/product-lightbox` zaten var. `zoom-image` `product-lightbox`'tan sonra alfabetik olarak en altta. Bu satırı ekle.)

- [ ] **Step 2: Ana image render bloğunu güncelle**

Mevcut blok:

```tsx
{activeMedia.type === "image" ? (
  <Image
    src={activeMedia.url}
    alt={activeMedia.altText ?? productName}
    fill
    sizes="(max-width: 1024px) 100vw, 50vw"
    priority
    className="object-cover"
  />
) : activeMedia.type === "video" ? (
  <video
    src={activeMedia.url}
    poster={activeMedia.thumbnailUrl}
    controls
    className="h-full w-full object-contain"
  />
) : null}
```

Şu hâle getir:

```tsx
{activeMedia.type === "image" ? (
  <ZoomImage
    src={activeMedia.url}
    alt={activeMedia.altText ?? productName}
  />
) : activeMedia.type === "video" ? (
  <video
    src={activeMedia.url}
    poster={activeMedia.thumbnailUrl}
    controls
    className="h-full w-full object-contain"
  />
) : null}
```

Sadece `<Image>` bloğunu `<ZoomImage>` ile değiştir. Video ve null branch'ler aynı kalır.

**ÖNEMLİ:** `next/image` `Image` import'unu DOSYADAN SİLME — thumbnail strip'inde hâlâ kullanılıyor (bir başka `<Image>` block thumbnail mapping'inde var, lines ~119-125 civarı). Sadece ana image'daki `<Image>` kullanımını `<ZoomImage>` ile değiştir.

- [ ] **Step 3: Verify tsc + lint + test**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test`

Expected: 50/50 PASS.

- [ ] **Step 4: Build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 5: Manuel smoke (desktop tarayıcı)**

Dev server'da:
1. `/urun/<bir-product-slug>` aç.
2. Desktop ekranda (>= 1024px width) ana resme fareyi getir.
3. Beklenen: Sağ tarafta yarı şeffaf bir panel açılır, büyütülmüş görüntü gözükür.
4. Cursor'u resmin üstünde gezdir → panel görüntüsü cursor'u takip ederek kayar.
5. Resmin üzerinde küçük translucent bir lens kutusu (cursor box) görmelisin — hangi bölge büyütüldüğünü gösterir.
6. Fareyi resmin dışına çıkar → lens ve panel kaybolur.
7. Resme TIKLA → mevcut lightbox açılır (hover-zoom'a rağmen).

Mobile (DevTools mobile preview veya gerçek mobil):
1. Aynı sayfayı aç (< 1024px width).
2. Resme dokun/hover yapma → lens ve panel görünmemeli.
3. Resme tıkla → lightbox açılır (mevcut davranış).

- [ ] **Step 6: Commit**

```powershell
git add components/shop/product-gallery.tsx
git commit -m "feat(shop): wire ZoomImage into product gallery main image"
```

---

## Faz 4: Verification Report

### Task 4.1: Raporu yaz

**Files:**
- Create: `docs/verification/2026-05-13-image-hover-zoom.md`

- [ ] **Step 1: Şablonu doldur**

```markdown
# Image Hover-Zoom Verification Report

**Tarih:** 2026-05-13
**Plan:** `docs/superpowers/plans/2026-05-13-image-hover-zoom.md`
**Spec:** `docs/superpowers/specs/2026-05-13-image-hover-zoom-design.md`
**Branch:** `feat/image-hover-zoom`
**Sonuç:** ✅ APPROVED FOR MERGE

## Commit listesi

[git log --oneline main..HEAD]

## Ne tamamlandı

- `lib/products/zoom-math.ts` — `clamp01` + `computeLensRect` saf fonksiyonlar (8 TDD test).
- `components/shop/zoom-image.tsx` — `<ZoomImage>` client component. Hover'da lens overlay (cursor box) + side panel (`background-image` ile cursor pozisyonuna göre kayan zoom view). `pointer-events-none` outer click'leri engellemez. `hidden lg:block` ile sadece desktop'ta render.
- `components/shop/product-gallery.tsx` — ana image bloğunda `<Image>` → `<ZoomImage>`. Click→lightbox + video/PDF branch'leri korundu. Thumbnail strip'in `<Image>` kullanımı dokunulmadı.

## Doğrulama

| Komut | Sonuç |
|---|---|
| `pnpm test` | 50/50 PASS |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm lint` | PASS |
| `pnpm build` | PASS |

## Manuel smoke

- [ ] Desktop hover → sağ panel açılır + büyütülmüş görüntü cursor'u takip eder
- [ ] Desktop hover → lens kutusu cursor pozisyonunda
- [ ] Desktop tıklama → lightbox açılır (hover-zoom etkilenmez)
- [ ] Mobil → hover-zoom render etmez, tıklama → lightbox

## Kapsam dışı

- Touch-and-pan zoom (mobil)
- Multiple zoom levels UI
- Klavye pan
- High-res variant generation
```

- [ ] **Step 2: Commit**

```powershell
git add docs/verification/2026-05-13-image-hover-zoom.md
git commit -m "docs(verification): image hover-zoom closure report"
```

---

## Bittikten Sonra

- main'e merge (kullanıcı onayıyla)
- Memory güncelle: `project_ux_consistency_sweep.md`'ye image hover-zoom kapandığını ekle
- Kapsam dışı: B3 (disk upload), B4/B5 (tedarikçi entegrasyonu)

---

## Self-Review

- ✅ **Spec coverage:** zoom-math saf yardımcı (Faz 1), ZoomImage component (Faz 2), gallery entegrasyonu (Faz 3), verification (Faz 4). Spec'deki tüm requirement'lar bir task'a karşılık geliyor.
- ✅ **No placeholders:** Her step tam kod + komut + beklenen çıktı.
- ✅ **Type consistency:** `LensRect` interface property adları (widthPct/heightPct/leftPct/topPct) Faz 1 test/impl ve Faz 2 component kullanımında aynı. `computeLensRect(posX, posY, zoom): LensRect` imza tutarlı.
- ⚠️ **Bilinen risk:** Faz 3'te ana image bloğu değiştirilirken `next/image` `Image` import'u korunmalı (thumbnail strip için). Implementer dikkat etmeli — adım açıkça uyarı içeriyor.
