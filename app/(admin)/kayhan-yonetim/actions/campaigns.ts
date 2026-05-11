"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { campaignInputSchema } from "@/lib/validations/campaign";

export interface CampaignActionState {
  error?: string;
}

function bust(slug?: string) {
  revalidatePath("/");
  revalidatePath("/magaza");
  if (slug) revalidatePath(`/magaza?kampanya=${slug}`);
  revalidatePath("/kayhan-yonetim/kampanyalar");
}

function parse(formData: FormData) {
  let ruleConfig: Record<string, unknown> = {};
  const raw = formData.get("ruleConfig");
  if (typeof raw === "string" && raw.trim()) {
    try {
      ruleConfig = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  let targetIds: string[] = [];
  const tRaw = formData.get("targetIds");
  if (typeof tRaw === "string" && tRaw.trim()) {
    try {
      targetIds = JSON.parse(tRaw);
    } catch {
      targetIds = tRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return campaignInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    bannerImageUrl: formData.get("bannerImageUrl") || undefined,
    ruleType: formData.get("ruleType"),
    ruleConfig,
    applicableTo: formData.get("applicableTo") ?? "all",
    targetIds,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    isActive: formData.get("isActive") === "on",
    displayOnHomepage: formData.get("displayOnHomepage") === "on",
    displayPriority: formData.get("displayPriority") || 0,
  });
}

export async function createCampaignAction(
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Kural konfigürasyonu geçersiz JSON" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  const created = await repo.createCampaign({
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    endDate: parsed.data.endDate || undefined,
  });
  bust(created.slug);
  redirect("/kayhan-yonetim/kampanyalar");
}

export async function updateCampaignAction(
  id: string,
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Kural konfigürasyonu geçersiz JSON" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  const updated = await repo.updateCampaign(id, {
    ...parsed.data,
    description: parsed.data.description || undefined,
    bannerImageUrl: parsed.data.bannerImageUrl || undefined,
    endDate: parsed.data.endDate || undefined,
  });
  bust(updated.slug);
  redirect("/kayhan-yonetim/kampanyalar");
}

export async function deleteCampaignAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteCampaign(id);
  bust();
  redirect("/kayhan-yonetim/kampanyalar");
}
