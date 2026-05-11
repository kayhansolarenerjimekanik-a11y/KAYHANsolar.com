// lib/data/supabase/stock-subscriptions.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowToStockSub } from "../mappers";
import type { StockSubscription } from "../types";

export async function listStockSubscriptions(productId?: string): Promise<StockSubscription[]> {
  let q = adminSupabase.from("stock_notifications").select("*").order("created_at", { ascending: false });
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToStockSub);
}

export async function createStockSubscription(data: {
  productId: string;
  email?: string;
  pushSubscriptionJson?: string;
}): Promise<StockSubscription> {
  const { data: row, error } = await adminSupabase
    .from("stock_notifications")
    .insert({
      product_id: data.productId,
      email: data.email ?? null,
      push_subscription: data.pushSubscriptionJson ? JSON.parse(data.pushSubscriptionJson) : null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToStockSub(row);
}

export async function deleteStockSubscription(id: string): Promise<void> {
  const { error } = await adminSupabase.from("stock_notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function markStockSubscriptionNotified(id: string): Promise<void> {
  const { error } = await adminSupabase
    .from("stock_notifications")
    .update({ is_notified: true, notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
