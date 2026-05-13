# Faz 6 Destek Araçları Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 6 (production prep) runbook'unu pratik kılmak için iki bağımsız araç ekle: (1) `pnpm check:env` — `.env.local` sağlık raporu CLI; (2) `GET /api/health` — admin-gated runtime entegrasyon kontrolü endpoint'i. Paralel agent ortamında shared file çakışmasını önlemek için her ikisi de yeni dosya, yardım metni dosya içine gömülü.

**Architecture:** İki tamamen bağımsız bileşen. `check-env.mjs` Node ESM script (zero dep, fs read + stdout). `/api/health` Next.js 16 App Router GET handler (admin-gated, env+live check, JSON output). Paylaşılan tip yok, paylaşılan helper yok. Runbook'a dokunulmaz — embedded help (script footer + endpoint JSON'da `runbook` field).

**Tech Stack:** Node ESM (.mjs, zero dep), Next.js 16 App Router, TypeScript strict, `@/lib/auth` `requireAdmin()`, `@/lib/data` `repo.listCategories()`. Test runner yok — doğrulama `pnpm exec tsc --noEmit && pnpm lint` + manuel smoke.

**Spec:** `docs/superpowers/specs/2026-05-13-faz6-destek-arac-design.md`

**Branch:** `feat/faz6-destek-arac` (main'den izole). Spec commit'i `a730d38`'de yatıyor.

**Verification per task:** Her görev sonunda:
```
pnpm exec tsc --noEmit && pnpm lint
```
sıfır hata + sıfır uyarı vermeli. Görev belirtirse manuel smoke testi yap. Sonra commit.

---

## Task 1: `scripts/check-env.mjs` — env checker CLI

Zero-dep Node ESM script. `.env.local` parse eder, anahtar gruplarını renkli rapor olarak basar. Eksik veya placeholder anahtar varsa exit 1 + footer (`Adımlar: docs/runbooks/faz-6-production-prep.md`).

**Files:**
- Create: `scripts/check-env.mjs`

- [ ] **Step 1: Script dosyasını oluştur**

```js
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
  green: (s) => `[32m${s}[0m`,
  red: (s) => `[31m${s}[0m`,
  yellow: (s) => `[33m${s}[0m`,
  bold: (s) => `[1m${s}[0m`,
  dim: (s) => `[2m${s}[0m`,
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
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı. (Script `.mjs` olduğu için tsc'ye girmez; lint geçer.)

- [ ] **Step 3: Commit**

```bash
git add scripts/check-env.mjs
git commit -m "feat(scripts): check-env env.local saglik raporu"
```

---

## Task 2: `package.json`'a `check:env` script entry'sini ekle

`scripts` bölümüne tek satır ekleniyor. Mevcut script'lere dokunulmuyor.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: package.json'ı oku**

Run:
```
type package.json
```
(Windows PowerShell `type` ya da Bash `cat`.) `scripts` bölümünü tespit et.

- [ ] **Step 2: `scripts` bölümüne tek satır ekle**

`"scripts": { ... }` içine alfabetik sıraya uygun yere `"check:env": "node scripts/check-env.mjs"` satırını ekle. Diğer entry'lere dokunma.

Örneğin mevcut yapı:
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  ...
}
```

Eklenen satır:
```json
"scripts": {
  "build": "next build",
  "check:env": "node scripts/check-env.mjs",
  "dev": "next dev",
  ...
}
```

JSON'un valid kalmasına dikkat et (önceki satırın sonunda virgül).

- [ ] **Step 3: Çalıştır → mevcut .env.local raporu**

Run:
```
pnpm check:env
```
Expected:
- Çekirdek, Supabase, Servis anahtarları, VAPID, SITE_URL grubları: tüm anahtarlar ✓ (yeşil).
- Turnstile grubu: 2 anahtar EKSİK (kırmızı).
- Özet satırı: `11 hazır · 0 placeholder · 2 eksik / 13` (yaklaşık — gerçek sayı `.env.local` içeriğine göre).
- Footer: `Adımlar: docs/runbooks/faz-6-production-prep.md`
- Exit code: `1` (Turnstile eksik olduğu için).

`echo %errorlevel%` (Windows) veya `echo $?` (Bash) ile exit kontrol edebilirsin.

- [ ] **Step 4: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore(pkg): pnpm check:env scripts entry"
```

---

## Task 3: `app/api/health/route.ts` — admin-gated runtime health endpoint

`requireAdmin()` ilk await; auth geçtikten sonra 6 check çalışır (supabase live ping + 5 env-only). JSON output `ok` + `mode` + `checks[]` + `runbook` + `timestamp`. `fail` varsa HTTP 503, aksi 200.

**Files:**
- Create: `app/api/health/route.ts`

- [ ] **Step 1: Endpoint dosyasını oluştur**

```ts
// app/api/health/route.ts
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";

type CheckStatus = "ok" | "fail" | "skipped";

interface Check {
  name: string;
  status: CheckStatus;
  detail?: string;
}

const RUNBOOK = "docs/runbooks/faz-6-production-prep.md";

function envOk(...keys: string[]): boolean {
  return keys.every((k) => {
    const v = process.env[k];
    return Boolean(v && v.trim());
  });
}

async function checkSupabase(): Promise<Check> {
  if (process.env.DATA_MODE !== "supabase") {
    return { name: "supabase", status: "skipped", detail: "DATA_MODE != supabase" };
  }
  if (!envOk("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")) {
    return { name: "supabase", status: "fail", detail: "anahtar eksik" };
  }
  try {
    await repo.listCategories();
    return { name: "supabase", status: "ok" };
  } catch (err) {
    return {
      name: "supabase",
      status: "fail",
      detail: err instanceof Error ? err.message : "bilinmeyen hata",
    };
  }
}

function checkResend(): Check {
  if (!envOk("RESEND_API_KEY")) {
    return { name: "resend", status: "skipped", detail: "RESEND_API_KEY yok" };
  }
  return { name: "resend", status: "ok" };
}

function checkGemini(): Check {
  if (!envOk("GEMINI_API_KEY")) {
    return { name: "gemini", status: "skipped", detail: "GEMINI_API_KEY yok" };
  }
  return { name: "gemini", status: "ok" };
}

function checkTurnstile(): Check {
  if (!envOk("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY")) {
    return {
      name: "turnstile",
      status: "skipped",
      detail: "anahtar yok — bot koruması demo passthrough",
    };
  }
  return { name: "turnstile", status: "ok" };
}

function checkVapid(): Check {
  if (!envOk("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT")) {
    return {
      name: "vapid",
      status: "skipped",
      detail: "anahtar yok — web push devre dışı",
    };
  }
  return { name: "vapid", status: "ok" };
}

function checkSiteUrl(): Check {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  if (!v) {
    return { name: "site_url", status: "skipped", detail: "fallback https://kayhansolar.com" };
  }
  try {
    new URL(v);
    return { name: "site_url", status: "ok", detail: v };
  } catch {
    return { name: "site_url", status: "fail", detail: `geçersiz URL: ${v}` };
  }
}

export async function GET() {
  await requireAdmin();

  const checks: Check[] = [
    await checkSupabase(),
    checkResend(),
    checkGemini(),
    checkTurnstile(),
    checkVapid(),
    checkSiteUrl(),
  ];
  const ok = checks.every((c) => c.status !== "fail");
  return NextResponse.json(
    {
      ok,
      mode: {
        auth: process.env.AUTH_MODE ?? "demo",
        data: process.env.DATA_MODE ?? "demo",
      },
      checks,
      runbook: RUNBOOK,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
```

- [ ] **Step 2: TypeScript + lint kontrol**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke (cookie YOK)**

`pnpm dev` arka planda çalışıyor olmalı.

```
curl -i http://localhost:3000/api/health
```

Expected: HTTP 401 (veya `requireAdmin()` redirect davranışına göre 302/307). Body içinde admin login sayfası HTML'i ya da JSON 401 olabilir — önemli olan **endpoint mantığına geçilmediği**. JSON döndüyse `mode`/`checks` alanlarının olmaması gerekir.

- [ ] **Step 4: Manuel smoke (admin login)**

1. Tarayıcıdan `/kayhan-yonetim/giris` aç, admin olarak giriş yap.
2. Tarayıcıyı kapatma; cookie'yi kullanarak:

PowerShell:
```powershell
$cookies = (Invoke-WebRequest http://localhost:3000/api/health -SessionVariable s).Headers
```
veya en kolay yol: tarayıcıdan doğrudan `http://localhost:3000/api/health` aç → JSON görünmeli.

Expected JSON (mevcut `.env.local` durumu):
```json
{
  "ok": true,
  "mode": { "auth": "supabase", "data": "supabase" },
  "checks": [
    { "name": "supabase", "status": "ok" },
    { "name": "resend", "status": "ok" },
    { "name": "gemini", "status": "ok" },
    { "name": "turnstile", "status": "skipped", "detail": "anahtar yok — bot koruması demo passthrough" },
    { "name": "vapid", "status": "ok" },
    { "name": "site_url", "status": "ok", "detail": "https://kayhansolar.com" }
  ],
  "runbook": "docs/runbooks/faz-6-production-prep.md",
  "timestamp": "2026-05-13T..."
}
```

HTTP status: 200.

- [ ] **Step 5: Commit**

```bash
git add app/api/health/route.ts
git commit -m "feat(api/health): admin-gated entegrasyon saglik endpointi"
```

---

## Task 4: Verification raporu + memory güncellemesi

**Files:**
- Create: `docs/superpowers/reports/2026-05-13-faz6-destek-arac-verification.md`
- Create (memory): `C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\project_faz6_destek_araclari.md`
- Modify (memory index): `C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\MEMORY.md`

- [ ] **Step 1: Toplu doğrulama**

Run:
```
pnpm exec tsc --noEmit && pnpm lint && pnpm check:env
```

Expected:
- tsc: 0 hata
- lint: 0 uyarı
- check:env: 11 ✓ + 2 EKSİK (Turnstile) + exit 1; footer satırı görünür

Tarayıcıdan admin login + `http://localhost:3000/api/health` → JSON `ok: true`, turnstile `skipped`, diğerleri `ok`. HTTP 200.

- [ ] **Step 2: Verification raporu yaz**

`docs/superpowers/reports/` klasörü yoksa oluştur (`mkdir -p`).

İçerik:

```markdown
# Faz 6 Destek Araçları — Verification Raporu

**Tarih:** 2026-05-13
**Plan:** docs/superpowers/plans/2026-05-13-faz6-destek-arac.md
**Spec:** docs/superpowers/specs/2026-05-13-faz6-destek-arac-design.md
**Branch:** feat/faz6-destek-arac

## Eklenenler
- `scripts/check-env.mjs` — `pnpm check:env` (zero-dep Node ESM)
- `app/api/health/route.ts` — admin-gated GET endpoint
- `package.json` `scripts.check:env` entry

## Sonuçlar
- TypeScript: 0 hata
- ESLint: 0 uyarı
- `pnpm check:env`: 11 ✓ · 2 EKSİK (Turnstile) · exit 1 — beklenen
- `/api/health` (admin cookie ile): HTTP 200, JSON `ok: true`, turnstile `skipped`, diğerleri `ok`
- `/api/health` (cookie yok): admin login redirect/401 — endpoint mantığı çalışmıyor (doğru davranış)

## Embedded help
- check-env footer: `Adımlar: docs/runbooks/faz-6-production-prep.md`
- /api/health JSON: `runbook: "docs/runbooks/faz-6-production-prep.md"`
- Runbook dosyasına dokunulmadı (paralel agent çakışmasından kaçınıldı)

## Bağımlılıklar
- Yeni paket yok
- Mevcut kullanılanlar: `requireAdmin()`, `repo.listCategories()`, `NextResponse`

## Sıradaki
- Kullanıcı Cloudflare Turnstile anahtarlarını alıp `.env.local`'a eklediğinde `pnpm check:env` ve `/api/health` çıktıları yeşil olacak — Faz 6 production prep kapanmış sayılır.
- Memory güncellendi: `project_faz6_destek_araclari.md`
```

- [ ] **Step 3: Verification raporunu commit et**

```bash
mkdir -p docs/superpowers/reports
git add docs/superpowers/reports/2026-05-13-faz6-destek-arac-verification.md
git commit -m "docs: faz6 destek arac verification raporu"
```

- [ ] **Step 4: Memory dosyası yaz**

Yeni dosya: `C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\project_faz6_destek_araclari.md`

İçerik:
```markdown
---
name: faz6-destek-araclari
description: KAYHAN Solar'a eklenen iki Faz 6 doğrulama aracı — pnpm check:env + admin-gated /api/health endpoint
metadata:
  type: project
---

KAYHAN Solar projesine Faz 6 production prep'i kolaylaştıran iki bağımsız araç eklendi (2026-05-13, branch `feat/faz6-destek-arac`).

**Araçlar:**
- **`pnpm check:env`** — `.env.local` içindeki anahtarların grup bazlı sağlık raporu (CLI). Eksik veya placeholder varsa exit 1. Renkli output. `scripts/check-env.mjs` (zero-dep Node ESM).
- **`GET /api/health`** — Admin-gated JSON endpoint. `requireAdmin()` ilk await; sonra 6 check (supabase live ping + resend/gemini/turnstile/vapid env + site_url). HTTP 200 ok, 503 fail. `app/api/health/route.ts`.

**Embedded help:** Runbook'a dokunulmadı (paralel agent çakışması riski). check-env footer'ında ve /api/health JSON'unda `runbook: docs/runbooks/faz-6-production-prep.md` referansı var.

**Why:** F-1 (web push + turnstile) main'e merge oldu; geriye sadece Turnstile anahtarları kaldı (memory: [[project_integrations]]). Bu araçlar Turnstile + diğer eksik anahtarları runtime'da görmeyi tek komutla mümkün kılıyor.

**How to apply:**
- Faz 6 ilerlemesini kontrol etmek için `pnpm check:env` çalıştır.
- Admin paneli açıkken `http://localhost:3000/api/health` ziyaret et — entegrasyonlar runtime'da ayakta mı görürsün.
- Anahtar ekledikten sonra dev server'ı **yeniden başlat** — `NEXT_PUBLIC_*` env'leri rebuild gerektirir.
- Hangi anahtarı nereden alacağın: [[reference_faz6_runbook]] veya direkt `docs/runbooks/faz-6-production-prep.md`.

**Branch durumu:** `feat/faz6-destek-arac` main'den izole; merge için ayrıca PR açılır.
```

- [ ] **Step 5: MEMORY.md indeksine satır ekle**

`C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\MEMORY.md` dosyasını oku. Mevcut satırlardan sonra yeni satır ekle:

```markdown
- [Faz 6 destek araçları](project_faz6_destek_araclari.md) — pnpm check:env CLI + admin /api/health endpoint, runbook'a dokunmadan embedded help
```

(Memory dosyalarına commit yok — onlar `~/.claude` altında, repo dışı.)

- [ ] **Step 6: Son durum**

Run:
```
git log --oneline feat/faz6-destek-arac
```

Expected (en alttan en üste):
```
<sha1> docs(spec): faz 6 destek araclari tasarim dokumani
<sha2> feat(scripts): check-env env.local saglik raporu
<sha3> chore(pkg): pnpm check:env scripts entry
<sha4> feat(api/health): admin-gated entegrasyon saglik endpointi
<sha5> docs: faz6 destek arac verification raporu
```

5 commit. Plan tamam.

---

## Self-Review

- **Spec coverage:** Spec'in her bölümü plan task'lerinde karşılanıyor:
  - Bileşen 1 (check-env) → Task 1 + Task 2 (package.json entry)
  - Bileşen 2 (/api/health) → Task 3
  - Test stratejisi → Task 4 (verification raporu)
  - Embedded help → Task 1 (footer) + Task 3 (`runbook` field)
  - Admin guard → Task 3 (`requireAdmin()` ilk await)
- **Placeholder scan:** "TBD/TODO/similar to" yok; tüm kod tam.
- **Type consistency:** `Check` tipi tek bir yerde tanımlı; `CheckStatus` aynı. `BulkResult` gibi shared type yok (her bileşen kendi tipini taşıyor).
- **No runbook edit:** Plan runbook dosyasına dokunmuyor (spec'in kapsam dışı maddesi). Embedded help yeterli.
- **Test runner yok varsayımı:** Her task `pnpm exec tsc --noEmit && pnpm lint` ile doğrulanıyor + manuel smoke. AGENTS.md ile uyumlu.

## Sıradaki adım

Execution: **superpowers:executing-plans** (kullanıcı seçimi, paralel-agent ortamında subagent-driven değil).
