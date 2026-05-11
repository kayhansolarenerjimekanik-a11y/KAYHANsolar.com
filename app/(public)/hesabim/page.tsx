import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export const metadata: Metadata = {
  title: "Hesabım",
};

export default function HesabimPage() {
  return (
    <PagePlaceholder
      title="Hesabım"
      description="Giriş yap, sipariş geçmişini görüntüle, kayıtlı adreslerini yönet — kullanıcı paneli Faz 3'te aktif olacak. Şimdilik sepetinizi tarayıcınız hatırlıyor."
      phase="Faz 3 — Admin Panel + Auth ile birlikte"
      primaryCta={{ href: "/magaza", label: "Mağazaya Göz At" }}
    />
  );
}
