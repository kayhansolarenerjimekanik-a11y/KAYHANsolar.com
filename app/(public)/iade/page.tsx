import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "İade ve Değişim Şartları",
};

export default function IadePage() {
  return (
    <LegalPage title="İade ve Değişim Şartları" lastUpdated="11 Mayıs 2026">
      <p>
        Aşağıdaki şartlar dahilinde ürün iade ve değişim talebinizi
        karşılarız.
      </p>

      <h2>1. Cayma Hakkı Süresi</h2>
      <p>
        Tüketici, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde
        cayma hakkını kullanabilir.
      </p>

      <h2>2. İade Koşulları</h2>
      <ul>
        <li>Ürünün orijinal ambalajıyla ve hasarsız olması.</li>
        <li>Etiketlerin ve aksesuarların eksiksiz olması.</li>
        <li>
          Anahtar teslim kurulum hizmeti tamamlanmış sistemlerin iadesi mümkün
          değildir; ancak kurulum öncesi ödeme iadesi koşullarımıza tabidir.
        </li>
        <li>
          Özel olarak hazırlanan veya sipariş üzerine üretilen ürünler iade
          kapsamı dışındadır.
        </li>
      </ul>

      <h2>3. İade Süreci</h2>
      <ol>
        <li>
          İade talebinizi{" "}
          <a href="mailto:siparis@kayhansolar.com">siparis@kayhansolar.com</a>{" "}
          adresine bildirin (sipariş numarası ile birlikte).
        </li>
        <li>
          İade onayı sonrası kargo bilgileri tarafınıza iletilir.
        </li>
        <li>
          Ürün depomuza ulaştıktan ve incelendikten sonra, ödeme yöntemine
          uygun şekilde 14 gün içinde iade gerçekleştirilir.
        </li>
      </ol>

      <h2>4. Hasarlı veya Eksik Ürün</h2>
      <p>
        Kargoda hasar gören veya eksik teslim alınan ürünler için teslim
        anında tutanak tutturulması önemlidir. 24 saat içinde bizimle
        iletişime geçtiğiniz takdirde sorunu ücretsiz çözeriz.
      </p>

      <h2>5. Kargo Ücretleri</h2>
      <p>
        Ürün hatası veya bizim kaynaklı bir sorun varsa kargo ücreti
        tarafımıza aittir. Cayma hakkı kapsamında yapılan iadelerde kargo
        ücreti tüketiciye aittir.
      </p>
    </LegalPage>
  );
}
