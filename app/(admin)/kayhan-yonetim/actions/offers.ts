"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { offerUpdateSchema } from "@/lib/validations/offer";

export interface OfferActionState {
  error?: string;
  success?: boolean;
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

  const patch: Parameters<typeof repo.updateOffer>[1] = {
    status: parsed.data.status,
    adminNotes: parsed.data.adminNotes,
    adminResponse: parsed.data.adminResponse,
  };
  if (parsed.data.status === "responded") {
    patch.respondedAt = new Date().toISOString();
  }

  await repo.updateOffer(id, patch);
  revalidatePath(`/kayhan-yonetim/teklifler/${id}`);
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  return { success: true };
}
