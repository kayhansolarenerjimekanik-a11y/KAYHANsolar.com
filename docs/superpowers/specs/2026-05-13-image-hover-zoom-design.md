# Image Hover-Zoom Design

**Tarih:** 2026-05-13
**Sub-project:** Image hover-zoom (parent: 2026-05-13 UX consistency sweep)
**Hedef branch:** `feat/image-hover-zoom`

## Problem

Ürün detay sayfasında müşteri görsel detaylarını incelemek için sadece tıkla→lightbox kullanabiliyor. Trendyol/Hepsiburada tarzı side-by-side hover zoom (fare üstündeyken yanda büyütülmüş görüntü) kullanıcı tecrübesini büyük ölçüde iyileştirir, müşterinin ürünü daha güvenle değerlendirmesini sağlar.

## Hedef davranışlar

- Desktop'ta (`pointer: fine`, `min-width: 1024px`): ürün detay sayfasında ana resme fareyi getirince sağ tarafta yarı şeffaf bir panel açılır, panel resmin büyütülmüş halini gösterir. Fareyi resmin üzerinde gezdirince panel'deki görünüm cursor'a göre kayar.
- Resmin üzerinde küçük bir "lens" kutusu (translucent overlay) hangi bölgenin büyütüldüğünü gösterir.
- Mobil ve tablet (lg breakpoint altı): hover-zoom render edilmez; mevcut click→lightbox davranışı korunur.
- Resme tıklayınca yine lightbox açılır (mevcut davranış kaybolmaz).
- Video ve PDF medya tipleri zoom dışı kalır.

## Mimari değişiklikler

### Yeni saf yardımcı: `lib/products/zoom-math.ts`

```ts
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface LensRect {
  widthPct: number;   // 0..100
  heightPct: number;  // 0..100
  leftPct: number;    // 0..100
  topPct: number;     // 0..100
}

export function computeLensRect(
  posX: number,  // normalized cursor x, 0..1
  posY: number,  // normalized cursor y, 0..1
  zoom: number,  // ör. 2.5
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

Saf, deterministik, kolayca test edilir.

### Yeni component: `components/shop/zoom-image.tsx`

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

**Davranış detayları:**
- `<Image>` (Next.js optimized) ana resmi gösterir.
- Lens overlay ana resim üzerinde, cursor'un olduğu yerde, `1/zoom` boyutunda yarı-saydam bir dikdörtgen. `aria-hidden`.
- Side panel ana resmin sağında (`left-full + ml-4`), `z-30` ile ürün bilgisi alanını overlay'ler. `backgroundImage` aynı URL — tarayıcı cache vuruşu.
- `hidden lg:block` — sadece `lg:` (1024px+) ekranlarda lens + panel render edilir.
- `pointer-events-none` — lens ve panel cursor olayları kapsamaz; outer wrapper tüm onMouseMove'leri yakalar.

### Entegrasyon: `components/shop/product-gallery.tsx`

Mevcut ana resim render bloğunda (sadece `activeMedia.type === "image"` durumu) `<Image>` yerine `<ZoomImage>`:

Mevcut:
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
  /* video unchanged */
) : null}
```

Yeni:
```tsx
{activeMedia.type === "image" ? (
  <ZoomImage
    src={activeMedia.url}
    alt={activeMedia.altText ?? productName}
  />
) : activeMedia.type === "video" ? (
  /* video unchanged */
) : null}
```

Outer wrapper'daki `onClick → setLightboxOpen(true)` ve `cursor-zoom-in` davranışları korunur — `ZoomImage` `pointer-events-none` overlay'lerle outer click'i engellemez.

**Önemli:** `next/image` `Image` import'u `product-gallery.tsx`'te thumbnail strip'i için hâlâ kullanılıyor, **silinmez**.

### Side panel layout kontrolü

Ürün detay sayfası mevcut layout:
```tsx
<div className="mt-8 grid gap-10 lg:grid-cols-2">
  <ProductGallery />
  <div>{/* product info */}</div>
</div>
```

Side panel galeri kolonunun sağına `left-full + ml-4` ile `absolute` konumlanır. Galeri 50% genişlikte ise panel sağ yarıyı (ürün info alanını) geçici olarak ÖRTER. `z-30` ile en üstte. Hover bittiğinde kaybolur. Bu Trendyol pattern'inin aynısı — kabul edilebilir UX (kullanıcı hover'ı bilinçli yapıyor).

