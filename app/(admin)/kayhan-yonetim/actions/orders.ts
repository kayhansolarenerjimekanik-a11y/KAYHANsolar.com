"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";
import { sendOrderStatusEmail } from "@/lib/email/resend";

const validStatuses: OrderStatus[] = [
  "pending",
  "whatsapp_sent",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await requireAdmin();
  if (!validStatuses.includes(status)) return;
  const updated = await repo.updateOrderStatus(orderId, status);
  try {
    await sendOrderStatusEmail(updated);
  } catch (err) {
    console.error("[email] sendOrderStatusEmail failed", err);
  }
  revalidatePath("/kayhan-yonetim/siparisler");
  revalidatePath("/kayhan-yonetim");
}
