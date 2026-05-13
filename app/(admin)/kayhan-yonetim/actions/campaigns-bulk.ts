// app/(admin)/kayhan-yonetim/actions/campaigns-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/magaza");
  revalidatePath("/kayhan-yonetim/kampanyalar");
  revalidatePath("/kayhan-yonetim");
}

export async function bulkSetCampaignActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.updateCampaign(id, { isActive });
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteCampaignsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteCampaign(id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}
