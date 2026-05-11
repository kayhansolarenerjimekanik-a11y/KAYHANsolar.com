import { Award, Heart, Leaf, Users } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "KAYHAN Solar & Enerji kimdir, vizyonu ve değerleri.",
};

const values = [
  {
    icon: Leaf,
    title: "Yenilenebilir Enerji İçin",
    description:
      "Her panel, her batarya — fosil yakıt bağımlılığını azaltmaya bir adım.",
  },
  {
    icon: Award,
    title: "Sertifikalı Bileşenler",
    description:
      "TSE, IEC ve CE belgeli paneller, inverterler ve bataryalar.",
  },
  {
    icon: Users,
    title: "Uzman Saha Ekibi",
    description: "Yüksekte ve elektrikte iş güvenliği belgeli kurulum ekibi.",
  },
  {
    icon: Heart,
    title: "Uzun Vadeli Servis",
    description:
      "Kurulum sonrası yıllık bakım, performans izleme ve hızlı arıza müdahalesi.",
  },
];

export default function HakkimizdaPage() {
  return (
    <Container className="py-10 lg:py-14">
      <header className="max-w-3xl space-y-4 pb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
          KAYHAN Solar & Enerji
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Güneşi enerjiye, enerjiyi sürdürülebilir geleceğe dönüştürüyoruz.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Konut, tarım ve işletmelere yönelik anahtar teslim güneş enerjisi
          sistemleri kuruyoruz. Saha keşfinden devreye almaya kadar tek
          adresten profesyonel çözüm sunuyoruz.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {values.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <h2 className="mt-4 text-base font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {description}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-16 rounded-3xl border border-border bg-surface p-8 sm:p-12">
        <h2 className="text-2xl font-semibold tracking-tight">Hikâyemiz</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
          KAYHAN Solar & Enerji, Türkiye&apos;de güneş enerjisinin yaygınlaşması
          vizyonuyla kuruldu. Yıllar içinde konut çatılarından tarımsal sulama
          tesislerine kadar yüzlerce farklı projede edindiğimiz tecrübeyi, her
          yeni müşterimize sunuyoruz.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
          Çalışma prensibimiz net: doğru bileşen, doğru hesaplama, doğru kurulum
          ve uzun vadeli destek. Hedefimiz sistemin 25+ yıllık ömrü boyunca
          verim üretmesini sağlamak.
        </p>
      </section>
    </Container>
  );
}