`overflow` clip yok — panel viewport sağına taşabilir. `panelSize=500` ile çoğu monitörde rahat sığar; aşırı küçük desktop'ta hafif overflow olabilir (kabul, kullanıcı zaten zoom'u görmek istiyor).

### Touch / pointer ayırımı

`hidden lg:block` Tailwind responsive utility'si `min-width: 1024px` breakpoint'i kullanır. Bu coarse pointer detection değil; tablet'ler 1024px+ olsa bile (örn. iPad Pro yatay) hover-zoom etkin olur — pratikte fine olarak davranır çünkü pencere genişliği desktop'tur. iPad'lerde Safari'nin "hover" emulasyonu tap-and-hold ile çalışır — `onMouseEnter` tetiklenir. Bu kabul edilebilir; tablet kullanıcı zoom paneli görür, ikinci tap ile gizlenir.

Daha sıkı kontrol için `@media (hover: hover) and (pointer: fine)` CSS query kullanılabilir ama Tailwind class olarak yok; mevcut `lg:block` davranışı yeterli.

## Test stratejisi (TDD)

Vitest mevcut. Yeni test dosyası:

### `lib/products/zoom-math.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { clamp01, computeLensRect } from "./zoom-math";

describe("clamp01", () => {
  it("returns 0 for negative", () => expect(clamp01(-0.5)).toBe(0));
  it("returns 1 for above 1", () => expect(clamp01(1.5)).toBe(1));
  it("returns same for 0..1", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });
});

describe("computeLensRect", () => {
  it("center cursor at 2x zoom places lens centered", () => {
    const r = computeLensRect(0.5, 0.5, 2);
    expect(r.widthPct).toBe(50);
    expect(r.heightPct).toBe(50);
    expect(r.leftPct).toBe(25);
    expect(r.topPct).toBe(25);
  });

  it("top-left cursor at 2x places lens at origin", () => {
    const r = computeLensRect(0, 0, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(0);
  });

  it("bottom-right cursor at 2x places lens at edge", () => {
    const r = computeLensRect(1, 1, 2);
    expect(r.leftPct).toBe(50);
    expect(r.topPct).toBe(50);
  });

  it("3x zoom makes lens smaller", () => {
    const r = computeLensRect(0.5, 0.5, 3);
    expect(r.widthPct).toBeCloseTo(33.333, 2);
  });

  it("clamps out-of-bounds cursor", () => {
    const r = computeLensRect(-0.5, 1.5, 2);
    expect(r.leftPct).toBe(0);
    expect(r.topPct).toBe(50);
  });
});
```

8 test toplam.

### Manuel doğrulama

- `pnpm test` — 50/50 PASS (önceki 42 + 8 yeni)
- `pnpm exec tsc --noEmit` — PASS
- `pnpm lint` — PASS
- `pnpm build` — PASS
- Desktop manuel smoke:
  - Bir ürün detayına git (`/urun/<slug>`)
  - Ana resme fareyi getir → sağ tarafta yan panel açılır, büyütülmüş görüntü
  - Cursor'u resmin üzerinde gezdir → panel görüntüsü kayar
  - Resmin üzerinde lens (translucent kutu) cursor'u takip eder
  - Fareyi resmin dışına çıkar → panel ve lens kaybolur
  - Resme tıkla → lightbox açılır (mevcut davranış, hover-zoom'a rağmen)
- Mobil manuel smoke (DevTools mobile view veya gerçek mobil):
  - Aynı sayfada resim hover-zoom render etmemeli (zaten touch event)
  - Tıkla → lightbox açılır

## Kapsam dışı

- **Touch-and-pan zoom** (mobilde tap+drag ile zoom modu)
- **Multiple zoom levels** (UI ile 2x/3x/5x değiştirme)
- **Klavye pan** (Arrow keys ile zoom alanı kaydırma)
- **High-res variant generation** (Supabase Storage hi-res variant oluşturma)
- **Lightbox içinde pinch-zoom** — mevcut lightbox aynı kalır
- **Galeri thumbnail'ları** — hover-zoom yok

Bunlar gelecek talep gelirse ayrı plan'lar olur.

## Plan'a geçiş

Kullanıcı onayından sonra `superpowers:writing-plans` ile `docs/superpowers/plans/2026-05-13-image-hover-zoom.md`. TDD: saf `zoom-math` testleri önce, sonra component implement.
