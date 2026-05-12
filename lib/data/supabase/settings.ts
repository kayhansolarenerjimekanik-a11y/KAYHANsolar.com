// lib/data/supabase/settings.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowsToSettings } from "../mappers";
import type { SiteSettings } from "../types";

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await adminSupabase.from("site_settings").select("key, value");
  if (error) throw error;
  return rowsToSettings(data ?? []);
}

export async function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const updates: { key: string; value: unknown }[] = [];
  if (patch.contactPhone !== undefined) updates.push({ key: "contact_phone", value: patch.contactPhone });
  if (patch.contactEmail !== undefined) updates.push({ key: "contact_email", value: patch.contactEmail });
  if (patch.whatsappNumber !== undefined) updates.push({ key: "whatsapp_number", value: patch.whatsappNumber });
  if (patch.address !== undefined) updates.push({ key: "address", value: patch.address });
  if (patch.socialMedia !== undefined) updates.push({ key: "social_media", value: patch.socialMedia });
  if (updates.length > 0) {
    const { error } = await adminSupabase.from("site_settings").upsert(updates, { onConflict: "key" });
    if (error) throw error;
  }
  return getSettings();
}
