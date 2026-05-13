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
