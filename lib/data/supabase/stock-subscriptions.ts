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
