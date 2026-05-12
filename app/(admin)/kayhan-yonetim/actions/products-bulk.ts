// app/(admin)/kayhan-yonetim/actions/products-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
  error?: string;
}

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/urunler");
}

export async function bulkSetProductActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.updateProduct(id, { isActive });
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidateCatalog();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteProductsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteProduct(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidateCatalog();
  return { ok: failed === 0, succeeded, failed };
}
