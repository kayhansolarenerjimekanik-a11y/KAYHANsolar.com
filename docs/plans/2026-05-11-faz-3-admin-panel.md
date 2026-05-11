# Faz 3 — Admin Kontrol Paneli + Demo Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hidden admin control panel at `/kayhan-yonetim` with full CRUD over products, categories, campaigns, offers, orders, gallery, and site settings — backed by a swappable data layer that starts as in-memory demo and flips to Supabase via a single env flag when API keys arrive.

**Architecture:**
- **Auth abstraction** (`lib/auth/`) — interface with `demo-provider` (HMAC-signed HttpOnly cookie, env credentials) and a future `supabase-provider` stub. Switched by `AUTH_MODE=demo|supabase` env var.
- **Repository abstraction** (`lib/data/`) — interface with `demo-repository` (in-memory singleton seeded from existing mock data) and a future `supabase-repository` stub. Switched by `DATA_MODE=demo|supabase`.
- **Route protection** via Next 16's `proxy.ts` (the renamed `middleware.ts`) that gates `/kayhan-yonetim/*` except `/giris`.
- **Mutations** via Next.js Server Actions; cache invalidation via `revalidatePath`.
- **Notifications** kept in the repository; admin UI polls every 30s. Will become Supabase Realtime when API keys arrive (drop-in replacement at the hook layer).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, React Hook Form + Zod, Sonner (toasts), Web Crypto API for cookie HMAC. No new heavy dependencies.

**Master plan reference:** §6.10 (Admin), §9 (Sync strategy), §12 (Auth & Security).

---

## Sub-Phase Breakdown

Execute in order. Each sub-phase is a deployable checkpoint.

| Sub-phase | Tasks | Outcome |
|---|---|---|
| **3A — Foundation** | 1–15 | Env, repository, auth, proxy, login, admin shell, dashboard, notification poller. |
| **3B — Catalog Management** | 16–22 | Products, categories, campaigns fully editable from admin. |
| **3C — Operations** | 23–29 | Offers (with calculator), orders, gallery, site settings, user view. |
| **3D — Polish + Verify** | 30–32 | AI/Analytics placeholders, end-to-end verification, written report. |

---

## File Structure

### New files (created in this plan)

```
docs/plans/2026-05-11-faz-3-admin-panel.md        (this file)

lib/auth/
  session.ts                  HMAC sign/verify for cookie payload
  cookies.ts                  Cookie name + helpers
  provider.ts                 AuthProvider interface
  demo-provider.ts            Demo auth (env credentials)
  index.ts                    Provider factory + getSession/requireAdmin

lib/data/
  types.ts                    Offer + Order types (extends existing types)
  repository.ts               Repository interface
  demo-store.ts               In-memory singleton + seed
  demo-repository.ts          Repository impl over demo-store
  notifications.ts            Notification types + helpers (used by repository)
  index.ts                    Repository factory

lib/validations/
  product.ts                  Zod schemas for product CRUD
  category.ts
  campaign.ts
  offer.ts
  gallery.ts
  settings.ts
  auth.ts

proxy.ts                      Next 16 middleware (renamed) — auth gate

app/(admin)/kayhan-yonetim/
  layout.tsx                  Auth check + admin shell
  page.tsx                    Dashboard
  giris/page.tsx              Login form
  cikis/route.ts              Sign-out route
  bildirimler/page.tsx        Notification inbox
  urunler/page.tsx            Product list
  urunler/yeni/page.tsx       Create product
  urunler/[id]/page.tsx       Edit product
  kategoriler/page.tsx        Category management
  kampanyalar/page.tsx        Campaign list
  kampanyalar/yeni/page.tsx
  kampanyalar/[id]/page.tsx
  teklifler/page.tsx          Offer list with tabs
  teklifler/[id]/page.tsx     Offer detail + calculator
  siparisler/page.tsx         Order list
  galeri/page.tsx             Gallery management
  galeri/yeni/page.tsx
  ayarlar/page.tsx            Site settings form
  kullanicilar/page.tsx       Users (demo: admin only)
  ai-egitim/page.tsx          Faz 5 placeholder
  analitik/page.tsx           Faz 5 placeholder
  actions/auth.ts             signIn/signOut server actions
  actions/products.ts
  actions/categories.ts
  actions/campaigns.ts
  actions/offers.ts
  actions/gallery.ts
  actions/settings.ts
  actions/notifications.ts

components/admin/
  sidebar.tsx
  topbar.tsx
  notification-bell.tsx       Client poller
  kpi-card.tsx
  data-table.tsx              Generic responsive table
  empty-state.tsx
  delete-confirm.tsx          Inline confirmation pattern
  product-form.tsx
  category-form.tsx
  campaign-form.tsx
  campaign-rule-editor.tsx
  offer-status-pill.tsx
  offer-calculator.tsx
  gallery-form.tsx
  settings-form.tsx
  media-uploader.tsx          Demo: paste URL (no real upload yet)

components/ui/
  input.tsx
  textarea.tsx
  label.tsx
  switch.tsx
  select.tsx
  badge.tsx
  table.tsx
```

### Modified files

```
.env.local                     Add AUTH_MODE, DATA_MODE, secrets, demo creds
.env.local.example             Documented template
app/(public)/magaza/page.tsx   Read from repository (instead of mockProducts)
components/shop/shop-view.tsx  Receive products as props instead of import
app/(public)/urun/[slug]/page.tsx   Repository read + revalidate
components/home/featured-products.tsx   Repository read
components/home/category-grid.tsx       Repository read
components/home/campaign-strip.tsx      Repository read
app/(public)/galeri/page.tsx   Repository read
lib/mock/data.ts               Kept as initial seed source only
```

---

## Conventions Used in This Plan

- **No automated tests** — master plan §3.9 explicitly chose manual verification over unit tests for this project. Each task ends with a **Manual Verification** step (browser walkthrough or build check) followed by a commit.
- **Commit cadence** — one commit per task. Commit message format: `feat(admin): <what>` for new admin features, `feat(data): <what>` for repository layer, `feat(auth): <what>` for auth.
- **Imports** — always alias-based (`@/lib/...`, `@/components/...`).
- **Server vs Client** — server components by default. Mark client components with `"use client"` only when interactivity is needed.
- **Cyber lime palette** — use the semantic tokens already defined (`bg-surface`, `text-foreground`, `border`, `bg-lime-primary`). Never hardcode hex.

---

# Sub-Phase 3A — Foundation

Outcome at the end of 3A: A working admin shell. You can navigate to `/kayhan-yonetim`, get redirected to `/kayhan-yonetim/giris`, sign in with demo credentials, see a dashboard with KPI cards. Public site continues to work, now reading through the repository layer.

---

### Task 1: Env vars + feature flags

**Files:**
- Create: `.env.local`
- Create: `.env.local.example`

- [ ] **Step 1: Write `.env.local.example` with documented defaults**

```bash
# === KAYHAN Solar env template ===
# Copy this file to .env.local and fill values.

# Auth mode: 'demo' uses local credentials below; 'supabase' uses Supabase Auth.
AUTH_MODE=demo

# Data mode: 'demo' uses in-memory store seeded from lib/mock; 'supabase' uses Supabase.
DATA_MODE=demo

# Demo admin credentials (only used when AUTH_MODE=demo)
DEMO_ADMIN_EMAIL=admin@kayhansolar.com
DEMO_ADMIN_PASSWORD=kayhan2026

# HMAC secret for session cookie signing. Generate with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
AUTH_SECRET=replace-me-with-48-bytes-of-base64

# Supabase (filled later when keys arrive)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Write `.env.local` with working demo values**

```bash
AUTH_MODE=demo
DATA_MODE=demo
DEMO_ADMIN_EMAIL=admin@kayhansolar.com
DEMO_ADMIN_PASSWORD=kayhan2026
AUTH_SECRET=local-dev-secret-do-not-use-in-prod-replace-on-deploy-aaaaaaaa
```

- [ ] **Step 3: Add `.env.local` to `.gitignore` (verify already present)**

Run: `grep -E '^\.env\.local$' .gitignore`
Expected: matches `.env.local` (Next.js's create-next-app already adds this).
If missing, append it.

- [ ] **Step 4: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "feat(config): add env template for demo auth + data modes"
```

> **Note:** `.env.local` itself is gitignored and must NOT be committed.

---

### Task 2: Repository types + interface

**Files:**
- Create: `lib/data/types.ts`
- Create: `lib/data/repository.ts`

- [ ] **Step 1: Write `lib/data/types.ts`**

```typescript
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
```

- [ ] **Step 2: Write `lib/data/repository.ts`**

```typescript
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
  listCategories(): Promise<Category[]>;
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
  listGalleryPosts(): Promise<GalleryPost[]>;
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
}
```

- [ ] **Step 3: Manual verification — type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors (no implementation yet, but interface compiles).

- [ ] **Step 4: Commit**

```bash
git add lib/data/types.ts lib/data/repository.ts
git commit -m "feat(data): add repository interface and admin entity types"
```

---

### Task 3: Demo in-memory store with seed

**Files:**
- Create: `lib/data/demo-store.ts`

- [ ] **Step 1: Write `lib/data/demo-store.ts`**

```typescript
import {
  mockCampaigns,
  mockCategories,
  mockGallery,
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
} from "./types";

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

// Singleton — survives across requests within a single server process.
// In serverless production with multiple instances, state isn't shared;
// this is acceptable for demo mode and goes away when Supabase ships.
declare global {
  // eslint-disable-next-line no-var
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
```

- [ ] **Step 2: Verify type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data/demo-store.ts
git commit -m "feat(data): seed demo store with products, offers, orders, notifications"
```

---

### Task 4: Demo repository implementation

**Files:**
- Create: `lib/data/demo-repository.ts`

- [ ] **Step 1: Write `lib/data/demo-repository.ts`**

```typescript
import { getDemoStore } from "./demo-store";
import type { Repository } from "./repository";
import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  NotificationType,
  Offer,
  OfferStatus,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
} from "./types";

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

