import "server-only";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service role not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Convenience singleton used by data-layer modules.
// Typed as `any` to avoid Supabase generic type inference issues when no DB schema is provided.
// Service-role key bypasses RLS — only import from trusted server contexts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminSupabase: any = new Proxy({} as any, {
  get(_target, prop) {
    const c = getSupabaseAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (c as any)[prop];
    return typeof val === "function" ? val.bind(c) : val;
  },
});
