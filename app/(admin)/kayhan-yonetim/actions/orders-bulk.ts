// app/(admin)/kayhan-yonetim/actions/orders-bulk.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";
import { sendOrderStatusEmail } from "@/lib/email/resend";

export interface BulkResult {
  ok: boolean;
  succeeded: number;
  failed: number;
}

const validStatuses: OrderStatus[] = [
  "pending",
  "whatsapp_sent",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function bulkSetOrderStatusAction(
  ids: string[],
  status: OrderStatus,
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
      const updated = await repo.updateOrderStatus(id, status);
      try {
        await sendOrderStatusEmail(updated);
      } catch (err) {
        console.error("[email] sendOrderStatusEmail failed", err);
      }
      succeeded += 1;
    } catch (err) {
      console.error("[orders-bulk] updateOrderStatus failed", { id, status, err });
      failed += 1;
    }
  }
  if (succeeded > 0) {
    revalidatePath("/kayhan-yonetim/siparisler");
    revalidatePath("/kayhan-yonetim");
  }
  return { ok: failed === 0, succeeded, failed };
}
