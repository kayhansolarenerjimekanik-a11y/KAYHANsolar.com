import { NextResponse } from "next/server";

import { repo } from "@/lib/data";
import { checkOrderRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createOrderSchema } from "@/lib/validations/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz sipariş verisi" },
        { status: 400 },
      );
    }
    const captchaOk = await verifyTurnstileToken(parsed.data.captchaToken ?? null);
    if (!captchaOk) {
      return NextResponse.json(
        { ok: false, error: "Güvenlik doğrulaması başarısız" },
        { status: 400 },
      );
    }
    const limit = checkOrderRateLimit(parsed.data.customerPhone);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Çok fazla istek — bir süre sonra tekrar deneyin" },
        { status: 429 },
      );
    }
    const order = await repo.createOrder({
      ...parsed.data,
      status: "pending",
      paymentMethod: "whatsapp",
    });
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  } catch (err) {
    console.error("[/api/orders] failed", err);
    return NextResponse.json(
      { ok: false, error: "Sipariş kaydedilemedi" },
      { status: 500 },
    );
  }
}
