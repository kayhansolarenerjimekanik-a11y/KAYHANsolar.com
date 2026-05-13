// scripts/check-env.mjs
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

const GROUPS = {
  "Çekirdek (zorunlu)": [
    "AUTH_MODE",
    "DATA_MODE",
    "AUTH_SECRET",
  ],
  "Supabase": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  ],
  "Servis anahtarları": [
    "RESEND_API_KEY",
    "GEMINI_API_KEY",
  ],
  "Faz 6 — Bot koruması (Turnstile)": [
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
  ],
  "Faz 6 — Web Push (VAPID)": [
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ],
  "Faz 6 — Üretim URL": [
    "NEXT_PUBLIC_SITE_URL",
  ],
};

const PLACEHOLDERS = new Set([
  "replace-me-with-48-bytes-of-base64",
  "your-key-here",
  "TODO",
  "",
]);

const RUNBOOK_HINT = "Adımlar: docs/runbooks/faz-6-production-prep.md";

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const out = {};
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function status(value) {
  if (value === undefined) return { ok: false, label: C.red("EKSİK") };
  if (PLACEHOLDERS.has(value)) return { ok: false, label: C.yellow("PLACEHOLDER") };
  return { ok: true, label: C.green("✓") };
}

function main() {
  if (!existsSync(ENV_PATH)) {
    console.log(C.red(`.env.local bulunamadı: ${ENV_PATH}`));
    console.log(C.dim("Önce .env.local.example dosyasını kopyalayıp doldur."));
    console.log(C.dim(RUNBOOK_HINT));
    process.exit(1);
  }

  const env = parseEnv(ENV_PATH);

  console.log(C.bold(`KAYHAN Solar — .env.local sağlık raporu\n`));
  let missing = 0;
  let placeholders = 0;
  let total = 0;

  for (const [groupName, keys] of Object.entries(GROUPS)) {
    console.log(C.bold(groupName));
    for (const key of keys) {
      total += 1;
      const s = status(env[key]);
      if (!s.ok) {
        if (env[key] === undefined) missing += 1;
        else placeholders += 1;
      }
      const valPreview = env[key]
        ? env[key].length > 20
          ? env[key].slice(0, 8) + "…" + env[key].slice(-4)
          : env[key]
        : C.dim("(eksik)");
      console.log(`  ${s.label}  ${key.padEnd(38)} ${C.dim(valPreview)}`);
    }
    console.log("");
  }

  const ok = total - missing - placeholders;
  console.log(
    C.bold(
      `Özet: ${C.green(`${ok} hazır`)} · ${C.yellow(`${placeholders} placeholder`)} · ${C.red(`${missing} eksik`)} / ${total}`,
    ),
  );
  console.log("");
  console.log(C.dim(RUNBOOK_HINT));

  if (missing > 0 || placeholders > 0) {
    process.exit(1);
  }
}

main();
