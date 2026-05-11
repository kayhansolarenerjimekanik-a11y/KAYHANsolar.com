import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/shared/social-icons";
import { Container } from "@/components/ui/container";
import { mockSiteSettings } from "@/lib/mock/data";

const footerLinks = {
  hizli: [
    { href: "/magaza", label: "Mağaza" },
    { href: "/teklif-al", label: "Teklif Al" },
    { href: "/galeri", label: "Galeri" },
    { href: "/hakkimizda", label: "Hakkımızda" },
    { href: "/sss", label: "SSS" },
  ],
  yasal: [
    { href: "/kvkk", label: "KVKK Aydınlatma Metni" },
    { href: "/gizlilik", label: "Gizlilik Politikası" },
    { href: "/cerez", label: "Çerez Politikası" },
    { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
    { href: "/iade", label: "İade ve Değişim" },
  ],
};

export function Footer() {
  const settings = mockSiteSettings;

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-primary text-black font-bold">
                K
              </span>
              <span className="text-base font-semibold tracking-tight">
                KAYHAN <span className="text-muted">Solar</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted">
              Güneş enerjisi sistemleri, paneller, inverterler, bataryalar ve
              kurulum çözümleri. Türkiye geneli kargo ve servis.
            </p>
            <div className="flex items-center gap-2 pt-2">
              {settings.socialMedia.instagram && (
                <Link
                  href={settings.socialMedia.instagram}
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:border-lime-primary hover:text-foreground"
                >
                  <InstagramIcon className="h-4 w-4" />
                </Link>
              )}
              {settings.socialMedia.facebook && (
                <Link
                  href={settings.socialMedia.facebook}
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:border-lime-primary hover:text-foreground"
                >
                  <FacebookIcon className="h-4 w-4" />
                </Link>
              )}
              {settings.socialMedia.youtube && (
                <Link
                  href={settings.socialMedia.youtube}
                  aria-label="YouTube"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:border-lime-primary hover:text-foreground"
                >
                  <YoutubeIcon className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Hızlı Linkler
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.hizli.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight">Yasal</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.yasal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-tight">İletişim</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
                <a
                  href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                  className="hover:text-foreground"
                >
                  {settings.contactPhone}
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="hover:text-foreground"
                >
                  {settings.contactEmail}
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span>{settings.address.full}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} KAYHAN Solar & Enerji. Tüm hakları
            saklıdır.
          </p>
          <p className="text-xs text-subtle">
            <span className="rounded-md bg-elevated px-2 py-1 font-mono">
              demo modu
            </span>{" "}
            — gerçek veriler entegrasyondan sonra yüklenecek
          </p>
        </div>
      </Container>
    </footer>
  );
}
