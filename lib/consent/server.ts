import "server-only";

import { cookies } from "next/headers";

import { CONSENT_KEY } from "./index";

export interface ServerConsent {
  analytics: boolean;
  marketing: boolean;
}

const NONE: ServerConsent = { analytics: false, marketing: false };

/**
 * Sunucu tarafında KVKK consent cookie'sini oku.
 * Kullanıcı banner'da bir tercih kaydetmediyse her şey false dönülür.
 */
export async function readServerConsent(): Promise<ServerConsent> {
  const c = await cookies();
  const raw = c.get(CONSENT_KEY)?.value;
  if (!raw) return NONE;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as Partial<ServerConsent>;
    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return NONE;
  }
}
