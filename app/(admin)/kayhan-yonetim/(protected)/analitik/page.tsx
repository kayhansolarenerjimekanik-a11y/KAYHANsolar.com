import { BarChart3, Eye, MessageCircle, ShoppingCart } from "lucide-react";

import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { repo } from "@/lib/data";
import { getDailyCounts, getTopProducts } from "@/lib/analytics/repository";

export default async function AdminAnalyticsPage() {
  const [pageViews, productViews, addToCarts, chatMessages, topProducts, products] =
    await Promise.all([
      getDailyCounts("page_view", 30),
      getDailyCounts("product_view", 30),
      getDailyCounts("add_to_cart", 30),
      getDailyCounts("chat_message", 30),
      getTopProducts(30, 5),
      repo.listProducts(),
    ]);

  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <BarChart3 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analitik</h1>
          <p className="mt-1 text-sm text-muted">
            Son 30 günün davranış özeti. Vercel Analytics tarayıcıda otomatik
            çalışıyor; bu sayfa kendi event tablomuzdan beslenir.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsChart data={pageViews} label="Sayfa Görüntüleme" />
        <AnalyticsChart data={productViews} label="Ürün Görüntüleme" />
        <AnalyticsChart data={addToCarts} label="Sepete Ekleme" />
        <AnalyticsChart data={chatMessages} label="AI Sohbet" />
      </div>

      <section className="rounded-2xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            En Çok Görüntülenen Ürünler (30 gün)
          </h2>
          <Eye className="h-4 w-4 text-muted" strokeWidth={2.2} />
        </header>
        {topProducts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            Henüz yeterli veri yok.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {topProducts.map((tp) => {
              const product = productById[tp.productId];
              return (
                <li
                  key={tp.productId}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span className="truncate font-medium">
                    {product?.name ?? tp.productId}
                  </span>
                  <span className="font-semibold tabular-nums text-muted">
                    {tp.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ShoppingCart}
          label="Bu hafta sepete ekleme"
          value={addToCarts.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
        <SummaryCard
          icon={MessageCircle}
          label="Bu hafta AI sohbet"
          value={chatMessages.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
        <SummaryCard
          icon={Eye}
          label="Bu hafta ürün görüntüleme"
          value={productViews.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted" strokeWidth={2.2} />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
