import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  Offer,
  OfferStatus,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  SiteSettings,
  StockSubscription,
} from "./types";
import type { CampaignRuleType, ProductMedia } from "@/types";

// ===== Product =====
export function rowToProduct(
  row: Record<string, unknown>,
  media: Record<string, unknown>[] = []
): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    shortDescription: (row.short_description as string | null) ?? "",
    longDescription: (row.long_description as string | null) ?? undefined,
    technicalSpecs: (row.technical_specs as Record<string, string> | null) ?? undefined,
    categoryId: row.category_id as string,
    brand: (row.brand as string | null) ?? undefined,
    supplierUrl: (row.supplier_url as string | null) ?? undefined,
    supplierPrice: row.supplier_price ? Number(row.supplier_price) : undefined,
    markupPercentage: row.markup_percentage ? Number(row.markup_percentage) : undefined,
    currentPrice: Number(row.current_price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    stockQuantity: (row.stock_quantity as number | null) ?? 0,
    lowStockThreshold: (row.low_stock_threshold as number | null) ?? 3,
    isActive: (row.is_active as boolean | null) ?? true,
    isFeatured: (row.is_featured as boolean | null) ?? false,
    isNewArrival: (row.is_new_arrival as boolean | null) ?? false,
    hasFreeShipping: (row.has_free_shipping as boolean | null) ?? false,
    warrantyYears: (row.warranty_years as number | null) ?? null,
    metaTitle: (row.meta_title as string | null) ?? undefined,
    metaDescription: (row.meta_description as string | null) ?? undefined,
    media: media.map((m): ProductMedia => ({
      id: m.id as string,
      type: m.media_type as ProductMedia["type"],
      url: m.url as string,
      thumbnailUrl: (m.thumbnail_url as string | null) ?? undefined,
      altText: (m.alt_text as string | null) ?? undefined,
    })),
    createdAt: row.created_at as string,
  };
}

export function productToInsert(p: Omit<Product, "id" | "createdAt">) {
  return {
    slug: p.slug,
    name: p.name,
    short_description: p.shortDescription,
    long_description: p.longDescription ?? null,
    technical_specs: p.technicalSpecs ?? null,
    category_id: p.categoryId,
    brand: p.brand ?? null,
    supplier_url: p.supplierUrl ?? null,
    supplier_price: p.supplierPrice ?? null,
    markup_percentage: p.markupPercentage ?? null,
    current_price: p.currentPrice,
    compare_at_price: p.compareAtPrice ?? null,
    stock_quantity: p.stockQuantity,
    low_stock_threshold: p.lowStockThreshold,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    is_new_arrival: p.isNewArrival,
    has_free_shipping: p.hasFreeShipping,
    warranty_years: p.warrantyYears,
    meta_title: p.metaTitle ?? null,
    meta_description: p.metaDescription ?? null,
  };
}

// ===== Category =====
export function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? undefined,
    parentId: (row.parent_id as string | null) ?? null,
    iconUrl: (row.icon_url as string | null) ?? undefined,
    displayOrder: (row.display_order as number | null) ?? 0,
    isActive: (row.is_active as boolean | null) ?? true,
  };
}
export function categoryToInsert(c: Omit<Category, "id">) {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    parent_id: c.parentId ?? null,
    icon_url: c.iconUrl ?? null,
    display_order: c.displayOrder,
    is_active: c.isActive,
  };
}

// ===== Campaign =====
export function rowToCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    bannerImageUrl: (row.banner_image_url as string | null) ?? undefined,
    coverImageUrl: (row.cover_image_url as string | null) ?? undefined,
    ctaLabel: (row.cta_label as string | null) ?? undefined,
    ctaSecondaryLabel: (row.cta_secondary_label as string | null) ?? undefined,
    ruleType: row.rule_type as CampaignRuleType,
    ruleConfig: (row.rule_config as Record<string, unknown>) ?? {},
    applicableTo: row.applicable_to as Campaign["applicableTo"],
    targetIds: (row.target_ids as string[] | null) ?? [],
    startDate: row.start_date as string,
    endDate: (row.end_date as string | null) ?? undefined,
    isActive: (row.is_active as boolean | null) ?? true,
    displayOnHomepage: (row.display_on_homepage as boolean | null) ?? false,
    displayPriority: (row.display_priority as number | null) ?? 0,
  };
}
export function campaignToInsert(c: Omit<Campaign, "id">) {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description ?? null,
    banner_image_url: c.bannerImageUrl ?? null,
    cover_image_url: c.coverImageUrl ?? null,
    cta_label: c.ctaLabel ?? null,
    cta_secondary_label: c.ctaSecondaryLabel ?? null,
    rule_type: c.ruleType,
    rule_config: c.ruleConfig,
    applicable_to: c.applicableTo,
    target_ids: c.targetIds,
    start_date: c.startDate,
    end_date: c.endDate ?? null,
    is_active: c.isActive,
    display_on_homepage: c.displayOnHomepage,
    display_priority: c.displayPriority,
  };
}

