import "server-only";

import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import type { AuthProvider, SignInResult } from "./provider";

export const demoAuthProvider: AuthProvider = {
  async signIn(email, password): Promise<SignInResult> {
    const expectedEmail = process.env.DEMO_ADMIN_EMAIL;
    const expectedPassword = process.env.DEMO_ADMIN_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      return {
        ok: false,
        error:
          "Demo admin kimlik bilgileri tanımlı değil. .env.local dosyasını kontrol edin.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail !== expectedEmail.toLowerCase() ||
      password !== expectedPassword
    ) {
      return { ok: false, error: "E-posta veya şifre hatalı" };
    }

    const now = Math.floor(Date.now() / 1000);
    return {
      ok: true,
      payload: {
        email: expectedEmail,
        role: "admin",
        iat: now,
        exp: now + SESSION_MAX_AGE_SECONDS,
      },
    };
  },
};
