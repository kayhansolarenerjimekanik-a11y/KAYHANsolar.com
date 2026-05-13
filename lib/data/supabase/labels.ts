import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { rowToProductLabel } from "@/lib/data/mappers";
import type { ProductLabel, ProductLabelColor } from "@/types";

export async function listProductLabels(): Promise<ProductLabel[]> {
  const { data, error } = await adminSupabase
    .from("product_labels")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToProductLabel);
}

export async function getProductLabelById(id: string): Promise<ProductLabel | null> {
  const { data, error } = await adminSupabase
    .from("product_labels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProductLabel(data) : null;
}

export async function createProductLabel(
  input: { name: string; color: ProductLabelColor },
): Promise<ProductLabel> {
  const { data, error } = await adminSupabase
    .from("product_labels")
    .insert({ name: input.name, color: input.color })
    .select("*")
    .single();
  if (error) throw error;
  return rowToProductLabel(data);
}

export async function updateProductLabel(
  id: string,
  patch: { name?: string; color?: ProductLabelColor },
): Promise<ProductLabel> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.color !== undefined) update.color = patch.color;
  const { data, error } = await adminSupabase
    .from("product_labels")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToProductLabel(data);
}

export async function deleteProductLabel(id: string): Promise<void> {
  const { error } = await adminSupabase.from("product_labels").delete().eq("id", id);
  if (error) throw error;
}

export async function setProductLabels(
  productId: string,
  labelIds: string[],
): Promise<void> {
  const { error: delError } = await adminSupabase
    .from("product_label_assignments")
    .delete()
    .eq("product_id", productId);
  if (delError) throw delError;
  if (labelIds.length === 0) return;
  const rows = labelIds.map((labelId) => ({
    product_id: productId,
    label_id: labelId,
  }));
  const { error: insError } = await adminSupabase
    .from("product_label_assignments")
    .insert(rows);
  if (insError) throw insError;
}

export async function listLabelsForProducts(
  productIds: string[],
): Promise<Map<string, ProductLabel[]>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("product_label_assignments")
    .select("product_id, label:product_labels(*)")
    .in("product_id", productIds);
  if (error) throw error;
  const out = new Map<string, ProductLabel[]>();
  for (const row of (data ?? []) as Array<{ product_id: string; label: Record<string, unknown> | null }>) {
    if (!row.label) continue;
    const label = rowToProductLabel(row.label);
    const list = out.get(row.product_id) ?? [];
    list.push(label);
    out.set(row.product_id, list);
  }
  return out;
}
