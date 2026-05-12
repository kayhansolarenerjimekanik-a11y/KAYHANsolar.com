import Link from "next/link";

import { OfferCreateForm } from "@/components/admin/offer-create-form";

export default function NewOfferPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/kayhan-yonetim/teklifler"
          className="text-xs text-muted hover:text-foreground"
        >
          ← Tekliflere dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Yeni Teklif (Manuel Kayıt)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Telefonla gelen müşteri için hızlı kayıt formu. Müşterinin e-postası
          girilirse otomatik &quot;kayıt alındı&quot; bildirimi gönderilir.
        </p>
      </header>

      <OfferCreateForm />
    </div>
  );
}
