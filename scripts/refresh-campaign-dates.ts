import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const NEW_END = "2027-12-31T23:59:59Z";
  const { data, error } = await sb
    .from("campaigns")
    .update({ end_date: NEW_END })
    .lt("end_date", new Date().toISOString())
    .select("id, slug, end_date");
  if (error) { console.error(error); process.exit(1); }
  console.log("Refreshed:", data);
}
main().catch(e => { console.error(e); process.exit(1); });
