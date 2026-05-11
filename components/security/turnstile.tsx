"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

interface Props {
  siteKey: string | null;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ siteKey, onToken, onExpire }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    function tryRender() {
      if (cancelled) return;
      if (!window.turnstile || !ref.current) {
        setTimeout(tryRender, 200);
        return;
      }
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey!,
        callback: onToken,
        "expired-callback": onExpire,
        theme: "auto",
      });
    }
    tryRender();
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore — widget may already be gone
        }
      }
    };
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div ref={ref} className="my-2" />
    </>
  );
}
