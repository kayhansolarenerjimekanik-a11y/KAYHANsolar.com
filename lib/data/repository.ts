import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  Offer,
  OfferStatus,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
  StockSubscription,
} from "./types";

export interface Repository {
  // Products
  listProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getProductBySlug(slug: string): Promise<Product | null>;
  createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product>;
  updateProduct(id: string, patch: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Categories
  listCategories(opts?: { onlyActive?: boolean }): Promise<Category[]>;
  createCategory(data: Omit<Category, "id">): Promise<Category>;
  updateCategory(id: string, patch: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Campaigns
  listCampaigns(): Promise<Campaign[]>;
  getCampaignById(id: string): Promise<Campaign | null>;
  createCampaign(data: Omit<Campaign, "id">): Promise<Campaign>;
  updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;

  // Offers
  listOffers(status?: OfferStatus): Promise<Offer[]>;
  getOfferById(id: string): Promise<Offer | null>;
  createOffer(data: Omit<Offer, "id" | "status" | "createdAt">): Promise<Offer>;
  updateOffer(id: string, patch: Partial<Offer>): Promise<Offer>;

  // Orders
  listOrders(status?: OrderStatus): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  createOrder(data: Omit<Order, "id" | "orderNumber" | "createdAt">): Promise<Order>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;

  // Gallery
  listGalleryPosts(opts?: { onlyActive?: boolean }): Promise<GalleryPost[]>;
  getGalleryPostBySlug(slug: string): Promise<GalleryPost | null>;
  createGalleryPost(data: Omit<GalleryPost, "id">): Promise<GalleryPost>;
  updateGalleryPost(id: string, patch: Partial<GalleryPost>): Promise<GalleryPost>;
  deleteGalleryPost(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<SiteSettings>;
  updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;

  // Notifications
  listNotifications(): Promise<AdminNotification[]>;
  unreadCount(): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  pushNotification(data: Omit<AdminNotification, "id" | "isRead" | "createdAt">): Promise<AdminNotification>;

  // Stock subscriptions
  listStockSubscriptions(productId?: string): Promise<StockSubscription[]>;
  createStockSubscription(
    data: Omit<StockSubscription, "id" | "isNotified" | "createdAt">,
  ): Promise<StockSubscription>;
  deleteStockSubscription(id: string): Promise<void>;
  markStockSubscriptionNotified(id: string): Promise<void>;
}
