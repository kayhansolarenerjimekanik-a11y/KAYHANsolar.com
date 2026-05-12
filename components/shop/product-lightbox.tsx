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
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function ProductLightbox({
  media,
  activeIndex,
  onActiveIndexChange,
  isOpen,
  onClose,
  productName,
  returnFocusRef,
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
      returnFocusRef?.current?.focus();
    };
  }, [isOpen, returnFocusRef]);

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
      } else if (e.key === "Tab") {
        const dialog = closeBtnRef.current?.closest('[role="dialog"]');
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href]:not([disabled])',
          ),
        );
        if (focusables.length === 0) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = active ? focusables.indexOf(active) : -1;
        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault();
            focusables[focusables.length - 1].focus();
          }
        } else {
          if (idx === focusables.length - 1) {
            e.preventDefault();
            focusables[0].focus();
          }
        }
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
        <div className="relative h-[80vh] w-[90vw]">
          {current.type === "image" ? (
            <Image
              src={current.url}
              alt={current.altText ?? productName}
              fill
              sizes="90vw"
              priority
              className="object-contain"
            />
          ) : current.type === "video" ? (
            <video
              src={current.url}
              poster={current.thumbnailUrl}
              controls
              className="h-full w-full object-contain"
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
