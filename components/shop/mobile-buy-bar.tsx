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
