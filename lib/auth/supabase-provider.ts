import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import type { AuthProvider, SignInResult } from "./provider";

export const supabaseAuthProvider: AuthProvider = {
  async signIn(email, password): Promise<SignInResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const adminSupabase = getSupabaseAdminClient();

    // Authenticate via Supabase Auth (we don't persist its session — we still mint our own HMAC cookie via setSessionCookie())
    const { data, error } = await adminSupabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: "E-posta veya şifre hatalı" };
    }

    // Fetch role from profiles
    const { data: profileRaw, error: profileErr } = await adminSupabase
      .from("profiles")
      .select("role, email")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profileRaw) {
      return { ok: false, error: "Profil bulunamadı. Yöneticiyle iletişime geçin." };
    }
    const profile = profileRaw as { role: string; email: string };
    const role = profile.role;
    if (!["admin", "moderator", "assistant"].includes(role)) {
      return { ok: false, error: "Bu hesabın yönetim paneline erişim yetkisi yok." };
    }

    const now = Math.floor(Date.now() / 1000);
    return {
      ok: true,
      payload: {
        email: profile.email,
        role: role as "admin" | "moderator" | "assistant",
        iat: now,
        exp: now + SESSION_MAX_AGE_SECONDS,
      },
    };
  },
};
