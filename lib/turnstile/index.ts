import "server-only";

export function getTurnstileSiteKey(): string | null {
  const k = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return k && k.length > 0 ? k : null;
}

export function isTurnstileEnabled(): boolean {
  const site = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  return Boolean(site && secret);
}

export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!isTurnstileEnabled()) return true; // demo passthrough
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY ?? "",
          response: token,
        }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
