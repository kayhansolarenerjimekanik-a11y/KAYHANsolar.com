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
