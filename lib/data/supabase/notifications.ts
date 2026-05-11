// lib/data/supabase/notifications.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowToNotification } from "../mappers";
import type { AdminNotification, NotificationType } from "../types";

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

export async function pushNotification(data: {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "offer" | "order" | "product";
}): Promise<AdminNotification> {
  const { data: row, error } = await adminSupabase
    .from("admin_notifications")
    .insert({
      type: data.type,
      title: data.title,
      message: data.message,
      related_id: data.relatedId ?? null,
      related_type: data.relatedType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToNotification(row);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await adminSupabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await adminSupabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) throw error;
}
