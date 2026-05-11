import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { mockSiteSettings } from "@/lib/mock/data";

export const metadata: Metadata = {
  title: "İletişim",
};

export default function IletisimPage() {
  const s = mockSiteSettings;
  const cleanPhone = s.contactPhone.replace(/\s/g, "");
  const whatsappLink = `https://wa.me/${s.whatsappNumber}`;

  return (
    <Container className="py-10 lg:py-14">
      <header className="max-w-2xl space-y-3 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          İletişim
        </h1>
        <p className="text-muted">
          Saha keşfi, fiyat bilgisi ya da teknik sorularınız için aşağıdaki
          kanallardan ulaşabilirsiniz.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href={`tel:${cleanPhone}`}
          className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-lime-primary"
        >
          <Phone
            className="h-5 w-5 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <h2 className="mt-4 text-sm font-semibold tracking-tight">Telefon</h2>
          <p className="mt-2 text-sm text-muted">{s.contactPhone}</p>
        </a>
        <Link
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-lime-primary"
        >
          <MessageCircle
            className="h-5 w-5 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <h2 className="mt-4 text-sm font-semibold tracking-tight">WhatsApp</h2>
          <p className="mt-2 text-sm text-muted">7/24 yazışma</p>
        </Link>
        <a
          href={`mailto:${s.contactEmail}`}
          className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-lime-primary"
        >
          <Mail
            className="h-5 w-5 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <h2 className="mt-4 text-sm font-semibold tracking-tight">E-posta</h2>
          <p className="mt-2 break-all text-sm text-muted">{s.contactEmail}</p>
        </a>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <MapPin
            className="h-5 w-5 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <h2 className="mt-4 text-sm font-semibold tracking-tight">Adres</h2>
          <p className="mt-2 text-sm text-muted">{s.address.full}</p>
        </div>
      </div>

      <section className="mt-12 rounded-3xl border border-dashed border-border bg-elevated p-6 text-sm text-muted">
        <p>
          <span className="font-semibold text-foreground">Demo modu:</span>{" "}
          Yukarıdaki iletişim bilgileri yer tutucudur. Gerçek iletişim
          bilgileriniz Admin Kontrol Panelinden güncellenecek.
        </p>
      </section>
    </Container>
  );
}
