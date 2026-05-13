"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { labelInputSchema } from "@/lib/validations/product-label";

export interface LabelActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/etiketler");
  revalidatePath("/kayhan-yonetim/urunler");
}

function parseFormData(fd: FormData):
  | { error: string; fieldErrors: Record<string, string> }
  | { name: string; color: "lime" | "red" | "yellow" | "blue" | "purple" | "gray" } {
  const raw = { name: fd.get("name"), color: fd.get("color") };
  const parsed = labelInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Form geçersiz", fieldErrors };
  }
  return parsed.data;
}

export async function createLabelAction(
  _prev: LabelActionState,
  fd: FormData,
): Promise<LabelActionState> {
  await requireAdmin();
  const result = parseFormData(fd);
  if ("error" in result) return result;
  await repo.createProductLabel(result);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}

export async function updateLabelAction(
  id: string,
  _prev: LabelActionState,
  fd: FormData,
): Promise<LabelActionState> {
  await requireAdmin();
  const result = parseFormData(fd);
  if ("error" in result) return result;
  await repo.updateProductLabel(id, result);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}

export async function deleteLabelAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.deleteProductLabel(id);
  revalidateCatalog();
  redirect("/kayhan-yonetim/etiketler");
}
