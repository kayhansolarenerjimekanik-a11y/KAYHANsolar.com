"use client";

import { useEffect, useState } from "react";

import {
  type ConsentState,
  readConsent,
  writeConsent,
} from "@/lib/consent";

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // SSR hydration guard — read consent from localStorage on client
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    setHydrated(true);
    function onChange(e: Event) {
      const ce = e as CustomEvent<ConsentState | null>;
      setConsent(ce.detail);
    }
    window.addEventListener("kayhan-consent-change", onChange);
    return () => window.removeEventListener("kayhan-consent-change", onChange);
  }, []);

  function setAndSave(next: { analytics: boolean; marketing: boolean }) {
    writeConsent(next);
  }

  return { consent, hydrated, setConsent: setAndSave };
}
