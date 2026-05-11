// lib/data/supabase/orders.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { orderToInsert, rowToOrder } from "../mappers";
import type { Order, OrderStatus } from "../types";
import { pushNotification } from "./notifications";

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

async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count, error } = await adminSupabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`);
  if (error) throw error;
  const seq = (count ?? 0) + 1;
  return `KH-${year}-${String(seq).padStart(6, "0")}`;
}

export async function createOrder(data: Omit<Order, "id" | "orderNumber" | "createdAt">): Promise<Order> {
  const orderNumber = await nextOrderNumber();
  const { data: row, error } = await adminSupabase
    .from("orders")
    .insert(orderToInsert(data, orderNumber))
    .select()
    .single();
  if (error) throw error;
  const order = rowToOrder(row);
  await pushNotification({
    type: "new_order",
    title: "Yeni Sipariş",
    message: `${order.orderNumber} — ${order.total.toLocaleString("tr-TR")} ₺`,
    relatedId: order.id,
    relatedType: "order",
  });
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data: row, error } = await adminSupabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToOrder(row);
}
