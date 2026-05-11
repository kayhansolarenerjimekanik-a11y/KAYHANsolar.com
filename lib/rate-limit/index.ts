import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimiterOptions {
  windowMs: number;
  max: number;
}

const buckets = new Map<string, Bucket>();

let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 300_000) return;
  lastPrune = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkLimit(
  key: string,
  options: LimiterOptions,
): RateLimitResult {
  maybePrune();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= options.max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function checkOfferRateLimit(phone: string): RateLimitResult {
  const normalized = phone.replace(/\D/g, "");
  return checkLimit(`offer:${normalized}`, {
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
  });
}

export function checkStockSubscribeRateLimit(ip: string): RateLimitResult {
  return checkLimit(`stocksub:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
}
