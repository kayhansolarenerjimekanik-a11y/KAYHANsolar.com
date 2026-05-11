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
