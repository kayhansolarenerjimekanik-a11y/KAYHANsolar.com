// lib/data/supabase/gallery.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { galleryToInsert, rowToGallery } from "../mappers";
import type { GalleryPost } from "../types";

async function fetchGalleryMedia(postIds: string[]): Promise<Map<string, Record<string, unknown>[]>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("gallery_media")
    .select("*")
    .in("post_id", postIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, Record<string, unknown>[]>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const postId = row.post_id as string;
    const list = map.get(postId) ?? [];
    list.push(row);
    map.set(postId, list);
  }
  return map;
}

export async function listGalleryPosts(): Promise<GalleryPost[]> {
  const { data, error } = await adminSupabase
    .from("gallery_posts")
    .select("*")
    .order("display_order");
  if (error) throw error;
  const rows: Record<string, unknown>[] = data ?? [];
  const mediaByPost = await fetchGalleryMedia(rows.map((r) => r.id as string));
  return rows.map((r) => rowToGallery(r, mediaByPost.get(r.id as string) ?? []));
}

export async function getGalleryPostBySlug(slug: string): Promise<GalleryPost | null> {
  const { data, error } = await adminSupabase.from("gallery_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchGalleryMedia([data.id])).get(data.id) ?? [];
  return rowToGallery(data, media);
}

export async function createGalleryPost(data: Omit<GalleryPost, "id">): Promise<GalleryPost> {
  const { data: row, error } = await adminSupabase
    .from("gallery_posts")
    .insert(galleryToInsert(data))
    .select()
    .single();
  if (error) throw error;
  if (data.media.length > 0) {
    const inserts = data.media.map((m, i) => ({
      post_id: row.id,
      media_type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnailUrl ?? null,
      display_order: i,
    }));
    await adminSupabase.from("gallery_media").insert(inserts);
  }
  const fresh = await getGalleryPostBySlug(data.slug);
  return fresh!;
}

export async function updateGalleryPost(id: string, patch: Partial<GalleryPost>): Promise<GalleryPost> {
  const update: Record<string, unknown> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.installationDate !== undefined) update.installation_date = patch.installationDate;
  if (patch.systemPowerKw !== undefined) update.system_power_kw = patch.systemPowerKw;
  if (patch.isFeatured !== undefined) update.is_featured = patch.isFeatured;
  if (Object.keys(update).length > 0) {
    const { error } = await adminSupabase.from("gallery_posts").update(update).eq("id", id);
    if (error) throw error;
  }
  if (patch.media !== undefined) {
    await adminSupabase.from("gallery_media").delete().eq("post_id", id);
    if (patch.media.length > 0) {
      const inserts = patch.media.map((m, i) => ({
        post_id: id,
        media_type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null,
        display_order: i,
      }));
      await adminSupabase.from("gallery_media").insert(inserts);
    }
  }
  const { data: row } = await adminSupabase.from("gallery_posts").select("*").eq("id", id).single();
  const mediaRows = await adminSupabase.from("gallery_media").select("*").eq("post_id", id).order("display_order");
  return rowToGallery(row!, mediaRows.data ?? []);
}

export async function deleteGalleryPost(id: string): Promise<void> {
  const { error } = await adminSupabase.from("gallery_posts").delete().eq("id", id);
  if (error) throw error;
}
