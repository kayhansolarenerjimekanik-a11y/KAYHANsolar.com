import "server-only";

import { repo } from "@/lib/data";
import { sendStockBackEmail } from "@/lib/email/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";

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
  const product = await repo.getProductById(productId);
  if (!product || pending.length === 0) return 0;

  const productUrl = `${SITE_URL}/urun/${product.slug}`;

  for (const s of pending) {
    if (s.email) {
      try {
        await sendStockBackEmail(s.email, product.name, productUrl);
      } catch (err) {
        console.error("[notify] email send failed", err);
      }
    }
    // Web push dispatch (when VAPID configured) — Faz 6.
    await repo.markStockSubscriptionNotified(s.id);
  }

  await repo.pushNotification({
    type: "system",
    title: "Stok Bildirimi Gönderildi",
    message: `${product.name} için ${pending.length} aboneye email iletildi`,
    relatedId: productId,
    relatedType: "product",
  });

  return pending.length;
}
