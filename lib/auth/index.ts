import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./cookies";
import { demoAuthProvider } from "./demo-provider";
import type { AuthProvider } from "./provider";
import { signSession, verifySession, type SessionPayload } from "./session";
import { supabaseAuthProvider } from "./supabase-provider";

function pickProvider(): AuthProvider {
  const mode = process.env.AUTH_MODE ?? "demo";
  if (mode === "supabase") return supabaseAuthProvider;
  return demoAuthProvider;
}

export const authProvider: AuthProvider = pickProvider();

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(
  payload: SessionPayload,
): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !["admin", "moderator", "assistant"].includes(session.role)) {
    redirect("/kayhan-yonetim/giris");
  }
  return session;
}

export type { SessionPayload };
