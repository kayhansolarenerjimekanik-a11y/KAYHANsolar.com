"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ProductMedia } from "@/types";

interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
}

export function ProductGallery({ media, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (media.length === 0) {
    return (
      <div className="aspect-square rounded-2xl border border-border bg-elevated" />
    );
  }

  const activeMedia = media[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-lime-primary/10 via-elevated to-transparent">
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
        <div className="grid grid-cols-5 gap-2">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-label={`${i + 1}. görsel`}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border-2 transition-colors",
                i === activeIndex
                  ? "border-lime-primary"
                  : "border-border hover:border-border-strong",
              )}
            >
              <Image
                src={m.thumbnailUrl ?? m.url}
                alt={m.altText ?? `${productName} ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
