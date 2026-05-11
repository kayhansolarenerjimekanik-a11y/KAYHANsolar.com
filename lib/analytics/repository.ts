import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type {
  AnalyticsEvent,
  DailyCount,
  TopProduct,
} from "./types";

export async function recordEvent(event: AnalyticsEvent): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const { error } = await client.from("analytics_events").insert({
    event_type: event.type,
    page_url: event.pageUrl,
    product_id: event.productId,
    metadata: event.metadata ?? {},
    session_id: event.sessionId,
  });
  if (error) console.error("[analytics] insert failed", error);
}

export async function getDailyCounts(
  eventType: string,
  days: number,
): Promise<DailyCount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await client
    .from("analytics_events")
    .select("created_at")
    .eq("event_type", eventType)
    .gte("created_at", since);
  if (error) {
    console.error("[analytics] getDailyCounts failed", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    result.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return result;
}

export async function getTopProducts(days: number, limit = 10): Promise<TopProduct[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = getSupabaseAdminClient() as any;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await client
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", "product_view")
    .gte("created_at", since)
    .not("product_id", "is", null);
  if (error) {
    console.error("[analytics] getTopProducts failed", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.product_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
