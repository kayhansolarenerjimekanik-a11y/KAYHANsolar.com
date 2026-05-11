// lib/data/supabase/orders.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { orderToInsert, rowToOrder } from "../mappers";
import type { Order, OrderStatus } from "../types";

export async function listOrders(status?: OrderStatus): Promise<Order[]> {
  let q = adminSupabase.from("orders").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await adminSupabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToOrder(data) : null;
}
