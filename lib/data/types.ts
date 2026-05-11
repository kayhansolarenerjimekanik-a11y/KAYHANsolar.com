import type { OfferRequest, Product, Category, Campaign, GalleryPost, SiteSettings } from "@/types";

export type OfferStatus = "new" | "in_review" | "responded" | "closed";

export interface Offer extends OfferRequest {
  id: string;
  status: OfferStatus;
  adminNotes?: string;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "whatsapp_sent"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    city: string;
    district: string;
    detailedAddress: string;
  };
  status: OrderStatus;
  paymentMethod: "whatsapp" | "iyzico" | "bank_transfer";
  createdAt: string;
}

export type NotificationType =
  | "new_offer"
  | "new_order"
  | "low_stock"
  | "supplier_price_up"
  | "supplier_price_down"
  | "product_unavailable"
  | "system";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "offer" | "order" | "product";
  isRead: boolean;
  createdAt: string;
}

export type { Product, Category, Campaign, GalleryPost, SiteSettings };
