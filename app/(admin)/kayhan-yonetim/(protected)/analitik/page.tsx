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
