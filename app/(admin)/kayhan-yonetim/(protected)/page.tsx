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
