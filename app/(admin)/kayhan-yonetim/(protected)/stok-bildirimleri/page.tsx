import { Bell } from "lucide-react";

import { StockSubscriberRow } from "@/components/admin/stock-subscriber-row";
import { repo } from "@/lib/data";

export default async function AdminStockNotificationsPage() {
  const [subscriptions, products] = await Promise.all([
    repo.listStockSubscriptions(),
    repo.listProducts(),
  ]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  const pending = subscriptions.filter((s) => !s.isNotified);
  const sent = subscriptions.filter((s) => s.isNotified);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stok Bildirimleri
          </h1>
          <p className="mt-1 text-sm text-muted">
            {subscriptions.length} abone — Ürün stoğa girdiğinde otomatik
            bildirim dispatch edilir.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Bekleyen Abonelikler</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-elevated p-6 text-center text-sm text-muted">
            Bekleyen abonelik yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((s) => (
              <StockSubscriberRow
                key={s.id}
                subscription={s}
                product={productById[s.productId]}
              />
            ))}
          </ul>
        )}
      </section>

      {sent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Gönderilenler
          </h2>
          <ul className="space-y-2">
            {sent.map((s) => (
              <StockSubscriberRow
                key={s.id}
                subscription={s}
                product={productById[s.productId]}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
        <span className="font-semibold text-foreground">Demo modu:</span>{" "}
        Bildirimler otomatik &quot;Gönderildi&quot; olarak işaretlenir; gerçek
        e-posta/push iletimi Resend ve VAPID anahtarları sağlandığında
        aktive olacak.
      </div>
    </div>
  );
}
