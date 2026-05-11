"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { categoryInputSchema } from "@/lib/validations/category";

export interface CategoryActionState {
  error?: string;
}

function bust() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/kategoriler");
  revalidatePath("/kayhan-yonetim/urunler");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.createCategory({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    displayOrder: parsed.data.displayOrder,
  });
  bust();
  return {};
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }
  await repo.updateCategory(id, parsed.data);
  bust();
  return {};
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteCategory(id);
  bust();
}
