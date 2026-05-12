"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { sendOfferResponseEmail } from "@/lib/email/resend";
import { offerUpdateSchema } from "@/lib/validations/offer";

export interface OfferActionState {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
  emailWarning?: string;
}

export async function updateOfferAction(
  id: string,
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  await requireAdmin();
  const parsed = offerUpdateSchema.safeParse({
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
    adminResponse: formData.get("adminResponse") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const offer = await repo.getOfferById(id);
  if (!offer) {
    return { error: "Teklif bulunamadı" };
  }

  const patch: Parameters<typeof repo.updateOffer>[1] = {
    status: parsed.data.status,
    adminNotes: parsed.data.adminNotes,
    adminResponse: parsed.data.adminResponse,
  };
  if (parsed.data.status === "responded") {
    patch.respondedAt = new Date().toISOString();
  }

  await repo.updateOffer(id, patch);

  let emailSent = false;
  let emailWarning: string | undefined;

  const shouldEmail =
    parsed.data.status === "responded" &&
    Boolean(parsed.data.adminResponse?.trim()) &&
    Boolean(offer.email);

  if (shouldEmail) {
    try {
      const result = await sendOfferResponseEmail(
        { ...offer, ...patch },
        parsed.data.adminResponse!,
      );
      if (result.ok) {
        emailSent = true;
      } else {
        emailWarning = result.error ?? "Email iletilemedi";
        console.error("[email] offer-response failed", result.error);
      }
    } catch (err) {
      console.error("[email] offer-response threw", err);
      emailWarning = "Email iletilemedi";
    }
  }

  revalidatePath(`/kayhan-yonetim/teklifler/${id}`);
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  return { success: true, emailSent, emailWarning };
}
