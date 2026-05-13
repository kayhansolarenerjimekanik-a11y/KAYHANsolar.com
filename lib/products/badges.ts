import type { ProductBadge } from "@/types";

export interface BadgeSourceFields {
  hasFreeShipping: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  warrantyYears: number | null;
}

export function deriveBadges(p: BadgeSourceFields): ProductBadge[] {
  const out: ProductBadge[] = [];
  if (p.hasFreeShipping) out.push("kargo_bedava");
  if (p.isNewArrival) out.push("yeni");
  if (p.isFeatured) out.push("tercih_edilen");
  if (p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold) {
    out.push("stokta_son");
  }
  if (p.warrantyYears === 5) out.push("5_yil_garanti");
  if (p.warrantyYears === 10) out.push("10_yil_garanti");
  return out;
}
