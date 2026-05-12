export type Locale = "tr" | "en";

export type UserRole = "customer" | "admin" | "moderator" | "assistant";

export type ProductBadge =
  | "kargo_bedava"
  | "yeni"
  | "tercih_edilen"
  | "5_yil_garanti"
  | "10_yil_garanti"
  | "stokta_son";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductMedia {
  id: string;
  type: "image" | "video" | "pdf";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription?: string;
  technicalSpecs?: Record<string, string>;
  categoryId: string;
  brand?: string;
  supplierUrl?: string;
  supplierPrice?: number;
  markupPercentage?: number;
  currentPrice: number;
  compareAtPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  badges: ProductBadge[];
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  media: ProductMedia[];
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
}

export type CampaignRuleType =
  | "percent_off"
  | "buy_x_get_y_discount"
  | "bundle_discount"
  | "free_shipping"
  | "fixed_amount_off";

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description?: string;
  bannerImageUrl?: string;
  coverImageUrl?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  ruleType: CampaignRuleType;
  ruleConfig: Record<string, unknown>;
  applicableTo: "all" | "category" | "product";
  targetIds: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  displayOnHomepage: boolean;
  displayPriority: number;
}

export interface GalleryPost {
  id: string;
  slug: string;
  title: string;
  description?: string;
  location?: string;
  installationDate?: string;
  systemPowerKw?: number;
  media: ProductMedia[];
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface OfferRequest {
  fullName: string;
  city: string;
  district: string;
  installationLocation: "roof" | "land" | "other";
  installationAddress?: string;
  appliances: Array<{
    name: string;
    powerW?: number;
    voltage?: number;
  }>;
  detailedDescription: string;
  phone: string;
  email?: string;
}

export interface SiteSettings {
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  address: {
    city: string;
    full: string;
    mapsUrl?: string;
  };
  socialMedia: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitter?: string;
  };
}
