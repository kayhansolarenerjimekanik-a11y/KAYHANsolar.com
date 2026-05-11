import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Çerez Politikası",
};

export default function CerezPolitikasiPage() {
  return (
    <LegalPage title="Çerez Politikası" lastUpdated="11 Mayıs 2026">
      <p>
        Web sitemizde deneyiminizi iyileştirmek ve hizmet kalitemizi ölçmek
        için çerezler (cookies) kullanıyoruz. Bu sayfada hangi çerezleri
        kullandığımızı ve seçeneklerinizi açıklıyoruz.
      </p>

      <h2>Çerez Kategorileri</h2>
      <h3>1. Gerekli Çerezler</h3>
      <p>
        Sitenin temel işlevleri için zorunludur (oturum yönetimi, sepet,
        tema). Bu çerezler her zaman aktiftir ve onay gerektirmez.
      </p>

      <h3>2. Analitik Çerezler</h3>
      <p>
        Sitenin nasıl kullanıldığını anonim olarak ölçeriz (sayfa
        görüntülemeleri, ortalama oturum süresi). Vercel Analytics ve kendi
        olay tablomuz kullanılır. Bu çerezleri yalnızca onay vermeniz halinde
        çalıştırırız.
      </p>

      <h3>3. Pazarlama Çerezleri</h3>
      <p>
        Şu anda pazarlama amaçlı çerez kullanmıyoruz. Gelecekte
        kullanılması durumunda onayınızı tekrar isteyeceğiz.
      </p>

      <h2>Tercihlerinizi Değiştirme</h2>
      <p>
        Sayfanın altındaki çerez banner&apos;ı veya{" "}
        <a href="/ayarlar">ayarlar sayfası</a> üzerinden tercihlerinizi
        istediğiniz zaman güncelleyebilirsiniz. Ayrıca tarayıcı ayarlarınızdan
        da çerezleri silebilir veya engelleyebilirsiniz.
      </p>
    </LegalPage>
  );
}
