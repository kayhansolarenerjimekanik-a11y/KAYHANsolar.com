import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Hesabım",
};

export default function HesabimPage() {
  return (
    <PagePlaceholder
      title="Hesabım"
      description="Giriş yap, sipariş geçmişini görüntüle, kayıtlı adreslerini yönet — müşteri hesabı production deploy'unda (Faz 6) aktif olacak. Şimdilik sepetinizi tarayıcınız hatırlıyor."
      phase="Faz 6 — Production Deploy ile birlikte"
      primaryCta={{ href: "/magaza", label: "Mağazaya Göz At" }}
    />
  );
}
