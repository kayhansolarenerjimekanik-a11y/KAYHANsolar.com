import { productBadgeLabels } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import type { ProductBadge } from "@/types";

const badgeStyles: Record<ProductBadge, string> = {
  kargo_bedava: "bg-lime-primary/95 text-black",
  yeni: "bg-info/90 text-white",
  tercih_edilen: "bg-foreground text-background",
  "5_yil_garanti": "bg-surface/95 text-foreground border border-border",
  "10_yil_garanti": "bg-surface/95 text-foreground border border-border",
  stokta_son: "bg-warning/90 text-white",
};

export function ProductBadgeChip({
  badge,
  className,
}: {
  badge: ProductBadge;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur",
        badgeStyles[badge],
        className,
      )}
    >
      {productBadgeLabels[badge] ?? badge}
    </span>
  );
}
