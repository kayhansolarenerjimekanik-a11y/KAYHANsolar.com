"use client";

import { Mail, Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  updateOfferAction,
  type OfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/offers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Offer, OfferStatus } from "@/lib/data/types";

interface Props {
  offer: Offer;
}

export function OfferResponseForm({ offer }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(
    updateOfferAction.bind(null, offer.id),
    {},
  );

  const [status, setStatus] = useState<OfferStatus>(offer.status);
  const [responseText, setResponseText] = useState<string>(
    offer.adminResponse ?? "",
  );

  const willEmail =
    status === "responded" &&
    responseText.trim().length > 0 &&
    Boolean(offer.email);

  const responseMissingEmail =
    status === "responded" &&
    responseText.trim().length > 0 &&
    !offer.email;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Yönetici Yanıtı</h2>
        <p className="mt-1 text-xs text-muted">
          Durumu &quot;Yanıtlandı&quot; yapıp kaydederseniz müşterinin e-posta
          adresine yanıt metni otomatik gönderilir.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Durum</Label>
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OfferStatus)}
        >
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
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
        />
      </div>

      {responseMissingEmail && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Bu müşterinin e-postası yok. Yanıtı kaydedebilirsiniz ama otomatik
          email gitmez — WhatsApp veya telefonla iletin.
        </p>
      )}

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      {state.success && state.emailSent && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Mail className="h-3.5 w-3.5" strokeWidth={2.4} />
          Kaydedildi · Email gönderildi
        </p>
      )}
      {state.success && state.emailWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Kaydedildi. ⚠ {state.emailWarning}
        </p>
      )}
      {state.success && !state.emailSent && !state.emailWarning && (
        <p className="text-xs text-success">Kaydedildi.</p>
      )}

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {willEmail ? (
          <>
            <Mail className="h-4 w-4" strokeWidth={2.4} />
            {pending ? "Gönderiliyor..." : "Kaydet ve Email At"}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" strokeWidth={2.4} />
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </>
        )}
      </Button>
    </form>
  );
}