export const demoRepository: Repository = {
  // ===== Products =====
  async listProducts() {
    return [...getDemoStore().products];
  },
  async getProductById(id) {
    return getDemoStore().products.find((p) => p.id === id) ?? null;
  },
  async getProductBySlug(slug) {
    return getDemoStore().products.find((p) => p.slug === slug) ?? null;
  },
  async createProduct(data) {
    const store = getDemoStore();
    const product: Product = {
      ...data,
      id: genId("p"),
      createdAt: new Date().toISOString(),
    };
    store.products.unshift(product);
    return product;
  },
  async updateProduct(id, patch) {
    const store = getDemoStore();
    const idx = store.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Product ${id} not found`);
    const prev = store.products[idx];
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
    return next;
  },
  async deleteProduct(id) {
    const store = getDemoStore();
    store.products = store.products.filter((p) => p.id !== id);
  },

  // ===== Categories =====
  async listCategories() {
    return [...getDemoStore().categories];
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
    await this.pushNotification({
      type: "new_order",
      title: "Yeni Sipariş",
      message: `${order.orderNumber} — ${order.total.toLocaleString("tr-TR")} ₺`,
      relatedId: order.id,
      relatedType: "order",
    });
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
  async listGalleryPosts() {
    return [...getDemoStore().gallery];
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
};

// Re-export type so consumers can avoid importing both files
export type { NotificationType };
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data/demo-repository.ts
git commit -m "feat(data): implement demo in-memory repository over store"
```

---

### Task 5: Repository factory + supabase stub

**Files:**
- Create: `lib/data/index.ts`
- Create: `lib/data/supabase-repository.ts`

- [ ] **Step 1: Write `lib/data/supabase-repository.ts` (stub)**

```typescript
import type { Repository } from "./repository";

const notImplemented = () => {
  throw new Error(
    "Supabase repository is not yet implemented. Set DATA_MODE=demo or configure Supabase keys.",
  );
};

export const supabaseRepository: Repository = new Proxy({} as Repository, {
  get() {
    return notImplemented;
  },
});
```

- [ ] **Step 2: Write `lib/data/index.ts` (factory)**

```typescript
import { demoRepository } from "./demo-repository";
import type { Repository } from "./repository";
import { supabaseRepository } from "./supabase-repository";

function pickRepository(): Repository {
  const mode = process.env.DATA_MODE ?? "demo";
  if (mode === "supabase") return supabaseRepository;
  return demoRepository;
}

export const repo: Repository = pickRepository();

export type { Repository };
export * from "./types";
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/data/index.ts lib/data/supabase-repository.ts
git commit -m "feat(data): add repository factory with supabase stub"
```

---

### Task 6: Migrate public site to repository

**Files:**
- Modify: `components/home/featured-products.tsx`
- Modify: `components/home/category-grid.tsx`
- Modify: `components/home/campaign-strip.tsx`
- Modify: `app/(public)/galeri/page.tsx`
- Modify: `app/(public)/urun/[slug]/page.tsx`
- Modify: `components/shop/shop-view.tsx` (accept props)
- Modify: `app/(public)/magaza/page.tsx` (fetch + pass props)
- Modify: `components/layout/footer.tsx` (read settings via repo)

- [ ] **Step 1: Convert `components/home/featured-products.tsx` to async server component**

Replace import `import { mockProducts } from "@/lib/mock/data";` with `import { repo } from "@/lib/data";` and make the component async:

```typescript
export async function FeaturedProducts() {
  const all = await repo.listProducts();
  const featured = all.filter((p) => p.isFeatured).slice(0, 8);
  // ... rest stays the same
}
```

- [ ] **Step 2: Convert `components/home/category-grid.tsx` similarly**

```typescript
import { repo } from "@/lib/data";
// ...
export async function CategoryGrid() {
  const categories = await repo.listCategories();
  // ... rest unchanged; pass categories instead of mockCategories
}
```

- [ ] **Step 3: Convert `components/home/campaign-strip.tsx`**

```typescript
import { repo } from "@/lib/data";
// ...
export async function CampaignStrip() {
  const all = await repo.listCampaigns();
  const active = all.filter((c) => c.isActive && c.displayOnHomepage);
  if (active.length === 0) return null;
  // ... rest unchanged
}
```

- [ ] **Step 4: Convert `app/(public)/galeri/page.tsx`**

Replace `import { mockGallery } from "@/lib/mock/data";` with:

```typescript
import { repo } from "@/lib/data";

export default async function GalleryPage() {
  const posts = await repo.listGalleryPosts();
  // ... use `posts` instead of `mockGallery`
}
```

- [ ] **Step 5: Convert `app/(public)/urun/[slug]/page.tsx`**

Replace `getProductBySlug` and `getCategoryById` calls with repository calls. Also update `generateStaticParams` to use repo:

```typescript
import { repo } from "@/lib/data";
// remove: import { getCategoryById, getProductBySlug, mockProducts } from "@/lib/mock/data";

export async function generateStaticParams() {
  const products = await repo.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  return { title: product.name, description: product.shortDescription };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) notFound();
  const categories = await repo.listCategories();
  const category = categories.find((c) => c.id === product.categoryId);
  const allProducts = await repo.listProducts();
  const related = allProducts
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId && p.isActive)
    .slice(0, 4);
  // ... rest unchanged
}
```

- [ ] **Step 6: Convert `components/shop/shop-view.tsx` to accept props**

At the top:

```typescript
import type { Category, Product } from "@/types";

interface ShopViewProps {
  products: Product[];
  categories: Category[];
}

export function ShopView({ products, categories }: ShopViewProps) {
  // remove: import { mockCategories, mockProducts } from "@/lib/mock/data";
  // replace all `mockProducts` → `products`
  // replace all `mockCategories` → `categories`
  // ... rest unchanged
}
```

- [ ] **Step 7: Update `app/(public)/magaza/page.tsx`**

```typescript
import type { Metadata } from "next";
import { Suspense } from "react";

import { ShopView } from "@/components/shop/shop-view";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Mağaza",
  description: "Güneş panelleri, bataryalar, inverterler, aydınlatma ve paket sistemler.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
  ]);
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopView products={products} categories={categories} />
    </Suspense>
  );
}

function ShopFallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-8 w-32 animate-pulse rounded-md bg-elevated" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-elevated" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Convert `components/layout/footer.tsx` to async + repo read**

```typescript
import { repo } from "@/lib/data";
// remove: import { mockSiteSettings } from "@/lib/mock/data";

export async function Footer() {
  const settings = await repo.getSettings();
  // ... rest unchanged
}
```

- [ ] **Step 9: Build to verify migration**

Run: `pnpm build`
Expected: ✓ Compiled successfully, 25 routes generated.

If a page errors with "cannot use async function" — that page is being rendered as a Client Component. Check for stray `"use client"` directives.

- [ ] **Step 10: Browser smoke test**

Run: `pnpm dev`
Visit:
- `http://localhost:3000` → home renders with categories, featured, campaigns
- `http://localhost:3000/magaza` → product grid + filters work
- `http://localhost:3000/urun/jinko-550w-monokristal-panel` → product detail
- `http://localhost:3000/galeri` → gallery posts visible
- Footer at bottom of every page shows contact info

Kill server when done (Ctrl+C).

- [ ] **Step 11: Commit**

```bash
git add app components/home components/layout components/shop
git commit -m "feat(data): migrate public site to repository abstraction"
```

---

### Task 7: Session signing utility

**Files:**
- Create: `lib/auth/cookies.ts`
- Create: `lib/auth/session.ts`

- [ ] **Step 1: Write `lib/auth/cookies.ts`**

```typescript
export const SESSION_COOKIE_NAME = "kayhan_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
```

- [ ] **Step 2: Write `lib/auth/session.ts`**

```typescript
import "server-only";

import type { UserRole } from "@/types";

export interface SessionPayload {
  email: string;
  role: UserRole;
  iat: number; // issued-at, seconds
  exp: number; // expires-at, seconds
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set in env (>= 32 chars). Check .env.local.",
    );
  }
  return secret;
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return toBase64Url(sig);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmac(body);
  // Constant-time-ish compare
  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/cookies.ts lib/auth/session.ts
git commit -m "feat(auth): add HMAC-signed session cookie utilities"
```

---

### Task 8: Auth provider interface + demo provider + factory

**Files:**
- Create: `lib/auth/provider.ts`
- Create: `lib/auth/demo-provider.ts`
- Create: `lib/auth/supabase-provider.ts`
- Create: `lib/auth/index.ts`
- Create: `lib/validations/auth.ts`

- [ ] **Step 1: Write `lib/validations/auth.ts`**

```typescript
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export type SignInInput = z.infer<typeof signInSchema>;
```

- [ ] **Step 2: Write `lib/auth/provider.ts`**

```typescript
import type { SessionPayload } from "./session";

export interface SignInResult {
  ok: boolean;
  error?: string;
  payload?: SessionPayload;
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<SignInResult>;
}
```

- [ ] **Step 3: Write `lib/auth/demo-provider.ts`**

```typescript
import "server-only";

import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import type { AuthProvider, SignInResult } from "./provider";

export const demoAuthProvider: AuthProvider = {
  async signIn(email, password): Promise<SignInResult> {
    const expectedEmail = process.env.DEMO_ADMIN_EMAIL;
    const expectedPassword = process.env.DEMO_ADMIN_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return {
        ok: false,
        error:
          "Demo admin kimlik bilgileri tanımlı değil. .env.local dosyasını kontrol edin.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail !== expectedEmail.toLowerCase() ||
      password !== expectedPassword
    ) {
      return { ok: false, error: "E-posta veya şifre hatalı" };
    }

    const now = Math.floor(Date.now() / 1000);
    return {
      ok: true,
      payload: {
        email: expectedEmail,
        role: "admin",
        iat: now,
        exp: now + SESSION_MAX_AGE_SECONDS,
      },
    };
  },
};
```

- [ ] **Step 4: Write `lib/auth/supabase-provider.ts` (stub)**

```typescript
import type { AuthProvider } from "./provider";

export const supabaseAuthProvider: AuthProvider = {
  async signIn() {
    return {
      ok: false,
      error:
        "Supabase auth henüz yapılandırılmadı. AUTH_MODE=demo olarak ayarlayın.",
    };
  },
};
```

- [ ] **Step 5: Write `lib/auth/index.ts`**

```typescript
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./cookies";
import { demoAuthProvider } from "./demo-provider";
import type { AuthProvider } from "./provider";
import { signSession, verifySession, type SessionPayload } from "./session";
import { supabaseAuthProvider } from "./supabase-provider";

function pickProvider(): AuthProvider {
  const mode = process.env.AUTH_MODE ?? "demo";
  if (mode === "supabase") return supabaseAuthProvider;
  return demoAuthProvider;
}

export const authProvider: AuthProvider = pickProvider();

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(
  payload: SessionPayload,
): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !["admin", "moderator", "assistant"].includes(session.role)) {
    redirect("/kayhan-yonetim/giris");
  }
  return session;
}

export type { SessionPayload };
```

- [ ] **Step 6: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add lib/auth lib/validations/auth.ts
git commit -m "feat(auth): demo provider + factory + session helpers"
```

---

### Task 9: Route protection via `proxy.ts`

**Files:**
- Create: `proxy.ts` (project root)

> Next.js 16 renamed `middleware.ts` to `proxy.ts`. The function must be named `proxy` (default export also accepted). Edge runtime is NOT supported in proxy; it runs on Node.

- [ ] **Step 1: Write `proxy.ts`**

```typescript
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/session";

const ADMIN_PREFIX = "/kayhan-yonetim";
const LOGIN_PATH = "/kayhan-yonetim/giris";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate admin routes
  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  // Login page is always accessible
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session || !["admin", "moderator", "assistant"].includes(session.role)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/kayhan-yonetim/:path*"],
};
```

- [ ] **Step 2: Build verification**

Run: `pnpm build`
Expected: ✓ Compiled. The build log should show `ƒ Middleware` or similar indicating proxy.ts was picked up.

- [ ] **Step 3: Smoke test**

Run: `pnpm dev`
Visit `http://localhost:3000/kayhan-yonetim` (don't sign in yet).
Expected: browser is redirected to `/kayhan-yonetim/giris`. The login page doesn't exist yet, so you'll get a 404 — that's the correct redirect behavior.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): gate /kayhan-yonetim routes via Next 16 proxy"
```

---

### Task 10: Sign-in / sign-out server actions

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/auth.ts`
- Create: `app/(admin)/kayhan-yonetim/cikis/route.ts`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/auth.ts`**

```typescript
"use server";

import { redirect } from "next/navigation";

import {
  authProvider,
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import { signInSchema } from "@/lib/validations/auth";

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  }

  const result = await authProvider.signIn(
    parsed.data.email,
    parsed.data.password,
  );
  if (!result.ok || !result.payload) {
    return { error: result.error ?? "Giriş başarısız" };
  }

  await setSessionCookie(result.payload);
  redirect("/kayhan-yonetim");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/kayhan-yonetim/giris");
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/cikis/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(
    new URL("/kayhan-yonetim/giris", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  );
}
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/actions/auth.ts app/\(admin\)/kayhan-yonetim/cikis
git commit -m "feat(admin): sign-in/sign-out server actions"
```

---

### Task 11: Admin login page

**Files:**
- Create: `app/(admin)/kayhan-yonetim/giris/page.tsx`
- Create: `components/admin/sign-in-form.tsx`

- [ ] **Step 1: Write `components/admin/sign-in-form.tsx`**

```typescript
"use client";

import { Lock, LogIn, Mail } from "lucide-react";
import { useActionState } from "react";

import { signInAction, type SignInState } from "@/app/(admin)/kayhan-yonetim/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          E-posta
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@kayhansolar.com"
            className="h-11 w-full rounded-xl border border-border bg-elevated pl-10 pr-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Şifre
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-xl border border-border bg-elevated pl-10 pr-3 text-sm text-foreground focus:border-lime-primary focus:outline-none"
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        <LogIn className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/giris/page.tsx`**

```typescript
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/admin/sign-in-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yönetici Girişi",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/kayhan-yonetim");

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-lime-primary text-black">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            KAYHAN Yönetim
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Bu alan yalnızca yetkili personel içindir.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/5 sm:p-8">
          <SignInForm />
        </div>

        <p className="mt-6 text-center text-xs text-subtle">
          Demo modu — kimlik bilgileri .env.local içinde tanımlı.
        </p>
      </div>
    </div>
  );
}
```

> **Note:** The admin route group has no shared layout yet — the login page is standalone. The admin layout (Task 13) only applies inside the protected area.

- [ ] **Step 3: Build verification**

Run: `pnpm build`
Expected: ✓ Compiled. Routes list should include `/kayhan-yonetim/giris`.

- [ ] **Step 4: Manual browser test**

Run: `pnpm dev`
- Go to `http://localhost:3000/kayhan-yonetim` → redirected to `/giris`
- Try wrong password → red error: "E-posta veya şifre hatalı"
- Sign in with `admin@kayhansolar.com` / `kayhan2026` → redirected to `/kayhan-yonetim` (will 404 since layout isn't built yet — that's expected)
- Cookie `kayhan_session` should be set (visible in DevTools → Application → Cookies)

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/giris components/admin/sign-in-form.tsx
git commit -m "feat(admin): login page with server action"
```

---

### Task 12: UI primitives for admin forms

**Files:**
- Create: `components/ui/input.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `components/ui/label.tsx`
- Create: `components/ui/select.tsx`
- Create: `components/ui/switch.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/table.tsx`

- [ ] **Step 1: Write `components/ui/input.tsx`**

```typescript
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

- [ ] **Step 2: Write `components/ui/textarea.tsx`**

```typescript
import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 3: Write `components/ui/label.tsx`**

```typescript
import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium uppercase tracking-wider text-subtle",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Write `components/ui/select.tsx`**

```typescript
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground focus:border-lime-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
```

- [ ] **Step 5: Write `components/ui/switch.tsx`**

```typescript
"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
    >
      <span className="relative inline-block h-6 w-11">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-border-strong transition-colors peer-checked:bg-lime-primary" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      {label && <span className={cn(className)}>{label}</span>}
    </label>
  ),
);
Switch.displayName = "Switch";
```

- [ ] **Step 6: Write `components/ui/badge.tsx`**

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      tone: {
        neutral: "bg-elevated text-muted",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-danger/15 text-danger",
        info: "bg-info/15 text-info",
        lime: "bg-lime-primary text-black",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
```

- [ ] **Step 7: Write `components/ui/table.tsx`**

```typescript
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-border bg-elevated text-xs uppercase tracking-wider text-subtle" {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-elevated/50", className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-semibold", className)} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
```

- [ ] **Step 8: Type check**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add components/ui
git commit -m "feat(ui): add Input, Textarea, Label, Select, Switch, Badge, Table primitives"
```

---

### Task 13: Admin shell — layout + sidebar + topbar

**Files:**
- Create: `components/admin/sidebar.tsx`
- Create: `components/admin/topbar.tsx`
- Create: `app/(admin)/kayhan-yonetim/layout.tsx`

- [ ] **Step 1: Write `components/admin/sidebar.tsx`**

```typescript
"use client";

import {
  BarChart3,
  Bell,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/kayhan-yonetim", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/kayhan-yonetim/bildirimler", label: "Bildirimler", icon: Bell },
  { href: "/kayhan-yonetim/urunler", label: "Ürünler", icon: Package },
  { href: "/kayhan-yonetim/kategoriler", label: "Kategoriler", icon: Tag },
  { href: "/kayhan-yonetim/kampanyalar", label: "Kampanyalar", icon: Sparkles },
  { href: "/kayhan-yonetim/teklifler", label: "Teklifler", icon: MessageSquareText },
  { href: "/kayhan-yonetim/siparisler", label: "Siparişler", icon: ShoppingBag },
  { href: "/kayhan-yonetim/galeri", label: "Galeri", icon: ImageIcon },
  { href: "/kayhan-yonetim/ai-egitim", label: "AI Eğitim", icon: Wand2 },
  { href: "/kayhan-yonetim/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/kayhan-yonetim/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/kayhan-yonetim/ayarlar", label: "Site Ayarları", icon: Settings },
] as const;

interface SidebarProps {
  unreadCount: number;
}

