"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { settingsInputSchema } from "@/lib/validations/settings";

export interface SettingsActionState {
  error?: string;
  success?: boolean;
}

export async function updateSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse({
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    whatsappNumber: formData.get("whatsappNumber"),
    addressCity: formData.get("addressCity"),
    addressFull: formData.get("addressFull"),
    addressMapsUrl: formData.get("addressMapsUrl") || undefined,
    socialInstagram: formData.get("socialInstagram") || undefined,
    socialFacebook: formData.get("socialFacebook") || undefined,
    socialYoutube: formData.get("socialYoutube") || undefined,
    socialTwitter: formData.get("socialTwitter") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  await repo.updateSettings({
    contactPhone: parsed.data.contactPhone,
    contactEmail: parsed.data.contactEmail,
    whatsappNumber: parsed.data.whatsappNumber,
    address: {
      city: parsed.data.addressCity,
      full: parsed.data.addressFull,
      mapsUrl: parsed.data.addressMapsUrl || undefined,
    },
    socialMedia: {
      instagram: parsed.data.socialInstagram || undefined,
      facebook: parsed.data.socialFacebook || undefined,
      youtube: parsed.data.socialYoutube || undefined,
      twitter: parsed.data.socialTwitter || undefined,
    },
  });
  revalidatePath("/");
  revalidatePath("/iletisim");
  revalidatePath("/kayhan-yonetim/ayarlar");
  return { success: true };
}
