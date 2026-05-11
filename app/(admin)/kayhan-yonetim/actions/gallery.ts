"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { galleryInputSchema } from "@/lib/validations/gallery";

export interface GalleryActionState {
  error?: string;
}

function parse(formData: FormData) {
  let media: unknown = [];
  const raw = formData.get("media");
  if (typeof raw === "string") {
    try {
      media = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return galleryInputSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    installationDate: formData.get("installationDate") || undefined,
    systemPowerKw: formData.get("systemPowerKw") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
    media,
  });
}

function bust() {
  revalidatePath("/galeri");
  revalidatePath("/kayhan-yonetim/galeri");
  revalidatePath("/");
}

export async function createGalleryAction(
  _prev: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed || !parsed.success) {
    return { error: !parsed ? "Medya verisi geçersiz" : parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.createGalleryPost({
    slug: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    installationDate: parsed.data.installationDate,
    systemPowerKw: parsed.data.systemPowerKw,
    isFeatured: parsed.data.isFeatured,
    media: parsed.data.media.map((m, i) => ({
      id: m.id ?? `gm-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.caption,
    })),
  });
  bust();
  redirect("/kayhan-yonetim/galeri");
}

export async function deleteGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteGalleryPost(id);
  bust();
}
