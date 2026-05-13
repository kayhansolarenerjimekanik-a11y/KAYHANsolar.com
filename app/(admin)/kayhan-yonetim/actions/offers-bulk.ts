// app/(admin)/kayhan-yonetim/actions/offers-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OfferStatus } from "@/lib/data/types";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

const validStatuses: OfferStatus[] = ["new", "in_review", "responded", "closed"];

export async function bulkSetOfferStatusAction(
  ids: string[],
  status: OfferStatus,
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };
  if (!validStatuses.includes(status)) {
    return { ok: false, succeeded: 0, failed: ids.length };
  }

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const patch: Parameters<typeof repo.updateOffer>[1] = { status };
      if (status === "responded") {
        patch.respondedAt = new Date().toISOString();
      }
      await repo.updateOffer(id, patch);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  if (succeeded > 0) {
    revalidatePath("/kayhan-yonetim/teklifler");
    revalidatePath("/kayhan-yonetim");
  }
  return { ok: failed === 0, succeeded, failed };
}
