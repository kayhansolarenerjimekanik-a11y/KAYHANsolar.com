import "server-only";

import { Resend } from "resend";

import type { Offer, Order } from "@/lib/data/types";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "KAYHAN Solar <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kayhansolar.com";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    console.warn("[email] Resend disabled; would send:", { to, subject });
    return { ok: true };
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function sendNewOfferEmail(offer: Offer): Promise<void> {
  const { renderNewOfferEmail } = await import("./templates/new-offer");
  const html = renderNewOfferEmail(offer);
  await send({
    to: ADMIN_EMAIL,
    subject: `Yeni Teklif — ${offer.fullName} (${offer.city})`,
    html,
  });
}

export async function sendStockBackEmail(
  to: string,
  productName: string,
  productUrl: string,
): Promise<void> {
  const { renderStockBackEmail } = await import("./templates/stock-back");
  const html = renderStockBackEmail({ productName, productUrl });
  await send({
    to,
    subject: `${productName} stoğa girdi`,
    html,
  });
}

export async function sendOrderStatusEmail(
  order: Order,
): Promise<void> {
  if (!order.customerEmail) return;
  const { renderOrderStatusEmail } = await import("./templates/order-status");
  const html = renderOrderStatusEmail(order);
  await send({
    to: order.customerEmail,
    subject: `Sipariş Durumu — ${order.orderNumber}`,
    html,
  });
}
