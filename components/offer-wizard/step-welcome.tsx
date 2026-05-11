"use client";

import { ArrowRight, Calculator, ShieldCheck, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  onNext: () => void;
}

const HIGHLIGHTS = [
  {
    icon: Calculator,
    title: "Detaylı hesaplama",
    text: "Cihazlarınıza göre panel sayısı, inverter ve batarya hesabı.",
  },
  {
    icon: Wrench,
    title: "Anahtar teslim kurulum",
    text: "Saha keşfinden devreye almaya kadar tek elden.",
  },
  {
    icon: ShieldCheck,
    title: "Şeffaf fiyatlandırma",
    text: "Tedarikçi bağlantılı fiyatlar, sürpriz yok.",
  },
];

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
          Ücretsiz teklif — 2 dakika
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bize Söyleyin, Biz Hesaplayalım
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">
          Kullandığınız cihazları ve kurulum yerinizi paylaşın; sistem
          büyüklüğünü, ürünleri ve kabataslak fiyatı sizin yerinize
          hesaplayalım. Adımları istediğiniz zaman duraklatabilirsiniz —
          bilgileriniz cihazınızda kayıtlı kalır.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <h2 className="mt-4 text-sm font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          Başla
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
