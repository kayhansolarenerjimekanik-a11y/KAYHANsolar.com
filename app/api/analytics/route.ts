import { NextResponse } from "next/server";
import { z } from "zod";

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
