"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { ProductLightbox } from "@/components/shop/product-lightbox";
import { ZoomImage } from "@/components/shop/zoom-image";
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
  const mainImageRef = useRef<HTMLDivElement>(null);

  if (media.length === 0) {
    return (
      <div className="aspect-square rounded-2xl border border-border bg-elevated" />
    );
  }

  const activeMedia = media[activeIndex];

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("video")) {
      touchStartX.current = null;
      return;
    }
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
        ref={mainImageRef}
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
        returnFocusRef={mainImageRef}
      />
    </div>
  );
}
