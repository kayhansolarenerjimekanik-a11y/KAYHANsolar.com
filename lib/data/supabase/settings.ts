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