// ===== Offer =====
export function rowToOffer(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    city: row.city as string,
    district: row.district as string,
    installationLocation: row.installation_location as Offer["installationLocation"],
    installationAddress: (row.installation_address as string | null) ?? undefined,
    appliances: (row.appliances_to_run as Offer["appliances"] | null) ?? [],
    detailedDescription: (row.detailed_description as string | null) ?? "",
    phone: row.phone as string,
    email: (row.email as string | null) ?? undefined,
    status: row.status as OfferStatus,
    adminNotes: (row.admin_notes as string | null) ?? undefined,
    adminResponse: (row.admin_response as string | null) ?? undefined,
    respondedAt: (row.responded_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}
export function offerToInsert(o: Omit<Offer, "id" | "status" | "createdAt">) {
  return {
    full_name: o.fullName,
    city: o.city,
    district: o.district,
    installation_location: o.installationLocation,
    installation_address: o.installationAddress ?? null,
    appliances_to_run: o.appliances,
    detailed_description: o.detailedDescription,
    phone: o.phone,
    email: o.email ?? null,
  };
}

// ===== Order =====
export function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    items: row.items as OrderItem[],
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost ?? 0),
    total: Number(row.total),
    discountAmount: Number(row.discount_amount ?? 0),
    appliedCampaignIds: (row.applied_campaigns as string[] | null) ?? [],
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: (row.customer_email as string | null) ?? undefined,
    shippingAddress: row.shipping_address as Order["shippingAddress"],
    status: row.status as OrderStatus,
    paymentMethod: (row.payment_method as Order["paymentMethod"] | null) ?? "whatsapp",
    createdAt: row.created_at as string,
  };
}
export function orderToInsert(o: Omit<Order, "id" | "orderNumber" | "createdAt">, orderNumber: string) {
  return {
    order_number: orderNumber,
    items: o.items,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    total: o.total,
    discount_amount: o.discountAmount,
    applied_campaigns: o.appliedCampaignIds,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail ?? null,
    shipping_address: o.shippingAddress,
    status: o.status,
    payment_method: o.paymentMethod,
  };
}

// ===== Gallery =====
export function rowToGallery(
  row: Record<string, unknown>,
  media: Record<string, unknown>[] = []
): GalleryPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    location: (row.location as string | null) ?? undefined,
    installationDate: (row.installation_date as string | null) ?? undefined,
    systemPowerKw: row.system_power_kw ? Number(row.system_power_kw) : undefined,
    media: media.map((m): ProductMedia => ({
      id: m.id as string,
      type: m.media_type as ProductMedia["type"],
      url: m.url as string,
      thumbnailUrl: (m.thumbnail_url as string | null) ?? undefined,
    })),
    isFeatured: (row.is_featured as boolean | null) ?? false,
    isActive: (row.is_active as boolean | null) ?? true,
    displayOrder: (row.display_order as number | null) ?? 0,
  };
}
export function galleryToInsert(g: Omit<GalleryPost, "id">) {
  return {
    slug: g.slug,
    title: g.title,
    description: g.description ?? null,
    location: g.location ?? null,
    installation_date: g.installationDate ?? null,
    system_power_kw: g.systemPowerKw ?? null,
    is_featured: g.isFeatured,
    is_active: g.isActive,
    display_order: g.displayOrder,
  };
}

// ===== Notification =====
export function rowToNotification(row: Record<string, unknown>): AdminNotification {
  return {
    id: row.id as string,
    type: row.type as AdminNotification["type"],
    title: row.title as string,
    message: (row.message as string | null) ?? "",
    relatedId: (row.related_id as string | null) ?? undefined,
    relatedType: (row.related_type as AdminNotification["relatedType"] | null) ?? undefined,
    isRead: (row.is_read as boolean | null) ?? false,
    createdAt: row.created_at as string,
  };
}

// ===== StockSubscription =====
export function rowToStockSub(row: Record<string, unknown>): StockSubscription {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    email: (row.email as string | null) ?? undefined,
    pushSubscriptionJson: row.push_subscription ? JSON.stringify(row.push_subscription) : undefined,
    isNotified: (row.is_notified as boolean | null) ?? false,
    createdAt: row.created_at as string,
  };
}

// ===== SiteSettings (key-value -> object) =====
export function rowsToSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    contactPhone: (map.get("contact_phone") as string) ?? "",
    contactEmail: (map.get("contact_email") as string) ?? "",
    whatsappNumber: (map.get("whatsapp_number") as string) ?? "",
    address: (map.get("address") as SiteSettings["address"]) ?? { city: "", full: "" },
    socialMedia: (map.get("social_media") as SiteSettings["socialMedia"]) ?? {},
  };
}
