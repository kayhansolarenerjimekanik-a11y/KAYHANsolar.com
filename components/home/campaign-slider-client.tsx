"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export interface SlideData {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
  href: string;
  ctaLabel: string;
  ctaSecondaryLabel?: string;
}

interface Props {
  slides: SlideData[];
}

const AUTOPLAY_MS = 5000;

export function CampaignSliderClient({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }
    timerRef.current = setInterval(next, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, slides.length, paused]);

  return (
    <div
      className="relative isolate overflow-hidden rounded-3xl border border-border bg-elevated outline-none focus-visible:ring-2 focus-visible:ring-lime-primary"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
      }}
      aria-roledescription="carousel"
      aria-label="Kampanyalar"
    >
      <div className="relative aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length}`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.coverImageUrl}
              alt={slide.title}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 1280px"
              className="object-cover"
              placeholder="empty"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
              <div className="max-w-2xl">
                <h2 className="text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-5xl">
                  {slide.title}
                </h2>
                {slide.description && (
                  <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
                    {slide.description}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={slide.href}>
                    <Button size="lg" variant="primary">
                      {slide.ctaLabel}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                    </Button>
                  </Link>
                  {slide.ctaSecondaryLabel && (
                    <Link href="/magaza">
                      <Button size="lg" variant="outline">
                        {slide.ctaSecondaryLabel}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Önceki slayt"
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Sonraki slayt"
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slayt ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
