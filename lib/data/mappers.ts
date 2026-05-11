import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  Offer,
  Order,
  Product,
  SiteSettings,
  StockSubscription,
} from "./types";

// ===== Product =====
export function rowToProduct(row: Record<string, any>, media: Record<string, any>[] = []): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description ?? "",
    longDescription: row.long_description ?? undefined,
    technicalSpecs: row.technical_specs ?? undefined,
    categoryId: row.category_id,
    brand: row.brand ?? undefined,
    supplierUrl: row.supplier_url ?? undefined,
    supplierPrice: row.supplier_price ? Number(row.supplier_price) : undefined,
    markupPercentage: row.markup_percentage ? Number(row.markup_percentage) : undefined,
    currentPrice: Number(row.current_price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 3,
    badges: row.badges ?? [],
    isActive: row.is_active ?? true,
    isFeatured: row.is_featured ?? false,
    isNewArrival: row.is_new_arrival ?? false,
    media: media.map((m) => ({
      id: m.id,
      type: m.media_type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url ?? undefined,
      altText: m.alt_text ?? undefined,
    })),
    createdAt: row.created_at,
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
    badges: p.badges,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    is_new_arrival: p.isNewArrival,
  };
}

// ===== Category =====
export function rowToCategory(row: Record<string, any>): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? null,
    iconUrl: row.icon_url ?? undefined,
    displayOrder: row.display_order ?? 0,
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
  };
}

// ===== Campaign =====
export function rowToCampaign(row: Record<string, any>): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    bannerImageUrl: row.banner_image_url ?? undefined,
    ruleType: row.rule_type,
    ruleConfig: row.rule_config,
    applicableTo: row.applicable_to,
    targetIds: row.target_ids ?? [],
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active ?? true,
    displayOnHomepage: row.display_on_homepage ?? false,
    displayPriority: row.display_priority ?? 0,
  };
}
export function campaignToInsert(c: Omit<Campaign, "id">) {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description ?? null,
    banner_image_url: c.bannerImageUrl ?? null,
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
export function rowToOffer(row: Record<string, any>): Offer {
  return {
    id: row.id,
    fullName: row.full_name,
    city: row.city,
    district: row.district,
    installationLocation: row.installation_location,
    installationAddress: row.installation_address ?? undefined,
    appliances: row.appliances_to_run ?? [],
    detailedDescription: row.detailed_description ?? "",
    phone: row.phone,
    email: row.email ?? undefined,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    adminResponse: row.admin_response ?? undefined,
    respondedAt: row.responded_at ?? undefined,
    createdAt: row.created_at,
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
export function rowToOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    items: row.items,
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost ?? 0),
    total: Number(row.total),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email ?? undefined,
    shippingAddress: row.shipping_address,
    status: row.status,
    paymentMethod: row.payment_method ?? "whatsapp",
    createdAt: row.created_at,
  };
}
export function orderToInsert(o: Omit<Order, "id" | "orderNumber" | "createdAt">, orderNumber: string) {
  return {
    order_number: orderNumber,
    items: o.items,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    total: o.total,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail ?? null,
    shipping_address: o.shippingAddress,
    status: o.status,
    payment_method: o.paymentMethod,
  };
}

// ===== Gallery =====
export function rowToGallery(row: Record<string, any>, media: Record<string, any>[] = []): GalleryPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    installationDate: row.installation_date ?? undefined,
    systemPowerKw: row.system_power_kw ? Number(row.system_power_kw) : undefined,
    media: media.map((m) => ({
      id: m.id,
      type: m.media_type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url ?? undefined,
    })),
    isFeatured: row.is_featured ?? false,
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
  };
}

// ===== Notification =====
export function rowToNotification(row: Record<string, any>): AdminNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message ?? "",
    relatedId: row.related_id ?? undefined,
    relatedType: row.related_type ?? undefined,
    isRead: row.is_read ?? false,
    createdAt: row.created_at,
  };
}

// ===== StockSubscription =====
export function rowToStockSub(row: Record<string, any>): StockSubscription {
  return {
    id: row.id,
    productId: row.product_id,
    email: row.email ?? undefined,
    pushSubscriptionJson: row.push_subscription ? JSON.stringify(row.push_subscription) : undefined,
    isNotified: row.is_notified ?? false,
    createdAt: row.created_at,
  };
}

// ===== SiteSettings (key-value -> object) =====
export function rowsToSettings(rows: { key: string; value: any }[]): SiteSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    contactPhone: map.get("contact_phone") ?? "",
    contactEmail: map.get("contact_email") ?? "",
    whatsappNumber: map.get("whatsapp_number") ?? "",
    address: map.get("address") ?? { city: "", full: "" },
    socialMedia: map.get("social_media") ?? {},
  };
}
