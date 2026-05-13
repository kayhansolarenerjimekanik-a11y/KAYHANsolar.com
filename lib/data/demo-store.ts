import {
  mockCampaigns,
  mockCategories,
  mockGallery,
  mockProductLabels,
  mockProducts,
  mockSiteSettings,
} from "@/lib/mock/data";

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
import type { ProductLabel } from "@/types";

// Seed offers for admin demo
const seedOffers: Offer[] = [
  {
    id: "of-1",
    fullName: "Ahmet Yılmaz",
    city: "Diyarbakır",
    district: "Sur",
    installationLocation: "roof",
    installationAddress: "Müstakil ev çatısı, güneye bakıyor",
    appliances: [
      { name: "Buzdolabı", powerW: 150 },
      { name: "Klima 12000 BTU", powerW: 1200 },
      { name: "Çamaşır makinesi", powerW: 2000 },
    ],
    detailedDescription:
      "Aylık ortalama 450 kWh elektrik tüketimimiz var. Çatımız 80 m2, güney cepheli. Şebeke bağlantımız mevcut, mahsuplaşma yapmak istiyoruz.",
    phone: "+90 555 111 22 33",
    email: "ahmet@example.com",
    status: "new",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "of-2",
    fullName: "Fatma Kaya",
    city: "Mardin",
    district: "Midyat",
    installationLocation: "land",
    installationAddress: "5 dönüm arazi, sulama amaçlı",
    appliances: [{ name: "Sulama pompası 3kW", powerW: 3000 }],
    detailedDescription:
      "Tarımsal sulama için bağımsız bir sistem istiyoruz. Şebeke uzak, çekmek pahalı.",
    phone: "+90 555 222 33 44",
    status: "in_review",
    adminNotes: "20 panel + 10 kW off-grid inverter hesaplandı. Fiyat hazırlanıyor.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "of-3",
    fullName: "Mehmet Demir",
    city: "Batman",
    district: "Merkez",
    installationLocation: "roof",
    installationAddress: "Villa çatısı",
    appliances: [],
    detailedDescription: "15 kW hibrit sistem fiyat sorgusu.",
    phone: "+90 555 333 44 55",
    status: "responded",
    adminResponse:
      "Sayın Mehmet Bey, 15 kW hibrit sistem için detaylı teklifimiz WhatsApp üzerinden gönderildi.",
    respondedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

const seedOrders: Order[] = [
  {
    id: "or-1",
    orderNumber: "KH-2026-000001",
    items: [
      {
        productId: "p-1",
        name: "Jinko 550W Monokristal Solar Panel",
        brand: "Jinko Solar",
        price: 3450,
        quantity: 4,
      },
    ],
    subtotal: 13800,
    shippingCost: 500,
    total: 14300,
    discountAmount: 0,
    appliedCampaignIds: [],
    customerName: "Hasan Öztürk",
    customerPhone: "+90 555 444 55 66",
    customerEmail: "hasan@example.com",
    shippingAddress: {
      city: "Şanlıurfa",
      district: "Haliliye",
      detailedAddress: "Örnek Mah. Örnek Sok. No: 5",
    },
    status: "whatsapp_sent",
    paymentMethod: "whatsapp",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

const seedNotifications: AdminNotification[] = [
  {
    id: "n-1",
    type: "new_offer",
    title: "Yeni Teklif",
    message: "Ahmet Yılmaz adlı müşteriden çatı kurulumu teklifi",
    relatedId: "of-1",
    relatedType: "offer",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "n-2",
    type: "new_order",
    title: "Yeni Sipariş",
    message: "KH-2026-000001 — 14.300 ₺",
    relatedId: "or-1",
    relatedType: "order",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "n-3",
    type: "low_stock",
    title: "Stok Azaldı",
    message: "Tam Sinüs İnverter 3000W — 2 adet kaldı",
    relatedId: "p-3",
    relatedType: "product",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];

const seedStockSubscriptions: StockSubscription[] = [
  {
    id: "ss-1",
    productId: "p-5", // Solar Sokak Lambası — stockQuantity 0 in seed
    email: "musteri@example.com",
    isNotified: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

// Singleton — survives across requests within a single server process.
// In serverless production with multiple instances, state isn't shared;
// this is acceptable for demo mode and goes away when Supabase ships.
declare global {
  var __kayhanDemoStore: DemoStore | undefined;
}

export interface DemoStore {
  products: Product[];
  categories: Category[];
  campaigns: Campaign[];
  gallery: GalleryPost[];
  offers: Offer[];
  orders: Order[];
  notifications: AdminNotification[];
  settings: SiteSettings;
  stockSubscriptions: StockSubscription[];
  productLabels: ProductLabel[];
  productLabelAssignments: Array<{ productId: string; labelId: string }>;
}

function freshStore(): DemoStore {
  return {
    products: structuredClone(mockProducts) as Product[],
    categories: structuredClone(mockCategories) as Category[],
    campaigns: structuredClone(mockCampaigns) as Campaign[],
    gallery: structuredClone(mockGallery) as GalleryPost[],
    offers: structuredClone(seedOffers),
    orders: structuredClone(seedOrders),
    notifications: structuredClone(seedNotifications),
    settings: structuredClone(mockSiteSettings) as SiteSettings,
    stockSubscriptions: structuredClone(seedStockSubscriptions),
    productLabels: structuredClone(mockProductLabels) as ProductLabel[],
    productLabelAssignments: [
      { productId: "p-1", labelId: "label-yilbasi" },
      { productId: "p-2", labelId: "label-yeni-sezon" },
      { productId: "p-2", labelId: "label-sinirli-stok" },
    ],
  };
}

export function getDemoStore(): DemoStore {
  if (!globalThis.__kayhanDemoStore) {
    globalThis.__kayhanDemoStore = freshStore();
  }
  return globalThis.__kayhanDemoStore;
}

export function resetDemoStore(): void {
  globalThis.__kayhanDemoStore = freshStore();
}
