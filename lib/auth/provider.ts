import type { SessionPayload } from "./session";

export interface SignInResult {
  ok: boolean;
  error?: string;
  payload?: SessionPayload;
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<SignInResult>;
}
