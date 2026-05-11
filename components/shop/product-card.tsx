import Image from "next/image";
import Link from "next/link";

import { ProductBadgeChip } from "@/components/shop/product-badge";
import { StockStatus } from "@/components/shop/stock-status";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const primaryImage = product.media[0]?.url;
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.currentPrice) /
          product.compareAtPrice!) *
          100,
      )
    : 0;

  return (
    <Link
      href={`/urun/${product.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-lime-primary hover:shadow-xl hover:shadow-lime-primary/10",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-lime-primary/10 via-elevated to-transparent">
        {primaryImage && (
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {product.badges.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.badges.slice(0, 2).map((badge) => (
              <ProductBadgeChip key={badge} badge={badge} />
            ))}
          </div>
        )}

        {hasDiscount && (
          <div className="absolute right-3 top-3 rounded-md bg-danger px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            −%{discountPercent}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
            {product.brand}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {product.name}
        </h3>

        <p className="line-clamp-1 text-xs text-muted">
          {product.shortDescription}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight text-foreground">
              {formatPrice(product.currentPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-subtle line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
          <StockStatus
            stockQuantity={product.stockQuantity}
            lowStockThreshold={product.lowStockThreshold}
          />
        </div>
      </div>
    </Link>
  );
}
