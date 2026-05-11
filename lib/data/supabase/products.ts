import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { productToInsert, rowToProduct } from "../mappers";
import type { Product } from "../types";

async function fetchMedia(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("product_media")
    .select("*")
    .in("product_id", productIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, any[]>();
  for (const row of data ?? []) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await adminSupabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: Record<string, any>[] = data ?? [];
  const mediaByProduct = await fetchMedia(rows.map((r) => r.id));
  return rows.map((r) => rowToProduct(r, mediaByProduct.get(r.id) ?? []));
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([id])).get(id) ?? [];
  return rowToProduct(data, media);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([data.id])).get(data.id) ?? [];
  return rowToProduct(data, media);
}
