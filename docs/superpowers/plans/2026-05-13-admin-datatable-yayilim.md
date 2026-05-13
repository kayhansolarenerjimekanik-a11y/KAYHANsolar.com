# Admin DataTable Yayılımı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürünler pilotunda hazırlanan `<DataTable>` ailesini dört yeni admin listesine yay — **Siparişler, Teklifler, Kampanyalar, Stok-bildirimleri**. Her sayfa arama, filtreler, kolon sıralama, sayfalama, uygun yerlerde toplu işlem ve URL-yansımalı state kazanır.

**Architecture:** Pilot pattern aynen tekrarlanıyor — her entity için (i) server action katmanı (bulk actions, gerekirse), (ii) `components/admin/<entity>-table.tsx` adında client component (kolon/filtre/sıralama/bulk tanımları + `<DataTable>` sarmalayıcısı), (iii) ilgili `page.tsx`'i `<PageHeader>` + yeni tablo komponenti kullanacak şekilde refactor. Server tarafında `repo.listX()` sonucu olduğu gibi `allRows` prop'una geçer; filtre/sıralama/sayfalama tarayıcıda `createClientFetcher` ile uygulanır.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, TypeScript strict, Tailwind 4, lucide-react, sonner, zod. **Test runner yok** — doğrulama `pnpm exec tsc --noEmit && pnpm lint` artı manuel smoke (her sayfaya tarayıcıdan gir, filtre/arama/sıralama/bulk işlem dene).

**Kapsam dışı (gerekçeli):**
- `galeri/page.tsx` — kart-grid UX (DataTable tablo paradigması değil).
- `kategoriler/page.tsx` — `CategoryManager` özel DnD bileşeni.
- `kullanicilar/page.tsx` — yalnızca aktif admin satırını gösteriyor (multi-user Faz 6+).
- `bildirimler/`, `ayarlar/`, `analitik/`, `ai-egitim/` — liste değil.

**Verification per task:**
```
pnpm exec tsc --noEmit && pnpm lint
```
Sıfır hata, sıfır uyarı vermeli. Page refactor tasklarında ek olarak manuel smoke:
1. `pnpm dev` çalışırken `/kayhan-yonetim/<sayfa>` aç.
2. Toolbar arama, her filtre, en az iki sıralama, sayfa değişimi, (varsa) bir bulk action başarıyla çalışmalı.
3. URL'de `?q=...&durum=...&siralama=...&sayfa=...` doğru reflect edilmeli.

---

## Task 1: Sipariş bulk action — `bulkSetOrderStatusAction`

Orders repo'sunda `updateOrderStatus` var, `delete` yok. Bulk sadece statü değişimi olabilir. Email side-effect mevcut `updateOrderStatusAction` ile aynı (per-row try/catch ile yutuluyor).

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/orders-bulk.ts`

- [ ] **Step 1: Action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/orders-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";
import { sendOrderStatusEmail } from "@/lib/email/resend";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

const validStatuses: OrderStatus[] = [
  "pending",
  "whatsapp_sent",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function bulkSetOrderStatusAction(
  ids: string[],
  status: OrderStatus,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };
  if (!validStatuses.includes(status)) {
    return { ok: false, succeeded: 0, failed: ids.length };
  }

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const updated = await repo.updateOrderStatus(id, status);
      try {
        await sendOrderStatusEmail(updated);
      } catch (err) {
        console.error("[email] sendOrderStatusEmail failed", err);
      }
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) {
    revalidatePath("/kayhan-yonetim/siparisler");
    revalidatePath("/kayhan-yonetim");
  }
  return { ok: failed === 0, succeeded, failed };
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/orders-bulk.ts
git commit -m "feat(admin/orders-bulk): toplu statu degisimi server action"
```

---

## Task 2: `<OrdersTable>` client component

**Files:**
- Create: `components/admin/orders-table.tsx`

- [ ] **Step 1: Component dosyasını oluştur**

