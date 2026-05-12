"use client";

import { Menu, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { SearchTrigger } from "@/components/search/search-trigger";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useCart } from "@/store/cart";

const navLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/magaza", label: "Mağaza" },
  { href: "/teklif-al", label: "Teklif Al" },
  { href: "/galeri", label: "Galeri" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/sss", label: "SSS" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = useCart((s) => s.getItemCount());
  const isHydrated = useCart((s) => s.isHydrated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="KAYHAN Solar anasayfa"
          className="flex items-center gap-2"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-primary text-black font-bold">
            K
          </span>
          <span className="hidden text-base font-semibold tracking-tight sm:inline">
            KAYHAN <span className="text-muted">Solar</span>
          </span>
        </Link>

        <nav
          aria-label="Ana navigasyon"
          className="hidden items-center gap-1 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchTrigger />

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <Link
            href="/sepet"
            aria-label={
              isHydrated && cartCount > 0
                ? `Sepet — ${cartCount} ürün`
                : "Sepet"
            }
            className="relative grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground"
          >
            <ShoppingCart className="h-4 w-4" strokeWidth={2.2} />
            {isHydrated && cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-lime-primary px-1 text-[10px] font-bold tabular-nums text-black">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/hesabim"
            aria-label="Hesabım"
            className="hidden h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground md:grid"
          >
            <User className="h-4 w-4" strokeWidth={2.2} />
          </Link>

          <Link href="/teklif-al" className="hidden lg:inline-flex">
            <Button variant="primary" size="sm">
              Teklif Al
            </Button>
          </Link>

          <button
            type="button"
            aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </Container>

      {mobileOpen && (
        <div className="lg:hidden">
          <div className="border-t border-border bg-background">
            <Container className="flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-elevated"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
                <span className="text-sm text-muted">Tema</span>
                <ThemeToggle />
              </div>
            </Container>
          </div>
        </div>
      )}
    </header>
  );
}
