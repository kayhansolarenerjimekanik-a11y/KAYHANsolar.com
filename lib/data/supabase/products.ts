import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { productToInsert, rowToProduct } from "../mappers";
import type { Product } from "../types";
import { pushNotification } from "./notifications";
import { listLabelsForProducts, setProductLabels } from "./labels";

async function fetchMedia(productIds: string[]): Promise<Map<string, Record<string, unknown>[]>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("product_media")
    .select("*")
    .in("product_id", productIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, Record<string, unknown>[]>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const productId = row.product_id as string;
    const list = map.get(productId) ?? [];
    list.push(row);
    map.set(productId, list);
  }
  return map;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await adminSupabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows: Record<string, unknown>[] = data ?? [];
  const productIds = rows.map((r) => r.id as string);
  const mediaByProduct = await fetchMedia(productIds);
  const products = rows.map((r) => rowToProduct(r, mediaByProduct.get(r.id as string) ?? []));
  const labelMap = await listLabelsForProducts(productIds);
  return products.map((p) => ({ ...p, customLabels: labelMap.get(p.id) ?? [] }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([id])).get(id) ?? [];
  const product = rowToProduct(data, media);
  const labelMap = await listLabelsForProducts([id]);
  return { ...product, customLabels: labelMap.get(id) ?? [] };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([data.id])).get(data.id) ?? [];
  const product = rowToProduct(data, media);
  const labelMap = await listLabelsForProducts([data.id]);
  return { ...product, customLabels: labelMap.get(data.id) ?? [] };
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt" | "customLabels"> & { customLabelIds?: string[] },
): Promise<Product> {
  const { customLabelIds = [], ...productData } = data;
  const { data: row, error } = await adminSupabase
    .from("products")
    .insert(productToInsert(productData))
    .select()
    .single();
  if (error) throw error;

  if (productData.media.length > 0) {
    const inserts = productData.media.map((m, i) => ({
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
  if (customLabelIds.length > 0) {
    await setProductLabels(row.id, customLabelIds);
  }
  return (await getProductById(row.id))!;
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, "id" | "createdAt" | "customLabels">> & { customLabelIds?: string[] },
): Promise<Product> {
  const prev = await getProductById(id);
  if (!prev) throw new Error(`Product ${id} not found`);
  const { customLabelIds, ...fields } = patch;

  // Map only the columns that map cleanly. Media handled separately.
  const update: Record<string, unknown> = {};
  if (fields.slug !== undefined) update.slug = fields.slug;
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.shortDescription !== undefined) update.short_description = fields.shortDescription;
  if (fields.longDescription !== undefined) update.long_description = fields.longDescription;
  if (fields.technicalSpecs !== undefined) update.technical_specs = fields.technicalSpecs;
  if (fields.categoryId !== undefined) update.category_id = fields.categoryId;
  if (fields.brand !== undefined) update.brand = fields.brand;
  if (fields.currentPrice !== undefined) update.current_price = fields.currentPrice;
  if (fields.compareAtPrice !== undefined) update.compare_at_price = fields.compareAtPrice;
  if (fields.stockQuantity !== undefined) update.stock_quantity = fields.stockQuantity;
  if (fields.lowStockThreshold !== undefined) update.low_stock_threshold = fields.lowStockThreshold;
  if (fields.isActive !== undefined) update.is_active = fields.isActive;
  if (fields.isFeatured !== undefined) update.is_featured = fields.isFeatured;
  if (fields.isNewArrival !== undefined) update.is_new_arrival = fields.isNewArrival;

  if (Object.keys(update).length > 0) {
    const { error } = await adminSupabase.from("products").update(update).eq("id", id);
    if (error) throw error;
  }

  if (fields.media !== undefined) {
    await adminSupabase.from("product_media").delete().eq("product_id", id);
    if (fields.media.length > 0) {
      const inserts = fields.media.map((m, i) => ({
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

  if (customLabelIds !== undefined) {
    await setProductLabels(id, customLabelIds);
  }

  const next = (await getProductById(id))!;

  // Low-stock notification (parity with demo behavior)
  if (
    fields.stockQuantity !== undefined &&
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
