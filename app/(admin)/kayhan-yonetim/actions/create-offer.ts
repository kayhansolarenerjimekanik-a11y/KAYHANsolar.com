// app/(admin)/kayhan-yonetim/actions/create-offer.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { sendOfferCreatedEmail } from "@/lib/email/resend";
import { offerCreateSchema } from "@/lib/validations/offer-create";

export interface CreateOfferActionState {
  error?: string;
}

export async function createOfferAction(
  _prev: CreateOfferActionState,
  formData: FormData,
): Promise<CreateOfferActionState> {
  await requireAdmin();

  let appliancesRaw: unknown = [];
  try {
    const raw = formData.get("appliances");
    appliancesRaw =
      typeof raw === "string" && raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return { error: "Cihaz listesi okunamadı" };
  }

  const parsed = offerCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    city: formData.get("city"),
    district: formData.get("district"),
    installationLocation: formData.get("installationLocation"),
    installationAddress: formData.get("installationAddress"),
    appliances: appliancesRaw,
    detailedDescription: formData.get("detailedDescription"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const offer = await repo.createOffer({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    city: parsed.data.city,
    district: parsed.data.district,
    installationLocation: parsed.data.installationLocation,
    installationAddress: parsed.data.installationAddress,
    appliances: parsed.data.appliances,
    detailedDescription: parsed.data.detailedDescription,
  });

  if (offer.email) {
    try {
      await sendOfferCreatedEmail(offer);
    } catch (err) {
      console.error("[email] offer-created failed", err);
    }
  }

  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  redirect(`/kayhan-yonetim/teklifler/${offer.id}`);
}
