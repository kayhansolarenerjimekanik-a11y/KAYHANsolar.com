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
