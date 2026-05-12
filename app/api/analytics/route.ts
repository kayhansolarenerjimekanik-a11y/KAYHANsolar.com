import { NextResponse } from "next/server";
import { z } from "zod";

import { readServerConsent } from "@/lib/consent/server";
import { recordEvent } from "@/lib/analytics/repository";

const bodySchema = z.object({
  type: z.enum([
    "page_view",
    "product_view",
    "add_to_cart",
    "offer_submit",
    "search_query",
    "chat_message",
  ]),
  pageUrl: z.string().optional(),
  productId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  const consent = await readServerConsent();
  if (!consent.analytics) {
    // Sessizce skipped — client tracker hata almasın diye 200 dön
    return NextResponse.json({ ok: true, skipped: true });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
