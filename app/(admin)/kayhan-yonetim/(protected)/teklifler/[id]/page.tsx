import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OfferCalculator } from "@/components/admin/offer-calculator";
import { OfferResponseForm } from "@/components/admin/offer-response-form";
import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

interface Props {
  params: Promise<{ id: string }>;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OfferDetailPage({ params }: Props) {
  const { id } = await params;
  const offer = await repo.getOfferById(id);
  if (!offer) notFound();

  const phoneClean = offer.phone.replace(/\D/g, "");
  const waLink = `https://wa.me/${phoneClean}?text=${encodeURIComponent(
    `Sayın ${offer.fullName}, KAYHAN Solar ekibinden yazıyorum. Teklifinizle ilgili görüşmek isteriz.`,
  )}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/kayhan-yonetim/teklifler"
            className="text-xs text-muted hover:text-foreground"
          >
            ← Tekliflere dön
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {offer.fullName}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
            <OfferStatusPill status={offer.status} />
            <span>{fmt(offer.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={waLink} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm">
              <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
              WhatsApp ile yanıtla
            </Button>
          </Link>
          {offer.email && (
            <Link href={`mailto:${offer.email}`}>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4" strokeWidth={2.2} />
                E-posta
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">Müşteri Bilgileri</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-subtle">Telefon</dt>
                <dd className="font-medium">{offer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">E-posta</dt>
                <dd className="font-medium">{offer.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">İl / İlçe</dt>
                <dd className="font-medium">
                  {offer.city} / {offer.district}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Kurulum yeri</dt>
                <dd className="font-medium">
                  {offer.installationLocation === "roof"
                    ? "Çatı"
                    : offer.installationLocation === "land"
                      ? "Arazi"
                      : "Diğer"}
                </dd>
              </div>
              {offer.installationAddress && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-subtle">Adres / Detay</dt>
                  <dd className="font-medium">{offer.installationAddress}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Çalıştırılacak Cihazlar
            </h2>
            {offer.appliances.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Cihaz listesi paylaşılmamış.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {offer.appliances.map((a, i) => (
                  <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted">
                      {a.powerW ? `${a.powerW} W` : "güç belirtilmemiş"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold tracking-tight">Detaylı Açıklama</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {offer.detailedDescription}
            </p>
          </section>

          <OfferCalculator appliances={offer.appliances} />
        </div>

        <OfferResponseForm offer={offer} />
      </div>
    </div>
  );
}
