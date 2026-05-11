import "server-only";

import * as Campaigns from "./supabase/campaigns";
import * as Categories from "./supabase/categories";
import * as Gallery from "./supabase/gallery";
import * as Notifications from "./supabase/notifications";
import * as Offers from "./supabase/offers";
import * as Orders from "./supabase/orders";
import * as Products from "./supabase/products";
import * as Settings from "./supabase/settings";
import * as StockSubs from "./supabase/stock-subscriptions";

import type { Repository } from "./repository";

const notImpl = (name: string) => () => {
  throw new Error(`supabaseRepository.${name} not yet implemented`);
};

export const supabaseRepository: Repository = {
  // Products
  listProducts: Products.listProducts,
  getProductById: Products.getProductById,
  getProductBySlug: Products.getProductBySlug,
  createProduct: notImpl("createProduct") as Repository["createProduct"],
  updateProduct: notImpl("updateProduct") as Repository["updateProduct"],
  deleteProduct: notImpl("deleteProduct") as Repository["deleteProduct"],
  // Categories
  listCategories: Categories.listCategories,
  createCategory: notImpl("createCategory") as Repository["createCategory"],
  updateCategory: notImpl("updateCategory") as Repository["updateCategory"],
  deleteCategory: notImpl("deleteCategory") as Repository["deleteCategory"],
  // Campaigns
  listCampaigns: Campaigns.listCampaigns,
  getCampaignById: Campaigns.getCampaignById,
  createCampaign: notImpl("createCampaign") as Repository["createCampaign"],
  updateCampaign: notImpl("updateCampaign") as Repository["updateCampaign"],
  deleteCampaign: notImpl("deleteCampaign") as Repository["deleteCampaign"],
  // Offers
  listOffers: Offers.listOffers,
  getOfferById: Offers.getOfferById,
  createOffer: notImpl("createOffer") as Repository["createOffer"],
  updateOffer: notImpl("updateOffer") as Repository["updateOffer"],
  // Orders
  listOrders: Orders.listOrders,
  getOrderById: Orders.getOrderById,
  createOrder: notImpl("createOrder") as Repository["createOrder"],
  updateOrderStatus: notImpl("updateOrderStatus") as Repository["updateOrderStatus"],
  // Gallery
  listGalleryPosts: Gallery.listGalleryPosts,
  getGalleryPostBySlug: Gallery.getGalleryPostBySlug,
  createGalleryPost: notImpl("createGalleryPost") as Repository["createGalleryPost"],
  updateGalleryPost: notImpl("updateGalleryPost") as Repository["updateGalleryPost"],
  deleteGalleryPost: notImpl("deleteGalleryPost") as Repository["deleteGalleryPost"],
  // Settings
  getSettings: Settings.getSettings,
  updateSettings: notImpl("updateSettings") as Repository["updateSettings"],
  // Notifications
  listNotifications: Notifications.listNotifications,
  unreadCount: Notifications.unreadCount,
  markNotificationRead: notImpl("markNotificationRead") as Repository["markNotificationRead"],
  markAllNotificationsRead: notImpl("markAllNotificationsRead") as Repository["markAllNotificationsRead"],
  pushNotification: notImpl("pushNotification") as Repository["pushNotification"],
  // Stock subs
  listStockSubscriptions: StockSubs.listStockSubscriptions,
  createStockSubscription: notImpl("createStockSubscription") as Repository["createStockSubscription"],
  deleteStockSubscription: notImpl("deleteStockSubscription") as Repository["deleteStockSubscription"],
  markStockSubscriptionNotified: notImpl("markStockSubscriptionNotified") as Repository["markStockSubscriptionNotified"],
};
