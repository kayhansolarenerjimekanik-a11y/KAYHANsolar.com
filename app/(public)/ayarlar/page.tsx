import type { Metadata } from "next";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Ayarlar",
};

export default function AyarlarPage() {
  return (
    <Container className="py-10 lg:py-14">
      <header className="max-w-2xl space-y-3 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ayarlar
        </h1>
        <p className="text-muted">
          Tema tercihi, bildirim ayarları ve hesap bilgileri.
        </p>
      </header>

      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Tema</h2>
            <p className="mt-1 text-xs text-muted">
              Aydınlık, karanlık veya sistem tercihi.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-elevated p-5 text-sm text-muted">
          <p>
            <span className="font-semibold text-foreground">Yakında:</span>{" "}
            Hesap bilgileri, bildirim tercihleri, çerez yönetimi ve KVKK
            ayarları Faz 3 ve Faz 5&apos;te aktive edilecek.
          </p>
        </div>
      </div>
    </Container>
  );
}
