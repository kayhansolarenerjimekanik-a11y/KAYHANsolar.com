"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { dispatchForProduct } from "@/lib/stock-notifications";
import { productInputSchema, type ProductInput } from "@/lib/validations/product";

export interface ProductActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/magaza");
  if (slug) revalidatePath(`/urun/${slug}`);
  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/urunler");
}

function parseFormData(formData: FormData): ProductInput | { error: string; fieldErrors: Record<string, string> } {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());

  // Coerce arrays from JSON-encoded fields
  if (typeof raw.badges === "string") {
    try {
      raw.badges = JSON.parse(raw.badges as string);
    } catch {
      raw.badges = [];
    }
  }
  if (typeof raw.media === "string") {
    try {
      raw.media = JSON.parse(raw.media as string);
    } catch {
      raw.media = [];
    }
  }
  if (typeof raw.technicalSpecs === "string") {
    try {
      raw.technicalSpecs = JSON.parse(raw.technicalSpecs as string);
    } catch {
      raw.technicalSpecs = {};
    }
  }
  // Checkboxes only appear in formData when checked
  raw.isActive = formData.get("isActive") === "on" || raw.isActive === "true";
  raw.isFeatured = formData.get("isFeatured") === "on" || raw.isFeatured === "true";
  raw.isNewArrival =
    formData.get("isNewArrival") === "on" || raw.isNewArrival === "true";
  raw.hasFreeShipping =
    formData.get("hasFreeShipping") === "on" || raw.hasFreeShipping === "true";

  const parsed = productInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Form geçersiz", fieldErrors };
  }
  return parsed.data;
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("error" in result) return result;

  const created = await repo.createProduct({
    ...result,
    media: result.media.map((m, i) => ({
      id: m.id ?? `m-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.altText || undefined,
    })),
    technicalSpecs: result.technicalSpecs ?? {},
    compareAtPrice: result.compareAtPrice || undefined,
    supplierUrl: result.supplierUrl || undefined,
    supplierPrice: result.supplierPrice || undefined,
    markupPercentage: result.markupPercentage || undefined,
    brand: result.brand || undefined,
    longDescription: result.longDescription || undefined,
    metaTitle: result.metaTitle?.trim() || undefined,
    metaDescription: result.metaDescription?.trim() || undefined,
  });
  revalidateCatalog(created.slug);
  redirect(`/kayhan-yonetim/urunler`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("error" in result) return result;

  const before = await repo.getProductById(id);
  const wasOutOfStock = before ? before.stockQuantity === 0 : false;

  const updated = await repo.updateProduct(id, {
    ...result,
    media: result.media.map((m, i) => ({
      id: m.id ?? `m-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.altText || undefined,
    })),
    technicalSpecs: result.technicalSpecs ?? {},
    compareAtPrice: result.compareAtPrice || undefined,
    supplierUrl: result.supplierUrl || undefined,
    supplierPrice: result.supplierPrice || undefined,
    markupPercentage: result.markupPercentage || undefined,
    brand: result.brand || undefined,
    longDescription: result.longDescription || undefined,
    metaTitle: result.metaTitle?.trim() || undefined,
    metaDescription: result.metaDescription?.trim() || undefined,
  });

  if (wasOutOfStock && updated.stockQuantity > 0) {
    await dispatchForProduct(id);
  }

  revalidateCatalog(updated.slug);
  redirect(`/kayhan-yonetim/urunler`);
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireAdmin();
  const product = await repo.getProductById(id);
  await repo.deleteProduct(id);
  revalidateCatalog(product?.slug);
  redirect(`/kayhan-yonetim/urunler`);
}
