import { NextResponse } from "next/server";
import { z } from "zod";

import { checkStockSubscribeRateLimit } from "@/lib/rate-limit";
import { subscribeToStock } from "@/lib/stock-notifications";
import { verifyTurnstileToken } from "@/lib/turnstile";

const bodySchema = z.object({
  productId: z.string().min(1),
  email: z.string().email().optional(),
  pushSubscriptionJson: z.string().optional(),
  captchaToken: z.string().optional(),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = checkStockSubscribeRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Çok fazla istek. Lütfen ${Math.ceil(limit.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );
  }
  const captchaOk = await verifyTurnstileToken(parsed.data.captchaToken ?? null);
  if (!captchaOk) {
    return NextResponse.json({ error: "Güvenlik doğrulaması başarısız" }, { status: 400 });
  }
  if (!parsed.data.email && !parsed.data.pushSubscriptionJson) {
    return NextResponse.json(
      { error: "E-posta veya bildirim aboneliği gerekli" },
      { status: 400 },
    );
  }
  try {
    const sub = await subscribeToStock(
      parsed.data.productId,
      parsed.data.email,
      parsed.data.pushSubscriptionJson,
    );
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Beklenmeyen hata" },
      { status: 500 },
    );
  }
}
