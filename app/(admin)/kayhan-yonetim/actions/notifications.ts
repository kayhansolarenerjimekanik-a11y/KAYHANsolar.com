"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

export async function fetchUnreadCountAction(): Promise<number> {
  await requireAdmin();
  return repo.unreadCount();
}

export async function markNotificationReadAction(id: string): Promise<void> {
  await requireAdmin();
  await repo.markNotificationRead(id);
  revalidatePath("/kayhan-yonetim/bildirimler");
  revalidatePath("/kayhan-yonetim");
}

export async function markAllReadAction(): Promise<void> {
  await requireAdmin();
  await repo.markAllNotificationsRead();
  revalidatePath("/kayhan-yonetim/bildirimler");
  revalidatePath("/kayhan-yonetim");
}
