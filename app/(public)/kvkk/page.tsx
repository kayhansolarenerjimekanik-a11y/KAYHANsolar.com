import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
};

export default function KvkkPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" lastUpdated="11 Mayıs 2026">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
        kapsamında, KAYHAN Solar &amp; Enerji (&quot;şirket&quot;) olarak
        sizleri kişisel verilerinizin işlenmesi hakkında bilgilendirmek
        isteriz.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        Kişisel verileriniz, veri sorumlusu sıfatıyla KAYHAN Solar &amp; Enerji
        tarafından işlenmektedir.
      </p>

      <h2>2. İşlenen Veriler ve Amaçları</h2>
      <p>Aşağıdaki kişisel veriler aşağıdaki amaçlarla işlenmektedir:</p>
      <ul>
        <li>
          <strong>Kimlik bilgileri</strong> (ad-soyad): Teklif değerlendirmesi
          ve müşteri hizmetleri.
        </li>
        <li>
          <strong>İletişim bilgileri</strong> (telefon, e-posta, il/ilçe):
          Teklif dönüşü, sipariş takibi ve bilgilendirme.
        </li>
        <li>
          <strong>Kurulum yeri bilgileri</strong> (adres, fotoğraf, açıklama):
          Sistem boyutlandırma ve saha keşfi.
        </li>
        <li>
          <strong>İşlem bilgileri</strong> (sepet, sipariş): Satış süreci ve
          sözleşmesel yükümlülükler.
        </li>
      </ul>

      <h2>3. Hukuki Sebepler</h2>
      <p>
        Kişisel verileriniz, KVKK&apos;nın 5. maddesinde belirtilen
        &quot;sözleşmenin kurulması veya ifası için zorunlu olması&quot;,
        &quot;hukuki yükümlülüğün yerine getirilmesi&quot; ve &quot;ilgili
        kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru
        menfaatlerimiz için zorunlu olması&quot; hukuki sebeplerine
        dayanılarak işlenmektedir.
      </p>

      <h2>4. Verilerin Aktarımı</h2>
      <p>
        Kişisel verileriniz; teklif sürecinin yürütülmesi, kargo, ödeme
        altyapıları ve yasal yükümlülüklerin yerine getirilmesi amacıyla
        tedarikçilerimiz ve hizmet sağlayıcılarımızla paylaşılabilir. Yurt
        dışına aktarım yapılması halinde KVKK&apos;nın 9. maddesindeki
        koşullara uygun hareket edilir.
      </p>

      <h2>5. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, ilgili mevzuatta öngörülen süreler veya işlendiği
        amacın gerektirdiği süre boyunca saklanır; süre sonunda silinir, yok
        edilir veya anonim hale getirilir.
      </p>

      <h2>6. Haklarınız</h2>
      <p>
        KVKK&apos;nın 11. maddesi uyarınca; verilerinizin işlenip
        işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme veya yok
        etme, aktarıldığı üçüncü kişileri öğrenme ve zararın giderilmesini
        talep etme haklarına sahipsiniz. Taleplerinizi{" "}
        <a href="mailto:kvkk@kayhansolar.com">kvkk@kayhansolar.com</a> adresine
        iletebilirsiniz.
      </p>
    </LegalPage>
  );
}
