// Quick verification: list Supabase Storage buckets + their public flag,
// and show storage.objects policies. Run once to confirm migration ran.
import postgres from "postgres";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const sql = postgres(dbUrl, { prepare: false });
  try {
    const buckets = await sql<{ id: string; public: boolean }[]>`
      select id, public from storage.buckets order by id
    `;
    console.log("Buckets:");
    for (const b of buckets) {
      console.log(`  ${b.id.padEnd(16)} public=${b.public}`);
    }

    const policies = await sql<{ policyname: string; cmd: string; roles: string[] }[]>`
      select policyname, cmd, roles
        from pg_policies
       where schemaname = 'storage' and tablename = 'objects'
       order by policyname
    `;
    console.log("\nstorage.objects policies:");
    if (policies.length === 0) console.log("  (none)");
    for (const p of policies) {
      console.log(`  ${p.policyname.padEnd(32)} ${p.cmd}  roles=${p.roles.join(",")}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
