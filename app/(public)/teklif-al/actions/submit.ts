"use server";

import { revalidatePath } from "next/cache";

import { repo } from "@/lib/data";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { finalSubmitSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

export interface SubmitOfferResult {
  ok: boolean;
  error?: string;
  offerId?: string;
}

export async function submitOfferAction(
  data: WizardState,
  captchaToken: string | null = null,
): Promise<SubmitOfferResult> {
  const captchaOk = await verifyTurnstileToken(captchaToken);
  if (!captchaOk) {
    return { ok: false, error: "Güvenlik doğrulaması başarısız" };
  }

  const parsed = finalSubmitSchema.safeParse({
    fullName: data.fullName,
    city: data.city,
    district: data.district,
    phone: data.phone,
    email: data.email || undefined,
    installationLocation: data.installationLocation,
    installationAddress: data.installationAddress,
    media: data.media,
    appliances: data.appliances,
    detailedDescription: data.detailedDescription,
    kvkkAccepted: data.kvkkAccepted,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz",
    };
  }

  const offer = await repo.createOffer({
    fullName: parsed.data.fullName,
    city: parsed.data.city,
    district: parsed.data.district,
    installationLocation: parsed.data.installationLocation,
    installationAddress: parsed.data.installationAddress,
    appliances: parsed.data.appliances,
    detailedDescription: parsed.data.detailedDescription,
    phone: parsed.data.phone,
    email: parsed.data.email ?? undefined,
  });

  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim/bildirimler");

  return { ok: true, offerId: offer.id };
}
