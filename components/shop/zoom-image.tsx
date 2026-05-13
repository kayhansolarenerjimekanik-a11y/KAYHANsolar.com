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
