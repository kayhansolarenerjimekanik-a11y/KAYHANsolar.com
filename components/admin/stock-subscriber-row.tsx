import type { Product } from "@/types";
import type { StockSubscription } from "@/lib/data/types";

import { Badge } from "@/components/ui/badge";

interface Props {
  subscription: StockSubscription;
  product?: Product;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockSubscriberRow({ subscription, product }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {product?.name ?? subscription.productId}
        </p>
        <p className="text-xs text-muted">
          {subscription.email ?? "Push aboneliği"} · {fmt(subscription.createdAt)}
        </p>
      </div>
      {subscription.isNotified ? (
        <Badge tone="success">Gönderildi</Badge>
      ) : product && product.stockQuantity > 0 ? (
        <Badge tone="lime">Gönderime hazır</Badge>
      ) : (
        <Badge tone="warning">Stok bekleniyor</Badge>
      )}
    </li>
  );
}
