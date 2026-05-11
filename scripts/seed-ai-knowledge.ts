import "dotenv/config";

import { embed } from "../lib/gemini/embeddings";
import { insertChunks } from "../lib/ai-knowledge/repository";
import { chunkText } from "../lib/gemini/chunker";

const SEED_DOCS = [
  {
    title: "KAYHAN Solar — Kim Olduğumuz",
    sourceType: "manual" as const,
    body: `KAYHAN Solar & Enerji, Türkiye genelinde anahtar teslim güneş enerjisi sistemleri kuran bir firmadır. Konut, tarım ve işletme tipi sistemler tasarlar, montajını yapar ve devreye alır. Saha keşfinden ekipman tedariğine, kurulumdan uzun vadeli bakıma kadar tüm süreci tek elden yürütürüz.`,
  },
  {
    title: "Sistem Boyutlandırma — Temel Mantık",
    sourceType: "manual" as const,
    body: `Bir güneş enerjisi sisteminin boyutu, müşterinin aylık veya günlük elektrik tüketimine göre belirlenir. Türkiye ortalamasında 1 kW kurulu güç günde yaklaşık 4-5 kWh üretir.

Aylık 500 kWh tüketen bir konut için yaklaşık 4-5 kW kurulu güç yeterlidir. Bu da 550W'lık monokristal panellerle 8-10 panel demektir. Off-grid (şebekeden bağımsız) sistemlerde batarya da gerekir ve %30-50 oversize yapmak akıllıcadır. On-grid (mahsuplaşmalı) sistemlerde batarya zorunlu değildir.`,
  },
  {
    title: "Panel Tipleri",
    sourceType: "manual" as const,
    body: `Üç ana panel tipi vardır:

- **Monokristal**: En verimli (%20-22 verim), en yaygın seçim. 550W ve 600W modelleri popüler.
- **Polikristal**: Biraz daha ucuz ama verim düşük (%17-19). Bütçe dostu.
- **Bifacial**: İki yüzlü, arkadan da %10-30 ek üretim. Açık alanlarda avantajlı, cam-cam yapısıyla uzun ömürlü.

KAYHAN Solar genelde Jinko, Trina ve Longi markalarını tercih eder. 25 yıl performans, 12 yıl ürün garantisi standarttır.`,
  },
  {
    title: "İnverter Seçimi",
    sourceType: "manual" as const,
    body: `İnverter, panelin ürettiği DC akımı evin kullandığı AC akıma çeviren cihazdır. Üç tip vardır:

- **On-grid (şebeke bağlı)**: Şebekeye satış için. Kesinti olunca durur.
- **Off-grid**: Şebekeden bağımsız, batarya zorunlu.
- **Hibrit**: Hem şebeke hem batarya. En esnek ama en pahalı.

Kurulu panel gücünün %75-100'ü kadar inverter seçilir. Örneğin 5 kW panel için 4-5 kW inverter yeterlidir.`,
  },
  {
    title: "Batarya Hesabı",
    sourceType: "manual" as const,
    body: `Batarya, gece kullanım veya yedekleme için gereklidir. İki ana kimya türü vardır:

- **Lityum (LiFePO4)**: 5000+ çevrim ömrü, derin deşarja dayanıklı, pahalı ama uzun ömürlü.
- **Jel (VRLA)**: 800-1000 çevrim, daha ucuz, %50 deşarj sınırlaması var.

Hesap için: günlük kullanılması istenen enerji (kWh) × 1000 ÷ 48V = gerekli Ah kapasitesi. Örneğin 5 kWh günlük yedek için 48V sistemde ~105 Ah lityum batarya.`,
  },
  {
    title: "Kampanyalar (Güncel)",
    sourceType: "manual" as const,
    body: `Aktif kampanyalarımız:

- **Bahar Kampanyası**: 4 güneş paneli alana 5.si %70 indirim. Yıl boyu paneller kategorisinde geçerli.
- **Paket Sistemlerde Bedava Kargo**: Tüm anahtar teslim paketlerde Türkiye geneli kargo bizden.
- **Lityum Batarya İndirimi**: İlk siparişlerde %15 indirim, sınırlı süreyle.

Detaylar mağaza sayfasında ve anasayfa kampanya şeridinde.`,
  },
  {
    title: "Teklif Süreci",
    sourceType: "manual" as const,
    body: `Teklif al sayfamızdan 6 adımlı bir form doldurursanız sistem büyüklüğünü ve kabataslak fiyatı 24 saat içinde size iletiyoruz. Form bilgileri: il/ilçe, kurulum yeri (çatı/arazi), çalıştıracağınız cihazlar (güç ve voltaj bilinmiyorsa boş bırakılabilir), açıklama notunuz. Sonrasında saha keşfi (gerekirse fiziki/Zoom) ile kesin teklif çıkar.`,
  },
  {
    title: "Garanti ve Servis",
    sourceType: "manual" as const,
    body: `Standart garantilerimiz:
- Paneller: 25 yıl performans / 12 yıl ürün
- İnverter: 5-10 yıl (markaya göre)
- Lityum batarya: 5 yıl
- Jel batarya: 2 yıl
- Kurulum (montaj+kablolama): 2 yıl

Servis: Yıllık 1-2 bakım önerilir (panel temizliği, kablo kontrolü). Uzaktan izleme platformuyla performansı sürekli takip ediyoruz; anormal düşüş olduğunda müdahale ediyoruz.`,
  },
];

async function main() {
  console.log("Seeding ai_knowledge...");
  for (const doc of SEED_DOCS) {
    const chunks = chunkText(doc.body);
    console.log(`  • ${doc.title} → ${chunks.length} chunk(s)`);
    const inserts = await Promise.all(
      chunks.map(async (content) => ({
        title: doc.title,
        content,
        sourceType: doc.sourceType,
        embedding: await embed(content),
      })),
    );
    await insertChunks(inserts);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("seed failed", err);
  process.exit(1);
});
