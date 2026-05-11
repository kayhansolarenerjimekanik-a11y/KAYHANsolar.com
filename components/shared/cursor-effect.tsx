"use client";

import { useEffect, useRef, useState } from "react";

const TRAIL_LERP = 0.18;

export function CursorEffect() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!finePointer || reducedMotion) return;

    // Client-only enable — SSR returns null; setting state here is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);

    const handleMove = (e: PointerEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      const dot = dotRef.current;
      if (dot) {
        dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    const handleOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      const interactive = !!target?.closest(
        "a, button, [role='button'], input, textarea, select, [data-cursor='interactive']",
      );
      setIsInteractive(interactive);
    };

    const handleLeave = () => {
      const dot = dotRef.current;
      const ring = ringRef.current;
      if (dot) dot.style.opacity = "0";
      if (ring) ring.style.opacity = "0";
    };

    const handleEnter = () => {
      const dot = dotRef.current;
      const ring = ringRef.current;
      if (dot) dot.style.opacity = "1";
      if (ring) ring.style.opacity = "1";
    };

    const tick = () => {
      const ring = ringRef.current;
      if (ring) {
        ringPosRef.current.x +=
          (targetRef.current.x - ringPosRef.current.x) * TRAIL_LERP;
        ringPosRef.current.y +=
          (targetRef.current.y - ringPosRef.current.y) * TRAIL_LERP;
        ring.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerover", handleOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    document.documentElement.addEventListener("pointerenter", handleEnter);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerover", handleOver);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
      document.documentElement.removeEventListener("pointerenter", handleEnter);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] hidden lg:block"
    >
      <div
        ref={dotRef}
        className={`pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-primary transition-[width,height,background-color] duration-200 ease-out ${
          isInteractive ? "h-3 w-3" : "h-2 w-2"
        }`}
      />
      <div
        ref={ringRef}
        className={`pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-[width,height,border-color,background-color] duration-200 ease-out ${
          isInteractive
            ? "h-12 w-12 border-lime-primary bg-lime-primary/10"
            : "h-8 w-8 border-foreground/30"
        }`}
      />
    </div>
  );
}
