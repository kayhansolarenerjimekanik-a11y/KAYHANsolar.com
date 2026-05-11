import { NextResponse } from "next/server";
import { z } from "zod";

import { subscribeToStock } from "@/lib/stock-notifications";

const bodySchema = z.object({
  productId: z.string().min(1),
  email: z.string().email().optional(),
  pushSubscriptionJson: z.string().optional(),
});

export async function POST(request: Request) {
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
