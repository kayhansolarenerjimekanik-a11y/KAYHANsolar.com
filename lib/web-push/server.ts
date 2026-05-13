import "server-only";

import * as webpush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isServerPushEnabled(): boolean {
  return configure();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface SendPushResult {
  ok: boolean;
  /** True when push service returned 404/410 — caller should delete this subscription. */
  expired: boolean;
  error?: string;
}

export async function sendWebPush(
  subscriptionJson: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!configure()) {
    return { ok: false, expired: false, error: "vapid_not_configured" };
  }
  let subscription: WebPushSubscription;
  try {
    subscription = JSON.parse(subscriptionJson) as WebPushSubscription;
  } catch {
    return { ok: false, expired: true, error: "invalid_subscription_json" };
  }
  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
    );
    return {
      ok: result.statusCode >= 200 && result.statusCode < 300,
      expired: false,
    };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      return { ok: false, expired: true, error: `push_gone_${status}` };
    }
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, expired: false, error: message };
  }
}
