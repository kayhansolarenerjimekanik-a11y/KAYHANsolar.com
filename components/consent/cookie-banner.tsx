"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { readConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(existing === null);
  }, []);

  if (!show) return null;

  function acceptAll() {
    writeConsent({ analytics: true, marketing: true });
    setShow(false);
  }

  function acceptSelection() {
    writeConsent({ analytics, marketing });
    setShow(false);
  }

  function rejectAll() {
    writeConsent({ analytics: false, marketing: false });
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie
            className="mt-0.5 h-5 w-5 shrink-0 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <div className="flex-1 space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Çerez Tercihleri
            </h2>
            <p className="text-xs leading-relaxed text-muted">
              Deneyiminizi iyileştirmek için çerezler kullanıyoruz. Gerekli
              çerezler her zaman aktiftir.{" "}
              <Link
                href="/cerez-politikasi"
                className="underline hover:text-foreground"
              >
                Detaylar
              </Link>
            </p>

            {details && (
              <div className="space-y-2 rounded-xl border border-border bg-elevated p-3 text-xs">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 accent-lime-primary" />
                  <span>
                    <strong className="text-foreground">Gerekli</strong> — Site
                    çalışması için zorunlu (oturum, tema, sepet).
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-lime-primary"
                  />
                  <span>
                    <strong className="text-foreground">Analitik</strong> — Site
                    nasıl kullanılıyor anlamak için anonim ölçüm.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-lime-primary"
                  />
                  <span>
                    <strong className="text-foreground">Pazarlama</strong> —
                    Kişiselleştirilmiş kampanya ve reklam (şu an kullanılmıyor).
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="primary" onClick={acceptAll}>
                Tümünü Kabul Et
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetails((v) => !v)}
              >
                {details ? "Detayları Kapat" : "Ayarlar"}
              </Button>
              {details && (
                <Button size="sm" variant="ghost" onClick={acceptSelection}>
                  Seçimi Kaydet
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={rejectAll}>
                Reddet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
