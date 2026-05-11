import { z } from "zod";

import { streamChat, type ChatTurn } from "@/lib/gemini/chat";
import { checkLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .default([]),
  question: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = checkLimit(`chat:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 30,
  });
  if (!limit.allowed) {
    return new Response("Çok fazla istek — bir süre sonra tekrar deneyin.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response("Geçersiz istek", { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Geçersiz veri", {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const piece of streamChat(
          parsed.data.history as ChatTurn[],
          parsed.data.question,
        )) {
          controller.enqueue(encoder.encode(piece));
        }
        controller.close();
      } catch (err) {
        console.error("[chat] stream failed", err);
        try {
          controller.enqueue(
            encoder.encode(
              "\n\n⚠️ Yanıt üretilemedi — lütfen biraz sonra tekrar deneyin.",
            ),
          );
        } catch {
          // ignore
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
