import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
};

export default function MesafeliSatisPage() {
  return (
    <LegalPage title="Mesafeli Satış Sözleşmesi" lastUpdated="11 Mayıs 2026">
      <p>
        İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve
        Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde, KAYHAN Solar
        &amp; Enerji (&quot;Satıcı&quot;) ile alıcı (&quot;Tüketici&quot;)
        arasındaki mesafeli satış ilişkisini düzenler.
      </p>

      <h2>1. Tarafların Yükümlülükleri</h2>
      <p>
        Satıcı, sipariş onayını takiben, ürünleri belirtilen sürede
        kargolar; tüketici, ödemeyi tam ve zamanında yapmakla yükümlüdür.
      </p>

      <h2>2. Ürün ve Fiyat</h2>
      <p>
        Sipariş edilen ürünlerin tüm özellikleri, kdv dahil satış fiyatı,
        kargo ücreti ve teslimat süresi sipariş onayı ekranında ve onay
        e-postasında belirtilir.
      </p>

      <h2>3. Cayma Hakkı</h2>
      <p>
        Tüketici, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün
        içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin
        sözleşmeden cayma hakkına sahiptir. Cayma bildirimi{" "}
        <a href="mailto:siparis@kayhansolar.com">siparis@kayhansolar.com</a>{" "}
        adresine yapılabilir. Cayma hakkının kullanılması için ürünün
        ambalajının açılmamış, kullanılmamış ve tekrar satılabilir
        durumda olması gerekir.
      </p>

      <h2>4. Teslimat</h2>
      <p>
        Ürünler, sözleşmenin kurulmasını takiben en geç 30 gün içinde
        kargoya verilir. Anahtar teslim kurulum içeren paket siparişlerinde
        teslimat süresi saha keşfi ve kurulum planlamasına göre değişir.
      </p>

      <h2>5. Garanti ve Servis</h2>
      <p>
        Ürünlerimiz üretici garantisi altındadır. Garanti süreleri ve
        koşulları ürün sayfalarında belirtilir.
      </p>

      <h2>6. Uyuşmazlıkların Çözümü</h2>
      <p>
        Sözleşmeden doğan uyuşmazlıklarda, ilgili Tüketici Hakem Heyetleri
        ve Tüketici Mahkemeleri yetkilidir.
      </p>
    </LegalPage>
  );
}