export function Sidebar({ unreadCount }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        const showBadge = href === "/kayhan-yonetim/bildirimler" && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-lime-primary text-black"
                : "text-muted hover:bg-elevated hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
              {label}
            </span>
            {showBadge && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Write `components/admin/topbar.tsx`**

```typescript
"use client";

import { LogOut, Menu } from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  email: string;
  onToggleSidebar: () => void;
}

export function Topbar({ email, onToggleSidebar }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Menüyü aç/kapat"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={2.2} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <span className="hidden text-xs text-muted sm:inline">{email}</span>
        <form action="/kayhan-yonetim/cikis" method="post">
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            Çıkış
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Write admin shell wrapper `components/admin/admin-shell.tsx`**

```typescript
"use client";

import { useState, type ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AdminShellProps {
  email: string;
  unreadCount: number;
  children: ReactNode;
}

export function AdminShell({ email, unreadCount, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 overflow-y-auto border-r border-border bg-surface lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-primary text-sm font-bold text-black">
            K
          </span>
          <span className="text-sm font-semibold tracking-tight">
            KAYHAN <span className="text-muted">Yönetim</span>
          </span>
        </div>
        <Sidebar unreadCount={unreadCount} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface shadow-2xl">
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-primary text-sm font-bold text-black">
                K
              </span>
              <span className="text-sm font-semibold tracking-tight">
                KAYHAN <span className="text-muted">Yönetim</span>
              </span>
            </div>
            <Sidebar unreadCount={unreadCount} />
          </aside>
        </div>
      )}

      <div className="flex min-h-dvh flex-1 flex-col">
        <Topbar email={email} onToggleSidebar={() => setOpen((v) => !v)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `app/(admin)/kayhan-yonetim/layout.tsx`**

> **Important:** The admin route group has its own layout that **does not** include the public Header/Footer. Since the public Header/Footer are in the root `app/layout.tsx`, we need a different structural choice — wrap admin pages in a separate sub-tree that hides them.
>
> Approach: the admin layout renders an `AdminShell` and uses CSS to hide nothing from root; instead, the public Header/Footer will simply not appear because... actually, they WILL appear since they're in root layout. We need to skip them.
>
> **Fix:** Move public Header/Footer out of root layout into a `(public)/layout.tsx` group layout. The root layout becomes structural only (html, body, providers).

```typescript
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s | KAYHAN Yönetim" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const unreadCount = await repo.unreadCount();
  return (
    <AdminShell email={session.email} unreadCount={unreadCount}>
      {children}
    </AdminShell>
  );
}
```

- [ ] **Step 5: Refactor public layout — move Header/Footer to `(public)` group**

Create `app/(public)/layout.tsx`:

```typescript
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
```

> **Note:** The home page (`app/page.tsx`) is outside the `(public)` group. Move it INTO the group: rename `app/page.tsx` → `app/(public)/page.tsx`. Same for `app/not-found.tsx` and `app/error.tsx` — leave these at root (they should be available globally).

Run: `mv "app/page.tsx" "app/(public)/page.tsx"`

- [ ] **Step 6: Update `app/layout.tsx` — strip Header/Footer**

```typescript
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { CursorEffect } from "@/components/shared/cursor-effect";
import { ThemeProvider } from "@/components/shared/theme-provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kayhansolar.com"),
  title: {
    default: "KAYHAN Solar & Enerji — Güneşin Gücü, Senin Kontrolünde",
    template: "%s | KAYHAN Solar",
  },
  description:
    "Güneş enerjisi sistemleri, paneller, inverterler, bataryalar ve aydınlatma çözümleri.",
  openGraph: { type: "website", locale: "tr_TR", siteName: "KAYHAN Solar & Enerji" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CursorEffect />
          {children}
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{ classNames: { toast: "glass !rounded-xl" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Build verification**

Run: `pnpm build`
Expected: ✓ Compiled. Route list should still include all `/(public)` routes (rendered as `/`, `/magaza`, etc — group names are stripped from URLs) plus `/kayhan-yonetim`, `/kayhan-yonetim/giris`, `/kayhan-yonetim/cikis`.

If build fails with "Conflicting public routes", check that home page was moved to `app/(public)/page.tsx`.

- [ ] **Step 8: Browser smoke test**

Run: `pnpm dev`
- `/` → public site renders normally with header/footer
- `/kayhan-yonetim` → redirects to `/giris`
- Sign in → `/kayhan-yonetim` shows admin shell with sidebar (Panel highlighted), topbar with email and Çıkış button. No public header or footer.
- Click sidebar items → each shows 404 (pages not built yet) but the shell persists. **Note:** sub-pages still need a `page.tsx`; for now you'll get 404s — that's expected until Task 14+.
- Click "Çıkış" → returns to login.

- [ ] **Step 9: Commit**

```bash
git add app components/admin
git commit -m "feat(admin): protected admin shell with sidebar and topbar"
```

---

### Task 14: Admin dashboard

**Files:**
- Create: `app/(admin)/kayhan-yonetim/page.tsx`
- Create: `components/admin/kpi-card.tsx`

- [ ] **Step 1: Write `components/admin/kpi-card.tsx`**

```typescript
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "warning" | "danger";
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: KpiCardProps) {
  const toneRing =
    tone === "warning"
      ? "ring-warning/30"
      : tone === "danger"
        ? "ring-danger/30"
        : "ring-transparent";

  const inner = (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 ring-1 transition-colors",
        toneRing,
        href && "hover:border-lime-primary hover:shadow-lg hover:shadow-lime-primary/10",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted" strokeWidth={2.2} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/page.tsx`**

```typescript
import {
  Bell,
  MessageSquareText,
  Package,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { KpiCard } from "@/components/admin/kpi-card";
import { Badge } from "@/components/ui/badge";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const [products, offers, orders, campaigns, unreadCount] = await Promise.all([
    repo.listProducts(),
    repo.listOffers(),
    repo.listOrders(),
    repo.listCampaigns(),
    repo.unreadCount(),
  ]);

  const lowStockProducts = products.filter(
    (p) => p.isActive && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold,
  );
  const newOffers = offers.filter((o) => o.status === "new");
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "whatsapp_sent",
  );
  const activeCampaigns = campaigns.filter((c) => c.isActive);

  const recentOffers = offers.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Yönetim Paneli</h1>
        <p className="text-sm text-muted">
          KAYHAN Solar günlük operasyon özeti
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={MessageSquareText}
          label="Yeni Teklifler"
          value={newOffers.length}
          hint={`${offers.length} toplam`}
          href="/kayhan-yonetim/teklifler"
          tone={newOffers.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Bekleyen Siparişler"
          value={pendingOrders.length}
          hint={`${orders.length} toplam`}
          href="/kayhan-yonetim/siparisler"
        />
        <KpiCard
          icon={Package}
          label="Düşük Stok"
          value={lowStockProducts.length}
          hint="3 adet veya altı"
          href="/kayhan-yonetim/urunler"
          tone={lowStockProducts.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={Sparkles}
          label="Aktif Kampanya"
          value={activeCampaigns.length}
          hint={`${campaigns.length} toplam`}
          href="/kayhan-yonetim/kampanyalar"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Son Teklifler</h2>
            <Link
              href="/kayhan-yonetim/teklifler"
              className="text-xs font-medium text-muted hover:text-foreground"
            >
              Tümü →
            </Link>
          </div>
          {recentOffers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Henüz teklif yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOffers.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/kayhan-yonetim/teklifler/${o.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-elevated"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.fullName}</p>
                      <p className="truncate text-xs text-muted">
                        {o.city} / {o.district}
                      </p>
                    </div>
                    <Badge
                      tone={
                        o.status === "new"
                          ? "warning"
                          : o.status === "responded"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {o.status === "new"
                        ? "Yeni"
                        : o.status === "in_review"
                          ? "İnceleniyor"
                          : o.status === "responded"
                            ? "Yanıtlandı"
                            : "Kapalı"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold tracking-tight">Son Siparişler</h2>
            <Link
              href="/kayhan-yonetim/siparisler"
              className="text-xs font-medium text-muted hover:text-foreground"
            >
              Tümü →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Henüz sipariş yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted">{o.customerName}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatPrice(o.total)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
        <Bell className="h-4 w-4 shrink-0 text-lime-dark dark:text-lime-primary" strokeWidth={2.2} />
        <span>
          {unreadCount > 0
            ? `${unreadCount} okunmamış bildirim var.`
            : "Tüm bildirimler okundu."}
        </span>
        <Link
          href="/kayhan-yonetim/bildirimler"
          className="ml-auto text-xs font-medium text-foreground hover:underline"
        >
          Aç
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build + smoke test**

Run: `pnpm build`
Expected: ✓ Compiled, `/kayhan-yonetim` in routes.

Run: `pnpm dev`
- Sign in → dashboard shows 4 KPI cards with seeded numbers
- "Yeni Teklifler" should show **1** (only `of-1` is `new`)
- "Bekleyen Siparişler" should show **1** (`or-1` is `whatsapp_sent`)
- "Düşük Stok" should show **1** (`p-3` Tam Sinüs İnverter)
- "Aktif Kampanya" should show **3**
- Recent offers list shows 3 seeded offers
- Recent orders list shows 1 seeded order
- Theme toggle in topbar works without losing text visibility

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/page.tsx components/admin/kpi-card.tsx
git commit -m "feat(admin): dashboard with KPI cards and recent activity"
```

---

### Task 15: Notification poller + inbox page

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/notifications.ts`
- Create: `components/admin/notification-bell.tsx`
- Create: `app/(admin)/kayhan-yonetim/bildirimler/page.tsx`
- Modify: `components/admin/topbar.tsx` (add the bell)

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/notifications.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export async function fetchUnreadCountAction(): Promise<number> {
  await requireAdmin();
  return repo.unreadCount();
}

export async function markNotificationReadAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.markNotificationRead(id);
  revalidatePath("/kayhan-yonetim/bildirimler");
  revalidatePath("/kayhan-yonetim");
}

export async function markAllReadAction(): Promise<void> {
  await requireAdmin();
  await repo.markAllNotificationsRead();
  revalidatePath("/kayhan-yonetim/bildirimler");
  revalidatePath("/kayhan-yonetim");
}
```

- [ ] **Step 2: Write `components/admin/notification-bell.tsx`**

```typescript
"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchUnreadCountAction } from "@/app/(admin)/kayhan-yonetim/actions/notifications";

interface NotificationBellProps {
  initialCount: number;
}

const POLL_MS = 30_000;

export function NotificationBell({ initialCount }: NotificationBellProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await fetchUnreadCountAction();
        if (!cancelled) setCount(next);
      } catch {
        // Silent — keep last known count on transient errors
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      href="/kayhan-yonetim/bildirimler"
      aria-label={count > 0 ? `Bildirimler — ${count} okunmamış` : "Bildirimler"}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground"
    >
      <Bell className="h-4 w-4" strokeWidth={2.2} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Update `components/admin/topbar.tsx` to include the bell**

```typescript
"use client";

import { LogOut, Menu } from "lucide-react";

import { NotificationBell } from "@/components/admin/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  email: string;
  initialUnreadCount: number;
  onToggleSidebar: () => void;
}

export function Topbar({ email, initialUnreadCount, onToggleSidebar }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Menüyü aç/kapat"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" strokeWidth={2.2} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell initialCount={initialUnreadCount} />
        <ThemeToggle />
        <span className="hidden text-xs text-muted sm:inline">{email}</span>
        <form action="/kayhan-yonetim/cikis" method="post">
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            Çıkış
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update `components/admin/admin-shell.tsx` to pass the count to Topbar**

In the existing `AdminShell`, change `<Topbar ...>` props:

```typescript
<Topbar
  email={email}
  initialUnreadCount={unreadCount}
  onToggleSidebar={() => setOpen((v) => !v)}
/>
```

- [ ] **Step 5: Write `app/(admin)/kayhan-yonetim/bildirimler/page.tsx`**

```typescript
import { CheckCheck } from "lucide-react";
import Link from "next/link";

import {
  markAllReadAction,
  markNotificationReadAction,
} from "@/app/(admin)/kayhan-yonetim/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";
import type { NotificationType } from "@/lib/data/types";

const typeLabels: Record<NotificationType, { label: string; tone: "warning" | "info" | "success" | "danger" | "neutral" }> = {
  new_offer: { label: "Yeni Teklif", tone: "warning" },
  new_order: { label: "Yeni Sipariş", tone: "info" },
  low_stock: { label: "Düşük Stok", tone: "warning" },
  supplier_price_up: { label: "Fiyat Yükseldi", tone: "danger" },
  supplier_price_down: { label: "Fiyat Düştü", tone: "success" },
  product_unavailable: { label: "Ürün Tükendi", tone: "danger" },
  system: { label: "Sistem", tone: "neutral" },
};

function relatedHref(t?: string, id?: string): string | null {
  if (!t || !id) return null;
  if (t === "offer") return `/kayhan-yonetim/teklifler/${id}`;
  if (t === "order") return `/kayhan-yonetim/siparisler`;
  if (t === "product") return `/kayhan-yonetim/urunler/${id}`;
  return null;
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - +new Date(iso)) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export default async function NotificationsPage() {
  const notifications = await repo.listNotifications();
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bildirimler</h1>
          <p className="mt-1 text-sm text-muted">
            {notifications.length} bildirim, {notifications.filter((n) => !n.isRead).length} okunmamış
          </p>
        </div>
        {hasUnread && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" strokeWidth={2.2} />
              Hepsini Okundu İşaretle
            </Button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Henüz bildirim yok.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const meta = typeLabels[n.type];
            const href = relatedHref(n.relatedType, n.relatedId);
            return (
              <li
                key={n.id}
                className={`rounded-2xl border bg-surface p-4 transition-colors ${
                  n.isRead ? "border-border" : "border-lime-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {!n.isRead && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-lime-dark dark:text-lime-primary">
                          Yeni
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-1 text-sm text-muted">{n.message}</p>
                    <p className="mt-2 text-xs text-subtle">{formatRelative(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {href && (
                      <Link href={href}>
                        <Button variant="outline" size="sm">
                          Aç
                        </Button>
                      </Link>
                    )}
                    {!n.isRead && (
                      <form action={markNotificationReadAction.bind(null, n.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Okundu
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Build + smoke test**

Run: `pnpm build && pnpm dev`
- Sign in → topbar shows bell with red badge "2" (two unread from seed)
- Click bell → `/bildirimler` shows 3 notifications
- Click "Okundu" on one → it loses the "Yeni" badge, badge count in topbar updates on next poll (or refresh)
- Click "Hepsini Okundu İşaretle" → all marked, badge disappears

- [ ] **Step 7: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/bildirimler app/\(admin\)/kayhan-yonetim/actions/notifications.ts components/admin/notification-bell.tsx components/admin/topbar.tsx components/admin/admin-shell.tsx
git commit -m "feat(admin): notification bell with 30s polling and inbox page"
```

---

**✓ End of Sub-phase 3A.** Working admin shell, dashboard, notifications. Sign in works. Public site continues to render via repository. Commit & deploy this checkpoint before continuing.

---

# Sub-Phase 3B — Catalog Management

Outcome: Admin can fully manage products, categories, and campaigns. Changes show on public site after revalidation.

---

### Task 16: Validation schemas for catalog

**Files:**
- Create: `lib/validations/product.ts`
- Create: `lib/validations/category.ts`
- Create: `lib/validations/campaign.ts`

- [ ] **Step 1: Write `lib/validations/product.ts`**

```typescript
import { z } from "zod";

const badgeEnum = z.enum([
  "kargo_bedava",
  "yeni",
  "tercih_edilen",
  "5_yil_garanti",
  "10_yil_garanti",
  "stokta_son",
]);

const mediaSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["image", "video", "pdf"]),
  url: z.string().url("Geçerli bir URL girin"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  altText: z.string().optional(),
});

export const productInputSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug en az 2 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içermeli"),
  name: z.string().min(2, "Ürün adı zorunlu"),
  shortDescription: z.string().min(5, "Kısa açıklama zorunlu").max(160),
  longDescription: z.string().optional(),
  technicalSpecs: z.record(z.string(), z.string()).optional(),
  categoryId: z.string().min(1, "Kategori seçin"),
  brand: z.string().optional(),
  supplierUrl: z.string().url().optional().or(z.literal("")),
  supplierPrice: z.coerce.number().nonnegative().optional(),
  markupPercentage: z.coerce.number().min(0).max(500).optional(),
  currentPrice: z.coerce.number().positive("Fiyat 0'dan büyük olmalı"),
  compareAtPrice: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().min(1).default(3),
  badges: z.array(badgeEnum).default([]),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  isNewArrival: z.coerce.boolean().default(false),
  media: z.array(mediaSchema).min(1, "En az 1 görsel ekleyin"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
```

- [ ] **Step 2: Write `lib/validations/category.ts`**

```typescript
import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().min(2, "Kategori adı zorunlu"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içermeli"),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
```

- [ ] **Step 3: Write `lib/validations/campaign.ts`**

```typescript
import { z } from "zod";

export const campaignInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3, "Başlık zorunlu"),
  description: z.string().optional(),
  bannerImageUrl: z.string().url().optional().or(z.literal("")),
  ruleType: z.enum([
    "percent_off",
    "buy_x_get_y_discount",
    "bundle_discount",
    "free_shipping",
    "fixed_amount_off",
  ]),
  ruleConfig: z.record(z.string(), z.unknown()).default({}),
  applicableTo: z.enum(["all", "category", "product"]).default("all"),
  targetIds: z.array(z.string()).default([]),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(8)),
  endDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  displayOnHomepage: z.coerce.boolean().default(false),
  displayPriority: z.coerce.number().int().default(0),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/validations
git commit -m "feat(admin): zod schemas for product, category, campaign"
```

---

### Task 17: Product server actions

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/products.ts`

- [ ] **Step 1: Write the actions file**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { productInputSchema, type ProductInput } from "@/lib/validations/product";

export interface ProductActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/magaza");
  if (slug) revalidatePath(`/urun/${slug}`);
  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/urunler");
}

function parseFormData(formData: FormData): ProductInput | { error: string; fieldErrors: Record<string, string> } {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());

  // Coerce arrays from JSON-encoded fields
  if (typeof raw.badges === "string") {
    try {
      raw.badges = JSON.parse(raw.badges as string);
    } catch {
      raw.badges = [];
    }
  }
  if (typeof raw.media === "string") {
    try {
      raw.media = JSON.parse(raw.media as string);
    } catch {
      raw.media = [];
    }
  }
  if (typeof raw.technicalSpecs === "string") {
    try {
      raw.technicalSpecs = JSON.parse(raw.technicalSpecs as string);
    } catch {
      raw.technicalSpecs = {};
    }
  }
  // Checkboxes only appear in formData when checked
  raw.isActive = formData.get("isActive") === "on" || raw.isActive === "true";
  raw.isFeatured = formData.get("isFeatured") === "on" || raw.isFeatured === "true";
  raw.isNewArrival =
    formData.get("isNewArrival") === "on" || raw.isNewArrival === "true";

  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Form geçersiz", fieldErrors };
  }
  return parsed.data;
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("error" in result) return result;

  const created = await repo.createProduct({
    ...result,
    media: result.media.map((m, i) => ({
      id: m.id ?? `m-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.altText || undefined,
    })),
    technicalSpecs: result.technicalSpecs ?? {},
    compareAtPrice: result.compareAtPrice || undefined,
    supplierUrl: result.supplierUrl || undefined,
    supplierPrice: result.supplierPrice || undefined,
    markupPercentage: result.markupPercentage || undefined,
    brand: result.brand || undefined,
    longDescription: result.longDescription || undefined,
  });
  revalidateCatalog(created.slug);
  redirect(`/kayhan-yonetim/urunler`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("error" in result) return result;

  const updated = await repo.updateProduct(id, {
    ...result,
    media: result.media.map((m, i) => ({
      id: m.id ?? `m-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.altText || undefined,
    })),
    technicalSpecs: result.technicalSpecs ?? {},
    compareAtPrice: result.compareAtPrice || undefined,
    supplierUrl: result.supplierUrl || undefined,
    supplierPrice: result.supplierPrice || undefined,
    markupPercentage: result.markupPercentage || undefined,
    brand: result.brand || undefined,
    longDescription: result.longDescription || undefined,
  });
  revalidateCatalog(updated.slug);
  redirect(`/kayhan-yonetim/urunler`);
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin();
  const product = await repo.getProductById(id);
  await repo.deleteProduct(id);
  revalidateCatalog(product?.slug);
  redirect(`/kayhan-yonetim/urunler`);
}
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add app/\(admin\)/kayhan-yonetim/actions/products.ts
git commit -m "feat(admin): product CRUD server actions"
```

---

### Task 18: Product list page

**Files:**
- Create: `app/(admin)/kayhan-yonetim/urunler/page.tsx`
- Create: `components/admin/product-row-actions.tsx`

- [ ] **Step 1: Write `components/admin/product-row-actions.tsx`**

```typescript
"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { Button } from "@/components/ui/button";

interface Props {
  productId: string;
  productName: string;
}

export function ProductRowActions({ productId, productName }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <form action={deleteProductAction.bind(null, productId)}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            Sil
          </Button>
        </form>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          İptal
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link href={`/kayhan-yonetim/urunler/${productId}`}>
        <Button variant="ghost" size="sm" aria-label={`${productName} düzenle`}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${productName} sil`}
        onClick={() => setConfirming(true)}
      >
        <MoreVertical className="h-3.5 w-3.5" strokeWidth={2.2} />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/urunler/page.tsx`**

```typescript
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

export default async function AdminProductListPage() {
  const [products, categories] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
  ]);
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ürünler</h1>
          <p className="mt-1 text-sm text-muted">{products.length} ürün</p>
        </div>
        <Link href="/kayhan-yonetim/urunler/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Ürün
          </Button>
        </Link>
      </header>

      <Table>
        <THead>
          <TR>
            <TH className="w-16">Görsel</TH>
            <TH>Ürün</TH>
            <TH className="hidden md:table-cell">Kategori</TH>
            <TH className="text-right">Fiyat</TH>
            <TH className="text-right">Stok</TH>
            <TH className="hidden sm:table-cell">Durum</TH>
            <TH className="w-32 text-right">İşlem</TH>
          </TR>
        </THead>
        <TBody>
          {products.map((p) => (
            <TR key={p.id}>
              <TD>
                <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-elevated">
                  {p.media[0]?.url && (
                    <Image
                      src={p.media[0].url}
                      alt={p.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </div>
              </TD>
              <TD>
                <Link
                  href={`/kayhan-yonetim/urunler/${p.id}`}
                  className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
                >
                  {p.name}
                </Link>
                {p.brand && (
                  <p className="text-xs text-subtle">{p.brand}</p>
                )}
              </TD>
              <TD className="hidden md:table-cell text-muted">
                {categoryName(p.categoryId)}
              </TD>
              <TD className="text-right tabular-nums">
                {formatPrice(p.currentPrice)}
              </TD>
              <TD className="text-right tabular-nums">
                {p.stockQuantity === 0 ? (
                  <span className="text-danger">0</span>
                ) : p.stockQuantity <= p.lowStockThreshold ? (
                  <span className="text-warning">{p.stockQuantity}</span>
                ) : (
                  p.stockQuantity
                )}
              </TD>
              <TD className="hidden sm:table-cell">
                {p.isActive ? (
                  <Badge tone="success">Aktif</Badge>
                ) : (
                  <Badge tone="neutral">Pasif</Badge>
                )}
              </TD>
              <TD>
                <ProductRowActions productId={p.id} productName={p.name} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Build + smoke test + commit**

```bash
pnpm build
```

Run dev, navigate to `/kayhan-yonetim/urunler`, expect a table with 12 seeded products. Stock column color-codes: red for 0 (sokak-lambasi), orange for ≤3 (tam-sinus-inverter, 10kw-tarim-paketi).

```bash
git add app/\(admin\)/kayhan-yonetim/urunler/page.tsx components/admin/product-row-actions.tsx
git commit -m "feat(admin): product list with inline row actions"
```

---

### Task 19: Product form component

**Files:**
- Create: `components/admin/media-list-editor.tsx`
- Create: `components/admin/specs-editor.tsx`
- Create: `components/admin/product-form.tsx`

- [ ] **Step 1: Write `components/admin/media-list-editor.tsx`**

```typescript
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import type { ProductMedia } from "@/types";

interface MediaListEditorProps {
  name: string;
  initial: ProductMedia[];
}

export function MediaListEditor({ name, initial }: MediaListEditorProps) {
  const [items, setItems] = useState<ProductMedia[]>(initial);

  const add = () =>
    setItems((x) => [
      ...x,
      { id: `tmp-${Date.now()}`, type: "image", url: "", altText: "" },
    ]);

  const remove = (idx: number) =>
    setItems((x) => x.filter((_, i) => i !== idx));

  const update = (idx: number, patch: Partial<ProductMedia>) =>
    setItems((x) => x.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((m, i) => (
        <div
          key={m.id ?? i}
          className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
        >
          <Select value={m.type} onChange={(e) => update(i, { type: e.target.value as ProductMedia["type"] })}>
            <option value="image">Görsel</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
          </Select>
          <Input
            placeholder="URL"
            value={m.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <Input
            placeholder="Alt metin (opsiyonel)"
            value={m.altText ?? ""}
            onChange={(e) => update(i, { altText: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Medya Ekle
      </Button>
      <Label className="mt-2 block">
        Demo modda dosya yükleme yok — URL yapıştırın (örn. picsum.photos veya kendi CDN&apos;iniz).
      </Label>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/admin/specs-editor.tsx`**

```typescript
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SpecsEditorProps {
  name: string;
  initial: Record<string, string>;
}

export function SpecsEditor({ name, initial }: SpecsEditorProps) {
  const [rows, setRows] = useState<Array<[string, string]>>(
    Object.entries(initial ?? {}),
  );

  const add = () => setRows((r) => [...r, ["", ""]]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateKey = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? [v, row[1]] : row)));
  const updateVal = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? [row[0], v] : row)));

  const asObject = Object.fromEntries(rows.filter(([k]) => k.trim()));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(asObject)} />
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="Özellik (örn. Güç)"
            value={k}
            onChange={(e) => updateKey(i, e.target.value)}
          />
          <Input
            placeholder="Değer (örn. 550W)"
            value={v}
            onChange={(e) => updateVal(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Özellik Ekle
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/admin/product-form.tsx`**

```typescript
"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { MediaListEditor } from "@/components/admin/media-list-editor";
import { SpecsEditor } from "@/components/admin/specs-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { Category, Product, ProductBadge } from "@/types";

import type { ProductActionState } from "@/app/(admin)/kayhan-yonetim/actions/products";

interface ProductFormProps {
  initial?: Product;
  categories: Category[];
  action: (state: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  submitLabel: string;
}

const ALL_BADGES: { value: ProductBadge; label: string }[] = [
  { value: "kargo_bedava", label: "Kargo Bedava" },
  { value: "yeni", label: "Yeni" },
  { value: "tercih_edilen", label: "Tercih Edilen" },
  { value: "5_yil_garanti", label: "5 Yıl Garanti" },
  { value: "10_yil_garanti", label: "10 Yıl Garanti" },
  { value: "stokta_son", label: "Stokta Son" },
];

export function ProductForm({ initial, categories, action, submitLabel }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(
    action,
    {},
  );

  const errFor = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Temel Bilgiler</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Ürün adı</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
            {errFor("name") && <p className="text-xs text-danger">{errFor("name")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" name="slug" defaultValue={initial?.slug} placeholder="ornegin-jinko-550w" required />
            {errFor("slug") && <p className="text-xs text-danger">{errFor("slug")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Marka</Label>
            <Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">Kısa açıklama</Label>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={initial?.shortDescription}
              maxLength={160}
              required
            />
            {errFor("shortDescription") && (
              <p className="text-xs text-danger">{errFor("shortDescription")}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="longDescription">Detaylı açıklama</Label>
            <Textarea
              id="longDescription"
              name="longDescription"
              rows={5}
              defaultValue={initial?.longDescription ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Kategori</Label>
            <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
              <option value="">Seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errFor("categoryId") && (
              <p className="text-xs text-danger">{errFor("categoryId")}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Fiyatlandırma & Stok</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="supplierUrl">Tedarikçi URL</Label>
            <Input id="supplierUrl" name="supplierUrl" defaultValue={initial?.supplierUrl ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplierPrice">Tedarikçi fiyatı</Label>
            <Input
              id="supplierPrice"
              name="supplierPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.supplierPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="markupPercentage">Kar marjı (%)</Label>
            <Input
              id="markupPercentage"
              name="markupPercentage"
              type="number"
              step="1"
              defaultValue={initial?.markupPercentage ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentPrice">Satış fiyatı (₺)</Label>
            <Input
              id="currentPrice"
              name="currentPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.currentPrice ?? ""}
              required
            />
            {errFor("currentPrice") && (
              <p className="text-xs text-danger">{errFor("currentPrice")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice">Eski fiyat (üstü çizili)</Label>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.compareAtPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stockQuantity">Stok adedi</Label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              step="1"
              defaultValue={initial?.stockQuantity ?? 0}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lowStockThreshold">Düşük stok eşiği</Label>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              step="1"
              defaultValue={initial?.lowStockThreshold ?? 3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Medya</h2>
        <p className="mt-1 text-xs text-muted">En az 1 görsel ekleyin.</p>
        <div className="mt-4">
          <MediaListEditor name="media" initial={initial?.media ?? []} />
          {errFor("media") && <p className="mt-2 text-xs text-danger">{errFor("media")}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Teknik Özellikler</h2>
        <div className="mt-4">
          <SpecsEditor name="technicalSpecs" initial={initial?.technicalSpecs ?? {}} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Etiketler & Görünürlük</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset className="rounded-xl border border-border bg-elevated p-3">
            <legend className="px-1 text-xs font-medium text-muted">Etiketler</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {ALL_BADGES.map((b) => (
                <label key={b.value} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="badges_options"
                    value={b.value}
                    defaultChecked={initial?.badges?.includes(b.value)}
                    className="h-4 w-4 accent-lime-primary"
                  />
                  {b.label}
                </label>
              ))}
            </div>
            {/* JSON-encoded value built client-side via small inline script */}
            <input
              type="hidden"
              name="badges"
              defaultValue={JSON.stringify(initial?.badges ?? [])}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){
                  const form = document.currentScript.closest('form');
                  if (!form) return;
                  const hidden = form.querySelector('input[name="badges"]');
                  const boxes = form.querySelectorAll('input[name="badges_options"]');
                  const sync = () => { hidden.value = JSON.stringify(Array.from(boxes).filter(b=>b.checked).map(b=>b.value)); };
                  boxes.forEach(b => b.addEventListener('change', sync));
                })();`,
              }}
            />
          </fieldset>

          <div className="space-y-3 rounded-xl border border-border bg-elevated p-3">
            <Switch
              id="isActive"
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
            />
            <Switch
              id="isFeatured"
              name="isFeatured"
              label="Anasayfada öne çıkar"
              defaultChecked={initial?.isFeatured ?? false}
            />
            <Switch
              id="isNewArrival"
              name="isNewArrival"
              label="Yeni gelen"
              defaultChecked={initial?.isNewArrival ?? false}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/urunler">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
pnpm build
git add components/admin/product-form.tsx components/admin/media-list-editor.tsx components/admin/specs-editor.tsx
git commit -m "feat(admin): reusable product form with media and specs editors"
```

---

### Task 20: Product create + edit pages

**Files:**
- Create: `app/(admin)/kayhan-yonetim/urunler/yeni/page.tsx`
- Create: `app/(admin)/kayhan-yonetim/urunler/[id]/page.tsx`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/urunler/yeni/page.tsx`**

```typescript
import Link from "next/link";

import { createProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { repo } from "@/lib/data";

export default async function NewProductPage() {
  const categories = await repo.listCategories();
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/kayhan-yonetim/urunler"
          className="text-xs text-muted hover:text-foreground"
        >
          ← Ürünlere dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Yeni Ürün
        </h1>
      </header>
      <ProductForm
        categories={categories}
        action={createProductAction}
        submitLabel="Ürünü Kaydet"
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/urunler/[id]/page.tsx`**

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { repo } from "@/lib/data";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditPageProps) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    repo.getProductById(id),
    repo.listCategories(),
  ]);
  if (!product) notFound();

  const boundUpdate = updateProductAction.bind(null, id);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/kayhan-yonetim/urunler"
          className="text-xs text-muted hover:text-foreground"
        >
          ← Ürünlere dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Ürünü Düzenle
        </h1>
        <p className="mt-1 text-xs text-subtle">
          ID: <code className="font-mono">{product.id}</code>
        </p>
      </header>
      <ProductForm
        initial={product}
        categories={categories}
        action={boundUpdate}
        submitLabel="Değişiklikleri Kaydet"
      />
    </div>
  );
}
```

- [ ] **Step 3: Build + smoke test**

Run: `pnpm build && pnpm dev`
- `/kayhan-yonetim/urunler` → list shows 12 products
- Click "Yeni Ürün" → form opens, fill in fields, add 1 media URL (e.g. `https://picsum.photos/seed/test/800/800`), set price, stock, category → Save → redirects to list with new row at top
- Click pencil on a row → edit page with fields prefilled
- Change stock to 1, save → redirected, badge becomes "Son 1 adet"
- Visit `/magaza` and `/urun/<slug>` → revalidation took effect, new product appears, edited product shows new stock
- Click ⋮ → Sil → product removed, public site updates after refresh

- [ ] **Step 4: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/urunler
git commit -m "feat(admin): product create and edit pages with revalidation"
```

---

### Task 21: Category management

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/categories.ts`
- Create: `app/(admin)/kayhan-yonetim/kategoriler/page.tsx`
- Create: `components/admin/category-manager.tsx`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/categories.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { categoryInputSchema } from "@/lib/validations/category";

export interface CategoryActionState {
  error?: string;
}

function bust() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/kategoriler");
  revalidatePath("/kayhan-yonetim/urunler");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.createCategory({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    displayOrder: parsed.data.displayOrder,
  });
  bust();
  return {};
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.updateCategory(id, parsed.data);
  bust();
  return {};
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteCategory(id);
  bust();
}
```

- [ ] **Step 2: Write `components/admin/category-manager.tsx`**

```typescript
"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
}

const initial: CategoryActionState = {};

export function CategoryManager({ categories }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Yeni Kategori
        </Button>
      </div>

      {creating && (
        <CreateForm onDone={() => setCreating(false)} />
      )}

      <ul className="space-y-2">
        {categories.map((c) =>
          editing === c.id ? (
            <EditRow
              key={c.id}
              category={c}
              onDone={() => setEditing(null)}
            />
          ) : (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  /{c.slug} {c.description ? `· ${c.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(c.id)}
                  aria-label={`${c.name} düzenle`}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                </Button>
                <form action={deleteCategoryAction.bind(null, c.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={`${c.name} sil`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                  </Button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    createCategoryAction,
    initial,
  );

  return (
    <form
      action={async (fd) => {
        await action(fd);
        if (!state.error) onDone();
      }}
      className="space-y-3 rounded-2xl border border-lime-primary/40 bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Yeni Kategori</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDone}
          aria-label="Kapat"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>
      </div>
      <FormFields />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Kaydediliyor..." : "Ekle"}
      </Button>
    </form>
  );
}

function EditRow({ category, onDone }: { category: Category; onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    updateCategoryAction.bind(null, category.id),
    initial,
  );

  return (
    <li>
      <form
        action={async (fd) => {
          await action(fd);
          if (!state.error) onDone();
        }}
        className="space-y-3 rounded-2xl border border-lime-primary/40 bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Düzenle</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDone}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
        <FormFields initial={category} />
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Kaydediliyor..." : "Güncelle"}
        </Button>
      </form>
    </li>
  );
}

function FormFields({ initial }: { initial?: Category }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Ad</Label>
        <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required defaultValue={initial?.slug ?? ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayOrder">Sıralama</Label>
        <Input
          id="displayOrder"
          name="displayOrder"
          type="number"
          step="1"
          defaultValue={initial?.displayOrder ?? 0}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `app/(admin)/kayhan-yonetim/kategoriler/page.tsx`**

```typescript
import { CategoryManager } from "@/components/admin/category-manager";
import { repo } from "@/lib/data";

export default async function AdminCategoriesPage() {
  const categories = await repo.listCategories();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kategoriler</h1>
        <p className="mt-1 text-sm text-muted">
          {categories.length} kategori
        </p>
      </header>
      <CategoryManager categories={categories} />
    </div>
  );
}
```

- [ ] **Step 4: Build + smoke test + commit**

```bash
pnpm build
# verify in browser: /kayhan-yonetim/kategoriler — add, edit, delete a test category
git add app/\(admin\)/kayhan-yonetim/kategoriler app/\(admin\)/kayhan-yonetim/actions/categories.ts components/admin/category-manager.tsx
git commit -m "feat(admin): inline category management"
```

---

### Task 22: Campaign actions + list + form pages

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/campaigns.ts`
- Create: `app/(admin)/kayhan-yonetim/kampanyalar/page.tsx`
- Create: `app/(admin)/kayhan-yonetim/kampanyalar/yeni/page.tsx`
- Create: `app/(admin)/kayhan-yonetim/kampanyalar/[id]/page.tsx`
- Create: `components/admin/campaign-form.tsx`
- Create: `components/admin/campaign-row-actions.tsx`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/campaigns.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { campaignInputSchema } from "@/lib/validations/campaign";

export interface CampaignActionState {
  error?: string;
}

function bust(slug?: string) {
  revalidatePath("/");
  revalidatePath("/magaza");
  if (slug) revalidatePath(`/magaza?kampanya=${slug}`);
  revalidatePath("/kayhan-yonetim/kampanyalar");
}

function parse(formData: FormData) {
  let ruleConfig: Record<string, unknown> = {};
  const raw = formData.get("ruleConfig");
  if (typeof raw === "string" && raw.trim()) {
    try {
      ruleConfig = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  let targetIds: string[] = [];
  const tRaw = formData.get("targetIds");
  if (typeof tRaw === "string" && tRaw.trim()) {
    try {
      targetIds = JSON.parse(tRaw);
    } catch {
      targetIds = tRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return campaignInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    bannerImageUrl: formData.get("bannerImageUrl") || undefined,
    ruleType: formData.get("ruleType"),
    ruleConfig,
    applicableTo: formData.get("applicableTo") ?? "all",
    targetIds,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    isActive: formData.get("isActive") === "on",
    displayOnHomepage: formData.get("displayOnHomepage") === "on",
    displayPriority: formData.get("displayPriority") || 0,
  });
}

export async function createCampaignAction(
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Kural konfigürasyonu geçersiz JSON" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  const created = await repo.createCampaign({
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    endDate: parsed.data.endDate || undefined,
  });
  bust(created.slug);
  redirect("/kayhan-yonetim/kampanyalar");
}

export async function updateCampaignAction(
  id: string,
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Kural konfigürasyonu geçersiz JSON" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  const updated = await repo.updateCampaign(id, {
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    endDate: parsed.data.endDate || undefined,
  });
  bust(updated.slug);
  redirect("/kayhan-yonetim/kampanyalar");
}

export async function deleteCampaignAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteCampaign(id);
  bust();
  redirect("/kayhan-yonetim/kampanyalar");
}
```

- [ ] **Step 2: Write `components/admin/campaign-form.tsx`**

```typescript
"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Campaign, Category } from "@/types";

import type { CampaignActionState } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";

interface CampaignFormProps {
  initial?: Campaign;
  categories: Category[];
  action: (state: CampaignActionState, fd: FormData) => Promise<CampaignActionState>;
  submitLabel: string;
}

const RULE_LABELS: Record<string, string> = {
  percent_off: "Yüzde indirim",
  buy_x_get_y_discount: "N alana N+1. ürün indirimi",
  bundle_discount: "Bundle indirimi",
  free_shipping: "Kargo bedava",
  fixed_amount_off: "Sabit tutar indirim",
};

export function CampaignForm({ initial, categories, action, submitLabel }: CampaignFormProps) {
  const [state, formAction, pending] = useActionState<CampaignActionState, FormData>(action, {});
  const [ruleType, setRuleType] = useState<Campaign["ruleType"]>(initial?.ruleType ?? "percent_off");
  const [ruleConfig, setRuleConfig] = useState<string>(
    JSON.stringify(initial?.ruleConfig ?? {}, null, 2),
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Genel</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" required defaultValue={initial?.title ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required defaultValue={initial?.slug ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bannerImageUrl">Banner görseli (URL)</Label>
            <Input id="bannerImageUrl" name="bannerImageUrl" defaultValue={initial?.bannerImageUrl ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Kural</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ruleType">Kural tipi</Label>
            <Select
              id="ruleType"
              name="ruleType"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as Campaign["ruleType"])}
            >
              {Object.entries(RULE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="applicableTo">Uygulanacağı yer</Label>
            <Select
              id="applicableTo"
              name="applicableTo"
              defaultValue={initial?.applicableTo ?? "all"}
            >
              <option value="all">Tüm site</option>
              <option value="category">Belirli kategori(ler)</option>
              <option value="product">Belirli ürün(ler)</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ruleConfig">Konfigürasyon (JSON)</Label>
            <Textarea
              id="ruleConfig"
              name="ruleConfig"
              rows={5}
              className="font-mono text-xs"
              value={ruleConfig}
              onChange={(e) => setRuleConfig(e.target.value)}
            />
            <p className="text-xs text-muted">
              Örnek:{" "}
              <code className="rounded bg-elevated px-1 py-0.5">
                {'{"buyQuantity":4,"getQuantity":1,"discountPercent":70}'}
              </code>{" "}
              veya kargo bedava için boş{" "}
              <code className="rounded bg-elevated px-1 py-0.5">{"{}"}</code>.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="targetIds">
              Hedef ID&apos;ler (virgülle ayır, kategori veya ürün id&apos;leri)
            </Label>
            <Input
              id="targetIds"
              name="targetIds"
              defaultValue={initial?.targetIds?.join(",") ?? ""}
              placeholder="cat-panel,cat-battery"
            />
            <p className="text-xs text-muted">
              Mevcut kategoriler:{" "}
              {categories.map((c) => (
                <code key={c.id} className="mr-1 rounded bg-elevated px-1 py-0.5">
                  {c.id}
                </code>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Zaman & Görünürlük</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Başlangıç</Label>
            <Input
              id="startDate"
              name="startDate"
              type="datetime-local"
              required
              defaultValue={initial?.startDate?.slice(0, 16) ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">Bitiş (opsiyonel)</Label>
            <Input
              id="endDate"
              name="endDate"
              type="datetime-local"
              defaultValue={initial?.endDate?.slice(0, 16) ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayPriority">Sıralama önceliği</Label>
            <Input
              id="displayPriority"
              name="displayPriority"
              type="number"
              step="1"
              defaultValue={initial?.displayPriority ?? 0}
            />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-elevated p-3">
            <Switch
              id="isActive"
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
            <Switch
              id="displayOnHomepage"
              name="displayOnHomepage"
              label="Anasayfada göster"
              defaultChecked={initial?.displayOnHomepage ?? false}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/kampanyalar">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write `components/admin/campaign-row-actions.tsx`**

```typescript
"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { Button } from "@/components/ui/button";

interface Props {
  id: string;
  title: string;
}

export function CampaignRowActions({ id, title }: Props) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <form action={deleteCampaignAction.bind(null, id)}>
          <Button type="submit" variant="danger" size="sm">
            Sil
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          İptal
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link href={`/kayhan-yonetim/kampanyalar/${id}`}>
        <Button variant="ghost" size="sm" aria-label={`${title} düzenle`}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${title} sil`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Write `app/(admin)/kayhan-yonetim/kampanyalar/page.tsx`**

```typescript
import { Plus } from "lucide-react";
import Link from "next/link";

import { CampaignRowActions } from "@/components/admin/campaign-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";

export default async function AdminCampaignsPage() {
  const campaigns = await repo.listCampaigns();
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampanyalar</h1>
          <p className="mt-1 text-sm text-muted">{campaigns.length} kampanya</p>
        </div>
        <Link href="/kayhan-yonetim/kampanyalar/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Kampanya
          </Button>
        </Link>
      </header>

      <Table>
        <THead>
          <TR>
            <TH>Başlık</TH>
            <TH className="hidden md:table-cell">Slug</TH>
            <TH className="hidden md:table-cell">Kural</TH>
            <TH>Durum</TH>
            <TH className="hidden sm:table-cell">Anasayfa</TH>
            <TH className="w-32 text-right">İşlem</TH>
          </TR>
        </THead>
        <TBody>
          {campaigns.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium">{c.title}</TD>
              <TD className="hidden md:table-cell text-muted">/{c.slug}</TD>
              <TD className="hidden md:table-cell text-muted">{c.ruleType}</TD>
              <TD>
                {c.isActive ? <Badge tone="success">Aktif</Badge> : <Badge>Pasif</Badge>}
              </TD>
              <TD className="hidden sm:table-cell">
                {c.displayOnHomepage ? <Badge tone="lime">Evet</Badge> : <Badge>Hayır</Badge>}
              </TD>
              <TD>
                <CampaignRowActions id={c.id} title={c.title} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Write `app/(admin)/kayhan-yonetim/kampanyalar/yeni/page.tsx`**

```typescript
import Link from "next/link";

import { createCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { CampaignForm } from "@/components/admin/campaign-form";
import { repo } from "@/lib/data";

export default async function NewCampaignPage() {
  const categories = await repo.listCategories();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/kampanyalar" className="text-xs text-muted hover:text-foreground">
          ← Kampanyalara dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Yeni Kampanya</h1>
      </header>
      <CampaignForm categories={categories} action={createCampaignAction} submitLabel="Kampanyayı Kaydet" />
    </div>
  );
}
```

- [ ] **Step 6: Write `app/(admin)/kayhan-yonetim/kampanyalar/[id]/page.tsx`**

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCampaignAction } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";
import { CampaignForm } from "@/components/admin/campaign-form";
import { repo } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: Props) {
  const { id } = await params;
  const [campaign, categories] = await Promise.all([
    repo.getCampaignById(id),
    repo.listCategories(),
  ]);
  if (!campaign) notFound();

  const boundUpdate = updateCampaignAction.bind(null, id);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/kampanyalar" className="text-xs text-muted hover:text-foreground">
          ← Kampanyalara dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Kampanyayı Düzenle
        </h1>
      </header>
      <CampaignForm
        initial={campaign}
        categories={categories}
        action={boundUpdate}
        submitLabel="Değişiklikleri Kaydet"
      />
    </div>
  );
}
```

- [ ] **Step 7: Build + smoke test + commit**

```bash
pnpm build
# Test in browser:
# - /kayhan-yonetim/kampanyalar lists 3 seeded campaigns
# - Create new campaign with rule_type=percent_off, ruleConfig={"discountPercent":10}
# - Toggle "Anasayfada göster" → see new banner on `/`
# - Delete the seeded "lityum-batarya-indirimi" → verify gone from home
git add app/\(admin\)/kayhan-yonetim/kampanyalar app/\(admin\)/kayhan-yonetim/actions/campaigns.ts components/admin/campaign-form.tsx components/admin/campaign-row-actions.tsx
git commit -m "feat(admin): campaign CRUD with rule configuration"
```

---

**✓ End of Sub-phase 3B.** Catalog (products, categories, campaigns) is fully manageable. Public site reflects changes after revalidation.

---

# Sub-Phase 3C — Operations

Outcome: Admin can manage incoming offers (with a built-in solar calculator), view orders, edit gallery posts, update site settings, and view users.

---

### Task 23: Offer actions + status pill

**Files:**
- Create: `lib/validations/offer.ts`
- Create: `app/(admin)/kayhan-yonetim/actions/offers.ts`
- Create: `components/admin/offer-status-pill.tsx`

- [ ] **Step 1: Write `lib/validations/offer.ts`**

```typescript
import { z } from "zod";

export const offerStatusSchema = z.enum([
  "new",
  "in_review",
  "responded",
  "closed",
]);

export const offerUpdateSchema = z.object({
  status: offerStatusSchema,
  adminNotes: z.string().optional(),
  adminResponse: z.string().optional(),
});

export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>;
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/actions/offers.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { offerUpdateSchema } from "@/lib/validations/offer";

export interface OfferActionState {
  error?: string;
  success?: boolean;
}

export async function updateOfferAction(
  id: string,
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  await requireAdmin();
  const parsed = offerUpdateSchema.safeParse({
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
    adminResponse: formData.get("adminResponse") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const patch: Parameters<typeof repo.updateOffer>[1] = {
    status: parsed.data.status,
    adminNotes: parsed.data.adminNotes,
    adminResponse: parsed.data.adminResponse,
  };
  if (parsed.data.status === "responded") {
    patch.respondedAt = new Date().toISOString();
  }

  await repo.updateOffer(id, patch);
  revalidatePath(`/kayhan-yonetim/teklifler/${id}`);
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  return { success: true };
}
```

- [ ] **Step 3: Write `components/admin/offer-status-pill.tsx`**

```typescript
import { Badge } from "@/components/ui/badge";
import type { OfferStatus } from "@/lib/data/types";

const map: Record<
  OfferStatus,
  { label: string; tone: "warning" | "info" | "success" | "neutral" }
> = {
  new: { label: "Yeni", tone: "warning" },
  in_review: { label: "İnceleniyor", tone: "info" },
  responded: { label: "Yanıtlandı", tone: "success" },
  closed: { label: "Kapalı", tone: "neutral" },
};

export function OfferStatusPill({ status }: { status: OfferStatus }) {
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/validations/offer.ts app/\(admin\)/kayhan-yonetim/actions/offers.ts components/admin/offer-status-pill.tsx
git commit -m "feat(admin): offer update action and status pill"
```

---

### Task 24: Offer list page

**Files:**
- Create: `app/(admin)/kayhan-yonetim/teklifler/page.tsx`

- [ ] **Step 1: Write the list page**

```typescript
import Link from "next/link";

import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import type { OfferStatus } from "@/lib/data/types";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const TABS: { value: OfferStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "in_review", label: "İnceleniyor" },
  { value: "responded", label: "Yanıtlandı" },
  { value: "closed", label: "Kapalı" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterStatus = (params.status as OfferStatus | undefined) ?? undefined;
  const all = await repo.listOffers();
  const filtered =
    filterStatus && TABS.some((t) => t.value === filterStatus)
      ? all.filter((o) => o.status === filterStatus)
      : all;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Teklifler</h1>
        <p className="mt-1 text-sm text-muted">{all.length} toplam</p>
      </header>

      <nav
        aria-label="Durum filtresi"
        className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-elevated p-1"
      >
        {TABS.map((t) => {
          const isActive =
            (t.value === "all" && !filterStatus) || filterStatus === t.value;
          const count =
            t.value === "all" ? all.length : all.filter((o) => o.status === t.value).length;
          return (
            <Link
              key={t.value}
              href={
                t.value === "all"
                  ? "/kayhan-yonetim/teklifler"
                  : `/kayhan-yonetim/teklifler?status=${t.value}`
              }
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-lime-primary text-black"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-black/10 px-1.5 text-[10px] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Bu kriterde teklif yok.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Müşteri</TH>
              <TH className="hidden md:table-cell">Konum</TH>
              <TH className="hidden md:table-cell">Yer</TH>
              <TH>Durum</TH>
              <TH className="hidden sm:table-cell">Tarih</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Link
                    href={`/kayhan-yonetim/teklifler/${o.id}`}
                    className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
                  >
                    {o.fullName}
                  </Link>
                  <p className="text-xs text-subtle">{o.phone}</p>
                </TD>
                <TD className="hidden md:table-cell text-muted">
                  {o.city} / {o.district}
                </TD>
                <TD className="hidden md:table-cell text-muted">
                  {o.installationLocation === "roof"
                    ? "Çatı"
                    : o.installationLocation === "land"
                      ? "Arazi"
                      : "Diğer"}
                </TD>
                <TD>
                  <OfferStatusPill status={o.status} />
                </TD>
                <TD className="hidden sm:table-cell text-xs text-subtle">
                  {formatDate(o.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + smoke test + commit**

```bash
pnpm build
# Verify in browser: /kayhan-yonetim/teklifler shows 3 seeded offers across tabs
git add app/\(admin\)/kayhan-yonetim/teklifler/page.tsx
git commit -m "feat(admin): offer list page with status tabs"
```

---

### Task 25: Solar calculator helper + offer detail

**Files:**
- Create: `lib/solar-calculator.ts`
- Create: `components/admin/offer-calculator.tsx`
- Create: `components/admin/offer-response-form.tsx`
- Create: `app/(admin)/kayhan-yonetim/teklifler/[id]/page.tsx`

- [ ] **Step 1: Write `lib/solar-calculator.ts`**

```typescript
export interface Appliance {
  name: string;
  powerW?: number;
}

export interface CalcResult {
  totalPowerW: number;
  dailyEnergyKwh: number; // assuming 8 hours/day average usage
  monthlyEnergyKwh: number;
  panelCount: number; // 550W panels with 1.3x oversize factor
  recommendedInverterKw: number;
  recommendedBatteryAh: number;
  roughCostTry: number;
}

// Assumptions used for the rough quote
const PANEL_WATTAGE = 550;
const ASSUMED_DAILY_HOURS = 8;
const OVERSIZE_FACTOR = 1.3; // panel sizing
const PANEL_COST = 3450;
const INVERTER_COST_PER_KW = 1950;
const BATTERY_COST_PER_AH = 185;
const INSTALL_BASE_COST = 25000;

export function calculateSystem(appliances: Appliance[]): CalcResult {
  const totalPowerW = appliances.reduce((s, a) => s + (a.powerW ?? 0), 0);
  const dailyEnergyKwh = (totalPowerW * ASSUMED_DAILY_HOURS) / 1000;
  const monthlyEnergyKwh = dailyEnergyKwh * 30;

  const panelCount = totalPowerW > 0 ? Math.max(2, Math.ceil((totalPowerW * OVERSIZE_FACTOR) / PANEL_WATTAGE)) : 0;
  const recommendedInverterKw = totalPowerW > 0 ? Math.max(3, Math.ceil((totalPowerW * 1.25) / 1000)) : 0;
  const recommendedBatteryAh = dailyEnergyKwh > 0 ? Math.max(100, Math.ceil((dailyEnergyKwh * 1000) / 48)) : 0;

  const roughCostTry =
    panelCount * PANEL_COST +
    recommendedInverterKw * INVERTER_COST_PER_KW +
    recommendedBatteryAh * BATTERY_COST_PER_AH +
    (panelCount > 0 ? INSTALL_BASE_COST : 0);

  return {
    totalPowerW,
    dailyEnergyKwh,
    monthlyEnergyKwh,
    panelCount,
    recommendedInverterKw,
    recommendedBatteryAh,
    roughCostTry,
  };
}
```

- [ ] **Step 2: Write `components/admin/offer-calculator.tsx`**

```typescript
import { Calculator } from "lucide-react";

import { type Appliance, calculateSystem } from "@/lib/solar-calculator";
import { formatPrice } from "@/lib/utils";

interface Props {
  appliances: Appliance[];
}

export function OfferCalculator({ appliances }: Props) {
  const result = calculateSystem(appliances);
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Calculator className="h-4 w-4 text-lime-dark dark:text-lime-primary" strokeWidth={2.2} />
        <h2 className="text-sm font-semibold tracking-tight">
          Hızlı Sistem Hesabı
        </h2>
      </header>
      {result.totalPowerW === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          Müşteri henüz cihaz gücü belirtmemiş. Manuel hesaplama yapın.
        </p>
      ) : (
        <dl className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-3">
          {[
            { label: "Toplam Güç", value: `${result.totalPowerW.toLocaleString("tr-TR")} W` },
            {
              label: "Günlük Tüketim (≈8 saat)",
              value: `${result.dailyEnergyKwh.toFixed(1)} kWh`,
            },
            {
              label: "Aylık Tüketim",
              value: `${result.monthlyEnergyKwh.toFixed(0)} kWh`,
            },
            {
              label: "Önerilen Panel (550W)",
              value: `${result.panelCount} adet`,
            },
            {
              label: "Önerilen İnverter",
              value: `${result.recommendedInverterKw} kW`,
            },
            {
              label: "Önerilen Batarya (48V)",
              value: `${result.recommendedBatteryAh} Ah`,
            },
          ].map((row) => (
            <div key={row.label} className="px-5 py-3">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                {row.label}
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
          <div className="col-span-2 border-t border-border bg-lime-primary/10 px-5 py-3 md:col-span-3">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-foreground">
              Kabataslak Yatırım
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {formatPrice(result.roughCostTry)}
            </dd>
            <p className="mt-1 text-xs text-muted">
              Saha keşfi ve tedarikçi fiyat hareketlerine göre ±%10 değişebilir.
            </p>
          </div>
        </dl>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Write `components/admin/offer-response-form.tsx`**

```typescript
"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  updateOfferAction,
  type OfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/offers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Offer } from "@/lib/data/types";

interface Props {
  offer: Offer;
}

export function OfferResponseForm({ offer }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(
    updateOfferAction.bind(null, offer.id),
    {},
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-tight">Yönetici Yanıtı</h2>

      <div className="space-y-1.5">
        <Label htmlFor="status">Durum</Label>
        <Select id="status" name="status" defaultValue={offer.status}>
          <option value="new">Yeni</option>
          <option value="in_review">İnceleniyor</option>
          <option value="responded">Yanıtlandı</option>
          <option value="closed">Kapalı</option>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminNotes">Dahili notlar (müşteriye gitmez)</Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          defaultValue={offer.adminNotes ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminResponse">Müşteriye yanıt</Label>
        <Textarea
          id="adminResponse"
          name="adminResponse"
          rows={5}
          defaultValue={offer.adminResponse ?? ""}
        />
      </div>

      {state.error && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-success">Kaydedildi.</p>
      )}

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        <Save className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Write `app/(admin)/kayhan-yonetim/teklifler/[id]/page.tsx`**

```typescript
import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfferCalculator } from "@/components/admin/offer-calculator";
import { OfferResponseForm } from "@/components/admin/offer-response-form";
import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OfferDetailPage({ params }: Props) {
  const { id } = await params;
  const offer = await repo.getOfferById(id);
  if (!offer) notFound();

  const phoneClean = offer.phone.replace(/\D/g, "");
  const waLink = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    `Sayın ${offer.fullName}, KAYHAN Solar ekibinden yazıyorum. Teklifinizle ilgili görüşmek isteriz.`,
  )}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/kayhan-yonetim/teklifler"
            className="text-xs text-muted hover:text-foreground"
          >
            ← Tekliflere dön
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {offer.fullName}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
            <OfferStatusPill status={offer.status} />
            <span>{fmt(offer.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={waLink} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm">
              <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
              WhatsApp ile yanıtla
            </Button>
          </Link>
          {offer.email && (
            <Link href={`mailto:${offer.email}`}>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4" strokeWidth={2.2} />
                E-posta
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">Müşteri Bilgileri</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-subtle">Telefon</dt>
                <dd className="font-medium">{offer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">E-posta</dt>
                <dd className="font-medium">{offer.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">İl / İlçe</dt>
                <dd className="font-medium">
                  {offer.city} / {offer.district}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Kurulum yeri</dt>
                <dd className="font-medium">
                  {offer.installationLocation === "roof"
                    ? "Çatı"
                    : offer.installationLocation === "land"
                      ? "Arazi"
                      : "Diğer"}
                </dd>
              </div>
              {offer.installationAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-subtle">Adres / Detay</dt>
                  <dd className="font-medium">{offer.installationAddress}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Çalıştırılacak Cihazlar
            </h2>
            {offer.appliances.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Cihaz listesi paylaşılmamış.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {offer.appliances.map((a, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted">
                      {a.powerW ? `${a.powerW} W` : "güç belirtilmemiş"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">Detaylı Açıklama</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {offer.detailedDescription}
            </p>
          </section>

          <OfferCalculator appliances={offer.appliances} />
        </div>

        <OfferResponseForm offer={offer} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build + smoke test + commit**

```bash
pnpm build
# Browser test:
# - /kayhan-yonetim/teklifler/of-2 (Fatma Kaya, 3000W sulama pompası)
# - Calculator shows ~8 panels, 4kW inverter, ~125Ah battery, ~57k ₺
# - Status dropdown → set to "responded", add a response, Save → status pill turns green
# - Click "WhatsApp ile yanıtla" → opens wa.me with prefilled text
git add lib/solar-calculator.ts app/\(admin\)/kayhan-yonetim/teklifler/\[id\]/page.tsx components/admin/offer-calculator.tsx components/admin/offer-response-form.tsx
git commit -m "feat(admin): offer detail with solar calculator and response form"
```

---

### Task 26: Order list

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/orders.ts`
- Create: `app/(admin)/kayhan-yonetim/siparisler/page.tsx`
- Create: `components/admin/order-status-control.tsx`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/orders.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";

const validStatuses: OrderStatus[] = [
  "pending",
  "whatsapp_sent",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await requireAdmin();
  if (!validStatuses.includes(status)) return;
  await repo.updateOrderStatus(orderId, status);
  revalidatePath("/kayhan-yonetim/siparisler");
  revalidatePath("/kayhan-yonetim");
}
```

- [ ] **Step 2: Write `components/admin/order-status-control.tsx`**

```typescript
"use client";

import { useTransition } from "react";

import { updateOrderStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/orders";
import { Select } from "@/components/ui/select";
import type { OrderStatus } from "@/lib/data/types";

const labels: Record<OrderStatus, string> = {
  pending: "Beklemede",
  whatsapp_sent: "WhatsApp Gönderildi",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargolandı",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
};

export function OrderStatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        startTransition(async () => {
          await updateOrderStatusAction(orderId, next);
        });
      }}
      className="h-8 px-2 text-xs"
    >
      {(Object.keys(labels) as OrderStatus[]).map((s) => (
        <option key={s} value={s}>
          {labels[s]}
        </option>
      ))}
    </Select>
  );
}
```

- [ ] **Step 3: Write `app/(admin)/kayhan-yonetim/siparisler/page.tsx`**

```typescript
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminOrdersPage() {
  const orders = await repo.listOrders();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Siparişler</h1>
        <p className="mt-1 text-sm text-muted">{orders.length} sipariş</p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Henüz sipariş yok.
        </div>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Sipariş No</TH>
              <TH>Müşteri</TH>
              <TH className="hidden md:table-cell">Adet</TH>
              <TH className="text-right">Toplam</TH>
              <TH className="w-44">Durum</TH>
              <TH className="hidden sm:table-cell">Tarih</TH>
            </TR>
          </THead>
          <TBody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD className="font-mono text-xs">{o.orderNumber}</TD>
                <TD>
                  <p className="font-medium">{o.customerName}</p>
                  <p className="text-xs text-subtle">{o.customerPhone}</p>
                </TD>
                <TD className="hidden md:table-cell text-muted">
                  {o.items.reduce((s, i) => s + i.quantity, 0)} ürün
                </TD>
                <TD className="text-right tabular-nums">
                  {formatPrice(o.total)}
                </TD>
                <TD>
                  <OrderStatusControl orderId={o.id} current={o.status} />
                </TD>
                <TD className="hidden sm:table-cell text-xs text-subtle">
                  {fmt(o.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build + smoke test + commit**

```bash
pnpm build
# Browser test: /kayhan-yonetim/siparisler shows KH-2026-000001
# Change status dropdown → updates after a brief delay
git add app/\(admin\)/kayhan-yonetim/siparisler app/\(admin\)/kayhan-yonetim/actions/orders.ts components/admin/order-status-control.tsx
git commit -m "feat(admin): order list with inline status update"
```

---

### Task 27: Gallery management

**Files:**
- Create: `lib/validations/gallery.ts`
- Create: `app/(admin)/kayhan-yonetim/actions/gallery.ts`
- Create: `components/admin/gallery-form.tsx`
- Create: `app/(admin)/kayhan-yonetim/galeri/page.tsx`
- Create: `app/(admin)/kayhan-yonetim/galeri/yeni/page.tsx`

- [ ] **Step 1: Write `lib/validations/gallery.ts`**

```typescript
import { z } from "zod";

const mediaSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["image", "video"]),
  url: z.string().url("Geçerli URL girin"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  caption: z.string().optional(),
});

export const galleryInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().optional(),
  location: z.string().optional(),
  installationDate: z.string().optional(),
  systemPowerKw: z.coerce.number().nonnegative().optional(),
  media: z.array(mediaSchema).min(1, "En az 1 medya ekleyin"),
  isFeatured: z.coerce.boolean().default(false),
});

export type GalleryInput = z.infer<typeof galleryInputSchema>;
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/actions/gallery.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { galleryInputSchema } from "@/lib/validations/gallery";

export interface GalleryActionState {
  error?: string;
}

function parse(formData: FormData) {
  let media: unknown = [];
  const raw = formData.get("media");
  if (typeof raw === "string") {
    try {
      media = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return galleryInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    installationDate: formData.get("installationDate") || undefined,
    systemPowerKw: formData.get("systemPowerKw") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
    media,
  });
}

function bust() {
  revalidatePath("/galeri");
  revalidatePath("/kayhan-yonetim/galeri");
  revalidatePath("/");
}

export async function createGalleryAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Medya verisi geçersiz" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.createGalleryPost({
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    installationDate: parsed.data.installationDate,
    systemPowerKw: parsed.data.systemPowerKw,
    isFeatured: parsed.data.isFeatured,
    media: parsed.data.media.map((m, i) => ({
      id: m.id ?? `gm-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.caption,
    })),
  });
  bust();
  redirect("/kayhan-yonetim/galeri");
}

export async function deleteGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteGalleryPost(id);
  bust();
}
```

- [ ] **Step 3: Write `components/admin/gallery-form.tsx`**

```typescript
"use client";

import { Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createGalleryAction,
  type GalleryActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type MediaDraft = {
  id?: string;
  type: "image" | "video";
  url: string;
  caption?: string;
};

export function GalleryCreateForm() {
  const [state, action, pending] = useActionState<GalleryActionState, FormData>(
    createGalleryAction,
    {},
  );
  const [media, setMedia] = useState<MediaDraft[]>([
    { type: "image", url: "" },
  ]);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Proje Bilgileri</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required placeholder="diyarbakir-cati-10kw" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Lokasyon</Label>
            <Input id="location" name="location" placeholder="Diyarbakır, Türkiye" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installationDate">Kurulum tarihi</Label>
            <Input id="installationDate" name="installationDate" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="systemPowerKw">Sistem gücü (kW)</Label>
            <Input id="systemPowerKw" name="systemPowerKw" type="number" step="0.1" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Switch
              id="isFeatured"
              name="isFeatured"
              label="Anasayfada öne çıkar"
              defaultChecked={false}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Medya</h2>
        <input type="hidden" name="media" value={JSON.stringify(media)} />
        <div className="mt-4 space-y-3">
          {media.map((m, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
            >
              <Select
                value={m.type}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) =>
                      j === i ? { ...x, type: e.target.value as MediaDraft["type"] } : x,
                    ),
                  )
                }
              >
                <option value="image">Görsel</option>
                <option value="video">Video</option>
              </Select>
              <Input
                placeholder="URL"
                value={m.url}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Açıklama (ops.)"
                value={m.caption ?? ""}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) =>
                      j === i ? { ...x, caption: e.target.value } : x,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Kaldır"
                onClick={() =>
                  setMedia((arr) => arr.filter((_, j) => j !== i))
                }
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMedia((arr) => [...arr, { type: "image", url: "" }])}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            Medya Ekle
          </Button>
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/galeri">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Projeyi Kaydet"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Write `app/(admin)/kayhan-yonetim/galeri/page.tsx`**

```typescript
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { deleteGalleryAction } from "@/app/(admin)/kayhan-yonetim/actions/gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminGalleryPage() {
  const posts = await repo.listGalleryPosts();
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galeri / Projeler</h1>
          <p className="mt-1 text-sm text-muted">{posts.length} proje</p>
        </div>
        <Link href="/kayhan-yonetim/galeri/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Proje
          </Button>
        </Link>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="relative aspect-[4/3] bg-elevated">
              {p.media[0]?.url && (
                <Image
                  src={p.media[0].url}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              )}
              {p.isFeatured && (
                <div className="absolute right-3 top-3">
                  <Badge tone="lime">Öne Çıkan</Badge>
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold">{p.title}</p>
              {p.location && (
                <p className="text-xs text-muted">{p.location}</p>
              )}
              <div className="flex items-center justify-end">
                <form action={deleteGalleryAction.bind(null, p.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                    Sil
                  </Button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Write `app/(admin)/kayhan-yonetim/galeri/yeni/page.tsx`**

```typescript
import Link from "next/link";

import { GalleryCreateForm } from "@/components/admin/gallery-form";

export default function NewGalleryPostPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/galeri" className="text-xs text-muted hover:text-foreground">
          ← Galeriye dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Yeni Proje</h1>
      </header>
      <GalleryCreateForm />
    </div>
  );
}
```

- [ ] **Step 6: Build + smoke test + commit**

```bash
pnpm build
# Add new gallery item via admin, verify it appears on /galeri
git add app/\(admin\)/kayhan-yonetim/galeri app/\(admin\)/kayhan-yonetim/actions/gallery.ts components/admin/gallery-form.tsx lib/validations/gallery.ts
git commit -m "feat(admin): gallery list and create form"
```

---

### Task 28: Site settings form

**Files:**
- Create: `lib/validations/settings.ts`
- Create: `app/(admin)/kayhan-yonetim/actions/settings.ts`
- Create: `components/admin/settings-form.tsx`
- Create: `app/(admin)/kayhan-yonetim/ayarlar/page.tsx`

- [ ] **Step 1: Write `lib/validations/settings.ts`**

```typescript
import { z } from "zod";

export const settingsInputSchema = z.object({
  contactPhone: z.string().min(7, "Geçerli telefon girin"),
  contactEmail: z.string().email(),
  whatsappNumber: z.string().regex(/^\d{10,15}$/, "Yalnızca rakam, ülke kodu dahil"),
  addressCity: z.string().min(2),
  addressFull: z.string().min(5),
  addressMapsUrl: z.string().url().optional().or(z.literal("")),
  socialInstagram: z.string().url().optional().or(z.literal("")),
  socialFacebook: z.string().url().optional().or(z.literal("")),
  socialYoutube: z.string().url().optional().or(z.literal("")),
  socialTwitter: z.string().url().optional().or(z.literal("")),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/actions/settings.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { settingsInputSchema } from "@/lib/validations/settings";

export interface SettingsActionState {
  error?: string;
  success?: boolean;
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse({
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    whatsappNumber: formData.get("whatsappNumber"),
    addressCity: formData.get("addressCity"),
    addressFull: formData.get("addressFull"),
    addressMapsUrl: formData.get("addressMapsUrl") || undefined,
    socialInstagram: formData.get("socialInstagram") || undefined,
    socialFacebook: formData.get("socialFacebook") || undefined,
    socialYoutube: formData.get("socialYoutube") || undefined,
    socialTwitter: formData.get("socialTwitter") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  await repo.updateSettings({
    contactPhone: parsed.data.contactPhone,
    contactEmail: parsed.data.contactEmail,
    whatsappNumber: parsed.data.whatsappNumber,
    address: {
      city: parsed.data.addressCity,
      full: parsed.data.addressFull,
      mapsUrl: parsed.data.addressMapsUrl || undefined,
    },
    socialMedia: {
      instagram: parsed.data.socialInstagram || undefined,
      facebook: parsed.data.socialFacebook || undefined,
      youtube: parsed.data.socialYoutube || undefined,
      twitter: parsed.data.socialTwitter || undefined,
    },
  });
  revalidatePath("/");
  revalidatePath("/iletisim");
  revalidatePath("/kayhan-yonetim/ayarlar");
  return { success: true };
}
```

- [ ] **Step 3: Write `components/admin/settings-form.tsx`**

```typescript
"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  updateSettingsAction,
  type SettingsActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteSettings } from "@/types";

interface Props {
  initial: SiteSettings;
}

export function SettingsForm({ initial }: Props) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">İletişim</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Telefon</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={initial.contactPhone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">E-posta</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="whatsappNumber">
              WhatsApp numarası (yalnızca rakam, ülke kodu dahil — örn. 905555555555)
            </Label>
            <Input id="whatsappNumber" name="whatsappNumber" defaultValue={initial.whatsappNumber} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Adres</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="addressCity">İl</Label>
            <Input id="addressCity" name="addressCity" defaultValue={initial.address.city} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addressMapsUrl">Google Maps URL</Label>
            <Input id="addressMapsUrl" name="addressMapsUrl" defaultValue={initial.address.mapsUrl ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressFull">Tam adres</Label>
            <Input id="addressFull" name="addressFull" defaultValue={initial.address.full} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Sosyal Medya</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["socialInstagram", "Instagram", initial.socialMedia.instagram],
              ["socialFacebook", "Facebook", initial.socialMedia.facebook],
              ["socialYoutube", "YouTube", initial.socialMedia.youtube],
              ["socialTwitter", "X / Twitter", initial.socialMedia.twitter],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} name={name} defaultValue={value ?? ""} placeholder="https://..." />
            </div>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Ayarlar kaydedildi.
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Write `app/(admin)/kayhan-yonetim/ayarlar/page.tsx`**

```typescript
import { SettingsForm } from "@/components/admin/settings-form";
import { repo } from "@/lib/data";

export default async function AdminSettingsPage() {
  const settings = await repo.getSettings();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Site Ayarları</h1>
        <p className="mt-1 text-sm text-muted">
          Müşterilerin gördüğü iletişim ve sosyal medya bilgileri.
        </p>
      </header>
      <SettingsForm initial={settings} />
    </div>
  );
}
```

- [ ] **Step 5: Build + smoke test + commit**

```bash
pnpm build
# Change phone number in admin, save, refresh /iletisim → updated number visible
git add lib/validations/settings.ts app/\(admin\)/kayhan-yonetim/ayarlar app/\(admin\)/kayhan-yonetim/actions/settings.ts components/admin/settings-form.tsx
git commit -m "feat(admin): site settings editable form"
```

---

### Task 29: User management page (demo)

**Files:**
- Create: `app/(admin)/kayhan-yonetim/kullanicilar/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { getSession } from "@/lib/auth";

export default async function AdminUsersPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar</h1>
        <p className="mt-1 text-sm text-muted">
          Demo modda yalnızca tek admin hesabı var. Çoklu kullanıcı yönetimi
          Supabase Auth entegrasyonu ile aktive olacak.
        </p>
      </header>

      <Table>
        <THead>
          <TR>
            <TH>E-posta</TH>
            <TH>Rol</TH>
            <TH className="hidden sm:table-cell">Oturum</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-lime-dark dark:text-lime-primary" strokeWidth={2.2} />
                <span className="font-medium">{session?.email ?? "—"}</span>
              </div>
            </TD>
            <TD>
              <Badge tone="lime">Admin</Badge>
            </TD>
            <TD className="hidden sm:table-cell text-xs text-muted">
              {session?.exp
                ? `Geçerlilik: ${new Date(session.exp * 1000).toLocaleString("tr-TR")}`
                : "—"}
            </TD>
          </TR>
        </TBody>
      </Table>

      <div className="rounded-2xl border border-dashed border-border bg-elevated p-5 text-sm text-muted">
        <p className="font-semibold text-foreground">Faz 3D / Faz 6&apos;da gelecek:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Yeni moderatör/asistan kullanıcı davet et</li>
          <li>Rol değiştir (admin / moderator / assistant)</li>
          <li>2FA aktif/pasif</li>
          <li>Oturum sonlandır</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add app/\(admin\)/kayhan-yonetim/kullanicilar
git commit -m "feat(admin): user management page (demo single-admin view)"
```

---

**✓ End of Sub-phase 3C.** Operations surface complete: offers, orders, gallery, settings, users.

---

# Sub-Phase 3D — Placeholders + Final Verification

Outcome: AI training and analytics pages exist as Faz 5 placeholders (so sidebar links don't 404), and the entire admin flow is verified end-to-end.

---

### Task 30: AI Eğitim placeholder

**Files:**
- Create: `app/(admin)/kayhan-yonetim/ai-egitim/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { Wand2 } from "lucide-react";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminAITrainingPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Wand2 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Eğitim</h1>
          <p className="mt-1 text-sm text-muted">
            Müşteri asistanı için bilgi tabanı yönetimi.
          </p>
        </div>
      </header>
      <PagePlaceholder
        title="Yapay Zekâ Bilgi Tabanı"
        description="Gemini destekli müşteri asistanına PDF, doküman ve URL eklemek, embedding'leri yeniden oluşturmak ve test sandbox'ı Faz 5'te aktive edilecek."
        phase="Faz 5 — AI Asistan + Analitik"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/ai-egitim
git commit -m "feat(admin): AI training placeholder for Faz 5"
```

---

### Task 31: Analitik placeholder

**Files:**
- Create: `app/(admin)/kayhan-yonetim/analitik/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
import { BarChart3 } from "lucide-react";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <BarChart3 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analitik</h1>
          <p className="mt-1 text-sm text-muted">
            Trafik, dönüşüm, en çok satan ürünler ve coğrafi dağılım.
          </p>
        </div>
      </header>
      <PagePlaceholder
        title="Analitik Panosu"
        description="Sayfa görüntüleme, sepete ekleme oranı, dönüşüm hunisi, en çok satan ürünler ve haftalık/aylık Excel rapor export'u Faz 5'te eklenecek. Bu süre içinde Vercel Analytics tarayıcı tarafında çalışıyor olacak."
        phase="Faz 5 — AI Asistan + Analitik"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(admin\)/kayhan-yonetim/analitik
git commit -m "feat(admin): analytics placeholder for Faz 5"
```

---

### Task 32: End-to-end verification + report

**Files (verification only — no code changes):**
- Run: build, lint, tsc, browser walkthrough

- [ ] **Step 1: Clean build**

```bash
pnpm exec eslint . --ext .ts,.tsx --max-warnings 0
pnpm exec tsc --noEmit
pnpm build
```

Expected:
- ESLint: 0 errors, 0 warnings
- tsc: no output (0 errors)
- Build: ✓ Compiled, route table includes:
  - 13 public routes (`/`, `/magaza`, `/sepet`, etc. + 12 product pages)
  - `/kayhan-yonetim` (4 admin pages: root, giris, cikis, bildirimler)
  - `/kayhan-yonetim/urunler` (list + yeni + 12 [id])
  - `/kayhan-yonetim/kategoriler`
  - `/kayhan-yonetim/kampanyalar` (list + yeni + 3 [id])
  - `/kayhan-yonetim/teklifler` (list + 3 [id])
  - `/kayhan-yonetim/siparisler`
  - `/kayhan-yonetim/galeri` (list + yeni)
  - `/kayhan-yonetim/ayarlar`
  - `/kayhan-yonetim/kullanicilar`
  - `/kayhan-yonetim/ai-egitim`
  - `/kayhan-yonetim/analitik`

If any tasks (especially dynamic `[id]` pages for admin edit) show as `dynamic ƒ` instead of `●`, that's expected — they read mutable repository state.

- [ ] **Step 2: Auth + redirect flow**

Run: `pnpm dev`

In a private/incognito browser window:
1. Visit `/kayhan-yonetim/urunler` → expect redirect to `/kayhan-yonetim/giris`
2. Visit `/kayhan-yonetim/teklifler/of-1` → expect redirect to `/giris` (not 404)
3. Visit `/kayhan-yonetim/giris` → login page renders
4. Submit empty form → field errors shown
5. Submit wrong password → "E-posta veya şifre hatalı"
6. Submit `admin@kayhansolar.com` / `kayhan2026` → redirects to `/kayhan-yonetim`
7. Cookie `kayhan_session` is HttpOnly (visible in DevTools, no JS access)
8. Visit `/kayhan-yonetim/urunler` directly → no redirect, page renders
9. Click "Çıkış" in topbar → returns to `/giris`
10. Try `/kayhan-yonetim` again → redirected to `/giris`

- [ ] **Step 3: Admin shell + theme**

After signing in:
1. Sidebar shows all 12 menu items with KAYHAN logo + "Yönetim" label
2. Bell icon shows red badge "2" (initial unread count)
3. Click each sidebar item → page loads (no 404s)
4. Toggle theme (Aydınlık / Sistem / Karanlık) — all text remains legible in both themes; no white-on-white or invisible elements
5. Resize browser to mobile width (375px) — hamburger appears, click → drawer slides in with same menu

- [ ] **Step 4: Product CRUD end-to-end**

1. Go to `/kayhan-yonetim/urunler` → 12 rows
2. Click "Yeni Ürün":
   - Slug: `test-panel-200w`
   - Name: `Test Panel 200W`
   - Short description: `E2E test ürünü`
   - Category: `Güneş Panelleri`
   - Price: `1500`
   - Stock: `10`
   - Media: add 1 URL `https://picsum.photos/seed/test-panel/800/800`
   - Save → redirected to list, new row at top
3. Open new tab → `/magaza` → "Test Panel 200W" visible
4. Open product detail → loads with gallery
5. Back in admin → edit the new product → change stock to `2` → Save
6. Refresh `/urun/test-panel-200w` → "Son 2 adet" warning shows
7. Delete the product (⋮ → Sil) → confirmation appears → confirm
8. Refresh `/magaza` → product is gone

- [ ] **Step 5: Category + Campaign edits**

1. `/kayhan-yonetim/kategoriler` → add "Test Aksesuar" with slug `test-aksesuar`
2. Verify it appears in product create form dropdown
3. Delete it
4. `/kayhan-yonetim/kampanyalar` → edit "Bahar Kampanyası" → toggle "Aktif" off → Save
5. Refresh `/` (home) → that campaign no longer in the campaign strip
6. Toggle back on, refresh `/` → reappears

- [ ] **Step 6: Offer + calculator**

1. `/kayhan-yonetim/teklifler` → tabs work, click "Yeni" tab → 1 offer
2. Click `of-2` (Fatma Kaya, sulama pompası 3000W)
3. Calculator section shows reasonable numbers (≈8 panel, ≈4 kW inverter)
4. Change status to "Yanıtlandı", write a response, Save → status pill turns green
5. Click "WhatsApp ile yanıtla" → opens `wa.me/...` with prefilled greeting

- [ ] **Step 7: Order + Settings + Notifications**

1. `/kayhan-yonetim/siparisler` → 1 order seeded
2. Change status to "preparing" → updates
3. `/kayhan-yonetim/ayarlar` → change phone number to `+90 555 111 22 33`, Save → success message
4. Refresh `/iletisim` (public) → new phone visible
5. `/kayhan-yonetim/bildirimler` → 3 notifications, mark all read → bell badge clears
6. Wait 30+ seconds → bell still 0 (poll doesn't add new notifications without user action)

- [ ] **Step 8: Cookie expiration + persistence**

1. Sign out
2. Sign in again
3. In DevTools → Application → Cookies → `kayhan_session` → note `Expires` is ~8 hours out
4. Close browser, reopen → still signed in (cookie persists)

- [ ] **Step 9: Verification report**

Write a Turkish verification report to `docs/verification/2026-05-11-faz-3.md`:

```markdown
# M3 Verification Report — Faz 3 Admin Paneli

## Yapılan
- Demo auth (HMAC cookie) + Next 16 proxy.ts ile route koruma
- Repository abstraction (demo + supabase stub) — public site dahil her şey repo üzerinden okuyor
- 12 admin sayfası: dashboard, ürünler (list/yeni/edit), kategoriler, kampanyalar, teklifler, siparişler, galeri, ayarlar, kullanıcılar, bildirimler, ai-egitim (placeholder), analitik (placeholder)
- Server Actions ile tüm CRUD; revalidatePath ile public site cache invalidation
- 30s polling ile bildirim sayacı (Realtime ikamesi)
- Solar hesaplama aracı (panel/inverter/batarya/fiyat tahmini)

## Test edildi
- Auth: giriş, çıkış, redirect, cookie persistence
- Ürün CRUD: create/edit/delete + public site senkronu
- Kategori, kampanya, ayarlar düzenlemesi
- Teklif yanıtı + WhatsApp linki
- Sipariş status değişimi
- Tema geçişlerinde okunabilirlik

## Düzeltildi
- [Karşılaşılan + düzeltilen sorunlar buraya]

## Temizlendi
- [Silinen orphan dosyalar — varsa]

## Bilinen eksikler (sonraki fazlara)
- AI asistan (Faz 5) — placeholder mevcut
- Analitik (Faz 5) — placeholder mevcut
- Multi-user / role management (Faz 6 — Supabase Auth)
- Gerçek email/push bildirim (Faz 5 — Resend entegrasyonu)
- Tedarikçi otomatik sync (Faz 4+)

## Sıradaki adım
Faz 4 — Gelişmiş Özellikler (multi-step teklif formu, kampanya kuralı sepette uygulama, stok bildirimi, SEO meta, sitemap).
```

- [ ] **Step 10: Final commit**

```bash
git add docs/verification/2026-05-11-faz-3.md
git commit -m "docs: Faz 3 verification report"
```

---

**✓ End of Sub-phase 3D.** Faz 3 complete. Admin can manage all surfaces in demo mode; flipping `AUTH_MODE=supabase` and `DATA_MODE=supabase` later will swap providers without touching pages or components.

---

# Swap-to-Supabase Checklist (Future, NOT in Faz 3)

When real Supabase keys arrive, this is the runway:

1. Install `@supabase/supabase-js` and `@supabase/ssr`.
2. Run the migration SQL from master plan §5 against your Supabase project.
3. Implement `lib/data/supabase-repository.ts` against `Repository` interface — each method becomes a Supabase query.
4. Implement `lib/auth/supabase-provider.ts` — `signIn` calls `supabase.auth.signInWithPassword`.
5. Update `getSession()` in `lib/auth/index.ts` to read Supabase session when `AUTH_MODE=supabase`.
6. Set env vars in `.env.local` and Vercel:
   - `AUTH_MODE=supabase`
   - `DATA_MODE=supabase`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
7. Notification bell: replace polling with Supabase Realtime subscription in `notification-bell.tsx`.
8. Delete `lib/data/demo-store.ts` and `lib/mock/data.ts` only after Supabase is in production and data has been migrated.

---

# Self-Review

After writing the plan, the author runs this checklist.

**1. Spec coverage** (master plan §6.10 + §12):

| Spec section | Covered by task |
|---|---|
| 6.10 Admin access (hidden URL, login, RBAC) | Tasks 1, 7, 8, 9, 10, 11 |
| 6.10.1 Dashboard (KPI + recent) | Task 14 |
| 6.10.2 Product management (list, form, fields, media, badges) | Tasks 16–20 |
| 6.10.3 Category management | Task 21 |
| 6.10.4 Campaign management (rule types, config) | Task 22 |
| 6.10.5 Offer management (list, tabs, detail, calculator, WhatsApp/email) | Tasks 23–25 |
| 6.10.6 Order management (list, status update) | Task 26 |
| 6.10.7 AI training | Task 30 (placeholder — Faz 5) |
| 6.10.8 User management | Task 29 (demo single-admin) |
| 6.10.9 Analytics | Task 31 (placeholder — Faz 5) |
| 6.10.10 Site settings (contact, social, address, WhatsApp) | Task 28 |
| 12.1 Auth strategy (email + password for admin) | Tasks 7–11 |
| 12.2 Authorization middleware | Task 9 |
| Notification system | Task 15 |
| Admin-frontend sync (§9) | Built into every action via `revalidatePath` |

All sections covered.

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or "similar to Task N" found. Each step contains full code or exact commands.

**3. Type consistency:**
- `Repository` interface method names match across `repository.ts`, `demo-repository.ts`, `supabase-repository.ts`, and all action files.
- `SessionPayload.role` is `UserRole` ("customer" | "admin" | "moderator" | "assistant") — `requireAdmin` accepts admin/moderator/assistant; `customer` is rejected.
- `OfferStatus`, `OrderStatus`, `NotificationType` consistent across types, repository, validations, server actions, and UI.
- `ProductInput` zod schema produces shape compatible with `Repository.createProduct` (extra optional fields explicitly handled).

---

# Execution Handoff

Plan complete and saved to `docs/plans/2026-05-11-faz-3-admin-panel.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, two-stage review between tasks, fast iteration on a long plan.

**2. Inline Execution** — Execute tasks in the current session using executing-plans skill, batch execution with checkpoints at sub-phase boundaries (3A, 3B, 3C, 3D).

Which approach?

