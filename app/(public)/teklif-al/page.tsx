import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Teklif Al",
  description:
    "Sistem ihtiyaçlarınıza özel ücretsiz teklif. Çatı, arazi ve işletme için.",
};

export default function TeklifAlPage() {
  return (
    <PagePlaceholder
      title="Ücretsiz Teklif Formu"
      description="Çok adımlı teklif formu, medya yükleme, cihaz hesaplaması ve KVKK onayı dahil tüm akış Faz 4'te aktive edilecek. Şimdilik WhatsApp üzerinden bizimle iletişime geçebilirsiniz."
      phase="Faz 4 — Gelişmiş Özellikler bölümünde detaylanacak"
      primaryCta={{ href: "/iletisim", label: "Bizimle İletişime Geç" }}
    />
  );
}
