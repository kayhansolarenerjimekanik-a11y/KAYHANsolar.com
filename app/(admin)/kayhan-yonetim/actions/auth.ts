"use server";

import { redirect } from "next/navigation";

import {
  authProvider,
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import { signInSchema } from "@/lib/validations/auth";

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  }

  const result = await authProvider.signIn(
    parsed.data.email,
    parsed.data.password,
  );
  if (!result.ok || !result.payload) {
    return { error: result.error ?? "Giriş başarısız" };
  }

  await setSessionCookie(result.payload);
  redirect("/kayhan-yonetim");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/kayhan-yonetim/giris");
}
