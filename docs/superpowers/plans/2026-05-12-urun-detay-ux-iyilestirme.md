# Ürün Detay UX/Dönüşüm İyileştirme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `app/(public)/urun/[slug]/page.tsx` ve `components/shop/` altındaki ürün detay sayfasının UX/dönüşüm eksiklerini gidermek — galeri lightbox + swipe + klavye, sepet farkındalığı + WhatsApp adet propagasyonu, mobil sticky CTA + paylaşım.

**Architecture:** Üç bağımsız sub-phase, üç ayrı commit. B1 (galeri) ve B2 (cart-aware add-to-cart) birbirinden bağımsız. B3 (sticky bar + share + page integration) her ikisini de sayfaya entegre ettiği için son sırada. Tüm yeni component'ler `"use client"`, hydration güvenliği `useCart.isHydrated` flag'i ile, scroll-lock detection MutationObserver ile.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19.2.4, Zustand 5 (cart store, persist middleware), Tailwind v4, lucide-react ikonları, sonner toast, TypeScript 5.

**Spec referansı:** `docs/superpowers/specs/2026-05-12-urun-detay-ux-iyilestirme-design.md`

**Test stratejisi:** Proje test framework içermiyor (yalnız eslint). Her sub-phase için doğrulama: (1) `pnpm lint`, (2) `pnpm exec tsc --noEmit`, (3) elle smoke (dev sunucusunda DevTools mobil emulasyon dahil). Hepsi geçtikten sonra commit.

---

## Dosya Haritası

| Dosya | Durum | Sorumluluk |
|---|---|---|
| `components/shop/product-lightbox.tsx` | Yeni | Tam-ekran modal: klavye + swipe + medya nav. Sadece galeride kullanılır. |
| `components/shop/product-gallery.tsx` | Değişen | Ana görsel swipe + klavye + lightbox toggle. Thumbnail listesi yatay scroll. |
| `lib/whatsapp.ts` | Değişen | `buildQuickOrderLink`'e opsiyonel `quantity` parametresi. |
| `components/shop/add-to-cart.tsx` | Değişen | 3 mod: Tükendi / Sepete Ekle / Sepette Var (stepper + WhatsApp adetli). |
| `components/shop/share-actions.tsx` | Yeni | Native share + link kopyala + WhatsApp paylaş. |
| `components/shop/mobile-buy-bar.tsx` | Yeni | Mobil fixed bottom bar; IntersectionObserver + MutationObserver. |
| `app/(public)/urun/[slug]/page.tsx` | Değişen | `id="buy-section"`, `<ShareActions>`, `<MobileBuyBar>`, `absoluteUrl` extraction. |

---

## Sub-phase B1: Galeri Rework

### Task 1.1: `product-lightbox.tsx` oluştur

**Files:**
- Create: `components/shop/product-lightbox.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/types";

interface ProductLightboxProps {
  media: ProductMedia[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}

export function ProductLightbox({
  media,
  activeIndex,
  onActiveIndexChange,
  isOpen,
  onClose,
  productName,
}: ProductLightboxProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "VIDEO") return; // video kendi seek kontrolünü yapar
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        onActiveIndexChange(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < media.length - 1) {
        e.preventDefault();
        onActiveIndexChange(activeIndex + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, activeIndex, media.length, onActiveIndexChange, onClose]);

  if (!isOpen || media.length === 0) return null;

  const current = media[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < media.length - 1;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && hasNext) onActiveIndexChange(activeIndex + 1);
    else if (dx > 0 && hasPrev) onActiveIndexChange(activeIndex - 1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={productName}
      className="fixed inset-0 z-50 bg-black/90"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
      >
        <X className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="relative max-h-[80vh] max-w-[90vw]">
          {current.type === "image" ? (
            <Image
              src={current.url}
              alt={current.altText ?? productName}
              width={1600}
              height={1600}
              className="max-h-[80vh] w-auto object-contain"
              priority
            />
          ) : current.type === "video" ? (
            <video
              src={current.url}
              poster={current.thumbnailUrl}
              controls
              className="max-h-[80vh] w-auto"
            />
          ) : null}
        </div>
      </div>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => hasPrev && onActiveIndexChange(activeIndex - 1)}
            disabled={!hasPrev}
            aria-label="Önceki"
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-black/40 text-white",
              hasPrev ? "hover:bg-black/60" : "opacity-30 cursor-not-allowed",
            )}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => hasNext && onActiveIndexChange(activeIndex + 1)}
            disabled={!hasNext}
            aria-label="Sonraki"
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-black/40 text-white",
              hasNext ? "hover:bg-black/60" : "opacity-30 cursor-not-allowed",
            )}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.2} />
          </button>
          <p
            aria-live="polite"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white"
          >
            {activeIndex + 1} / {media.length}
          </p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata. Yeni dosya `ProductMedia` ve `cn` import'ları çözülmeli.

### Task 1.2: `product-gallery.tsx` — lightbox + swipe + klavye + grid fix

**Files:**
- Modify: `components/shop/product-gallery.tsx` (tüm dosya yenilenir)

- [ ] **Step 1: Dosyayı yenile**

```tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { ProductLightbox } from "@/components/shop/product-lightbox";
import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/types";

interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
}

export function ProductGallery({ media, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (media.length === 0) {
    return (
      <div className="aspect-square rounded-2xl border border-border bg-elevated" />
    );
  }

  const activeMedia = media[activeIndex];

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && activeIndex < media.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (dx > 0 && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" && activeIndex > 0) {
      e.preventDefault();
      setActiveIndex(activeIndex - 1);
    } else if (e.key === "ArrowRight" && activeIndex < media.length - 1) {
      e.preventDefault();
      setActiveIndex(activeIndex + 1);
    } else if ((e.key === "Enter" || e.key === " ") && activeMedia.type === "image") {
      e.preventDefault();
      setLightboxOpen(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role={activeMedia.type === "image" ? "button" : undefined}
        tabIndex={0}
        aria-label={
          activeMedia.type === "image"
            ? `${productName} — büyütmek için tıkla`
            : productName
        }
        onClick={() => {
          if (activeMedia.type === "image") setLightboxOpen(true);
        }}
        onKeyDown={handleKey}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-lime-primary/10 via-elevated to-transparent focus:outline-none focus:ring-2 focus:ring-lime-primary",
          activeMedia.type === "image" && "cursor-zoom-in",
        )}
      >
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
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-label={`${i + 1}. görsel`}
              aria-current={i === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative aspect-square w-20 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-colors",
                i === activeIndex
                  ? "border-lime-primary"
                  : "border-border hover:border-border-strong",
              )}
            >
              <Image
                src={m.thumbnailUrl ?? m.url}
                alt={m.altText ?? `${productName} ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <ProductLightbox
        media={media}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        productName={productName}
      />
    </div>
  );
}
```

- [ ] **Step 2: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata, 0 uyarı (ya da var olan baseline uyarılar değişmemiş).

### Task 1.3: B1 manuel smoke

- [ ] **Step 1: Dev sunucusunu başlat**

```powershell
pnpm dev
```

`.next/dev/lock` ELIFECYCLE hatası verirse: dosyadaki PID'i `taskkill /F /PID <pid>` ile sonlandır, `Remove-Item .next\dev\lock`, tekrar `pnpm dev`.

- [ ] **Step 2: Tek görselli ürün smoke**

`http://localhost:3000/magaza` → tek görselli bir ürüne git.
- Thumbnail satırı görünmüyor mu? ✓
- Ana görsele tıkla → lightbox açılıyor mu, prev/next/sayaç gizli mi? ✓
- Escape → kapanıyor mu? ✓
- Tab ile odakla → Enter ya da Space ile lightbox açılıyor mu? ✓

- [ ] **Step 3: Çoklu görselli ürün smoke**

5+ medyası olan ürüne git (yoksa demo seed'inde `lib/mock/data.ts`'deki en çok medyası olan ürüne git).
- Thumbnail satırı yatay scroll mı, taşma var mı? ✓
- Thumbnail tıklayınca ana görsel değişiyor mu? ✓
- Ana görsel container odakta iken sol/sağ ok aktif index değiştiriyor mu? ✓
- Ana görsele tıkla → lightbox, sol/sağ ok ile dolaş, prev/next butonları doğru disabled hale gelmeli (ilk/son media'da). ✓

- [ ] **Step 4: Mobil emulasyon smoke**

DevTools → Toggle device toolbar → iPhone 14 (veya benzeri).
- Ana görselde sola swipe → sonraki media'ya geç. ✓
- Sağa swipe → öncekine. ✓
- < 50px hareket → değişiklik yok. ✓
- Lightbox açıkken aynı swipe davranışı. ✓
- Scroll restore: lightbox kapanınca sayfa scroll edilebilir mi? ✓

- [ ] **Step 5: Video media smoke**

Video media içeren bir ürün varsa (yoksa skip):
- Lightbox'ta video controls görünür mü? ✓
- Video'ya tıklayıp seek/play yaparken sol/sağ ok modal navigation tetiklemiyor mu (video focusedken)? ✓

### Task 1.4: B1 commit

- [ ] **Step 1: Commit**

```powershell
git add components/shop/product-gallery.tsx components/shop/product-lightbox.tsx
git commit -m "feat(shop): product gallery lightbox + swipe + keyboard nav"
```

---

## Sub-phase B2: AddToCart + WhatsApp

### Task 2.1: `lib/whatsapp.ts` — `quantity` parametresi

**Files:**
- Modify: `lib/whatsapp.ts:51-61` (`buildQuickOrderLink`)

- [ ] **Step 1: Fonksiyonu güncelle**

`lib/whatsapp.ts` dosyasında `buildQuickOrderLink` fonksiyonunu **tamamen** şu içerikle değiştir:

```ts
export function buildQuickOrderLink(
  whatsappNumber: string,
  productName: string,
  price: number,
  quantity: number = 1,
): string {
  const lines =
    quantity > 1
      ? [
          `Merhaba, "${productName}" ürününden ${quantity} adet (toplam ${formatPrice(
            price * quantity,
          )}) sipariş etmek istiyorum.`,
        ]
      : [
          `Merhaba, "${productName}" (${formatPrice(price)}) ürününü sipariş etmek istiyorum.`,
        ];
  const text = encodeURIComponent(lines.join("\n"));
  const clean = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${text}`;
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata. Mevcut çağrı yerleri (`add-to-cart.tsx`) opsiyonel param eksik olduğu için kırılmaz.

### Task 2.2: `add-to-cart.tsx` — 3 mod + cart awareness

**Files:**
- Modify: `components/shop/add-to-cart.tsx` (tüm dosya yenilenir)

- [ ] **Step 1: Dosyayı yenile**

```tsx
"use client";

import {
  AlertCircle,
  Bell,
  Mail,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildQuickOrderLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

interface AddToCartProps {
  product: Product;
  whatsappNumber: string;
}

export function AddToCart({ product, whatsappNumber }: AddToCartProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const isHydrated = useCart((s) => s.isHydrated);
  const existingQuantity = useCart(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );

  const inStock = product.stockQuantity > 0;
  const showExisting = isHydrated && existingQuantity > 0 && inStock;
  const overStock = showExisting && existingQuantity > product.stockQuantity;

  // Cart cached yet admin lowered stock — clamp + inform once.
  useEffect(() => {
    if (overStock) {
      updateQuantity(product.id, product.stockQuantity);
      toast.info("Stok güncellendi", {
        description: `${product.name} adediniz ${product.stockQuantity} olarak güncellendi.`,
      });
    }
  }, [overStock, product.id, product.stockQuantity, product.name, updateQuantity]);

  if (!inStock) {
    return <NotifyWhenAvailable productId={product.id} productName={product.name} />;
  }

  if (showExisting) {
    return (
      <ExistingInCart
        product={product}
        existingQuantity={existingQuantity}
        whatsappNumber={whatsappNumber}
        onUpdate={(q) => updateQuantity(product.id, q)}
        onRemove={() => {
          removeItem(product.id);
          toast.success("Sepetten çıkarıldı", { description: product.name });
        }}
      />
    );
  }

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.currentPrice,
      imageUrl: product.media[0]?.url,
      stockQuantity: product.stockQuantity,
      quantity,
    });
    toast.success("Sepete eklendi", {
      description: `${quantity} × ${product.name}`,
      action: {
        label: "Sepete Git",
        onClick: () => router.push("/sepet"),
      },
    });
  };

  const whatsappLink = buildQuickOrderLink(
    whatsappNumber,
    product.name,
    product.currentPrice,
    quantity,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Adet:</span>
        <div className="inline-flex items-center rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Azalt"
            className="grid h-10 w-10 place-items-center rounded-l-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(product.stockQuantity, q + 1))
            }
            disabled={quantity >= product.stockQuantity}
            aria-label="Arttır"
            className="grid h-10 w-10 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" onClick={handleAddToCart}>
          <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
          Sepete Ekle
        </Button>
        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="lg" className="w-full">
            Hemen Satın Al
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted">
        &quot;Hemen Satın Al&quot; WhatsApp üzerinden tamamlanır.
      </p>
    </div>
  );
}

function ExistingInCart({
  product,
  existingQuantity,
  whatsappNumber,
  onUpdate,
  onRemove,
}: {
  product: Product;
  existingQuantity: number;
  whatsappNumber: string;
  onUpdate: (quantity: number) => void;
  onRemove: () => void;
}) {
  const canIncrement = existingQuantity < product.stockQuantity;
  const whatsappLink = buildQuickOrderLink(
    whatsappNumber,
    product.name,
    product.currentPrice,
    existingQuantity,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Sepetinizde:{" "}
        <span className="font-semibold text-foreground">
          {existingQuantity} adet
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-xl border border-border">
          <button
            type="button"
            onClick={() => {
              if (existingQuantity <= 1) onRemove();
              else onUpdate(existingQuantity - 1);
            }}
            aria-label="Azalt"
            className="grid h-10 w-10 place-items-center rounded-l-xl text-muted hover:text-foreground"
          >
            <Minus className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">
            {existingQuantity}
          </span>
          <button
            type="button"
            onClick={() => canIncrement && onUpdate(existingQuantity + 1)}
            disabled={!canIncrement}
            aria-label="Arttır"
            className="grid h-10 w-10 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <Link href="/sepet" className="flex-1 min-w-[10rem]">
          <Button variant="secondary" size="lg" className="w-full">
            Sepete Git →
          </Button>
        </Link>
      </div>

      {!canIncrement && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
          Stok dolu — daha fazla eklenemez.
        </p>
      )}

      <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
        <Button variant="primary" size="lg" className="w-full">
          Hemen Satın Al ({existingQuantity} adet)
        </Button>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1.5 text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
        Sepetten çıkar
      </button>
    </div>
  );
}

function NotifyWhenAvailable({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Geçerli bir e-posta adresi girin");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/stock-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, email: trimmed }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Gönderim başarısız");
          return;
        }
        setSubmitted(true);
        toast.success("Bildirim aboneliğiniz alındı", {
          description: `${productName} stoğa girince size haber vereceğiz.`,
        });
      } catch {
        setError("Bağlantı hatası — lütfen tekrar deneyin");
      }
    });
  }

  if (submitted) {
    return (
      <div className="space-y-2 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
        <p className="font-medium text-foreground">Aboneliğiniz kaydedildi.</p>
        <p className="text-xs text-muted">
          Ürün stoğa girdiğinde {email} adresine bildirim göndereceğiz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <p className="text-sm font-medium text-foreground">
        Bu ürün şu anda tükenmiş durumda.
      </p>
      <p className="text-xs text-muted">
        E-postanızı bırakın, stoğa girince size haber verelim.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
            className="pl-10"
            autoComplete="email"
          />
        </div>
        <Button onClick={submit} disabled={pending}>
          <Bell className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Haber Ver"}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 2.3: B2 manuel smoke

- [ ] **Step 1: Mod B (Sepete Ekle) smoke — yeni ürün**

`/magaza` → daha önce eklenmemiş bir ürüne git.
- Ekranda: adet stepper + "Sepete Ekle" + "Hemen Satın Al" ✓
- Adet 1 default. "+" / "−" sınırlarda disable ✓
- Adet 3 yap → "Hemen Satın Al"a tıkla → açılan WhatsApp URL'inde "3 adet" görünüyor mu? (URL bar'da decoded text görünmez; popupta veya elle decode ile kontrol et) ✓
- "Sepete Ekle" → toast geldi mi, sayfa Mod C'ye geçti mi? ✓

- [ ] **Step 2: Mod C (Sepette Var) smoke**

Aynı sayfada (Mod B'den sonra):
- "Sepetinizde: 3 adet" görünüyor mu? ✓
- Stepper "+" tıkla → 4 adet (stok izin verirse). "−" → 2 ✓
- "Sepete Git" butonu `/sepet`'e gidiyor mu? ✓
- "Hemen Satın Al (3 adet)" → WhatsApp adetli URL ✓
- 1 adetteyken "−" → ürün sepetten silinir, Mod B'ye dönüş + toast ✓
- "Sepetten çıkar" linki → silme + toast ✓

- [ ] **Step 3: Edge — stok admin'den düşürüldü**

Admin paneli açıksa: bir ürünü sepete 3 adet ekle, sonra admin'den stoğunu 1'e düşür. (Yoksa: `localStorage.setItem('kayhan-cart', '<JSON>')` ile manuel patch.)
- Sayfaya yeniden gir → Mod C'ye düşmeli, adet otomatik 1'e clamp + "Stok güncellendi" toast ✓
- Stepper "+" disabled, "Stok dolu" uyarısı görünüyor ✓

- [ ] **Step 4: Edge — stoksuz ürün**

`/magaza` → "Tükendi" badge'i olan bir ürüne git.
- `NotifyWhenAvailable` formu görünüyor (mevcut davranış, kırılmadı) ✓
- E-posta gönder → toast ✓

- [ ] **Step 5: SSR / hydration check**

Network → throttle → "Slow 3G" + DevTools sayfa kaynağını incele (`view-source:...`).
- İlk HTML'de Mod B render edilmeli ("Sepetinizde: X adet" stringi HTML'de YOK olmalı)
- Hydration sonrası kullanıcı sepetteki ürüne girdiğinde Mod C'ye geçer ✓
- Görsel zıplama yok ya da minimal ✓

### Task 2.4: B2 commit

- [ ] **Step 1: Commit**

```powershell
git add components/shop/add-to-cart.tsx lib/whatsapp.ts
git commit -m "feat(shop): cart-aware add-to-cart + whatsapp quantity propagation"
```

---

## Sub-phase B3: Sticky Bar + Share + Page

### Task 3.1: `share-actions.tsx` oluştur

**Files:**
- Create: `components/shop/share-actions.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
"use client";

import { Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ShareActionsProps {
  productName: string;
  url: string;
}

export function ShareActions({ productName, url }: ShareActionsProps) {
  const [mounted, setMounted] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasNativeShare(typeof navigator !== "undefined" && "share" in navigator);
    setHasClipboard(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function",
    );
  }, []);

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `${productName} — ${url}`,
  )}`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title: productName, url });
    } catch {
      /* user cancel — sessizce yut */
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link kopyalandı");
    } catch {
      toast.error("Kopyalama başarısız");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="font-medium">Paylaş:</span>

      {mounted && hasNativeShare && (
        <Button variant="outline" size="sm" onClick={handleNativeShare}>
          <Share2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          Paylaş
        </Button>
      )}

      {mounted && hasClipboard && (
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" strokeWidth={2.2} />
          Linki Kopyala
        </Button>
      )}

      <Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          WhatsApp
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 3.2: `mobile-buy-bar.tsx` oluştur

**Files:**
- Create: `components/shop/mobile-buy-bar.tsx`

- [ ] **Step 1: Dosyayı oluştur**

```tsx
"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

interface MobileBuyBarProps {
  product: Product;
  targetSelector: string;
}

export function MobileBuyBar({ product, targetSelector }: MobileBuyBarProps) {
  const isHydrated = useCart((s) => s.isHydrated);
  const existingQuantity = useCart(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );

  const [ctaVisible, setCtaVisible] = useState(true);
  const [bodyLocked, setBodyLocked] = useState(false);

  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => setCtaVisible(entries[0]?.isIntersecting ?? true),
      { threshold: 0.3 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetSelector]);

  useEffect(() => {
    const check = () => setBodyLocked(document.body.style.overflow === "hidden");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, []);

  if (product.stockQuantity === 0) return null;

  const inCart = isHydrated && existingQuantity > 0;
  const hidden = ctaVisible || bodyLocked;

  function scrollToBuySection() {
    document
      .querySelector(targetSelector)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div
      aria-hidden={hidden}
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur",
        "px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "transition-transform duration-200 lg:hidden",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {inCart ? (
            <p className="truncate text-sm">
              Sepette:{" "}
              <span className="font-semibold text-foreground">
                {existingQuantity} adet
              </span>
            </p>
          ) : (
            <p className="truncate text-base font-semibold tracking-tight">
              {formatPrice(product.currentPrice)}
            </p>
          )}
        </div>

        {inCart ? (
          <Link href="/sepet">
            <Button variant="primary" size="sm">
              Sepete Git →
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" onClick={scrollToBuySection}>
            <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.4} />
            Sepete Ekle
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 3.3: `page.tsx` — entegrasyon

**Files:**
- Modify: `app/(public)/urun/[slug]/page.tsx`

- [ ] **Step 1: `absoluteUrl` çıkar, `id` ekle, yeni component'leri yerleştir**

`app/(public)/urun/[slug]/page.tsx`'i şu içerikle değiştir:

```tsx
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/shop/add-to-cart";
import { MobileBuyBar } from "@/components/shop/mobile-buy-bar";
import { ProductCard } from "@/components/shop/product-card";
import { ProductBadgeChip } from "@/components/shop/product-badge";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ShareActions } from "@/components/shop/share-actions";
import { StockStatus } from "@/components/shop/stock-status";
import { Container } from "@/components/ui/container";
import { ProductJsonLd } from "@/components/seo/product-jsonld";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { recordEvent } from "@/lib/analytics/repository";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const products = await repo.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

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

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, settings, categories, allProducts] = await Promise.all([
    repo.getProductBySlug(slug),
    repo.getSettings(),
    repo.listCategories(),
    repo.listProducts(),
  ]);
  if (!product) notFound();

  recordEvent({
    type: "product_view",
    pageUrl: `/urun/${product.slug}`,
    productId: product.id,
  }).catch(() => {
    /* analytics must never break the page */
  });

  const category = categories.find((c) => c.id === product.categoryId);
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.currentPrice) /
          product.compareAtPrice!) *
          100,
      )
    : 0;

  const related = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.categoryId === product.categoryId &&
        p.isActive,
    )
    .slice(0, 4);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";
  const absoluteUrl = `${siteUrl}/urun/${product.slug}`;

  return (
    <Container className="py-8 lg:py-14">
      <ProductJsonLd product={product} url={absoluteUrl} />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted"
      >
        <Link href="/" className="hover:text-foreground">
          Ana
        </Link>
        <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
        <Link href="/magaza" className="hover:text-foreground">
          Mağaza
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
            <Link
              href={`/magaza?kategori=${category.slug}`}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ProductGallery media={product.media} productName={product.name} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {product.brand && (
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <p className="text-sm text-muted">{product.shortDescription}</p>

            {product.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {product.badges.map((badge) => (
                  <ProductBadgeChip key={badge} badge={badge} />
                ))}
              </div>
            )}
          </div>

          <div
            id="buy-section"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight">
                {formatPrice(product.currentPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-subtle line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                  <span className="rounded-md bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
                    −%{discountPercent}
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <StockStatus
                stockQuantity={product.stockQuantity}
                lowStockThreshold={product.lowStockThreshold}
              />
            </div>
            <div className="mt-5">
              <AddToCart
                product={product}
                whatsappNumber={settings.whatsappNumber}
              />
            </div>
          </div>

          <ShareActions productName={product.name} url={absoluteUrl} />

          {product.technicalSpecs &&
            Object.keys(product.technicalSpecs).length > 0 && (
              <div className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold tracking-tight">
                    Teknik Özellikler
                  </h2>
                </div>
                <dl className="divide-y divide-border">
                  {Object.entries(product.technicalSpecs).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                    >
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
        </div>
      </div>

      {product.longDescription && (
        <section className="mt-16 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Detaylı Açıklama
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
            {product.longDescription}
          </p>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Benzer Ürünler
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <MobileBuyBar product={product} targetSelector="#buy-section" />
    </Container>
  );
}
```

**Not:** Mevcut sayfaya kıyasla iki bonus iyileştirme yapıldı: (a) sequential `await repo.listProducts()` (line 74) Promise.all'a alındı, (b) inline URL hesaplaması `absoluteUrl` const'una çıkarıldı.

- [ ] **Step 2: Lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

### Task 3.4: B3 manuel smoke

- [ ] **Step 1: Share — desktop**

`/urun/<bir-ürün>` aç (desktop genişliği).
- "Paylaş:" satırı görünüyor ✓
- Mounted sonrası: "Linki Kopyala" + "WhatsApp" butonları (native share desktop'ta yok genelde) ✓
- "Linki Kopyala" tıkla → toast + pano'da `https://.../urun/<slug>` ✓
- "WhatsApp" tıkla → yeni sekmede `wa.me/?text=...` URL, decoded text `"<ürün adı> — https://..."` ✓

- [ ] **Step 2: Share — mobil emulasyon**

DevTools mobil emulasyon (iPhone) — Chrome bazı durumlarda native share emulate eder.
- "Paylaş" butonu görünebilir; tıklayınca share sheet ya da sessiz cancel ✓
- "Linki Kopyala" yine çalışır (clipboard API mevcut) ✓

- [ ] **Step 3: Sticky bar — temel**

Mobil emulasyon devam.
- Sayfa başında (CTA card görünür) → bar görünmez ✓
- Aşağı kaydır (CTA görünmüyor) → bar yumuşak slide up ✓
- Yukarı kaydır → bar gizlenir ✓
- Mod B'de (ürün sepette değil): bar'da fiyat + "Sepete Ekle" buton → CTA'ya smooth scroll ✓
- Sepete ekle, geri scroll (bar tekrar görünür) → bar Mod C'ye geçti, "Sepetinizde: X adet" + "Sepete Git →" ✓
- "Sepete Git" → `/sepet`'e gider ✓

- [ ] **Step 4: Sticky bar — body lock**

Mobil emulasyonda hâlâ.
- Bar görünür konumda (sayfayı aşağı kaydırılmış) ✓
- Header'daki menü (hamburger) → tıkla → mobil menü açılır + bar anında gizlenir ✓
- Menüyü kapat → bar tekrar görünür ✓
- Arama dialog'unu aç (varsa kısayolla) → bar gizli ✓

- [ ] **Step 5: Sticky bar — edge case'ler**

- Tükendi ürün → bar **hiç** render edilmemeli (DOM'da yok) ✓
- Desktop (lg+) genişlikte → bar görünmez (`lg:hidden`) ✓
- Stok 1, kullanıcı 1 adet sepete eklemiş → bar Mod C, "Sepete Git" → ✓

- [ ] **Step 6: SSR check**

`view-source:` ile mobil-buy-bar ilk HTML'de ne durumda?
- Hidden state `aria-hidden="true"` + `translate-y-full` olarak render edilmiş olmalı (CTA başlangıçta görünür varsayılır, doğru). Hydration sonrası IntersectionObserver gerçek değeri set eder. ✓

### Task 3.5: B3 commit

- [ ] **Step 1: Commit**

```powershell
git add app/(public)/urun/[slug]/page.tsx components/shop/mobile-buy-bar.tsx components/shop/share-actions.tsx
git commit -m "feat(shop): mobile sticky buy bar + share actions on product page"
```

---

## Finalize

### Task 4.1: Toplu doğrulama

- [ ] **Step 1: Tam lint + typecheck**

```powershell
pnpm lint
pnpm exec tsc --noEmit
```

Expected: 0 hata.

- [ ] **Step 2: Build smoke**

```powershell
pnpm build
```

Expected: Build başarılı. `urun/[slug]` statik üretildi (generateStaticParams çalıştı), warning yok.

- [ ] **Step 3: Memory güncelle (opsiyonel)**

Eğer plan başarıyla tamamlandıysa `project_master_fix_findings.md` memory'sine bu turun sonucu eklenebilir — ama bu plan kapsamı dışı, ayrı bir kararla yapılır.

---

## Risk Notları

- **Hydration mismatch:** AddToCart ve MobileBuyBar ilk render Mod B varsayıyor. SSR HTML'de Mod C asla render edilmez — hydration sonrası `isHydrated && existingQuantity > 0` true olduğunda geçer. Bu kalıp Next.js + Zustand persist için standart.
- **MutationObserver overhead:** body style izlemek mikro maliyetli; yalnız attribute değişiklikleri trigger eder.
- **IntersectionObserver fallback:** `target` element bulunamazsa observer kurulmaz, `ctaVisible` true kalır → bar gizli kalır. Bu güvenli default.
- **WhatsApp imza:** `quantity` opsiyonel default 1 → backward-compatible. `lib/whatsapp.ts`'deki diğer fonksiyon (`buildOrderWhatsAppLink`) etkilenmiyor.
- **Lightbox `Image` width/height:** `width={1600} height={1600}` placeholder boyutlar — `object-contain` ile aspect ratio kaynak görselden gelir. Next 16'da fill alternatif olabilir ama padding/sizing daha kontrolsüz.

---

## Geri Alma

Her commit bağımsız. Sıra:
- B1: `feat(shop): product gallery lightbox + swipe + keyboard nav`
- B2: `feat(shop): cart-aware add-to-cart + whatsapp quantity propagation`
- B3: `feat(shop): mobile sticky buy bar + share actions on product page`

Sorun varsa: `git revert <hash>` — diğer iki commit'i bozmaz.
