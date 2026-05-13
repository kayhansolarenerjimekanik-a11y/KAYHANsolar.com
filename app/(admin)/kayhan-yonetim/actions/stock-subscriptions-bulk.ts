// app/(admin)/kayhan-yonetim/actions/stock-subscriptions-bulk.ts
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
  revalidatePath("/kayhan-yonetim/stok-bildirimleri");
  revalidatePath("/kayhan-yonetim");
}

export async function bulkMarkStockNotifiedAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.markStockSubscriptionNotified(id);
      succeeded += 1;
    } catch (err) {
      console.error("[stock-subscriptions-bulk] markNotified failed", { id, err });
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}

export async function bulkDeleteStockSubscriptionsAction(
  ids: string[],
): Promise<BulkResult> {
  await requireAdmin();
  if (ids.length === 0) return { ok: true, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await repo.deleteStockSubscription(id);
      succeeded += 1;
    } catch (err) {
      console.error("[stock-subscriptions-bulk] deleteSubscription failed", { id, err });
      failed += 1;
    }
  }
  if (succeeded > 0) revalidate();
  return { ok: failed === 0, succeeded, failed };
}
