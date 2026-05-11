"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import {
  updateOfferAction,
  type OfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/offers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Offer } from "@/lib/data/types";

interface Props {
  offer: Offer;
}

export function OfferResponseForm({ offer }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(
    updateOfferAction.bind(null, offer.id),
    {},
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold tracking-tight">Yönetici Yanıtı</h2>

      <div className="space-y-1.5">
        <Label htmlFor="status">Durum</Label>
        <Select id="status" name="status" defaultValue={offer.status}>
          <option value="new">Yeni</option>
          <option value="in_review">İnceleniyor</option>
          <option value="responded">Yanıtlandı</option>
          <option value="closed">Kapalı</option>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminNotes">Dahili notlar (müşteriye gitmez)</Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          defaultValue={offer.adminNotes ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminResponse">Müşteriye yanıt</Label>
        <Textarea
          id="adminResponse"
          name="adminResponse"
          rows={5}
          defaultValue={offer.adminResponse ?? ""}
        />
      </div>

      {state.error && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-success">Kaydedildi.</p>
      )}

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        <Save className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
