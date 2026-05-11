"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { ApplianceListEditor } from "@/components/offer-wizard/appliance-list-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { systemSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const MAX_DESC = 2000;

export function StepSystem({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const remaining = MAX_DESC - data.detailedDescription.length;

  function tryNext() {
    const result = systemSchema.safeParse({
      appliances: data.appliances.filter((a) => a.name.trim()),
      detailedDescription: data.detailedDescription,
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
    patch({ appliances: data.appliances.filter((a) => a.name.trim()) });
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Sistem İhtiyacı
        </h2>
        <p className="mt-1 text-sm text-muted">
          Çalıştırmak istediğiniz cihazları ve genel beklentilerinizi yazın.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold tracking-tight">
          Çalıştırılacak Cihazlar
        </h3>
        <p className="mt-1 text-xs text-muted">
          Güç ve voltajı bilmiyorsanız boş bırakabilirsiniz; ekibimiz
          hesaplamayı tamamlar.
        </p>
        <div className="mt-4">
          <ApplianceListEditor
            items={data.appliances}
            onChange={(appliances) => patch({ appliances })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="detailedDescription">Detaylı Açıklama</Label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              remaining < 0 ? "text-danger" : "text-subtle"
            }`}
          >
            {data.detailedDescription.length}/{MAX_DESC}
          </span>
        </div>
        <Textarea
          id="detailedDescription"
          rows={7}
          maxLength={MAX_DESC}
          value={data.detailedDescription}
          onChange={(e) => patch({ detailedDescription: e.target.value })}
          placeholder="Aylık ortalama tüketim, kullanım saatleri, batarya yedek ihtiyacı, şebeke durumu vb..."
          className="mt-2"
        />
        {errors.detailedDescription && (
          <p className="mt-1 text-xs text-danger">
            {errors.detailedDescription}
          </p>
        )}
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
