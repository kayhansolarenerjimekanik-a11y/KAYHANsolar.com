import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "ERROR: DATABASE_URL is not set in .env.local.\n\n" +
        "Open Supabase Dashboard → Project Settings → Database →\n" +
        "Connection string → URI (Transaction pooler).\n\n" +
        "Copy the URI, replace [YOUR-PASSWORD] with the database password\n" +
        "(also shown on that page), and add to .env.local:\n\n" +
        "  DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:6543/postgres\n",
    );
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  console.log(`Applying ${files.length} migration(s) to Supabase...`);
  const sql = postgres(dbUrl, { prepare: false });

  try {
    for (const file of files) {
      console.log(`\n→ ${file}`);
      const path = join(MIGRATIONS_DIR, file);
      const contents = readFileSync(path, "utf8");
      await sql.unsafe(contents);
      console.log(`  ✓ Applied`);
    }
    console.log("\nAll migrations applied successfully.");
  } catch (err) {
    console.error("\nMigration failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
