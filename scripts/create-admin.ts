// Standalone script: creates the admin Supabase user + profile.
// We import createClient directly (not lib/supabase/admin) to avoid
// the `server-only` guard which throws outside Next.js.
import { createClient } from "@supabase/supabase-js";

const email = process.env.DEMO_ADMIN_EMAIL;
const password = process.env.DEMO_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("DEMO_ADMIN_EMAIL or DEMO_ADMIN_PASSWORD missing");
  process.exit(1);
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service role not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const adminSupabase = getSupabaseAdminClient();

  const { data: list, error: listErr } = await adminSupabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());

  let userId: string;
  if (existing) {
    console.log(`User ${email} already exists, id=${existing.id}`);
    userId = existing.id;
  } else {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: email!,
      password: password!,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user!.id;
    console.log(`Created user ${email}, id=${userId}`);
  }

  const { error: profErr } = await adminSupabase
    .from("profiles")
    .upsert({ id: userId, email: email!, role: "admin", full_name: "KAYHAN Admin" }, { onConflict: "id" });
  if (profErr) throw profErr;
  console.log("Profile upserted with role=admin");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
