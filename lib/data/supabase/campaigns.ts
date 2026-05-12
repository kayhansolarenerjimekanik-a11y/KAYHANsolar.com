// lib/data/supabase/campaigns.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { campaignToInsert, rowToCampaign } from "../mappers";
import type { Campaign } from "../types";

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await adminSupabase
    .from("campaigns")
    .select("*")
    .order("display_priority", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await adminSupabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToCampaign(data) : null;
}

export async function createCampaign(data: Omit<Campaign, "id">): Promise<Campaign> {
  const { data: row, error } = await adminSupabase
    .from("campaigns")
    .insert(campaignToInsert(data))
    .select()
    .single();
  if (error) throw error;
  return rowToCampaign(row);
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign> {
  const update: Record<string, unknown> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.bannerImageUrl !== undefined) update.banner_image_url = patch.bannerImageUrl;
  if (patch.ruleType !== undefined) update.rule_type = patch.ruleType;
  if (patch.ruleConfig !== undefined) update.rule_config = patch.ruleConfig;
  if (patch.applicableTo !== undefined) update.applicable_to = patch.applicableTo;
  if (patch.targetIds !== undefined) update.target_ids = patch.targetIds;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.displayOnHomepage !== undefined) update.display_on_homepage = patch.displayOnHomepage;
  if (patch.displayPriority !== undefined) update.display_priority = patch.displayPriority;
  const { data: row, error } = await adminSupabase.from("campaigns").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToCampaign(row);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await adminSupabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}