```tsx
// components/admin/orders-table.tsx
"use client";

import { CheckCircle2, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { bulkSetOrderStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/orders-bulk";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { formatPrice } from "@/lib/utils";
import type { Campaign, Order } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "Tüm durumlar" },
  { value: "pending", label: "Beklemede" },
  { value: "whatsapp_sent", label: "WhatsApp Gönderildi" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "preparing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargolandı" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal" },
];

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: Order[];
  campaigns: Campaign[];
}

export function OrdersTable({ allRows, campaigns }: Props) {
  const campaignTitleById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.title])),
    [campaigns],
  );

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "orderNumber",
        header: "Sipariş No",
        sortable: true,
        className: "font-mono text-xs",
        cell: (o) => o.orderNumber,
      },
      {
        id: "customer",
        header: "Müşteri",
        cell: (o) => (
          <>
            <p className="font-medium">{o.customerName}</p>
            <p className="text-xs text-subtle">{o.customerPhone}</p>
          </>
        ),
      },
      {
        id: "items",
        header: "Adet",
        className: "hidden md:table-cell text-muted",
        cell: (o) => `${o.items.reduce((s, i) => s + i.quantity, 0)} ürün`,
      },
      {
        id: "toplam",
        header: "Toplam",
        sortable: true,
        align: "right",
        className: "tabular-nums",
        cell: (o) => (
          <>
            {formatPrice(o.total)}
            {o.discountAmount > 0 && (
              <p className="text-xs font-medium text-success">
                −{formatPrice(o.discountAmount)}
                {o.appliedCampaignIds.length > 0 && (
                  <span className="ml-1 text-subtle">
                    (
                    {o.appliedCampaignIds
                      .map((id) => campaignTitleById.get(id) ?? "kampanya")
                      .join(", ")}
                    )
                  </span>
                )}
              </p>
            )}
          </>
        ),
      },
      {
        id: "status",
        header: "Durum",
        className: "w-44",
        cell: (o) => <OrderStatusControl orderId={o.id} current={o.status} />,
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (o) => fmt(o.createdAt),
      },
    ],
    [campaignTitleById],
  );

  const filters = useMemo<FilterDef<Order>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Sipariş no, müşteri veya telefon ara…",
        searchAccessor: (o) =>
          `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.customerEmail ?? ""}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: STATUS_OPTIONS,
        predicate: (o, v) => o.status === v,
      },
    ],
    [],
  );

  const sorts = useMemo<SortDef<Order>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni siparişler",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski siparişler",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
      {
        id: "toplam-azalan",
        label: "Toplam azalan",
        compare: (a, b) => b.total - a.total,
      },
      {
        id: "toplam-artan",
        label: "Toplam artan",
        compare: (a, b) => a.total - b.total,
      },
      {
        id: "orderNumber-az",
        label: "Sipariş no A→Z",
        compare: (a, b) => a.orderNumber.localeCompare(b.orderNumber, "tr"),
      },
      {
        id: "orderNumber-za",
        label: "Sipariş no Z→A",
        compare: (a, b) => b.orderNumber.localeCompare(a.orderNumber, "tr"),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Order>[]>(
    () => [
      {
        id: "confirm",
        label: "Onaylandı yap",
        icon: CheckCircle2,
        run: async (rows) => {
          const res = await bulkSetOrderStatusAction(
            rows.map((r) => r.id),
            "confirmed",
          );
          if (res.ok) toast.success(`${res.succeeded} sipariş onaylandı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "ship",
        label: "Kargolandı yap",
        icon: Truck,
        run: async (rows) => {
          const res = await bulkSetOrderStatusAction(
            rows.map((r) => r.id),
            "shipped",
          );
          if (res.ok) toast.success(`${res.succeeded} sipariş kargolandı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Order>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(o) => o.id}
      emptyState={{
        icon: CheckCircle2,
        title: "Henüz sipariş yok",
        description: "Müşteri sepetinden sipariş geldiğinde burada listelenir.",
      }}
      emptyFilteredState={{
        icon: CheckCircle2,
        title: "Bu kriterde sipariş bulunamadı",
        description: "Arama veya filtreyi değiştirip tekrar dene.",
        action: (
          <Link
            href="/kayhan-yonetim/siparisler"
            className="text-xs font-medium text-lime-dark hover:underline dark:text-lime-primary"
          >
            Tümünü göster
          </Link>
        ),
      }}
    />
  );
}
```

> Not: `Campaign` ve `Order` tipleri `@/types`'tan re-export. `repo.listCampaigns()` aktif/pasif ayrımı yapmıyor; tüm kampanyalar gelir — sadece ID→başlık mapping için kullanıyoruz.

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/orders-table.tsx
git commit -m "feat(admin/orders): OrdersTable DataTable sarmaliyici"
```

---

## Task 3: `siparisler/page.tsx` refactor

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/siparisler/page.tsx`

- [ ] **Step 1: Page'i yeniden yaz**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/siparisler/page.tsx
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/page-header";
import { repo } from "@/lib/data";

export default async function AdminOrdersPage() {
  const [orders, campaigns] = await Promise.all([
    repo.listOrders(),
    repo.listCampaigns(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Siparişler" subtitle={`${orders.length} sipariş`} />
      <OrdersTable allRows={orders} campaigns={campaigns} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

1. `pnpm dev` çalışıyor, `/kayhan-yonetim/siparisler` aç.
2. Toolbar'daki arama ile bir müşteri adı ara → sonuç süzülmeli.
3. Durum tab'larına tıkla → URL `?durum=confirmed` vb. olmalı, sonuçlar süzülmeli.
4. "Toplam" kolonuna tıkla → sıralama değişmeli, URL `?siralama=toplam-azalan`.
5. En az 2 satır seç → bulk bar görünmeli → "Onaylandı yap" çalışmalı, toast görünmeli.
6. Sayfa boyutunu 25'in üstüne çıkartmak için yeterli sipariş yoksa skip; varsa sayfa 2'ye geç → URL `?sayfa=2`.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/kayhan-yonetim/(protected)/siparisler/page.tsx
git commit -m "feat(admin/siparisler): DataTable kullanimi"
```

---

## Task 4: Teklif bulk action — `bulkSetOfferStatusAction`

Repo'da `deleteOffer` **yok** — bulk silme yapılmıyor; bulk yalnızca statü değişimi. Mevcut tekil `updateOfferAction` email gönderim/respondedAt detayını barındırıyor; toplu işlem için sadeleştirilmiş versiyon (email yok, respondedAt değişiminde yine ayarla).

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/offers-bulk.ts`

- [ ] **Step 1: Action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/offers-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OfferStatus } from "@/lib/data/types";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

const validStatuses: OfferStatus[] = ["new", "in_review", "responded", "closed"];

export async function bulkSetOfferStatusAction(
  ids: string[],
  status: OfferStatus,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };
  if (!validStatuses.includes(status)) {
    return { ok: false, succeeded: 0, failed: ids.length };
  }

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const patch: Parameters<typeof repo.updateOffer>[1] = { status };
      if (status === "responded") {
        patch.respondedAt = new Date().toISOString();
      }
      await repo.updateOffer(id, patch);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) {
    revalidatePath("/kayhan-yonetim/teklifler");
    revalidatePath("/kayhan-yonetim");
  }
  return { ok: failed === 0, succeeded, failed };
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/offers-bulk.ts
git commit -m "feat(admin/offers-bulk): toplu statu degisimi server action"
```

---

## Task 5: `<OffersTable>` client component

Mevcut sayfanın `?status=...` link-tab pattern'i `durum` filtresine taşınıyor — link yerine DataTable tabs filtresi kullanılacak (URL anahtarı `durum`, kalan param'lar `q`, `siralama`, `sayfa`).

**Files:**
- Create: `components/admin/offers-table.tsx`

- [ ] **Step 1: Component dosyasını oluştur**

```tsx
// components/admin/offers-table.tsx
"use client";

import { Eye, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { bulkSetOfferStatusAction } from "@/app/(admin)/kayhan-yonetim/actions/offers-bulk";
import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import type { Offer } from "@/lib/data/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "in_review", label: "İnceleniyor" },
  { value: "responded", label: "Yanıtlandı" },
  { value: "closed", label: "Kapalı" },
];

const LOCATION_LABEL: Record<string, string> = {
  roof: "Çatı",
  land: "Arazi",
  other: "Diğer",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: Offer[];
}

export function OffersTable({ allRows }: Props) {
  const columns = useMemo<ColumnDef<Offer>[]>(
    () => [
      {
        id: "customer",
        header: "Müşteri",
        cell: (o) => (
          <>
            <Link
              href={`/kayhan-yonetim/teklifler/${o.id}`}
              className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
            >
              {o.fullName}
            </Link>
            <p className="text-xs text-subtle">{o.phone}</p>
          </>
        ),
      },
      {
        id: "konum",
        header: "Konum",
        className: "hidden md:table-cell text-muted",
        cell: (o) => `${o.city} / ${o.district}`,
      },
      {
        id: "yer",
        header: "Yer",
        className: "hidden md:table-cell text-muted",
        cell: (o) => LOCATION_LABEL[o.installationLocation] ?? "—",
      },
      {
        id: "status",
        header: "Durum",
        cell: (o) => <OfferStatusPill status={o.status} />,
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (o) => fmt(o.createdAt),
      },
    ],
    [],
  );

  const filters = useMemo<FilterDef<Offer>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "İsim, telefon, e-posta veya il/ilçe ara…",
        searchAccessor: (o) =>
          `${o.fullName} ${o.phone} ${o.email ?? ""} ${o.city} ${o.district}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: STATUS_OPTIONS,
        predicate: (o, v) => o.status === v,
      },
      {
        id: "yer",
        type: "chips",
        label: "Kurulum yeri",
        options: [
          { value: "", label: "Hepsi" },
          { value: "roof", label: "Çatı" },
          { value: "land", label: "Arazi" },
          { value: "other", label: "Diğer" },
        ],
        predicate: (o, v) => o.installationLocation === v,
      },
    ],
    [],
  );

  const sorts = useMemo<SortDef<Offer>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni başvurular",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski başvurular",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Offer>[]>(
    () => [
      {
        id: "in_review",
        label: "İnceleniyor yap",
        icon: Eye,
        run: async (rows) => {
          const res = await bulkSetOfferStatusAction(
            rows.map((r) => r.id),
            "in_review",
          );
          if (res.ok) toast.success(`${res.succeeded} teklif incelemeye alındı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "closed",
        label: "Kapat",
        icon: FileText,
        run: async (rows) => {
          const res = await bulkSetOfferStatusAction(
            rows.map((r) => r.id),
            "closed",
          );
          if (res.ok) toast.success(`${res.succeeded} teklif kapatıldı.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Offer>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(o) => o.id}
      emptyState={{
        icon: FileText,
        title: "Henüz teklif yok",
        description: "Müşteri teklif formu doldurduğunda burada listelenir.",
      }}
      emptyFilteredState={{
        icon: FileText,
        title: "Bu kriterde teklif bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/offers-table.tsx
git commit -m "feat(admin/offers): OffersTable DataTable sarmaliyici"
```

---

## Task 6: `teklifler/page.tsx` refactor

Eski `?status=` link-tab kaldırılıyor — `?durum=` DataTable filtresine geçti. Mevcut bookmark'lar bozulmasın diye `?status=` parametresi de okunup `?durum=`'e yönlendirilecek (geriye uyum mini-shim).

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx`

- [ ] **Step 1: Page'i yeniden yaz**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OffersTable } from "@/components/admin/offers-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

interface Props {
  searchParams: Promise<{ status?: string; durum?: string }>;
}

export default async function AdminOffersPage({ searchParams }: Props) {
  const params = await searchParams;
  // Geriye uyum: eski ?status=... linkleri ?durum=...'a yonlendir.
  if (params.status && !params.durum) {
    redirect(`/kayhan-yonetim/teklifler?durum=${params.status}`);
  }

  const offers = await repo.listOffers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teklifler"
        subtitle={`${offers.length} toplam`}
        action={
          <Link href="/kayhan-yonetim/teklifler/yeni">
            <Button size="sm" variant="primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Teklif
            </Button>
          </Link>
        }
      />
      <OffersTable allRows={offers} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

1. `/kayhan-yonetim/teklifler` aç → tüm teklifler listelenmeli.
2. Bir durum tab'ına tıkla → URL `?durum=in_review` olmalı, satırlar süzülmeli.
3. Eski URL `?status=new` ziyaret et → `?durum=new`'e redirect olmalı.
4. Arama yap, sıralama değiştir, en az 2 satır seç → bulk "İnceleniyor yap" çalışmalı.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx
git commit -m "feat(admin/teklifler): DataTable kullanimi"
```

---

## Task 7: Kampanya bulk action — `bulkSetCampaignActiveAction` + `bulkDeleteCampaignsAction`

Repo'da full CRUD var → bulk activate/deactivate + delete uygulanabilir. `bust()` helper'ı mevcut `actions/campaigns.ts`'de private; aynı revalidate setini dosya içinde tekrar yazıyoruz (slug bilmediğimiz için `/magaza?kampanya=...` revalidate edemiyoruz; tüm magaza zaten revalidate ediliyor).

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/campaigns-bulk.ts`

- [ ] **Step 1: Action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/campaigns-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/kampanyalar");
  revalidatePath("/kayhan-yonetim");
}

export async function bulkSetCampaignActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.updateCampaign(id, { isActive });
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteCampaignsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteCampaign(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/campaigns-bulk.ts
git commit -m "feat(admin/campaigns-bulk): toplu aktif/pasif/sil server action"
```

---

## Task 8: `<CampaignsTable>` client component

**Files:**
- Create: `components/admin/campaigns-table.tsx`

- [ ] **Step 1: Component dosyasını oluştur**

```tsx
// components/admin/campaigns-table.tsx
"use client";

import { Eye, EyeOff, Megaphone, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  bulkDeleteCampaignsAction,
  bulkSetCampaignActiveAction,
} from "@/app/(admin)/kayhan-yonetim/actions/campaigns-bulk";
import { CampaignRowActions } from "@/components/admin/campaign-row-actions";
import { Badge } from "@/components/ui/badge";
import type { Campaign } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

interface Props {
  allRows: Campaign[];
}

export function CampaignsTable({ allRows }: Props) {
  const ruleTypes = useMemo(() => {
    const set = new Set<string>();
    for (const c of allRows) set.add(c.ruleType);
    return Array.from(set).sort();
  }, [allRows]);

  const columns = useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        id: "title",
        header: "Başlık",
        sortable: true,
        className: "font-medium",
        cell: (c) => c.title,
      },
      {
        id: "slug",
        header: "Slug",
        className: "hidden md:table-cell text-muted",
        cell: (c) => `/${c.slug}`,
      },
      {
        id: "ruleType",
        header: "Kural",
        className: "hidden md:table-cell text-muted",
        cell: (c) => c.ruleType,
      },
      {
        id: "status",
        header: "Durum",
        cell: (c) =>
          c.isActive ? <Badge tone="success">Aktif</Badge> : <Badge>Pasif</Badge>,
      },
      {
        id: "homepage",
        header: "Anasayfa",
        className: "hidden sm:table-cell",
        cell: (c) =>
          c.displayOnHomepage ? <Badge tone="lime">Evet</Badge> : <Badge>Hayır</Badge>,
      },
      {
        id: "actions",
        header: "İşlem",
        className: "w-32 text-right",
        cell: (c) => <CampaignRowActions id={c.id} title={c.title} />,
      },
    ],
    [],
  );

  const filters = useMemo<FilterDef<Campaign>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Başlık veya slug ara…",
        searchAccessor: (c) => `${c.title} ${c.slug}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: [
          { value: "", label: "Tümü" },
          { value: "aktif", label: "Aktif" },
          { value: "pasif", label: "Pasif" },
        ],
        predicate: (c, v) =>
          v === "aktif" ? c.isActive : v === "pasif" ? !c.isActive : true,
      },
      {
        id: "anasayfa",
        type: "chips",
        label: "Anasayfa",
        options: [
          { value: "", label: "Hepsi" },
          { value: "evet", label: "Anasayfada" },
          { value: "hayir", label: "Anasayfada değil" },
        ],
        predicate: (c, v) =>
          v === "evet" ? c.displayOnHomepage : v === "hayir" ? !c.displayOnHomepage : true,
      },
      {
        id: "kural",
        type: "select",
        label: "Kural tipi",
        options: [
          { value: "", label: "Tüm kurallar" },
          ...ruleTypes.map((r) => ({ value: r, label: r })),
        ],
        predicate: (c, v) => c.ruleType === v,
      },
    ],
    [ruleTypes],
  );

  const sorts = useMemo<SortDef<Campaign>[]>(
    () => [
      {
        id: "title-az",
        label: "Başlık A→Z",
        compare: (a, b) => a.title.localeCompare(b.title, "tr"),
      },
      {
        id: "title-za",
        label: "Başlık Z→A",
        compare: (a, b) => b.title.localeCompare(a.title, "tr"),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<Campaign>[]>(
    () => [
      {
        id: "activate",
        label: "Aktif yap",
        icon: Eye,
        run: async (rows) => {
          const res = await bulkSetCampaignActiveAction(rows.map((r) => r.id), true);
          if (res.ok) toast.success(`${res.succeeded} kampanya aktif edildi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "deactivate",
        label: "Pasif yap",
        icon: EyeOff,
        run: async (rows) => {
          const res = await bulkSetCampaignActiveAction(rows.map((r) => r.id), false);
          if (res.ok) toast.success(`${res.succeeded} kampanya pasifleştirildi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "delete",
        label: "Sil",
        icon: Trash2,
        variant: "danger",
        confirm: {
          title: "Toplu silme",
          description: (n) => `${n} kampanya silinecek. Bu işlem geri alınamaz.`,
          confirmLabel: "Sil",
        },
        run: async (rows) => {
          const res = await bulkDeleteCampaignsAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} kampanya silindi.`);
          else toast.warning(`${res.succeeded} silindi, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Campaign>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="title-az"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(c) => c.id}
      emptyState={{
        icon: Megaphone,
        title: "Henüz kampanya yok",
        description: "İlk kampanyayı ekleyerek mağazada görünür hale getir.",
      }}
      emptyFilteredState={{
        icon: Megaphone,
        title: "Bu kriterde kampanya bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/campaigns-table.tsx
git commit -m "feat(admin/campaigns): CampaignsTable DataTable sarmaliyici"
```

---

## Task 9: `kampanyalar/page.tsx` refactor

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/kampanyalar/page.tsx`

- [ ] **Step 1: Page'i yeniden yaz**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/kampanyalar/page.tsx
import { Plus } from "lucide-react";
import Link from "next/link";

import { CampaignsTable } from "@/components/admin/campaigns-table";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminCampaignsPage() {
  const campaigns = await repo.listCampaigns();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kampanyalar"
        subtitle={`${campaigns.length} kampanya`}
        action={
          <Link href="/kayhan-yonetim/kampanyalar/yeni">
            <Button size="sm">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Kampanya
            </Button>
          </Link>
        }
      />
      <CampaignsTable allRows={campaigns} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

1. `/kayhan-yonetim/kampanyalar` aç → tüm kampanyalar listelenmeli.
2. Arama, durum tabs, anasayfa chips, kural select filtreleri dene.
3. Başlık kolonuna tıkla → sıralama A→Z / Z→A toggle olmalı.
4. En az 2 satır seç → "Aktif yap" / "Pasif yap" / "Sil" çalışmalı (sil için onay diyaloğu görünmeli).

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/kayhan-yonetim/(protected)/kampanyalar/page.tsx
git commit -m "feat(admin/kampanyalar): DataTable kullanimi"
```

---

## Task 10: Stok aboneliği bulk action — `bulkMarkStockNotifiedAction` + `bulkDeleteStockSubscriptionsAction`

Repo'da `markStockSubscriptionNotified` ve `deleteStockSubscription` var. İki bulk action yeterli.

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk.ts`

- [ ] **Step 1: Action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

function revalidate() {
  revalidatePath("/kayhan-yonetim/stok-bildirimleri");
  revalidatePath("/kayhan-yonetim");
}

export async function bulkMarkStockNotifiedAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.markStockSubscriptionNotified(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteStockSubscriptionsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteStockSubscription(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk.ts
git commit -m "feat(admin/stock-bulk): toplu gonderildi/sil server action"
```

---

## Task 11: `<StockSubscriptionsTable>` client component

Pending/Sent ayrımını ayrı listeler yerine tek tabloda **durum** filtresi olarak veriyoruz. Ürün adı için page server'da `productById` map'ini hazırlayıp prop olarak geçiyor (üst düzey `Map`).

**Files:**
- Create: `components/admin/stock-subscriptions-table.tsx`

- [ ] **Step 1: Component dosyasını oluştur**

```tsx
// components/admin/stock-subscriptions-table.tsx
"use client";

import { Bell, BellRing, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  bulkDeleteStockSubscriptionsAction,
  bulkMarkStockNotifiedAction,
} from "@/app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk";
import { Badge } from "@/components/ui/badge";
import type { StockSubscription } from "@/lib/data/types";
import type { Product } from "@/types";

import { createClientFetcher } from "./data-table/client-fetcher";
import { DataTable } from "./data-table/data-table";
import type { BulkAction, ColumnDef, FilterDef, SortDef } from "./data-table/types";

const PAGE_SIZE = 25;

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  allRows: StockSubscription[];
  productById: Record<string, Product | undefined>;
}

export function StockSubscriptionsTable({ allRows, productById }: Props) {
  const productName = (id: string) => productById[id]?.name ?? "Bilinmeyen ürün";
  const productSlug = (id: string) => productById[id]?.slug ?? "";

  const columns = useMemo<ColumnDef<StockSubscription>[]>(
    () => [
      {
        id: "product",
        header: "Ürün",
        cell: (s) => {
          const slug = productSlug(s.productId);
          const label = productName(s.productId);
          return slug ? (
            <Link
              href={`/urun/${slug}`}
              className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
            >
              {label}
            </Link>
          ) : (
            <span className="font-medium">{label}</span>
          );
        },
      },
      {
        id: "channel",
        header: "Kanal",
        className: "text-muted",
        cell: (s) =>
          s.email ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Mail className="h-3.5 w-3.5" strokeWidth={2.2} />
              {s.email}
            </span>
          ) : s.pushSubscriptionJson ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <BellRing className="h-3.5 w-3.5" strokeWidth={2.2} />
              Web Push
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "status",
        header: "Durum",
        cell: (s) =>
          s.isNotified ? (
            <Badge tone="success">Gönderildi</Badge>
          ) : (
            <Badge tone="warning">Bekliyor</Badge>
          ),
      },
      {
        id: "tarih",
        header: "Tarih",
        sortable: true,
        className: "hidden sm:table-cell text-xs text-subtle",
        cell: (s) => fmt(s.createdAt),
      },
    ],
    // productById tek tek değişiklik göstermez (server-render snapshot); ESLint react-hooks
    // exhaustive-deps tetiklenirse closures için stabil referans bekliyoruz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productById],
  );

  const filters = useMemo<FilterDef<StockSubscription>[]>(
    () => [
      {
        id: "q",
        type: "search",
        label: "Arama",
        placeholder: "Ürün adı veya e-posta ara…",
        searchAccessor: (s) => `${productName(s.productId)} ${s.email ?? ""}`,
      },
      {
        id: "durum",
        type: "tabs",
        label: "Durum",
        options: [
          { value: "", label: "Tümü" },
          { value: "bekliyor", label: "Bekliyor" },
          { value: "gonderildi", label: "Gönderildi" },
        ],
        predicate: (s, v) =>
          v === "bekliyor" ? !s.isNotified : v === "gonderildi" ? s.isNotified : true,
      },
      {
        id: "kanal",
        type: "chips",
        label: "Kanal",
        options: [
          { value: "", label: "Hepsi" },
          { value: "email", label: "E-posta" },
          { value: "push", label: "Web Push" },
        ],
        predicate: (s, v) =>
          v === "email" ? Boolean(s.email) : v === "push" ? Boolean(s.pushSubscriptionJson) : true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productById],
  );

  const sorts = useMemo<SortDef<StockSubscription>[]>(
    () => [
      {
        id: "tarih-yeni",
        label: "Yeni abonelikler",
        compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      },
      {
        id: "tarih-eski",
        label: "Eski abonelikler",
        compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
      },
    ],
    [],
  );

  const fetcher = useMemo(
    () => createClientFetcher({ rows: allRows, filters, sorts, pageSize: PAGE_SIZE }),
    [allRows, filters, sorts],
  );

  const bulkActions = useMemo<BulkAction<StockSubscription>[]>(
    () => [
      {
        id: "mark-notified",
        label: "Gönderildi işaretle",
        icon: Bell,
        run: async (rows) => {
          const res = await bulkMarkStockNotifiedAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} abonelik gönderildi olarak işaretlendi.`);
          else toast.warning(`${res.succeeded} başarılı, ${res.failed} hatalı.`);
        },
      },
      {
        id: "delete",
        label: "Sil",
        icon: Trash2,
        variant: "danger",
        confirm: {
          title: "Toplu silme",
          description: (n) => `${n} abonelik silinecek. Bu işlem geri alınamaz.`,
          confirmLabel: "Sil",
        },
        run: async (rows) => {
          const res = await bulkDeleteStockSubscriptionsAction(rows.map((r) => r.id));
          if (res.ok) toast.success(`${res.succeeded} abonelik silindi.`);
          else toast.warning(`${res.succeeded} silindi, ${res.failed} hatalı.`);
        },
      },
    ],
    [],
  );

  return (
    <DataTable<StockSubscription>
      allRows={allRows}
      columns={columns}
      filters={filters}
      sorts={sorts}
      defaultSort="tarih-yeni"
      fetcher={fetcher}
      pageSize={PAGE_SIZE}
      bulkActions={bulkActions}
      getRowId={(s) => s.id}
      emptyState={{
        icon: Bell,
        title: "Henüz abonelik yok",
        description: "Müşteri ürün sayfasından 'Stoğa girince haber ver' tıklayınca burada listelenir.",
      }}
      emptyFilteredState={{
        icon: Bell,
        title: "Bu kriterde abonelik bulunamadı",
        description: "Arama veya filtreleri değiştirip tekrar dene.",
      }}
    />
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/stock-subscriptions-table.tsx
git commit -m "feat(admin/stock): StockSubscriptionsTable DataTable sarmaliyici"
```

---

## Task 12: `stok-bildirimleri/page.tsx` refactor

Eski yapı `Bell` iconlu header + pending/sent iki ayrı bölüm. Yeni yapı `<PageHeader>` + tek `<StockSubscriptionsTable>` + alttaki demo bilgi bandı.

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/page.tsx`

- [ ] **Step 1: Page'i yeniden yaz**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/page.tsx
import { PageHeader } from "@/components/admin/page-header";
import { StockSubscriptionsTable } from "@/components/admin/stock-subscriptions-table";
import { repo } from "@/lib/data";

export default async function AdminStockNotificationsPage() {
  const [subscriptions, products] = await Promise.all([
    repo.listStockSubscriptions(),
    repo.listProducts(),
  ]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  const pending = subscriptions.filter((s) => !s.isNotified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok Bildirimleri"
        subtitle={`${subscriptions.length} abone — ${pending} bekliyor`}
      />
      <StockSubscriptionsTable allRows={subscriptions} productById={productById} />
      <div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
        <span className="font-semibold text-foreground">Demo modu:</span>{" "}
        Bildirimler otomatik &quot;Gönderildi&quot; olarak işaretlenir; gerçek
        e-posta/push iletimi Resend ve VAPID anahtarları sağlandığında
        aktive olacak.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

1. `/kayhan-yonetim/stok-bildirimleri` aç.
2. Subtitle "X abone — Y bekliyor" doğru sayıları göstermeli.
3. Durum tab'ları (Bekliyor/Gönderildi) listeleri filtrelemeli.
4. Tarih kolonuna tıkla → sıralama değişmeli.
5. Bekleyen 2+ abonelik seç → "Gönderildi işaretle" çalışmalı, satırlar Gönderildi olmalı.
6. Bir aboneliği sil → silinmeli.

> Not: Demo modda iken aboneliklerin nasıl üretileceği — public ürün detay sayfasından "Stoğa girince haber ver" yoksa, smoke için manuel veri gerekebilir. `lib/mock/data.ts` `stockSubscriptions` üreten yer varsa kontrol et; yoksa smoke için en az bir abonelik oluşturmak adına public sayfadan abonelik ekle.

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/page.tsx
git commit -m "feat(admin/stok-bildirimleri): DataTable kullanimi"
```

---

## Task 13: Tüm sayfa toplu doğrulama + verification raporu

**Files:**
- Create: `docs/superpowers/reports/2026-05-13-admin-datatable-yayilim-verification.md`

- [ ] **Step 1: Toplu TypeScript + lint + (varsa) build**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

(Opsiyonel — build edebilirsen): `pnpm build` → success.

- [ ] **Step 2: Sayfa-sayfa smoke checklist**

Dev sunucusunu başlat (`pnpm dev`) ve aşağıdakini elden geçir; her sayfa için ✓/✗ işaretle:

```
- [ ] /kayhan-yonetim/siparisler   — arama, durum tabs, sıralama, bulk onayla
- [ ] /kayhan-yonetim/teklifler    — arama, durum tabs, eski ?status= redirect, bulk
- [ ] /kayhan-yonetim/kampanyalar  — arama, tüm 3 filtre, başlık sıralama, bulk sil onay
- [ ] /kayhan-yonetim/stok-bildirimleri — durum tabs, kanal chips, bulk gönderildi
- [ ] /kayhan-yonetim/urunler      — pilot, regresyon kontrol (eski davranış aynı kalmalı)
```

- [ ] **Step 3: Verification raporu yaz**

```markdown
# Admin DataTable Yayılımı — Verification Raporu

**Tarih:** 2026-05-13
**Plan:** docs/superpowers/plans/2026-05-13-admin-datatable-yayilim.md

## Kapsam
- Siparişler, Teklifler, Kampanyalar, Stok-bildirimleri — DataTable'a geçti.
- Galeri, Kategoriler, Kullanıcılar — kapsam dışı (gerekçeler planda).

## Sonuçlar
- TypeScript: 0 hata
- ESLint: 0 uyarı
- Smoke testi (5 sayfa) → tamamı ✓
- Eski `?status=` URL'leri `/teklifler` sayfasında `?durum=`'e redirect edildi.

## Yan etkiler
- 4 yeni server action dosyası (`*-bulk.ts`).
- 4 yeni client component (`*-table.tsx`).
- 4 sayfa refactor (page.tsx).
- 1 mevcut `PageHeader` componenti her sayfada kullanılıyor.

## İlişkili commit'ler
[git log --oneline çıktısını buraya yapıştır]
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/reports/2026-05-13-admin-datatable-yayilim-verification.md
git commit -m "docs: admin datatable yayilim verification raporu"
```

- [ ] **Step 5: Memory güncellemesi**

`C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\` altında yeni bir project memory dosyası oluştur (örn. `project_admin_datatable_yayilim.md`) — pilotun 4 sayfaya yayıldığını ve hangi sayfaların kapsam dışı kaldığını kısa not olarak yaz. `MEMORY.md` indeksine satır ekle.

---

## Self-Review

- **Spec coverage:** Plan, "DataTable expansion to remaining admin tables" hedefini 4 sayfa için tamamen kapsıyor; galeri/kategoriler/kullanıcılar kapsam dışı ve gerekçeli.
- **Placeholder scan:** Her task tam kod içeriyor; "TBD / TODO / similar to" yok.
- **Type consistency:** Tüm `BulkResult` aynı şekil; `Fetcher`, `ColumnDef`, `FilterDef`, `SortDef`, `BulkAction` pilot tiplerinden import ediliyor; `OrderStatus` ve `OfferStatus` `@/lib/data/types`'tan geliyor.
- **URL parametre tutarlılığı:** Tüm tablolarda `q`, durum filtresi `durum`, sıralama `siralama`, sayfa `sayfa` — pilotla aynı.
- **Bulk action güvenliği:** Her bulk action `requireAdmin()` ile başlıyor; per-row try/catch ile partial failure raporu döner.
