"use client";

import { ArrowLeft, ArrowRight, Info, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { locationSchema } from "@/lib/validations/offer-wizard";
import type { WizardMediaRef, WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepLocation({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addMedia() {
    patch({
      media: [...data.media, { type: "image", url: "" }],
    });
  }

  function removeMedia(i: number) {
    patch({ media: data.media.filter((_, idx) => idx !== i) });
  }

  function updateMedia(i: number, mPatch: Partial<WizardMediaRef>) {
    patch({
      media: data.media.map((m, idx) =>
        idx === i ? { ...m, ...mPatch } : m,
      ),
    });
  }

  function tryNext() {
    const result = locationSchema.safeParse({
      installationLocation: data.installationLocation,
      installationAddress: data.installationAddress,
      media: data.media.filter((m) => m.url.trim()),
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    patch({ media: data.media.filter((m) => m.url.trim()) });
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Kurulum Yeri</h2>
        <p className="mt-1 text-sm text-muted">
          Sistemin nereye kurulacağını ve mümkünse mevcut alanın görüntülerini
          bizimle paylaşın.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="installationLocation">Kurulum türü</Label>
          <Select
            id="installationLocation"
            value={data.installationLocation}
            onChange={(e) =>
              patch({
                installationLocation: e.target
                  .value as WizardState["installationLocation"],
              })
            }
          >
            <option value="roof">Çatı</option>
            <option value="land">Arazi</option>
            <option value="other">Diğer</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="installationAddress">
            Adres / kurulum detayları
          </Label>
          <Textarea
            id="installationAddress"
            rows={3}
            value={data.installationAddress}
            onChange={(e) => patch({ installationAddress: e.target.value })}
            placeholder="Örn: Müstakil ev çatısı, güneye bakıyor, 80 m2..."
          />
          {errors.installationAddress && (
            <p className="text-xs text-danger">{errors.installationAddress}</p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Görsel / video (opsiyonel)
            </h3>
            <p className="mt-1 flex items-start gap-2 text-xs text-muted">
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-dark dark:text-lime-primary"
                strokeWidth={2.4}
              />
              <span>
                Demo modda dosya yükleme yakında aktif olacak — şimdilik
                Google Drive, Dropbox veya WhatsApp&apos;tan paylaşım linki
                yapıştırın. Maksimum 7 medya ekleyebilirsiniz.
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {data.media.map((m, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[140px_1fr_auto]"
            >
              <Select
                value={m.type}
                onChange={(e) =>
                  updateMedia(i, {
                    type: e.target.value as WizardMediaRef["type"],
                  })
                }
              >
                <option value="image">Görsel</option>
                <option value="video">Video</option>
                <option value="document">Belge</option>
              </Select>
              <Input
                value={m.url}
                onChange={(e) => updateMedia(i, { url: e.target.value })}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Medyayı kaldır"
                onClick={() => removeMedia(i)}
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </Button>
            </div>
          ))}

          {data.media.length < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMedia}
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              Medya Ekle
            </Button>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={tryNext}>
          Devam
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
