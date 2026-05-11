import type { AuthProvider } from "./provider";

export const supabaseAuthProvider: AuthProvider = {
  async signIn() {
    return {
      ok: false,
      error:
        "Supabase auth henüz yapılandırılmadı. AUTH_MODE=demo olarak ayarlayın.",
    };
  },
};
