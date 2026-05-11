// lib/data/supabase/gallery.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { galleryToInsert, rowToGallery } from "../mappers";
import type { GalleryPost } from "../types";

async function fetchGalleryMedia(postIds: string[]): Promise<Map<string, any[]>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("gallery_media")
    .select("*")
    .in("post_id", postIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, any[]>();
  for (const row of data ?? []) {
    const list = map.get(row.post_id) ?? [];
    list.push(row);
    map.set(row.post_id, list);
  }
  return map;
}

export async function listGalleryPosts(): Promise<GalleryPost[]> {
  const { data, error } = await adminSupabase
    .from("gallery_posts")
    .select("*")
    .order("display_order");
  if (error) throw error;
  const rows: Record<string, any>[] = data ?? [];
  const mediaByPost = await fetchGalleryMedia(rows.map((r) => r.id));
  return rows.map((r) => rowToGallery(r, mediaByPost.get(r.id) ?? []));
}

export async function getGalleryPostBySlug(slug: string): Promise<GalleryPost | null> {
  const { data, error } = await adminSupabase.from("gallery_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchGalleryMedia([data.id])).get(data.id) ?? [];
  return rowToGallery(data, media);
}
