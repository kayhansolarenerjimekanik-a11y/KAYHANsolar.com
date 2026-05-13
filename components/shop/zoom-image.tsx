"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  clamp01,
  computeLensRect,
  escapeCssUrl,
  isHttpsUrl,
} from "@/lib/products/zoom-math";
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

interface PanelPos {
  top: number;
  left: number;
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
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    });
    // Panel pozisyonunu da her move'da güncelle: scroll/resize sırasında
    // doğru kalır. Sağ tarafa sığmazsa sola yansıt.
    const rightEdge = rect.right + 16 + panelSize;
    const placeOnLeft =
      typeof window !== "undefined" && rightEdge > window.innerWidth;
    setPanelPos({
      top: rect.top,
      left: placeOnLeft ? rect.left - panelSize - 16 : rect.right + 16,
    });
  }

  const lens = computeLensRect(pos.x, pos.y, zoom);
  // Guvenlik: yalnizca https:// URL'leri arka plan resmi olarak kullan.
  // Aksi halde panel cizilmez (XSS / CSS injection guard).
  const safeBgSrc = isHttpsUrl(src) ? escapeCssUrl(src) : null;
  // hovering=false ilk render'da (server/client) — portal asla initial pass'te
  // calismaz; document.body sadece kullanici hover ettiginde okunur (client-only).
  const showPanel = hovering && safeBgSrc !== null && panelPos !== null;

  return (
    <>
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
      </div>

      {showPanel &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-50 hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl lg:block"
            style={{
              top: `${panelPos.top}px`,
              left: `${panelPos.left}px`,
              width: `${panelSize}px`,
              height: `${panelSize}px`,
              backgroundImage: `url("${safeBgSrc}")`,
              backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
              backgroundPosition: `${pos.x * 100}% ${pos.y * 100}%`,
              backgroundRepeat: "no-repeat",
            }}
          />,
          document.body,
        )}
    </>
  );
}
