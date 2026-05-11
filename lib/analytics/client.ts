"use client";

import type { AnalyticsEvent } from "./types";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const KEY = "kayhan-session";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (typeof window === "undefined") return;
  // Gate behind analytics consent
  try {
    const raw = localStorage.getItem("kayhan-consent-v1");
    if (!raw) return; // no consent yet → don't track
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    if (!parsed.analytics) return;
  } catch {
    return;
  }
  const payload = { ...event, sessionId: event.sessionId ?? getSessionId() };
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const ok = navigator.sendBeacon("/api/analytics", blob);
      if (ok) return;
    }
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silent — analytics must not break UX
  }
}
