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
