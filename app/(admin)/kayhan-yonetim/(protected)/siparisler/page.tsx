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
  const [orders, campaigns] = await Promise.all([
    repo.listOrders(),
    repo.listCampaigns(),
  ]);
  const campaignTitleById = new Map(campaigns.map((c) => [c.id, c.title]));
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
