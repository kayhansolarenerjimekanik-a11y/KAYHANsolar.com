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
