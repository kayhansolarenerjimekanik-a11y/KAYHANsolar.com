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
      if (tag === "VIDEO") return;
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
              className="max-h-[80vh] w-auto object-contain"
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
