"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";

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
  await repo.updateOrderStatus(orderId, status);
  revalidatePath("/kayhan-yonetim/siparisler");
  revalidatePath("/kayhan-yonetim");
}
