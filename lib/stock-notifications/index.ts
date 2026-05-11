import "server-only";

import { repo } from "@/lib/data";

export async function subscribeToStock(
  productId: string,
  email?: string,
  pushSubscriptionJson?: string,
) {
  if (!email && !pushSubscriptionJson) {
    throw new Error("E-posta veya bildirim aboneliği gerekli");
  }
  return repo.createStockSubscription({
    productId,
    email,
    pushSubscriptionJson,
  });
}

export async function dispatchForProduct(productId: string): Promise<number> {
  const subs = await repo.listStockSubscriptions(productId);
  const pending = subs.filter((s) => !s.isNotified);
  // Demo: just mark notified + push admin notification.
  // Real impl: send email (Resend) + Web Push to subscriptionJson.
  for (const s of pending) {
    await repo.markStockSubscriptionNotified(s.id);
  }
  if (pending.length > 0) {
    const product = await repo.getProductById(productId);
    await repo.pushNotification({
      type: "system",
      title: "Stok Bildirimleri Gönderildi (demo)",
      message: `${product?.name ?? productId} için ${pending.length} aboneye bildirim hazır`,
      relatedId: productId,
      relatedType: "product",
    });
  }
  return pending.length;
}
