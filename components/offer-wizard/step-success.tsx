"use client";

import { CheckCircle2, Home, MessageCircle, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
  whatsappNumber: string | null;
  customerName: string;
}

const NEXT_STEPS = [
  "Ekibimiz 24 saat içinde sizi arayacak.",
  "Saha keşfi için size uygun bir randevu planlanacak.",
  "Detaylı teklif e-posta veya WhatsApp ile size iletilecek.",
];

export function StepSuccess({ onReset, whatsappNumber, customerName }: Props) {
  const waLink = whatsappNumber
    ? buildWaLink(whatsappNumber, customerName)
    : null;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-10 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-primary/20 text-lime-dark dark:text-lime-primary">
        <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Teklifiniz Başarıyla İletildi
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted">
          Bilgileriniz ekibimize ulaştı. En geç 24 saat içinde size telefon
          veya e-posta ile dönüş yapacağız.
        </p>
      </div>

      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-left">
        <h3 className="text-sm font-semibold tracking-tight">Sırada Ne Var?</h3>
        <ol className="mt-3 space-y-3">
          {NEXT_STEPS.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-primary text-xs font-semibold text-black tabular-nums">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button size="lg" variant="primary">
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Anasayfaya Dön
          </Button>
        </Link>
        <Link href="/magaza">
          <Button size="lg" variant="outline">
            <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
            Mağazaya Göz At
          </Button>
        </Link>
        {waLink && (
          <Link href={waLink} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline">
              <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
              WhatsApp&apos;la İletişim
            </Button>
          </Link>
        )}
        {!waLink && (
          <Link href="/iletisim">
            <Button size="lg" variant="outline">
              <Phone className="h-4 w-4" strokeWidth={2.2} />
              İletişim Sayfası
            </Button>
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="text-xs text-subtle underline hover:text-muted"
      >
        Yeni bir teklif daha gönder
      </button>
    </div>
  );
}

function buildWaLink(whatsappNumber: string, customerName: string): string {
  const clean = whatsappNumber.replace(/\D/g, "");
  const text = encodeURIComponent(
    customerName.trim()
      ? `Merhaba, ben ${customerName}. Az önce siteden bir teklif gönderdim, görüşmek isterim.`
      : "Merhaba, az önce siteden bir teklif gönderdim, görüşmek isterim.",
  );
  return `https://wa.me/${clean}?text=${text}`;
}
