import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { categoryToInsert, rowToCategory } from "../mappers";
import type { Category } from "../types";

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data ?? []).map(rowToCategory);
}

export async function createCategory(data: Omit<Category, "id">): Promise<Category> {
  const { data: row, error } = await adminSupabase
    .from("categories")
    .insert(categoryToInsert(data))
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(row);
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  const update: Record<string, unknown> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.parentId !== undefined) update.parent_id = patch.parentId;
  if (patch.iconUrl !== undefined) update.icon_url = patch.iconUrl;
  if (patch.displayOrder !== undefined) update.display_order = patch.displayOrder;
  const { data: row, error } = await adminSupabase.from("categories").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToCategory(row);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await adminSupabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
