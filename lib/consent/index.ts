export const CONSENT_KEY = "kayhan-consent-v1";

export interface ConsentState {
  necessary: true; // always true (functional cookies)
  analytics: boolean;
  marketing: boolean;
  acceptedAt: number;
}

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  acceptedAt: 0,
};

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      acceptedAt: typeof parsed.acceptedAt === "number" ? parsed.acceptedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writeConsent(consent: Omit<ConsentState, "necessary" | "acceptedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ConsentState = {
      necessary: true,
      analytics: consent.analytics,
      marketing: consent.marketing,
      acceptedAt: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("kayhan-consent-change", { detail: payload }));
  } catch {
    // ignore quota
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent("kayhan-consent-change", { detail: null }));
  } catch {
    // ignore
  }
}
