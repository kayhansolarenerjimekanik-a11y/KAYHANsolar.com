import { getDemoStore } from "./demo-store";
import type { Repository } from "./repository";
import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  NotificationType,
  Offer,
  Order,
  Product,
} from "./types";
import type { ProductLabel, ProductLabelColor } from "@/types";

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function nextOrderNumber(orders: Order[]): string {
  const year = new Date().getFullYear();
  const seq = orders.length + 1;
  return `KH-${year}-${String(seq).padStart(6, "0")}`;
}

function attachCustomLabels(p: Product): Product {
  const store = getDemoStore();
  const labelIds = store.productLabelAssignments
    .filter((a) => a.productId === p.id)
    .map((a) => a.labelId);
  return {
    ...p,
    customLabels: store.productLabels.filter((l) => labelIds.includes(l.id)),
  };
}

export const demoRepository: Repository = {
  // ===== Products =====
  async listProducts() {
    return getDemoStore().products.map(attachCustomLabels);
  },
  async getProductById(id) {
    const p = getDemoStore().products.find((p) => p.id === id) ?? null;
    return p ? attachCustomLabels(p) : null;
  },
  async getProductBySlug(slug) {
    const p = getDemoStore().products.find((p) => p.slug === slug) ?? null;
    return p ? attachCustomLabels(p) : null;
  },
  async createProduct(data) {
    const store = getDemoStore();
    const { customLabelIds = [], ...rest } = data;
    const product: Product = {
      ...rest,
      id: genId("p"),
      customLabels: [],
      createdAt: new Date().toISOString(),
    };
    store.products.unshift(product);
    await demoRepository.setProductLabels(product.id, customLabelIds);
    return attachCustomLabels(product);
  },
  async updateProduct(id, data) {
    const store = getDemoStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Product ${id} not found`);
    const prev = store.products[idx];
    const { customLabelIds, ...patch } = data;
    const next = { ...prev, ...patch };

    // Low-stock notification trigger
    if (
      patch.stockQuantity !== undefined &&
      next.stockQuantity > 0 &&
      next.stockQuantity <= next.lowStockThreshold &&
      prev.stockQuantity > prev.lowStockThreshold
    ) {
      await this.pushNotification({
        type: "low_stock",
        title: "Stok Azaldı",
        message: `${next.name} — ${next.stockQuantity} adet kaldı`,
        relatedId: id,
        relatedType: "product",
      });
    }

    store.products[idx] = next;
    if (customLabelIds !== undefined) {
      await demoRepository.setProductLabels(id, customLabelIds);
    }
    return attachCustomLabels(next);
  },
  async deleteProduct(id) {
    const store = getDemoStore();
    store.products = store.products.filter((p) => p.id !== id);
  },

  // ===== Categories =====
  async listCategories(opts = {}) {
    const cats = getDemoStore().categories;
    return opts.onlyActive ? cats.filter((c) => c.isActive) : [...cats];
  },
  async createCategory(data) {
    const store = getDemoStore();
    const category: Category = { ...data, id: genId("cat") };
    store.categories.push(category);
    return category;
  },
  async updateCategory(id, patch) {
    const store = getDemoStore();
    const idx = store.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Category ${id} not found`);
    store.categories[idx] = { ...store.categories[idx], ...patch };
    return store.categories[idx];
  },
  async deleteCategory(id) {
    const store = getDemoStore();
    store.categories = store.categories.filter((c) => c.id !== id);
  },

  // ===== Campaigns =====
  async listCampaigns() {
    return [...getDemoStore().campaigns];
  },
  async getCampaignById(id) {
    return getDemoStore().campaigns.find((c) => c.id === id) ?? null;
  },
  async createCampaign(data) {
    const store = getDemoStore();
    const campaign: Campaign = { ...data, id: genId("c") };
    store.campaigns.push(campaign);
    return campaign;
  },
  async updateCampaign(id, patch) {
    const store = getDemoStore();
    const idx = store.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Campaign ${id} not found`);
    store.campaigns[idx] = { ...store.campaigns[idx], ...patch };
    return store.campaigns[idx];
  },
  async deleteCampaign(id) {
    const store = getDemoStore();
    store.campaigns = store.campaigns.filter((c) => c.id !== id);
  },

  // ===== Offers =====
  async listOffers(status) {
    const all = [...getDemoStore().offers];
    return status ? all.filter((o) => o.status === status) : all;
  },
  async getOfferById(id) {
    return getDemoStore().offers.find((o) => o.id === id) ?? null;
  },
  async createOffer(data) {
    const store = getDemoStore();
    const offer: Offer = {
      ...data,
      id: genId("of"),
      status: "new",
      createdAt: new Date().toISOString(),
    };
    store.offers.unshift(offer);
    await this.pushNotification({
      type: "new_offer",
      title: "Yeni Teklif",
      message: `${offer.fullName} adlı müşteriden teklif`,
      relatedId: offer.id,
      relatedType: "offer",
    });
    return offer;
  },
  async updateOffer(id, patch) {
    const store = getDemoStore();
    const idx = store.offers.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Offer ${id} not found`);
    store.offers[idx] = { ...store.offers[idx], ...patch };
    return store.offers[idx];
  },

  // ===== Orders =====
  async listOrders(status) {
    const all = [...getDemoStore().orders];
    return status ? all.filter((o) => o.status === status) : all;
  },
  async getOrderById(id) {
    return getDemoStore().orders.find((o) => o.id === id) ?? null;
  },
  async createOrder(data) {
    const store = getDemoStore();
    const order: Order = {
      ...data,
      id: genId("or"),
      orderNumber: nextOrderNumber(store.orders),
      createdAt: new Date().toISOString(),
    };
    store.orders.unshift(order);
    try {
      await this.pushNotification({
        type: "new_order",
        title: "Yeni Sipariş",
        message: `${order.orderNumber} — ${order.total.toLocaleString("tr-TR")} ₺`,
        relatedId: order.id,
        relatedType: "order",
      });
    } catch (err) {
      console.error("[orders] pushNotification failed", err);
    }
    return order;
  },
  async updateOrderStatus(id, status) {
    const store = getDemoStore();
    const idx = store.orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Order ${id} not found`);
    store.orders[idx] = { ...store.orders[idx], status };
    return store.orders[idx];
  },

  // ===== Gallery =====
  async listGalleryPosts(opts = {}) {
    const posts = getDemoStore().gallery;
    const list = opts.onlyActive ? posts.filter((g) => g.isActive) : [...posts];
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  },
  async getGalleryPostBySlug(slug) {
    return getDemoStore().gallery.find((g) => g.slug === slug) ?? null;
  },
  async createGalleryPost(data) {
    const store = getDemoStore();
    const post: GalleryPost = { ...data, id: genId("g") };
    store.gallery.unshift(post);
    return post;
  },
  async updateGalleryPost(id, patch) {
    const store = getDemoStore();
    const idx = store.gallery.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Gallery post ${id} not found`);
    store.gallery[idx] = { ...store.gallery[idx], ...patch };
    return store.gallery[idx];
  },
  async deleteGalleryPost(id) {
    const store = getDemoStore();
    store.gallery = store.gallery.filter((g) => g.id !== id);
  },

  // ===== Settings =====
  async getSettings() {
    return { ...getDemoStore().settings };
  },
  async updateSettings(patch) {
    const store = getDemoStore();
    store.settings = { ...store.settings, ...patch };
    return store.settings;
  },

  // ===== Notifications =====
  async listNotifications() {
    return [...getDemoStore().notifications].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  },
  async unreadCount() {
    return getDemoStore().notifications.filter((n) => !n.isRead).length;
  },
  async markNotificationRead(id) {
    const store = getDemoStore();
    const n = store.notifications.find((x) => x.id === id);
    if (n) n.isRead = true;
  },
  async markAllNotificationsRead() {
    const store = getDemoStore();
    store.notifications.forEach((n) => (n.isRead = true));
  },
  async pushNotification(data) {
    const store = getDemoStore();
    const notification: AdminNotification = {
      ...data,
      id: genId("n"),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notification);
    return notification;
  },

  // ===== Stock Subscriptions =====
  async listStockSubscriptions(productId) {
    const all = [...getDemoStore().stockSubscriptions];
    return productId ? all.filter((s) => s.productId === productId) : all;
  },
  async createStockSubscription(data) {
    const store = getDemoStore();
    const subscription = {
      ...data,
      id: genId("ss"),
      isNotified: false,
      createdAt: new Date().toISOString(),
    };
    store.stockSubscriptions.unshift(subscription);
    return subscription;
  },
  async deleteStockSubscription(id) {
    const store = getDemoStore();
    store.stockSubscriptions = store.stockSubscriptions.filter(
      (s) => s.id !== id,
    );
  },
  async markStockSubscriptionNotified(id) {
    const store = getDemoStore();
    const sub = store.stockSubscriptions.find((s) => s.id === id);
    if (sub) sub.isNotified = true;
  },

  // ===== Product Labels =====
  async listProductLabels(): Promise<ProductLabel[]> {
    return [...getDemoStore().productLabels];
  },
  async getProductLabelById(id: string): Promise<ProductLabel | null> {
    return getDemoStore().productLabels.find((l) => l.id === id) ?? null;
  },
  async createProductLabel(data: { name: string; color: ProductLabelColor }): Promise<ProductLabel> {
    const store = getDemoStore();
    const label: ProductLabel = {
      id: `label-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: data.name,
      color: data.color,
      createdAt: new Date().toISOString(),
    };
    store.productLabels.push(label);
    return label;
  },
  async updateProductLabel(
    id: string,
    data: { name?: string; color?: ProductLabelColor },
  ): Promise<ProductLabel> {
    const store = getDemoStore();
    const idx = store.productLabels.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error("Etiket bulunamadı");
    const updated: ProductLabel = {
      ...store.productLabels[idx],
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    };
    store.productLabels[idx] = updated;
    return updated;
  },
  async deleteProductLabel(id: string): Promise<void> {
    const store = getDemoStore();
    store.productLabels = store.productLabels.filter((l) => l.id !== id);
    store.productLabelAssignments = store.productLabelAssignments.filter(
      (a) => a.labelId !== id,
    );
  },
  async setProductLabels(productId: string, labelIds: string[]): Promise<void> {
    const store = getDemoStore();
    store.productLabelAssignments = store.productLabelAssignments.filter(
      (a) => a.productId !== productId,
    );
    for (const labelId of labelIds) {
      store.productLabelAssignments.push({ productId, labelId });
    }
  },
};

// Re-export type so consumers can avoid importing both files
export type { NotificationType };
