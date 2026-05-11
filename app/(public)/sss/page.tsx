import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
};

const faqs = [
  {
    q: "Kurulum süresi ne kadar?",
    a: "5–10 kW konut sistemleri için ortalama 1–2 gün, 25 kW üstü sistemler için saha koşullarına göre 3–5 gün sürer.",
  },
  {
    q: "Hangi şehirlere kurulum yapıyorsunuz?",
    a: "Türkiye geneli kurulum yapıyoruz. İlçenize göre ek lojistik ücreti olabilir, teklifte belirtiriz.",
  },
  {
    q: "Devlet teşvikleri ve kredi olanakları var mı?",
    a: "Evet, lisanssız üretim için EPDK düzenlemeleri ve bazı bankaların özel solar kredileri mevcut. Detayları teklif aşamasında paylaşırız.",
  },
  {
    q: "Garanti süresi ne kadar?",
    a: "Paneller 25 yıl performans / 12 yıl ürün garantili. İnverterler 5–10 yıl, bataryalar 2–5 yıl arası. Kurulum garantimiz 2 yıldır.",
  },
  {
    q: "Ödeme nasıl yapılır?",
    a: "Şu anda WhatsApp üzerinden sipariş alıyor ve havale/EFT veya yerinde nakit ödeme kabul ediyoruz. Online kredi kartı ödemesi yakında aktive edilecek.",
  },
  {
    q: "Sistem yetersiz gelirse büyütülebilir mi?",
    a: "Evet. Sistem tasarımı baştan büyütülebilir olarak yapılır; ek panel ve batarya kapasitesi kolayca eklenir.",
  },
  {
    q: "Bulutlu havalarda da elektrik üretir mi?",
    a: "Evet, daha düşük verimle ama üretim devam eder. Yıllık ortalama üretim hesabı tüm hava koşullarını dikkate alarak yapılır.",
  },
  {
    q: "Sistem bakım gerektirir mi?",
    a: "Yılda 1–2 kez panel temizliği ve gözle muayene yeterlidir. İnverter ve batarya durumlarını biz uzaktan izleriz.",
  },
];

export default function SSSPage() {
  return (
    <Container className="py-10 lg:py-14">
      <header className="max-w-2xl space-y-3 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sıkça Sorulan Sorular
        </h1>
        <p className="text-muted">
          Aklınıza takılan bir soru bulamadıysanız WhatsApp veya formla bize
          ulaşabilirsiniz.
        </p>
      </header>

      <div className="mx-auto max-w-3xl space-y-2">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-border bg-surface px-5 py-4 transition-colors open:border-lime-primary"
          >
            <summary className="cursor-pointer list-none text-base font-semibold tracking-tight">
              <span className="flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-xl text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </Container>
  );
}
