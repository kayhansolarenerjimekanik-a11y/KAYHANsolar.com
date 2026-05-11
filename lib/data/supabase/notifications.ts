// lib/data/supabase/notifications.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowToNotification } from "../mappers";
import type { AdminNotification } from "../types";

export async function listNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await adminSupabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await adminSupabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}
