"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  updateSettingsAction,
  type SettingsActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteSettings } from "@/types";

interface Props {
  initial: SiteSettings;
}

export function SettingsForm({ initial }: Props) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">İletişim</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Telefon</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={initial.contactPhone} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">E-posta</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="whatsappNumber">
              WhatsApp numarası (yalnızca rakam, ülke kodu dahil — örn. 905555555555)
            </Label>
            <Input id="whatsappNumber" name="whatsappNumber" defaultValue={initial.whatsappNumber} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Adres</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="addressCity">İl</Label>
            <Input id="addressCity" name="addressCity" defaultValue={initial.address.city} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addressMapsUrl">Google Maps URL</Label>
            <Input id="addressMapsUrl" name="addressMapsUrl" defaultValue={initial.address.mapsUrl ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressFull">Tam adres</Label>
            <Input id="addressFull" name="addressFull" defaultValue={initial.address.full} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Sosyal Medya</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["socialInstagram", "Instagram", initial.socialMedia.instagram],
              ["socialFacebook", "Facebook", initial.socialMedia.facebook],
              ["socialYoutube", "YouTube", initial.socialMedia.youtube],
              ["socialTwitter", "X / Twitter", initial.socialMedia.twitter],
            ] as const
          ).map(([name, label, value]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} name={name} defaultValue={value ?? ""} placeholder="https://..." />
            </div>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Ayarlar kaydedildi.
        </p>
      )}

      <div className="flex items-center justify-end">
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
