"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { turkishCities } from "@/lib/mock/data";
import { personalSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPersonal({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function tryNext() {
    const result = personalSchema.safeParse({
      fullName: data.fullName,
      city: data.city,
      district: data.district,
      phone: data.phone,
      email: data.email || undefined,
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
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Kişisel Bilgiler
        </h2>
        <p className="mt-1 text-sm text-muted">
          Size dönüş yapabilmemiz için iletişim bilgilerinizi paylaşın.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fullName">Ad Soyad</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
            placeholder="Adınız Soyadınız"
            autoComplete="name"
          />
          {errors.fullName && (
            <p className="text-xs text-danger">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">İl</Label>
          <Select
            id="city"
            value={data.city}
            onChange={(e) => patch({ city: e.target.value })}
          >
            <option value="">Seçin</option>
            {turkishCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {errors.city && <p className="text-xs text-danger">{errors.city}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="district">İlçe</Label>
          <Input
            id="district"
            value={data.district}
            onChange={(e) => patch({ district: e.target.value })}
            placeholder="İlçeniz"
          />
          {errors.district && (
            <p className="text-xs text-danger">{errors.district}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="+90 555 555 55 55"
            autoComplete="tel"
          />
          {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta (opsiyonel)</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="ornek@eposta.com"
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
        </div>
      </div>

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
