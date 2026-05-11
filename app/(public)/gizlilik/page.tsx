import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
};

export default function GizlilikPage() {
  return (
    <LegalPage title="Gizlilik Politikası" lastUpdated="11 Mayıs 2026">
      <p>
        Bu gizlilik politikası, KAYHAN Solar &amp; Enerji web sitesinin
        kullanımı sırasında elde edilen bilgilerin nasıl toplandığını,
        kullanıldığını ve korunduğunu açıklar.
      </p>

      <h2>Toplanan Bilgiler</h2>
      <ul>
        <li>
          <strong>Form bilgileri:</strong> Teklif, sipariş ve iletişim formları
          aracılığıyla doğrudan tarafınızdan paylaşılan bilgiler.
        </li>
        <li>
          <strong>Otomatik veriler:</strong> Tarayıcı türü, ziyaret edilen
          sayfa, oturum süresi gibi anonim teknik veriler (yalnızca analitik
          çerez onayı verdiyseniz).
        </li>
      </ul>

      <h2>Bilgilerin Kullanımı</h2>
      <ul>
        <li>Hizmetlerin sunulması ve geliştirilmesi.</li>
        <li>Müşteri sorularına yanıt verilmesi.</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
        <li>İstatistiksel analiz (kimliği belirlenemeyen şekilde).</li>
      </ul>

      <h2>Güvenlik</h2>
      <p>
        Verilerinizi yetkisiz erişime, değişikliğe ve ifşaya karşı korumak için
        endüstri standardı güvenlik önlemleri uyguluyoruz. Tüm veri aktarımı
        TLS (HTTPS) ile şifrelenir.
      </p>

      <h2>Üçüncü Taraflar</h2>
      <p>
        Hizmet sağlayıcılarımız (e-posta gönderim, ödeme, kargo, bulut
        altyapı) gizlilik prensiplerimize bağlı kalmak zorundadır.
        Bilgileriniz onlara yalnızca hizmet ifası için gereken kadar açılır.
      </p>

      <h2>İletişim</h2>
      <p>
        Gizlilik politikası ile ilgili sorularınız için{" "}
        <a href="mailto:gizlilik@kayhansolar.com">gizlilik@kayhansolar.com</a>{" "}
        adresine yazabilirsiniz.
      </p>
    </LegalPage>
  );
}
