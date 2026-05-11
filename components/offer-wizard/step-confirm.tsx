"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitOfferAction } from "@/app/(public)/teklif-al/actions/submit";
import { Button } from "@/components/ui/button";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onPrev: () => void;
  onSuccess: () => void;
}

export function StepConfirm({ data, patch, onPrev, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!data.kvkkAccepted) {
      setError("KVKK aydınlatma metnini onaylayın");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitOfferAction(data);
      if (!result.ok) {
        setError(result.error ?? "Gönderim başarısız");
        toast.error("Gönderilemedi", { description: result.error });
        return;
      }
      toast.success("Teklifiniz alındı");
      onSuccess();
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Bilgilerinizi Onaylayın
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aşağıdaki özeti kontrol edin; KVKK metnini onaylayıp gönderebilirsiniz.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-subtle">Ad Soyad</dt>
            <dd className="font-medium">{data.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Telefon</dt>
            <dd className="font-medium">{data.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">E-posta</dt>
            <dd className="font-medium">{data.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">İl / İlçe</dt>
            <dd className="font-medium">
              {data.city} / {data.district}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-subtle">Kurulum yeri</dt>
            <dd className="font-medium">
              {data.installationLocation === "roof"
                ? "Çatı"
                : data.installationLocation === "land"
                  ? "Arazi"
                  : "Diğer"}{" "}
              · {data.installationAddress}
            </dd>
          </div>
          {data.media.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-subtle">Medya</dt>
              <dd className="text-xs text-muted">
                {data.media.length} adet bağlantı eklendi
              </dd>
            </div>
          )}
          {data.appliances.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-subtle">Cihazlar</dt>
              <dd className="font-medium">
                {data.appliances
                  .map((a) =>
                    a.powerW ? `${a.name} (${a.powerW}W)` : a.name,
                  )
                  .join(", ")}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-xs text-subtle">Açıklama</dt>
            <dd className="whitespace-pre-wrap text-foreground">
              {data.detailedDescription}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.kvkkAccepted}
            onChange={(e) => patch({ kvkkAccepted: e.target.checked })}
            className="mt-1 h-4 w-4 cursor-pointer accent-lime-primary"
          />
          <span className="text-sm leading-relaxed text-foreground">
            <Link
              href="/kvkk"
              target="_blank"
              className="underline hover:text-lime-dark dark:hover:text-lime-primary"
            >
              KVKK aydınlatma metnini
            </Link>{" "}
            okudum ve kişisel verilerimin teklif değerlendirmesi amacıyla
            işlenmesini kabul ediyorum.
          </span>
        </label>
      </section>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          <Send className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Gönderiliyor..." : "Teklifi Gönder"}
        </Button>
      </div>
    </div>
  );
}
