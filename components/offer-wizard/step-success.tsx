"use client";

import { CheckCircle2, Home, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
}

export function StepSuccess({ onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-primary/20 text-lime-dark dark:text-lime-primary">
        <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Teklifiniz Alındı
        </h2>
        <p className="max-w-md text-sm text-muted">
          Bilgileriniz ekibimize iletildi. 24 saat içinde size telefon veya
          e-posta ile dönüş yapacağız.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Link href="/">
          <Button size="lg" variant="primary">
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Anasayfaya Dön
          </Button>
        </Link>
        <Link href="/iletisim">
          <Button size="lg" variant="outline">
            <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
            Bizimle İletişime Geç
          </Button>
        </Link>
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
