// components/admin/offer-create-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createOfferAction,
  type CreateOfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/create-offer";
import { ApplianceListEditor } from "@/components/offer-wizard/appliance-list-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { turkishCities } from "@/lib/mock/data";
import type { WizardAppliance } from "@/types/offer-wizard";

export function OfferCreateForm() {
  const [state, action, pending] = useActionState<
    CreateOfferActionState,
    FormData
  >(createOfferAction, {});

  const [appliances, setAppliances] = useState<WizardAppliance[]>([]);

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Müşteri</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Ad Soyad *</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              placeholder="Müşterinin tam adı"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+90 555 555 55 55"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta (opsiyonel)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@eposta.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">İl *</Label>
            <Select id="city" name="city" required defaultValue="">
              <option value="">Seçin</option>
              {turkishCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="district">İlçe *</Label>
            <Input id="district" name="district" required placeholder="İlçe" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Kurulum</h2>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="installationLocation">Kurulum türü *</Label>
            <Select
              id="installationLocation"
              name="installationLocation"
              defaultValue="roof"
            >
              <option value="roof">Çatı</option>
              <option value="land">Arazi</option>
              <option value="other">Diğer</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="installationAddress">Adres / kurulum detayları *</Label>
            <Textarea
              id="installationAddress"
              name="installationAddress"
              rows={3}
              required
              placeholder="Örn: Müstakil ev çatısı, güneye bakıyor, 80 m2..."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">İhtiyaç</h2>

        <div>
          <Label>Çalıştırılacak Cihazlar</Label>
          <p className="mt-1 text-xs text-muted">
            Telefonla aldığınız bilgilere göre listeleyin. Boş bırakılabilir.
          </p>
          <div className="mt-3">
            <ApplianceListEditor items={appliances} onChange={setAppliances} />
          </div>
        </div>

        <input
          type="hidden"
          name="appliances"
          value={JSON.stringify(appliances.filter((a) => a.name.trim()))}
        />

        <div className="space-y-1.5">
          <Label htmlFor="detailedDescription">Detaylı Açıklama *</Label>
          <Textarea
            id="detailedDescription"
            name="detailedDescription"
            rows={5}
            required
            placeholder="Aylık ortalama tüketim, kullanım saatleri, batarya yedek ihtiyacı..."
          />
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link href="/kayhan-yonetim/teklifler">
          <Button type="button" variant="outline">
            İptal
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Kaydet ve Detay Sayfasını Aç"}
        </Button>
      </div>
    </form>
  );
}
