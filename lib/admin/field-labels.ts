const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: "Ürün adı",
  slug: "Slug (URL)",
  shortDescription: "Kısa açıklama",
  longDescription: "Detaylı açıklama",
  metaTitle: "SEO başlığı",
  metaDescription: "SEO açıklaması",
  categoryId: "Kategori",
  brand: "Marka",
  supplierUrl: "Tedarikçi URL",
  supplierPrice: "Tedarikçi fiyatı",
  markupPercentage: "Kar marjı",
  currentPrice: "Satış fiyatı",
  compareAtPrice: "Eski fiyat",
  stockQuantity: "Stok adedi",
  lowStockThreshold: "Düşük stok eşiği",
  warrantyYears: "Garanti (yıl)",
  hasFreeShipping: "Kargo bedava",
  isActive: "Aktif",
  isFeatured: "Öne çıkar",
  isNewArrival: "Yeni gelen",
  media: "Medya listesi",
  technicalSpecs: "Teknik özellikler",
};

const MEDIA_SUB_LABELS: Record<string, string> = {
  url: "URL",
  altText: "alt metin",
  thumbnailUrl: "küçük görsel",
  type: "tip",
};

export function productFieldLabel(field: string): string {
  const mediaMatch = /^media\.(\d+)\.([a-zA-Z]+)$/.exec(field);
  if (mediaMatch) {
    const idx = Number(mediaMatch[1]) + 1;
    const sub = MEDIA_SUB_LABELS[mediaMatch[2]] ?? mediaMatch[2];
    return `${idx}. medya ${sub}`;
  }
  return PRODUCT_FIELD_LABELS[field] ?? field;
}
