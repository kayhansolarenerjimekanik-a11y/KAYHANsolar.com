import { NextResponse } from "next/server";

import { repo } from "@/lib/data";
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
