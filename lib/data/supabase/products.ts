import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { productToInsert, rowToProduct } from "../mappers";
import type { Product } from "../types";
import { pushNotification } from "./notifications";

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

export async function createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
  const { data: row, error } = await adminSupabase
    .from("products")
    .insert(productToInsert(data))
    .select()
    .single();
  if (error) throw error;

  if (data.media.length > 0) {
    const inserts = data.media.map((m, i) => ({
      product_id: row.id,
      media_type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnailUrl ?? null,
      alt_text: m.altText ?? null,
      display_order: i,
    }));
    const { error: mediaErr } = await adminSupabase.from("product_media").insert(inserts);
    if (mediaErr) throw mediaErr;
  }
  return (await getProductById(row.id))!;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const prev = await getProductById(id);
  if (!prev) throw new Error(`Product ${id} not found`);

  // Map only the columns that map cleanly. Media handled separately.
  const update: Record<string, any> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.shortDescription !== undefined) update.short_description = patch.shortDescription;
  if (patch.longDescription !== undefined) update.long_description = patch.longDescription;
  if (patch.technicalSpecs !== undefined) update.technical_specs = patch.technicalSpecs;
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
  if (patch.brand !== undefined) update.brand = patch.brand;
  if (patch.currentPrice !== undefined) update.current_price = patch.currentPrice;
  if (patch.compareAtPrice !== undefined) update.compare_at_price = patch.compareAtPrice;
  if (patch.stockQuantity !== undefined) update.stock_quantity = patch.stockQuantity;
  if (patch.lowStockThreshold !== undefined) update.low_stock_threshold = patch.lowStockThreshold;
  if (patch.badges !== undefined) update.badges = patch.badges;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.isFeatured !== undefined) update.is_featured = patch.isFeatured;
  if (patch.isNewArrival !== undefined) update.is_new_arrival = patch.isNewArrival;

  if (Object.keys(update).length > 0) {
    const { error } = await adminSupabase.from("products").update(update).eq("id", id);
    if (error) throw error;
  }

  if (patch.media !== undefined) {
    await adminSupabase.from("product_media").delete().eq("product_id", id);
    if (patch.media.length > 0) {
      const inserts = patch.media.map((m, i) => ({
        product_id: id,
        media_type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null,
        alt_text: m.altText ?? null,
        display_order: i,
      }));
      await adminSupabase.from("product_media").insert(inserts);
    }
  }

  const next = (await getProductById(id))!;

  // Low-stock notification (parity with demo behavior)
  if (
    patch.stockQuantity !== undefined &&
    next.stockQuantity > 0 &&
    next.stockQuantity <= next.lowStockThreshold &&
    prev.stockQuantity > prev.lowStockThreshold
  ) {
    await pushNotification({
      type: "low_stock",
      title: "Stok Azaldı",
      message: `${next.name} — ${next.stockQuantity} adet kaldı`,
      relatedId: id,
      relatedType: "product",
    });
  }
  return next;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await adminSupabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
