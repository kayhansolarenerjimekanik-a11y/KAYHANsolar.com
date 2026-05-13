import "server-only";

import * as Campaigns from "./supabase/campaigns";
import * as Categories from "./supabase/categories";
import * as Gallery from "./supabase/gallery";
import * as Labels from "./supabase/labels";
import * as Notifications from "./supabase/notifications";
import * as Offers from "./supabase/offers";
import * as Orders from "./supabase/orders";
import * as Products from "./supabase/products";
import * as Settings from "./supabase/settings";
import * as StockSubs from "./supabase/stock-subscriptions";

import type { Repository } from "./repository";

export const supabaseRepository: Repository = {
  listProducts: Products.listProducts,
  getProductById: Products.getProductById,
  getProductBySlug: Products.getProductBySlug,
  createProduct: Products.createProduct,
  updateProduct: Products.updateProduct,
  deleteProduct: Products.deleteProduct,
  listCategories: Categories.listCategories,
  createCategory: Categories.createCategory,
  updateCategory: Categories.updateCategory,
  deleteCategory: Categories.deleteCategory,
  listCampaigns: Campaigns.listCampaigns,
  getCampaignById: Campaigns.getCampaignById,
  createCampaign: Campaigns.createCampaign,
  updateCampaign: Campaigns.updateCampaign,
  deleteCampaign: Campaigns.deleteCampaign,
  listOffers: Offers.listOffers,
  getOfferById: Offers.getOfferById,
  createOffer: Offers.createOffer,
  updateOffer: Offers.updateOffer,
  listOrders: Orders.listOrders,
  getOrderById: Orders.getOrderById,
  createOrder: Orders.createOrder,
  updateOrderStatus: Orders.updateOrderStatus,
  listGalleryPosts: Gallery.listGalleryPosts,
  getGalleryPostBySlug: Gallery.getGalleryPostBySlug,
  createGalleryPost: Gallery.createGalleryPost,
  updateGalleryPost: Gallery.updateGalleryPost,
  deleteGalleryPost: Gallery.deleteGalleryPost,
  getSettings: Settings.getSettings,
  updateSettings: Settings.updateSettings,
  listNotifications: Notifications.listNotifications,
  unreadCount: Notifications.unreadCount,
  markNotificationRead: Notifications.markNotificationRead,
  markAllNotificationsRead: Notifications.markAllNotificationsRead,
  pushNotification: Notifications.pushNotification,
  listStockSubscriptions: StockSubs.listStockSubscriptions,
  createStockSubscription: StockSubs.createStockSubscription,
  deleteStockSubscription: StockSubs.deleteStockSubscription,
  markStockSubscriptionNotified: StockSubs.markStockSubscriptionNotified,
  listProductLabels: Labels.listProductLabels,
  getProductLabelById: Labels.getProductLabelById,
  createProductLabel: Labels.createProductLabel,
  updateProductLabel: Labels.updateProductLabel,
  deleteProductLabel: Labels.deleteProductLabel,
  setProductLabels: Labels.setProductLabels,
};
