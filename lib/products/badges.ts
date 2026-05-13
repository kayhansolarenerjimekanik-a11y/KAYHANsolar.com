import type { Product, ProductBadge } from "@/types";

export type BadgeSourceFields = Pick<
  Product,
  | "hasFreeShipping"
  | "isFeatured"
  | "isNewArrival"
  | "stockQuantity"
  | "lowStockThreshold"
  | "warrantyYears"
>;

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
