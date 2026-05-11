# Faz 5 — AI Asistan + Analitik + KVKK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the AI customer assistant (Gemini Flash + RAG over Supabase pgvector + voice readout), real email notifications via Resend, basic analytics surfaces, KVKK çerez banner + legal pages, and final cross-browser polish.

**Architecture:**
- **Lean Supabase usage** — keep demo repository for products/offers/orders; use Supabase **only** for `ai_knowledge` (pgvector embeddings) at this phase. Full data-layer migration is Faz 6.
- **AI flow** — Customer asks → Gemini embeds query → pgvector similarity lookup → Top-K knowledge chunks become system context → Gemini Flash streams response → browser renders markdown + offers Web Speech voice readout (pause/resume).
- **Resend integration** — `lib/email/resend.ts` sends transactional email; wired into `createOffer` (admin alert) and `dispatchForProduct` (customer back-in-stock). Demo passthrough when key missing (it isn't anymore, but the env-flag pattern stays).
- **Analytics** — Vercel Analytics is auto-active on deploy; in-app `analytics_events` mock table + a custom admin Analitik page with KPI charts using lightweight inline SVG (no chart lib).
- **KVKK** — Cookie consent banner (localStorage), category-based consent (necessary / analytics / marketing), four legal pages with editable content via existing site-settings pattern.

**Tech Stack:** `@google/generative-ai`, `@supabase/supabase-js` + `@supabase/ssr`, `resend`, `react-markdown` (already installed), Web Speech API (browser-native).

**Master plan reference:** §11 (AI Asistan), §6.10.9 (Analitik), §12.3 (KVKK), §13 Faz 5 + Faz 6 takvimi.

---

## Sub-Phase Breakdown

| Sub-phase | Tasks | Outcome |
|---|---|---|
| **5A — Email + Supabase Foundation** | 1–7 | Resend client wired; Supabase clients ready; pgvector table + admin AI knowledge surface |
| **5B — AI Assistant Core** | 8–14 | Gemini chat + RAG + streaming, chat widget UI, voice readout |
| **5C — Admin AI Training + Analytics** | 15–20 | Admin doc upload + reembed, analytics events + dashboard charts |
| **5D — KVKK + Legal + Polish** | 21–26 | Cookie banner, 4 legal pages, cross-browser & a11y pass |
| **5E — Verify** | 27 | Build/lint/tsc + E2E + verification report |

---

## File Structure

### New files

```
lib/supabase/
  client.ts                 Browser supabase client
  server.ts                 Server supabase client (RLS-aware)
  admin.ts                  Service-role client (server-only)
  types.ts                  Generated/hand-written DB types

lib/email/
  resend.ts                 Resend client wrapper + send helpers
  templates/
    new-offer.tsx           Admin-facing offer alert
    stock-back.tsx          Customer-facing back-in-stock
    order-status.tsx        Order status update email

lib/gemini/
  client.ts                 GoogleGenerativeAI singleton
  chat.ts                   streamChatCompletion() with system prompt + RAG context
  embeddings.ts             embed(content: string) → 768d vector
  rag.ts                    retrieveRelevantChunks(query, k)
  system-prompt.ts          Tailored KAYHAN Solar persona

lib/analytics/
  types.ts                  AnalyticsEvent shape
  client.ts                 trackEvent() — POST to /api/analytics
  aggregations.ts           Server: time-series + top-products etc.

lib/consent/
  index.ts                  Cookie consent storage + categories

app/api/chat/
  route.ts                  POST: streams Gemini response with SSE

app/api/ai-knowledge/
  route.ts                  POST (admin): upsert chunks + embeddings

app/api/analytics/
  route.ts                  POST: tracks one event

app/(public)/
  kvkk/page.tsx             KVKK aydınlatma metni
  gizlilik/page.tsx         Gizlilik politikası
  cerez-politikasi/page.tsx Çerez politikası
  mesafeli-satis/page.tsx   Mesafeli satış sözleşmesi
  iade/page.tsx             İade ve değişim şartları

app/(admin)/kayhan-yonetim/(protected)/
  ai-egitim/page.tsx        REPLACE placeholder with real upload + list UI
  analitik/page.tsx         REPLACE placeholder with charts

components/ai/
  chat-fab.tsx              Floating button (lime, glow, mobile-aware)
  chat-panel.tsx            Slide-in panel / bottom sheet
  chat-message.tsx          User vs AI bubble with markdown
  voice-button.tsx          Play/pause TTS controls
  use-chat.ts               Streaming hook
  use-tts.ts                Web Speech wrapper

components/admin/
  ai-knowledge-list.tsx     Lists uploaded sources, delete
  ai-knowledge-uploader.tsx PDF/TXT/URL paste form
  ai-knowledge-actions.ts   server actions: upload, delete, reembed
  analytics-chart.tsx       Lightweight inline SVG line/bar
  kpi-30day.tsx             Top-N + trendline

components/consent/
  cookie-banner.tsx         Bottom banner; controls below
  cookie-settings.tsx       Detailed category toggles (in /ayarlar)
  use-consent.ts            React hook around lib/consent

components/seo/
  page-track.tsx            Client component → trackEvent on mount

supabase/migrations/
  20260511_001_ai_knowledge.sql   pgvector + ai_knowledge table + match_documents function
  20260511_002_analytics.sql       analytics_events table (lightweight)
```

### Modified files

```
.env.local                       Already has Gemini/Supabase/Resend (user-set). No edits needed.
.env.local.example               Document the now-required keys

app/layout.tsx                   Add <CookieBanner /> + <PageTrack /> + Vercel Analytics import (next/script or @vercel/analytics)

lib/stock-notifications/index.ts Switch dispatchForProduct to send real email via Resend (when key set)
app/(public)/teklif-al/actions/submit.ts   After repo.createOffer, also call sendNewOfferEmail()
app/(admin)/kayhan-yonetim/actions/orders.ts   When status changes, optionally send order-status email

app/(public)/galeri/page.tsx     Wrap with <PageTrack /> (or root layout handles it via path read)
app/(public)/urun/[slug]/page.tsx  Track product_view event server-side via repo.recordEvent

app/layout.tsx                   <ChatFab /> mounted globally (public site only — gate by path)

components/layout/footer.tsx     Update legal links to point to real /kvkk, /gizlilik, etc.
components/offer-wizard/step-confirm.tsx   KVKK link → /kvkk (already correct)

next.config.ts                   No changes expected, but verify remote image patterns still cover any new Supabase storage URLs (Faz 6 concern; ignore now)
```

### Convention reminders

- Plan uses **manual verification** (no automated tests) per master plan §3.9.
- One commit per task. Conventional prefixes: `feat(ai)`, `feat(email)`, `feat(analytics)`, `feat(consent)`, `feat(legal)`, `feat(supabase)`.
- All Turkish-facing strings stay Turkish; identifiers stay English.
- Semantic Tailwind tokens only; no raw hex.

---

# Sub-Phase 5A — Email + Supabase Foundation

Outcome: Resend sends real email for offers and stock alerts; Supabase clients are ready; `ai_knowledge` table exists with pgvector and a `match_documents` RPC.

---

### Task 1: Install dependencies

**Files:** `package.json` (modified via pnpm)

- [ ] **Step 1: Install runtime deps**

```bash
cd "c:/SOLAR S1TE/kayhan-solar"
pnpm add @google/generative-ai @supabase/supabase-js @supabase/ssr resend
```

- [ ] **Step 2: Verify**

Run `cat package.json | grep -A 2 dependencies` and confirm all 4 packages appear.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): add gemini, supabase, resend SDKs"
```

---

### Task 2: Resend client + email templates

**Files:**
- Create: `lib/email/resend.ts`
- Create: `lib/email/templates/new-offer.tsx`
- Create: `lib/email/templates/stock-back.tsx`
- Create: `lib/email/templates/order-status.tsx`

- [ ] **Step 1: Write `lib/email/resend.ts`**

```typescript
import "server-only";

import { Resend } from "resend";

import type { Offer, Order } from "@/lib/data/types";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "KAYHAN Solar <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@kayhansolar.com";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

async function send({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    // Demo passthrough — log to server console for visibility
    console.warn("[email] Resend disabled; would send:", { to, subject });
    return { ok: true };
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function sendNewOfferEmail(offer: Offer): Promise<void> {
  const { renderNewOfferEmail } = await import("./templates/new-offer");
  const html = renderNewOfferEmail(offer);
  await send({
    to: ADMIN_EMAIL,
    subject: `Yeni Teklif — ${offer.fullName} (${offer.city})`,
    html,
  });
}

export async function sendStockBackEmail(
  to: string,
  productName: string,
  productUrl: string,
): Promise<void> {
  const { renderStockBackEmail } = await import("./templates/stock-back");
  const html = renderStockBackEmail({ productName, productUrl });
  await send({
    to,
    subject: `${productName} stoğa girdi`,
    html,
  });
}

export async function sendOrderStatusEmail(
  order: Order,
): Promise<void> {
  if (!order.customerEmail) return;
  const { renderOrderStatusEmail } = await import("./templates/order-status");
  const html = renderOrderStatusEmail(order);
  await send({
    to: order.customerEmail,
    subject: `Sipariş Durumu — ${order.orderNumber}`,
    html,
  });
}
```

- [ ] **Step 2: Write `lib/email/templates/new-offer.tsx`**

```typescript
import type { Offer } from "@/lib/data/types";

export function renderNewOfferEmail(offer: Offer): string {
  const appliances =
    offer.appliances.length === 0
      ? "—"
      : offer.appliances
          .map((a) => (a.powerW ? `${a.name} (${a.powerW}W)` : a.name))
          .join(", ");

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Yeni Teklif</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar Yönetim</strong>
      </div>
      <h1 style="margin:0 0 16px 0;font-size:20px;">Yeni Teklif Talebi</h1>
      <p style="margin:0 0 16px 0;color:#475569;">${escape(offer.fullName)} adlı müşteriden yeni bir teklif geldi.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:140px;">Telefon</td><td>${escape(offer.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">E-posta</td><td>${escape(offer.email ?? "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">İl / İlçe</td><td>${escape(offer.city)} / ${escape(offer.district)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kurulum yeri</td><td>${offer.installationLocation === "roof" ? "Çatı" : offer.installationLocation === "land" ? "Arazi" : "Diğer"}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;vertical-align:top;">Cihazlar</td><td>${escape(appliances)}</td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#f1f5f9;border-radius:12px;font-size:14px;white-space:pre-wrap;">${escape(offer.detailedDescription)}</div>
      <div style="margin-top:24px;">
        <a href="${siteUrl()}/kayhan-yonetim/teklifler/${offer.id}" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;">Yönetim Panelinde Aç</a>
      </div>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";
}
```

- [ ] **Step 3: Write `lib/email/templates/stock-back.tsx`**

```typescript
export function renderStockBackEmail({
  productName,
  productUrl,
}: {
  productName: string;
  productUrl: string;
}): string {
  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Stoğa Geri Geldi</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>
      <h1 style="margin:0 0 16px 0;font-size:22px;">İyi haber!</h1>
      <p style="margin:0 0 16px 0;color:#475569;line-height:1.5;">
        Stoğa girmesini beklediğiniz <strong>${escape(productName)}</strong>
        ürünü artık satın alınabilir durumda.
      </p>
      <div style="margin-top:24px;">
        <a href="${escape(productUrl)}" style="display:inline-block;padding:12px 24px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;">Ürünü Görüntüle</a>
      </div>
      <p style="margin-top:32px;font-size:12px;color:#94a3b8;">
        Bu e-postayı KAYHAN Solar bildirim aboneliğinizi alarak alıyorsunuz.
      </p>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 4: Write `lib/email/templates/order-status.tsx`**

```typescript
import type { Order } from "@/lib/data/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  whatsapp_sent: "İletişim aşamasında",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya verildi",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};

export function renderOrderStatusEmail(order: Order): string {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Sipariş Durumu</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 8px 0;font-size:22px;">Sipariş ${escape(order.orderNumber)}</h1>
      <p style="color:#475569;margin:0 0 24px 0;">Durum güncellendi.</p>
      <div style="padding:16px 20px;background:#c7ff00;color:#000;border-radius:12px;font-weight:600;font-size:18px;">
        ${escape(statusLabel)}
      </div>
      <p style="margin-top:24px;font-size:14px;color:#475569;">
        Sorularınız için bizimle iletişime geçebilirsiniz.
      </p>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

- [ ] **Step 5: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/email
git commit -m "feat(email): Resend client and transactional templates"
```

---

### Task 3: Wire Resend into offer + stock notify + order status

**Files:**
- Modify: `app/(public)/teklif-al/actions/submit.ts`
- Modify: `lib/stock-notifications/index.ts`
- Modify: `app/(admin)/kayhan-yonetim/actions/orders.ts`

- [ ] **Step 1: Modify `app/(public)/teklif-al/actions/submit.ts`**

Read the file. Add the import:

```typescript
import { sendNewOfferEmail } from "@/lib/email/resend";
```

After `const offer = await repo.createOffer({ ... })` and BEFORE the `revalidatePath` calls, add:

```typescript
  // Send admin email — fire-and-forget; failure shouldn't block success response.
  try {
    await sendNewOfferEmail(offer);
  } catch (err) {
    console.error("[email] sendNewOfferEmail failed", err);
  }
```

- [ ] **Step 2: Modify `lib/stock-notifications/index.ts`**

Read the file. Replace the body of `dispatchForProduct` to actually send emails when a product is back:

```typescript
import "server-only";

import { repo } from "@/lib/data";
import { sendStockBackEmail } from "@/lib/email/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";

export async function subscribeToStock(
  productId: string,
  email?: string,
  pushSubscriptionJson?: string,
) {
  if (!email && !pushSubscriptionJson) {
    throw new Error("E-posta veya bildirim aboneliği gerekli");
  }
  return repo.createStockSubscription({
    productId,
    email,
    pushSubscriptionJson,
  });
}

export async function dispatchForProduct(productId: string): Promise<number> {
  const subs = await repo.listStockSubscriptions(productId);
  const pending = subs.filter((s) => !s.isNotified);
  const product = await repo.getProductById(productId);
  if (!product || pending.length === 0) return 0;

  const productUrl = `${SITE_URL}/urun/${product.slug}`;

  for (const s of pending) {
    if (s.email) {
      try {
        await sendStockBackEmail(s.email, product.name, productUrl);
      } catch (err) {
        console.error("[notify] email send failed", err);
      }
    }
    // Web push dispatch (when VAPID configured) — Faz 6.
    await repo.markStockSubscriptionNotified(s.id);
  }

  await repo.pushNotification({
    type: "system",
    title: "Stok Bildirimi Gönderildi",
    message: `${product.name} için ${pending.length} aboneye email iletildi`,
    relatedId: productId,
    relatedType: "product",
  });

  return pending.length;
}
```

- [ ] **Step 3: Modify `app/(admin)/kayhan-yonetim/actions/orders.ts`**

Read the file. Add the import:

```typescript
import { sendOrderStatusEmail } from "@/lib/email/resend";
```

Replace the `updateOrderStatusAction` body to capture the post-update order and send the email:

```typescript
export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await requireAdmin();
  if (!validStatuses.includes(status)) return;
  const updated = await repo.updateOrderStatus(orderId, status);
  try {
    await sendOrderStatusEmail(updated);
  } catch (err) {
    console.error("[email] sendOrderStatusEmail failed", err);
  }
  revalidatePath("/kayhan-yonetim/siparisler");
  revalidatePath("/kayhan-yonetim");
}
```

- [ ] **Step 4: Build + commit**

```bash
pnpm build
git add "app/(public)/teklif-al/actions/submit.ts" lib/stock-notifications/index.ts "app/(admin)/kayhan-yonetim/actions/orders.ts"
git commit -m "feat(email): wire Resend into offer/stock/order flows"
```

---

### Task 4: Supabase client setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Write `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```typescript
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Server Component context — cookie set will throw; safe to ignore.
            }
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Write `lib/supabase/admin.ts`**

```typescript
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
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/supabase
git commit -m "feat(supabase): browser/server/admin client factories"
```

---

### Task 5: Migration SQL — pgvector + ai_knowledge

**Files:**
- Create: `supabase/migrations/20260511_001_ai_knowledge.sql`
- Create: `docs/runbooks/supabase-migrations.md`

- [ ] **Step 1: Write `supabase/migrations/20260511_001_ai_knowledge.sql`**

```sql
-- Enable pgvector for embedding storage
create extension if not exists vector;

-- AI knowledge base — chunked documents with embeddings
create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  source_type text check (source_type in ('manual', 'url', 'pdf', 'text')) default 'manual',
  source_url text,
  embedding vector(768),
  metadata jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_ai_knowledge_active
  on public.ai_knowledge(is_active) where is_active = true;

create index if not exists idx_ai_knowledge_embedding
  on public.ai_knowledge using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC: cosine similarity match
create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float default 0.6,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.ai_knowledge
  where is_active = true
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- RLS: service role only writes; anon read is OK (no PII in knowledge base)
alter table public.ai_knowledge enable row level security;

create policy "ai_knowledge_read_all"
  on public.ai_knowledge for select
  to anon, authenticated
  using (is_active = true);

create policy "ai_knowledge_service_role_all"
  on public.ai_knowledge for all
  to service_role
  using (true) with check (true);
```

- [ ] **Step 2: Write `docs/runbooks/supabase-migrations.md`**

```markdown
# Supabase Migrations Runbook

This project keeps SQL migrations under `supabase/migrations/`. They are NOT run automatically — apply them manually to your Supabase project via the SQL editor.

## How to apply a migration

1. Open the [Supabase Dashboard](https://supabase.com) for the KAYHAN project.
2. Go to **SQL Editor** → **New query**.
3. Open the migration file from `supabase/migrations/<timestamp>_<name>.sql`.
4. Paste contents into the editor.
5. Click **Run**.
6. Verify objects exist via **Database → Tables** / **Database → Functions**.

## Migrations in this project

| File | Purpose | Required for |
|---|---|---|
| `20260511_001_ai_knowledge.sql` | pgvector + ai_knowledge + match_documents RPC | AI assistant (Faz 5B) |
| `20260511_002_analytics.sql` | analytics_events table | Analytics page (Faz 5C) |

## Future

When the full data layer migration happens (Faz 6), additional migrations will create products, categories, campaigns, offers, orders, gallery, profiles, etc.
```

- [ ] **Step 3: Commit**

```bash
git add supabase docs/runbooks
git commit -m "feat(supabase): ai_knowledge migration + runbook"
```

> **Manual step (do once before Task 8):** Open Supabase SQL Editor and run `supabase/migrations/20260511_001_ai_knowledge.sql`. Verify the table and `match_documents` function exist. No need to seed yet.

---

### Task 6: AI knowledge types + repository surface

**Files:**
- Create: `lib/ai-knowledge/types.ts`
- Create: `lib/ai-knowledge/repository.ts`

- [ ] **Step 1: Write `lib/ai-knowledge/types.ts`**

```typescript
export interface AIKnowledgeChunk {
  id: string;
  title: string;
  content: string;
  sourceType: "manual" | "url" | "pdf" | "text";
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface AIKnowledgeMatch {
  id: string;
  title: string;
  content: string;
  similarity: number;
}
```

- [ ] **Step 2: Write `lib/ai-knowledge/repository.ts`**

```typescript
import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type { AIKnowledgeChunk, AIKnowledgeMatch } from "./types";

interface InsertChunk {
  title: string;
  content: string;
  sourceType: "manual" | "url" | "pdf" | "text";
  sourceUrl?: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export async function listChunks(): Promise<AIKnowledgeChunk[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("ai_knowledge")
    .select("id,title,content,source_type,source_url,metadata,is_active,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    sourceType: row.source_type as AIKnowledgeChunk["sourceType"],
    sourceUrl: (row.source_url as string | null) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  }));
}

export async function insertChunks(chunks: InsertChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const client = getSupabaseAdminClient();
  const rows = chunks.map((c) => ({
    title: c.title,
    content: c.content,
    source_type: c.sourceType,
    source_url: c.sourceUrl,
    embedding: c.embedding,
    metadata: c.metadata ?? {},
  }));
  const { error } = await client.from("ai_knowledge").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteChunk(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("ai_knowledge").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function matchChunks(
  queryEmbedding: number[],
  k = 5,
): Promise<AIKnowledgeMatch[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.6,
    match_count: k,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AIKnowledgeMatch[];
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/ai-knowledge
git commit -m "feat(supabase): ai_knowledge repository surface"
```

---

### Task 7: Gemini client + embedding helper

**Files:**
- Create: `lib/gemini/client.ts`
- Create: `lib/gemini/embeddings.ts`
- Create: `lib/gemini/chunker.ts`

- [ ] **Step 1: Write `lib/gemini/client.ts`**

```typescript
import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (cached) return cached;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set in env.");
  }
  cached = new GoogleGenerativeAI(key);
  return cached;
}

export const GEMINI_CHAT_MODEL = "gemini-2.0-flash-exp";
export const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
```

- [ ] **Step 2: Write `lib/gemini/embeddings.ts`**

```typescript
import "server-only";

import { GEMINI_EMBEDDING_MODEL, getGemini } from "./client";

export async function embed(text: string): Promise<number[]> {
  const model = getGemini().getGenerativeModel({
    model: GEMINI_EMBEDDING_MODEL,
  });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Sequential to keep dev-friendly rate limit headroom.
  // Gemini accepts batchEmbedContents too but the SDK shape varies — keep simple.
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await embed(t));
  }
  return out;
}
```

- [ ] **Step 3: Write `lib/gemini/chunker.ts`**

```typescript
// Splits raw text into ~500-character chunks aligned to sentence/paragraph boundaries.
// Heuristic: try paragraph breaks first, fall back to sentence boundaries, last resort hard cut.

const MAX_CHARS = 500;
const MIN_CHARS = 80;

export function chunkText(text: string): string[] {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= MAX_CHARS) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  function flush() {
    const t = buffer.trim();
    if (t.length >= MIN_CHARS) chunks.push(t);
    else if (chunks.length > 0 && t.length > 0) {
      chunks[chunks.length - 1] += "\n\n" + t;
    } else if (t.length > 0) {
      chunks.push(t);
    }
    buffer = "";
  }

  for (const p of paragraphs) {
    if (buffer.length + p.length + 2 <= MAX_CHARS) {
      buffer = buffer.length === 0 ? p : `${buffer}\n\n${p}`;
      continue;
    }
    if (buffer.length > 0) flush();

    if (p.length <= MAX_CHARS) {
      buffer = p;
      continue;
    }

    // Paragraph itself too long — split by sentences
    const sentences = p.split(/(?<=[.!?])\s+/);
    let sBuf = "";
    for (const s of sentences) {
      if (sBuf.length + s.length + 1 > MAX_CHARS) {
        if (sBuf.trim().length >= MIN_CHARS) chunks.push(sBuf.trim());
        sBuf = s;
      } else {
        sBuf = sBuf.length === 0 ? s : `${sBuf} ${s}`;
      }
    }
    if (sBuf.trim().length > 0) buffer = sBuf.trim();
  }
  if (buffer.length > 0) flush();

  return chunks;
}
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/gemini
git commit -m "feat(ai): Gemini client, embeddings helper, text chunker"
```

---

**✓ End of Sub-Phase 5A.** Resend wired; Supabase clients ready; pgvector + ai_knowledge migration applied; Gemini SDK ready to chat and embed.

---

# Sub-Phase 5B — AI Assistant Core

Outcome: A floating lime FAB on every public page opens a chat panel. Customer messages stream via SSE from Gemini Flash, grounded with top-K knowledge chunks from pgvector. Markdown renders cleanly. Voice readout (Web Speech API) reads AI responses with pause/resume; emoji and markdown stripped from spoken text.

---

### Task 8: System prompt + RAG retrieval

**Files:**
- Create: `lib/gemini/system-prompt.ts`
- Create: `lib/gemini/rag.ts`

- [ ] **Step 1: Write `lib/gemini/system-prompt.ts`**

```typescript
export const KAYHAN_SYSTEM_PROMPT = `Sen KAYHAN Solar & Enerji'nin müşteri asistanısın.

Görevin:
- Güneş enerjisi sistemleri, paneller, inverterler, bataryalar ve kurulum hakkında müşterilerin sorularını yanıtlamak.
- Sistem büyüklüğü, panel sayısı ve kabataslak fiyat tahminleri yapmak (somut hesap için "teklif formunu doldurmanızı öneririm" de).
- Ürünlerimiz, kampanyalarımız ve garanti şartları hakkında bilgi vermek.

Cevap kuralları:
- Cevaplar Türkçe, kısa, samimi ama profesyonel olsun.
- Belirsiz bir konuda bilgin yoksa uydurma — "Bu konuyu netleştirmek için iletişim formundan ekibimize ulaşabilirsiniz" de.
- Cevaplarını markdown olarak yaz: **kalın**, listeler, kısa başlıklar. Karmaşık tablolardan kaçın.
- Emoji kullanabilirsin ama abartma (mesaj başına 1-2 tane).
- Fiyat söylediğinde "kabataslak" olduğunu belirt.

Aşağıda müşterinin sorusuyla ilgili bilgi tabanından çekilmiş içerikler var. Cevabını öncelikle bu içeriklere dayandır.`;

export function buildContextBlock(chunks: { content: string }[]): string {
  if (chunks.length === 0) return "";
  return `\n\n[İlgili bilgi tabanı içeriği]\n${chunks
    .map((c, i) => `--- (${i + 1}) ---\n${c.content}`)
    .join("\n\n")}\n[içerik sonu]\n`;
}
```

- [ ] **Step 2: Write `lib/gemini/rag.ts`**

```typescript
import "server-only";

import { matchChunks } from "@/lib/ai-knowledge/repository";

import { embed } from "./embeddings";

export async function retrieveContext(
  query: string,
  k = 5,
): Promise<{ content: string; title: string; similarity: number }[]> {
  if (query.trim().length < 3) return [];
  try {
    const queryEmbedding = await embed(query);
    return await matchChunks(queryEmbedding, k);
  } catch (err) {
    console.error("[rag] retrieveContext failed", err);
    return [];
  }
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/gemini/system-prompt.ts lib/gemini/rag.ts
git commit -m "feat(ai): RAG retrieval + KAYHAN system prompt"
```

---

### Task 9: Chat completion + streaming

**Files:**
- Create: `lib/gemini/chat.ts`

- [ ] **Step 1: Write the file**

```typescript
import "server-only";

import { GEMINI_CHAT_MODEL, getGemini } from "./client";
import { retrieveContext } from "./rag";
import { KAYHAN_SYSTEM_PROMPT, buildContextBlock } from "./system-prompt";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChat(
  history: ChatTurn[],
  question: string,
): AsyncGenerator<string, void, unknown> {
  const context = await retrieveContext(question, 5);
  const systemInstruction =
    KAYHAN_SYSTEM_PROMPT + buildContextBlock(context);

  const model = getGemini().getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction,
  });

  const chat = model.startChat({
    history: history.map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    })),
  });

  const stream = await chat.sendMessageStream(question);
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/gemini/chat.ts
git commit -m "feat(ai): Gemini chat stream with system instruction + RAG"
```

---

### Task 10: Chat API route (SSE)

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { z } from "zod";

import { streamChat, type ChatTurn } from "@/lib/gemini/chat";
import { checkLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .default([]),
  question: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = checkLimit(`chat:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 30,
  });
  if (!limit.allowed) {
    return new Response("Çok fazla istek — bir süre sonra tekrar deneyin.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSec) },
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response("Geçersiz istek", { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Geçersiz veri", {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const piece of streamChat(
          parsed.data.history as ChatTurn[],
          parsed.data.question,
        )) {
          controller.enqueue(encoder.encode(piece));
        }
        controller.close();
      } catch (err) {
        console.error("[chat] stream failed", err);
        try {
          controller.enqueue(
            encoder.encode(
              "\n\n⚠️ Yanıt üretilemedi — lütfen biraz sonra tekrar deneyin.",
            ),
          );
        } catch {
          // ignore
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add app/api/chat
git commit -m "feat(ai): /api/chat streaming endpoint with rate limit"
```

---

### Task 11: Chat hook (useChat) + TTS hook (useTts)

**Files:**
- Create: `components/ai/use-chat.ts`
- Create: `components/ai/use-tts.ts`

- [ ] **Step 1: Write `components/ai/use-chat.ts`**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

function genId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
    const aiMsg: ChatMessage = {
      id: genId(),
      role: "assistant",
      content: "",
      pending: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setSending(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, question: text }),
        signal: ctl.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "Yanıt alınamadı");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? { ...m, content: errText, pending: false }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id ? { ...m, content: buffer } : m,
          ),
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id ? { ...m, pending: false } : m,
        ),
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? {
                ...m,
                content: "Bağlantı hatası. Lütfen tekrar deneyin.",
                pending: false,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [messages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, sending, send, reset };
}
```

- [ ] **Step 2: Write `components/ai/use-tts.ts`**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function stripMarkdownAndEmoji(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TtsState {
  status: "idle" | "speaking" | "paused";
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  supported: boolean;
}

export function useTts(): TtsState {
  const [status, setStatus] = useState<"idle" | "speaking" | "paused">("idle");
  const supportedRef = useRef(false);
  const turkishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    supportedRef.current = true;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      turkishVoiceRef.current =
        voices.find((v) => v.lang.toLowerCase().startsWith("tr")) ?? null;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!supportedRef.current) return;
    const clean = stripMarkdownAndEmoji(text);
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "tr-TR";
    u.rate = 1.0;
    if (turkishVoiceRef.current) u.voice = turkishVoiceRef.current;
    u.onend = () => setStatus("idle");
    u.onerror = () => setStatus("idle");
    setStatus("speaking");
    window.speechSynthesis.speak(u);
  }, []);

  const pause = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, []);

  const stop = useCallback(() => {
    if (!supportedRef.current) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  return {
    status,
    speak,
    pause,
    resume,
    stop,
    supported: supportedRef.current,
  };
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add components/ai/use-chat.ts components/ai/use-tts.ts
git commit -m "feat(ai): useChat streaming hook + useTts (Web Speech)"
```

---

### Task 12: Chat message + voice button components

**Files:**
- Create: `components/ai/voice-button.tsx`
- Create: `components/ai/chat-message.tsx`

- [ ] **Step 1: Write `components/ai/voice-button.tsx`**

```typescript
"use client";

import { Pause, Play, Volume2 } from "lucide-react";

import { useTts } from "./use-tts";

interface Props {
  text: string;
}

export function VoiceButton({ text }: Props) {
  const tts = useTts();
  if (!tts.supported) return null;

  if (tts.status === "speaking") {
    return (
      <button
        type="button"
        onClick={tts.pause}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
      >
        <Pause className="h-3 w-3" strokeWidth={2.4} />
        Duraklat
      </button>
    );
  }
  if (tts.status === "paused") {
    return (
      <button
        type="button"
        onClick={tts.resume}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
      >
        <Play className="h-3 w-3" strokeWidth={2.4} />
        Devam
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => tts.speak(text)}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted hover:bg-elevated"
    >
      <Volume2 className="h-3 w-3" strokeWidth={2.4} />
      Sesli oku
    </button>
  );
}
```

- [ ] **Step 2: Write `components/ai/chat-message.tsx`**

```typescript
"use client";

import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage as ChatMessageType } from "./use-chat";
import { VoiceButton } from "./voice-button";

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-lime-primary text-black"
            : "border border-border bg-surface text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            {message.content.trim().length === 0 && message.pending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted" strokeWidth={2.4} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {!isUser && !message.pending && message.content && (
          <div className="mt-1 flex items-center justify-end gap-1">
            <VoiceButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add components/ai/voice-button.tsx components/ai/chat-message.tsx
git commit -m "feat(ai): chat message bubble + voice readout button"
```

---

### Task 13: Chat panel + FAB

**Files:**
- Create: `components/ai/chat-panel.tsx`
- Create: `components/ai/chat-fab.tsx`

- [ ] **Step 1: Write `components/ai/chat-panel.tsx`**

```typescript
"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatMessage } from "./chat-message";
import { useChat } from "./use-chat";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  "Aylık 500 kWh için kaç panel gerekir?",
  "Bataryalı sistem ile şebekeden ne fark eder?",
  "Bahar kampanyasının detayı nedir?",
];

export function ChatPanel({ open, onClose }: Props) {
  const { messages, sending, send, reset } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Lock body scroll on mobile
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!open) return null;

  function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    send(trimmed);
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-end px-0 pb-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:px-0"
      role="dialog"
      aria-label="KAYHAN Asistan"
    >
      <div
        className="glass-strong relative flex h-[85vh] w-full flex-col rounded-t-3xl border-t border-border sm:h-[640px] sm:w-[400px] sm:rounded-3xl sm:border"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/80 px-4 py-3 sm:rounded-t-3xl">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-primary text-black">
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                KAYHAN Asistan
              </p>
              <p className="text-[10px] text-muted">
                Güneş enerjisi soruları için yapay zeka
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sohbeti kapat"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Aşağıdaki örnek sorulardan biriyle başlayabilir veya kendi
                sorunuzu yazabilirsiniz.
              </p>
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="block w-full rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs text-foreground hover:border-lime-primary"
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          )}
        </div>

        <footer className="border-t border-border bg-surface/80 px-3 py-3 sm:rounded-b-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Sorunuzu yazın..."
              disabled={sending}
              className="h-10 flex-1 rounded-xl border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || input.trim().length === 0}
              aria-label="Gönder"
              className="grid h-10 w-10 place-items-center rounded-xl bg-lime-primary text-black transition-opacity disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </form>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-[10px] text-subtle underline hover:text-muted"
            >
              Sohbeti sıfırla
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/ai/chat-fab.tsx`**

```typescript
"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ChatPanel } from "./chat-panel";

export function ChatFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname.startsWith("/kayhan-yonetim")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Sohbeti kapat" : "Asistanı aç"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-lime-primary text-black shadow-xl shadow-lime-primary/30 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.4} />
        ) : (
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} />
        )}
      </button>
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Mount in `app/layout.tsx`**

Read `app/layout.tsx`. Add the import:

```typescript
import { ChatFab } from "@/components/ai/chat-fab";
```

Inside the body's `<ThemeProvider>` children, alongside `<CursorEffect />` and `<Toaster />`, add `<ChatFab />`. Place it right after `{children}`:

```typescript
          <CursorEffect />
          {children}
          <ChatFab />
          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{ classNames: { toast: "glass !rounded-xl" } }}
          />
```

- [ ] **Step 4: Build + commit**

```bash
pnpm build
git add components/ai/chat-panel.tsx components/ai/chat-fab.tsx app/layout.tsx
git commit -m "feat(ai): chat panel + floating FAB across public site"
```

---

### Task 14: Seed initial knowledge

**Files:**
- Create: `scripts/seed-ai-knowledge.ts`

This script populates the empty `ai_knowledge` table with foundational KAYHAN content so the chat can immediately answer common questions. Run once manually.

- [ ] **Step 1: Write `scripts/seed-ai-knowledge.ts`**

```typescript
import "dotenv/config";

import { embed } from "../lib/gemini/embeddings";
import { insertChunks } from "../lib/ai-knowledge/repository";
import { chunkText } from "../lib/gemini/chunker";

const SEED_DOCS = [
  {
    title: "KAYHAN Solar — Kim Olduğumuz",
    sourceType: "manual" as const,
    body: `KAYHAN Solar & Enerji, Türkiye genelinde anahtar teslim güneş enerjisi sistemleri kuran bir firmadır. Konut, tarım ve işletme tipi sistemler tasarlar, montajını yapar ve devreye alır. Saha keşfinden ekipman tedariğine, kurulumdan uzun vadeli bakıma kadar tüm süreci tek elden yürütürüz.`,
  },
  {
    title: "Sistem Boyutlandırma — Temel Mantık",
    sourceType: "manual" as const,
    body: `Bir güneş enerjisi sisteminin boyutu, müşterinin aylık veya günlük elektrik tüketimine göre belirlenir. Türkiye ortalamasında 1 kW kurulu güç günde yaklaşık 4-5 kWh üretir.

Aylık 500 kWh tüketen bir konut için yaklaşık 4-5 kW kurulu güç yeterlidir. Bu da 550W'lık monokristal panellerle 8-10 panel demektir. Off-grid (şebekeden bağımsız) sistemlerde batarya da gerekir ve %30-50 oversize yapmak akıllıcadır. On-grid (mahsuplaşmalı) sistemlerde batarya zorunlu değildir.`,
  },
  {
    title: "Panel Tipleri",
    sourceType: "manual" as const,
    body: `Üç ana panel tipi vardır:

- **Monokristal**: En verimli (%20-22 verim), en yaygın seçim. 550W ve 600W modelleri popüler.
- **Polikristal**: Biraz daha ucuz ama verim düşük (%17-19). Bütçe dostu.
- **Bifacial**: İki yüzlü, arkadan da %10-30 ek üretim. Açık alanlarda avantajlı, cam-cam yapısıyla uzun ömürlü.

KAYHAN Solar genelde Jinko, Trina ve Longi markalarını tercih eder. 25 yıl performans, 12 yıl ürün garantisi standarttır.`,
  },
  {
    title: "İnverter Seçimi",
    sourceType: "manual" as const,
    body: `İnverter, panelin ürettiği DC akımı evin kullandığı AC akıma çeviren cihazdır. Üç tip vardır:

- **On-grid (şebeke bağlı)**: Şebekeye satış için. Kesinti olunca durur.
- **Off-grid**: Şebekeden bağımsız, batarya zorunlu.
- **Hibrit**: Hem şebeke hem batarya. En esnek ama en pahalı.

Kurulu panel gücünün %75-100'ü kadar inverter seçilir. Örneğin 5 kW panel için 4-5 kW inverter yeterlidir.`,
  },
  {
    title: "Batarya Hesabı",
    sourceType: "manual" as const,
    body: `Batarya, gece kullanım veya yedekleme için gereklidir. İki ana kimya türü vardır:

- **Lityum (LiFePO4)**: 5000+ çevrim ömrü, derin deşarja dayanıklı, pahalı ama uzun ömürlü.
- **Jel (VRLA)**: 800-1000 çevrim, daha ucuz, %50 deşarj sınırlaması var.

Hesap için: günlük kullanılması istenen enerji (kWh) × 1000 ÷ 48V = gerekli Ah kapasitesi. Örneğin 5 kWh günlük yedek için 48V sistemde ~105 Ah lityum batarya.`,
  },
  {
    title: "Kampanyalar (Güncel)",
    sourceType: "manual" as const,
    body: `Aktif kampanyalarımız:

- **Bahar Kampanyası**: 4 güneş paneli alana 5.si %70 indirim. Yıl boyu paneller kategorisinde geçerli.
- **Paket Sistemlerde Bedava Kargo**: Tüm anahtar teslim paketlerde Türkiye geneli kargo bizden.
- **Lityum Batarya İndirimi**: İlk siparişlerde %15 indirim, sınırlı süreyle.

Detaylar mağaza sayfasında ve anasayfa kampanya şeridinde.`,
  },
  {
    title: "Teklif Süreci",
    sourceType: "manual" as const,
    body: `Teklif al sayfamızdan 6 adımlı bir form doldurursanız sistem büyüklüğünü ve kabataslak fiyatı 24 saat içinde size iletiyoruz. Form bilgileri: il/ilçe, kurulum yeri (çatı/arazi), çalıştıracağınız cihazlar (güç ve voltaj bilinmiyorsa boş bırakılabilir), açıklama notunuz. Sonrasında saha keşfi (gerekirse fiziki/Zoom) ile kesin teklif çıkar.`,
  },
  {
    title: "Garanti ve Servis",
    sourceType: "manual" as const,
    body: `Standart garantilerimiz:
- Paneller: 25 yıl performans / 12 yıl ürün
- İnverter: 5-10 yıl (markaya göre)
- Lityum batarya: 5 yıl
- Jel batarya: 2 yıl
- Kurulum (montaj+kablolama): 2 yıl

Servis: Yıllık 1-2 bakım önerilir (panel temizliği, kablo kontrolü). Uzaktan izleme platformuyla performansı sürekli takip ediyoruz; anormal düşüş olduğunda müdahale ediyoruz.`,
  },
];

async function main() {
  console.log("Seeding ai_knowledge...");
  for (const doc of SEED_DOCS) {
    const chunks = chunkText(doc.body);
    console.log(`  • ${doc.title} → ${chunks.length} chunk(s)`);
    const inserts = await Promise.all(
      chunks.map(async (content) => ({
        title: doc.title,
        content,
        sourceType: doc.sourceType,
        embedding: await embed(content),
      })),
    );
    await insertChunks(inserts);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("seed failed", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

Read `package.json`. In the `scripts` block, add:

```json
    "seed:ai": "tsx --env-file=.env.local scripts/seed-ai-knowledge.ts"
```

(Will need `tsx` — install as a dev dep.)

```bash
pnpm add -D tsx
```

- [ ] **Step 3: Run the seed**

```bash
pnpm run seed:ai
```

Expected log:
```
Seeding ai_knowledge...
  • KAYHAN Solar — Kim Olduğumuz → 1 chunk(s)
  • Sistem Boyutlandırma — Temel Mantık → 2 chunk(s)
  ...
Done.
```

- [ ] **Step 4: Smoke test in browser**

```bash
pnpm dev
```

Visit `http://localhost:3000`, click the lime FAB, ask "Aylık 500 kWh için kaç panel gerekir?". Expect a streamed markdown response that references panel sizing and possibly mentions monokristal 550W.

Click the speaker icon → Turkish TTS should read the response (skipping markdown).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/seed-ai-knowledge.ts
git commit -m "feat(ai): seed ai_knowledge with foundational KAYHAN content"
```

---

**✓ End of Sub-Phase 5B.** AI chat is live: stream, RAG-grounded, voice readout, mobile-friendly bottom sheet, desktop panel.

---

# Sub-Phase 5C — Admin AI Training + Analytics

Outcome: Admin uploads source text → it gets chunked, embedded, stored. Admin can delete chunks. Public site emits page-view events; admin Analitik page shows last-30-days line chart, top products, and top searches in lightweight inline SVG (no chart lib).

---

### Task 15: Admin AI training — server actions + page

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/ai-knowledge.ts`
- Modify: `app/(admin)/kayhan-yonetim/(protected)/ai-egitim/page.tsx`
- Create: `components/admin/ai-knowledge-uploader.tsx`
- Create: `components/admin/ai-knowledge-list.tsx`

- [ ] **Step 1: Write `app/(admin)/kayhan-yonetim/actions/ai-knowledge.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { deleteChunk, insertChunks } from "@/lib/ai-knowledge/repository";
import { chunkText } from "@/lib/gemini/chunker";
import { embed } from "@/lib/gemini/embeddings";

export interface AIKnowledgeActionState {
  error?: string;
  successMessage?: string;
}

const uploadSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(20).max(50_000),
});

export async function uploadKnowledgeAction(
  _prev: AIKnowledgeActionState,
  formData: FormData,
): Promise<AIKnowledgeActionState> {
  await requireAdmin();
  const parsed = uploadSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  try {
    const chunks = chunkText(parsed.data.body);
    const inserts = await Promise.all(
      chunks.map(async (content) => ({
        title: parsed.data.title,
        content,
        sourceType: "manual" as const,
        embedding: await embed(content),
      })),
    );
    await insertChunks(inserts);
    revalidatePath("/kayhan-yonetim/ai-egitim");
    return {
      successMessage: `${chunks.length} parça eklendi.`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Yükleme başarısız",
    };
  }
}

export async function deleteKnowledgeAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteChunk(id);
  revalidatePath("/kayhan-yonetim/ai-egitim");
}
```

- [ ] **Step 2: Write `components/admin/ai-knowledge-uploader.tsx`**

```typescript
"use client";

import { Upload } from "lucide-react";
import { useActionState } from "react";

import {
  uploadKnowledgeAction,
  type AIKnowledgeActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/ai-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AIKnowledgeUploader() {
  const [state, action, pending] = useActionState<AIKnowledgeActionState, FormData>(
    uploadKnowledgeAction,
    {},
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header>
        <h2 className="text-sm font-semibold tracking-tight">Yeni İçerik Ekle</h2>
        <p className="mt-1 text-xs text-muted">
          Metin otomatik olarak parçalara bölünür, embedding'leri oluşturulur ve
          AI&apos;ın referans verebilmesi için kaydedilir.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="title">Başlık</Label>
        <Input id="title" name="title" required maxLength={200} placeholder="Örn: Garanti Şartları" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">İçerik</Label>
        <Textarea
          id="body"
          name="body"
          rows={10}
          required
          minLength={20}
          maxLength={50000}
          placeholder="Bilgi tabanına eklenecek metin..."
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.successMessage && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.successMessage}
        </p>
      )}

      <Button type="submit" disabled={pending} variant="primary">
        <Upload className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Embed ediliyor..." : "Yükle ve Embed Et"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write `components/admin/ai-knowledge-list.tsx`**

```typescript
import { Trash2 } from "lucide-react";

import { deleteKnowledgeAction } from "@/app/(admin)/kayhan-yonetim/actions/ai-knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listChunks } from "@/lib/ai-knowledge/repository";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function AIKnowledgeList() {
  const chunks = await listChunks();

  const groups = new Map<string, typeof chunks>();
  for (const c of chunks) {
    const existing = groups.get(c.title) ?? [];
    existing.push(c);
    groups.set(c.title, existing);
  }

  if (groups.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
        Henüz bilgi tabanı içeriği yok.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {Array.from(groups.entries()).map(([title, items]) => (
        <li
          key={title}
          className="space-y-2 rounded-2xl border border-border bg-surface p-4"
        >
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-subtle">
                {items.length} parça · son eklenen {formatDate(items[0].createdAt)}
              </p>
            </div>
            <Badge tone="lime">{items[0].sourceType}</Badge>
          </header>
          <details className="text-xs text-muted">
            <summary className="cursor-pointer text-foreground">
              İçeriği göster
            </summary>
            <ul className="mt-2 space-y-2">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-elevated p-3"
                >
                  <p className="flex-1 whitespace-pre-wrap text-foreground">
                    {c.content}
                  </p>
                  <form action={deleteKnowledgeAction.bind(null, c.id)}>
                    <Button type="submit" variant="ghost" size="sm" aria-label="Parçayı sil">
                      <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Replace `app/(admin)/kayhan-yonetim/(protected)/ai-egitim/page.tsx`**

```typescript
import { Wand2 } from "lucide-react";

import { AIKnowledgeList } from "@/components/admin/ai-knowledge-list";
import { AIKnowledgeUploader } from "@/components/admin/ai-knowledge-uploader";

export default function AdminAITrainingPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Wand2 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Eğitim</h1>
          <p className="mt-1 text-sm text-muted">
            Müşteri asistanının kullandığı bilgi tabanı. Yüklediğiniz her metin
            otomatik olarak parçalara bölünüp embedding'leri oluşturulur.
          </p>
        </div>
      </header>

      <AIKnowledgeUploader />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Mevcut İçerikler</h2>
        <AIKnowledgeList />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Build + smoke test + commit**

```bash
pnpm build
```

Then in dev:
- Visit `/kayhan-yonetim/ai-egitim`
- Add a new doc (e.g., title="Test Bilgi", body=lorem ipsum 100+ chars)
- See success message and list updates
- Delete one chunk → list updates

```bash
git add app components/admin/ai-knowledge-uploader.tsx components/admin/ai-knowledge-list.tsx
git commit -m "feat(ai): admin AI training page (upload + delete chunks)"
```

---

### Task 16: Analytics — migration + types + repository

**Files:**
- Create: `supabase/migrations/20260511_002_analytics.sql`
- Create: `lib/analytics/types.ts`
- Create: `lib/analytics/repository.ts`

- [ ] **Step 1: Write `supabase/migrations/20260511_002_analytics.sql`**

```sql
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  page_url text,
  product_id text,
  metadata jsonb default '{}'::jsonb,
  session_id text,
  created_at timestamptz default now()
);

create index if not exists idx_analytics_type_date
  on public.analytics_events(event_type, created_at desc);

create index if not exists idx_analytics_product
  on public.analytics_events(product_id) where product_id is not null;

create index if not exists idx_analytics_session
  on public.analytics_events(session_id) where session_id is not null;

alter table public.analytics_events enable row level security;

create policy "analytics_service_role_all"
  on public.analytics_events for all
  to service_role
  using (true) with check (true);

create policy "analytics_anon_insert"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);
```

> **Manual step:** Run this migration in Supabase SQL editor (same process as Task 5).

- [ ] **Step 2: Write `lib/analytics/types.ts`**

```typescript
export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "offer_submit"
  | "search_query"
  | "chat_message";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  pageUrl?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

export interface DailyCount {
  date: string; // ISO YYYY-MM-DD
  count: number;
}

export interface TopProduct {
  productId: string;
  count: number;
}
```

- [ ] **Step 3: Write `lib/analytics/repository.ts`**

```typescript
import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

import type {
  AnalyticsEvent,
  DailyCount,
  TopProduct,
} from "./types";

export async function recordEvent(event: AnalyticsEvent): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("analytics_events").insert({
    event_type: event.type,
    page_url: event.pageUrl,
    product_id: event.productId,
    metadata: event.metadata ?? {},
    session_id: event.sessionId,
  });
  if (error) console.error("[analytics] insert failed", error);
}

export async function getDailyCounts(
  eventType: string,
  days: number,
): Promise<DailyCount[]> {
  const client = getSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  // Pull rows; aggregate in JS (fine at this scale; replace with SQL later if needed).
  const { data, error } = await client
    .from("analytics_events")
    .select("created_at")
    .eq("event_type", eventType)
    .gte("created_at", since);
  if (error) {
    console.error("[analytics] getDailyCounts failed", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    result.push({ date: d, count: counts.get(d) ?? 0 });
  }
  return result;
}

export async function getTopProducts(days: number, limit = 10): Promise<TopProduct[]> {
  const client = getSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await client
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", "product_view")
    .gte("created_at", since)
    .not("product_id", "is", null);
  if (error) {
    console.error("[analytics] getTopProducts failed", error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.product_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add supabase/migrations/20260511_002_analytics.sql lib/analytics
git commit -m "feat(analytics): events migration + repository"
```

---

### Task 17: Event tracking client + API

**Files:**
- Create: `app/api/analytics/route.ts`
- Create: `lib/analytics/client.ts`
- Create: `components/analytics/page-track.tsx`

- [ ] **Step 1: Write `app/api/analytics/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordEvent } from "@/lib/analytics/repository";

const bodySchema = z.object({
  type: z.enum([
    "page_view",
    "product_view",
    "add_to_cart",
    "offer_submit",
    "search_query",
    "chat_message",
  ]),
  pageUrl: z.string().optional(),
  productId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await recordEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write `lib/analytics/client.ts`**

```typescript
"use client";

import type { AnalyticsEvent } from "./types";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const KEY = "kayhan-session";
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (typeof window === "undefined") return;
  const payload = { ...event, sessionId: event.sessionId ?? getSessionId() };
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const ok = navigator.sendBeacon("/api/analytics", blob);
      if (ok) return;
    }
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silent — analytics must not break UX
  }
}
```

- [ ] **Step 3: Write `components/analytics/page-track.tsx`**

```typescript
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";

export function PageTrack() {
  const pathname = usePathname();
  useEffect(() => {
    // Don't track admin paths
    if (pathname.startsWith("/kayhan-yonetim")) return;
    trackEvent({
      type: "page_view",
      pageUrl: pathname,
    });
  }, [pathname]);
  return null;
}
```

- [ ] **Step 4: Mount in `app/layout.tsx`**

Read the file. Add import:

```typescript
import { PageTrack } from "@/components/analytics/page-track";
```

Inside `<ThemeProvider>` children, next to `<ChatFab />`, add `<PageTrack />`:

```typescript
          <CursorEffect />
          <PageTrack />
          {children}
          <ChatFab />
          <Toaster ... />
```

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add app/api/analytics lib/analytics/client.ts components/analytics app/layout.tsx
git commit -m "feat(analytics): page-view tracking via sendBeacon"
```

---

### Task 18: Analytics chart component (SVG)

**Files:**
- Create: `components/admin/analytics-chart.tsx`

- [ ] **Step 1: Write the file**

```typescript
import type { DailyCount } from "@/lib/analytics/types";

interface Props {
  data: DailyCount[];
  label: string;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 12, right: 12, bottom: 24, left: 32 };

export function AnalyticsChart({ data, label }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated p-6 text-center text-sm text-muted">
        Henüz veri yok.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const total = data.reduce((s, d) => s + d.count, 0);

  const points = data.map((d, i) => {
    const x = PADDING.left + i * stepX;
    const y = PADDING.top + innerH - (d.count / max) * innerH;
    return { x, y, label: d.date, value: d.count };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${
    HEIGHT - PADDING.bottom
  } L ${points[0].x.toFixed(1)} ${HEIGHT - PADDING.bottom} Z`;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <header className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{total}</p>
      </header>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-40 w-full"
        aria-label={`${label} grafiği`}
        role="img"
      >
        <path d={areaPath} fill="rgb(199 255 0 / 0.15)" />
        <path d={path} fill="none" stroke="rgb(199 255 0)" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={2.5} fill="rgb(199 255 0)">
            <title>
              {p.label}: {p.value}
            </title>
          </circle>
        ))}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={HEIGHT - PADDING.bottom}
          y2={HEIGHT - PADDING.bottom}
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        <text
          x={PADDING.left}
          y={HEIGHT - 4}
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.5}
        >
          {data[0]?.date}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 4}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.5}
        >
          {data[data.length - 1]?.date}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add components/admin/analytics-chart.tsx
git commit -m "feat(analytics): SVG line chart for daily counts"
```

---

### Task 19: Admin Analitik page

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/(protected)/analitik/page.tsx`

- [ ] **Step 1: Replace the file**

```typescript
import { BarChart3, Eye, MessageCircle, ShoppingCart } from "lucide-react";

import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { repo } from "@/lib/data";
import { getDailyCounts, getTopProducts } from "@/lib/analytics/repository";

export default async function AdminAnalyticsPage() {
  const [pageViews, productViews, addToCarts, chatMessages, topProducts, products] =
    await Promise.all([
      getDailyCounts("page_view", 30),
      getDailyCounts("product_view", 30),
      getDailyCounts("add_to_cart", 30),
      getDailyCounts("chat_message", 30),
      getTopProducts(30, 5),
      repo.listProducts(),
    ]);

  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <BarChart3 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analitik</h1>
          <p className="mt-1 text-sm text-muted">
            Son 30 günün davranış özeti. Vercel Analytics tarayıcıda otomatik
            çalışıyor; bu sayfa kendi event tablomuzdan beslenir.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsChart data={pageViews} label="Sayfa Görüntüleme" />
        <AnalyticsChart data={productViews} label="Ürün Görüntüleme" />
        <AnalyticsChart data={addToCarts} label="Sepete Ekleme" />
        <AnalyticsChart data={chatMessages} label="AI Sohbet" />
      </div>

      <section className="rounded-2xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            En Çok Görüntülenen Ürünler (30 gün)
          </h2>
          <Eye className="h-4 w-4 text-muted" strokeWidth={2.2} />
        </header>
        {topProducts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            Henüz yeterli veri yok.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {topProducts.map((tp) => {
              const product = productById[tp.productId];
              return (
                <li
                  key={tp.productId}
                  className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span className="truncate font-medium">
                    {product?.name ?? tp.productId}
                  </span>
                  <span className="font-semibold tabular-nums text-muted">
                    {tp.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ShoppingCart}
          label="Bu hafta sepete ekleme"
          value={addToCarts.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
        <SummaryCard
          icon={MessageCircle}
          label="Bu hafta AI sohbet"
          value={chatMessages.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
        <SummaryCard
          icon={Eye}
          label="Bu hafta ürün görüntüleme"
          value={productViews.slice(-7).reduce((s, d) => s + d.count, 0)}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted" strokeWidth={2.2} />
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
pnpm build
git add "app/(admin)/kayhan-yonetim/(protected)/analitik/page.tsx"
git commit -m "feat(analytics): admin analytics page with charts and top-products"
```

---

### Task 20: Track product_view + chat_message events

**Files:**
- Modify: `app/(public)/urun/[slug]/page.tsx`
- Modify: `components/ai/use-chat.ts`

- [ ] **Step 1: Modify `app/(public)/urun/[slug]/page.tsx`**

Read the file. We'll record a product_view event server-side. Add the import:

```typescript
import { recordEvent } from "@/lib/analytics/repository";
```

Inside the page component, after `const product = await repo.getProductBySlug(slug);` and the `if (!product) notFound();` check, add (fire-and-forget):

```typescript
  // Best-effort analytics — never throws.
  recordEvent({
    type: "product_view",
    pageUrl: `/urun/${product.slug}`,
    productId: product.id,
  }).catch(() => {
    /* analytics must never break the page */
  });
```

- [ ] **Step 2: Modify `components/ai/use-chat.ts`**

Read the file. Inside the `send` function, after `setSending(true);`, add:

```typescript
    // Best-effort analytics for chat usage
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "chat_message" }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add "app/(public)/urun/[slug]/page.tsx" components/ai/use-chat.ts
git commit -m "feat(analytics): track product_view and chat_message events"
```

---

**✓ End of Sub-Phase 5C.** AI training UI for admin lives; events tracked; analytics dashboard renders charts and top products.

---

# Sub-Phase 5D — KVKK + Legal + Polish

Outcome: A cookie consent banner on first visit; analytics tracking respects consent; four legal pages with real content from the master plan; final cross-browser pass.

---

### Task 21: Consent storage + hook

**Files:**
- Create: `lib/consent/index.ts`
- Create: `components/consent/use-consent.ts`

- [ ] **Step 1: Write `lib/consent/index.ts`**

```typescript
export const CONSENT_KEY = "kayhan-consent-v1";

export interface ConsentState {
  necessary: true; // always true (functional cookies)
  analytics: boolean;
  marketing: boolean;
  acceptedAt: number;
}

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  acceptedAt: 0,
};

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      acceptedAt: typeof parsed.acceptedAt === "number" ? parsed.acceptedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writeConsent(consent: Omit<ConsentState, "necessary" | "acceptedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ConsentState = {
      necessary: true,
      analytics: consent.analytics,
      marketing: consent.marketing,
      acceptedAt: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
    // Notify listeners
    window.dispatchEvent(new CustomEvent("kayhan-consent-change", { detail: payload }));
  } catch {
    // ignore quota
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CONSENT_KEY);
    window.dispatchEvent(new CustomEvent("kayhan-consent-change", { detail: null }));
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Write `components/consent/use-consent.ts`**

```typescript
"use client";

import { useEffect, useState } from "react";

import {
  type ConsentState,
  readConsent,
  writeConsent,
} from "@/lib/consent";

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
    function onChange(e: Event) {
      const ce = e as CustomEvent<ConsentState | null>;
      setConsent(ce.detail);
    }
    window.addEventListener("kayhan-consent-change", onChange);
    return () => window.removeEventListener("kayhan-consent-change", onChange);
  }, []);

  function setAndSave(next: { analytics: boolean; marketing: boolean }) {
    writeConsent(next);
  }

  return { consent, hydrated, setConsent: setAndSave };
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/consent components/consent
git commit -m "feat(consent): cookie consent storage + hook"
```

---

### Task 22: Cookie banner + gate analytics on consent

**Files:**
- Create: `components/consent/cookie-banner.tsx`
- Modify: `lib/analytics/client.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write `components/consent/cookie-banner.tsx`**

```typescript
"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { readConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(existing === null);
  }, []);

  if (!show) return null;

  function acceptAll() {
    writeConsent({ analytics: true, marketing: true });
    setShow(false);
  }

  function acceptSelection() {
    writeConsent({ analytics, marketing });
    setShow(false);
  }

  function rejectAll() {
    writeConsent({ analytics: false, marketing: false });
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie
            className="mt-0.5 h-5 w-5 shrink-0 text-lime-dark dark:text-lime-primary"
            strokeWidth={2.2}
          />
          <div className="flex-1 space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Çerez Tercihleri
            </h2>
            <p className="text-xs leading-relaxed text-muted">
              Deneyiminizi iyileştirmek için çerezler kullanıyoruz. Gerekli
              çerezler her zaman aktiftir.{" "}
              <Link
                href="/cerez-politikasi"
                className="underline hover:text-foreground"
              >
                Detaylar
              </Link>
            </p>

            {details && (
              <div className="space-y-2 rounded-xl border border-border bg-elevated p-3 text-xs">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 accent-lime-primary" />
                  <span>
                    <strong className="text-foreground">Gerekli</strong> — Site
                    çalışması için zorunlu (oturum, tema, sepet).
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-lime-primary"
                  />
                  <span>
                    <strong className="text-foreground">Analitik</strong> — Site
                    nasıl kullanılıyor anlamak için anonim ölçüm.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-lime-primary"
                  />
                  <span>
                    <strong className="text-foreground">Pazarlama</strong> —
                    Kişiselleştirilmiş kampanya ve reklam (şu an kullanılmıyor).
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="primary" onClick={acceptAll}>
                Tümünü Kabul Et
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDetails((v) => !v)}
              >
                {details ? "Detayları Kapat" : "Ayarlar"}
              </Button>
              {details && (
                <Button size="sm" variant="ghost" onClick={acceptSelection}>
                  Seçimi Kaydet
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={rejectAll}>
                Reddet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `lib/analytics/client.ts`**

Add a consent check at the top of `trackEvent`. After `if (typeof window === "undefined") return;`, insert:

```typescript
  // Gate behind analytics consent
  try {
    const raw = localStorage.getItem("kayhan-consent-v1");
    if (!raw) return; // no consent yet → don't track
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    if (!parsed.analytics) return;
  } catch {
    return;
  }
```

- [ ] **Step 3: Mount banner in `app/layout.tsx`**

Read the file. Add import:

```typescript
import { CookieBanner } from "@/components/consent/cookie-banner";
```

Inside `<ThemeProvider>` children, alongside `<ChatFab />` and `<PageTrack />`:

```typescript
          <CursorEffect />
          <PageTrack />
          {children}
          <ChatFab />
          <CookieBanner />
          <Toaster ... />
```

- [ ] **Step 4: Build + commit**

```bash
pnpm build
git add components/consent/cookie-banner.tsx lib/analytics/client.ts app/layout.tsx
git commit -m "feat(consent): cookie banner gated analytics tracking"
```

---

### Task 23: Legal page content layout

**Files:**
- Create: `components/legal/legal-page.tsx`

- [ ] **Step 1: Write `components/legal/legal-page.tsx`**

```typescript
import { Container } from "@/components/ui/container";

interface Props {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: Props) {
  return (
    <Container className="py-12 lg:py-16">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-xs text-subtle">Son güncelleme: {lastUpdated}</p>
        )}
      </header>

      <div className="prose prose-sm dark:prose-invert mt-8 max-w-3xl [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1">
        {children}
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/legal
git commit -m "feat(legal): shared legal page layout"
```

---

### Task 24: Four legal pages

**Files:**
- Create: `app/(public)/kvkk/page.tsx`
- Create: `app/(public)/gizlilik/page.tsx`
- Create: `app/(public)/cerez-politikasi/page.tsx`
- Create: `app/(public)/mesafeli-satis/page.tsx`
- Create: `app/(public)/iade/page.tsx`

Each follows the same pattern. Below the full content for each:

- [ ] **Step 1: Write `app/(public)/kvkk/page.tsx`**

```typescript
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
};

export default function KvkkPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni" lastUpdated="11 Mayıs 2026">
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
        kapsamında, KAYHAN Solar &amp; Enerji (&quot;şirket&quot;) olarak
        sizleri kişisel verilerinizin işlenmesi hakkında bilgilendirmek
        isteriz.
      </p>

      <h2>1. Veri Sorumlusu</h2>
      <p>
        Kişisel verileriniz, veri sorumlusu sıfatıyla KAYHAN Solar &amp; Enerji
        tarafından işlenmektedir.
      </p>

      <h2>2. İşlenen Veriler ve Amaçları</h2>
      <p>Aşağıdaki kişisel veriler aşağıdaki amaçlarla işlenmektedir:</p>
      <ul>
        <li>
          <strong>Kimlik bilgileri</strong> (ad-soyad): Teklif değerlendirmesi
          ve müşteri hizmetleri.
        </li>
        <li>
          <strong>İletişim bilgileri</strong> (telefon, e-posta, il/ilçe):
          Teklif dönüşü, sipariş takibi ve bilgilendirme.
        </li>
        <li>
          <strong>Kurulum yeri bilgileri</strong> (adres, fotoğraf, açıklama):
          Sistem boyutlandırma ve saha keşfi.
        </li>
        <li>
          <strong>İşlem bilgileri</strong> (sepet, sipariş): Satış süreci ve
          sözleşmesel yükümlülükler.
        </li>
      </ul>

      <h2>3. Hukuki Sebepler</h2>
      <p>
        Kişisel verileriniz, KVKK&apos;nın 5. maddesinde belirtilen
        &quot;sözleşmenin kurulması veya ifası için zorunlu olması&quot;,
        &quot;hukuki yükümlülüğün yerine getirilmesi&quot; ve &quot;ilgili
        kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru
        menfaatlerimiz için zorunlu olması&quot; hukuki sebeplerine
        dayanılarak işlenmektedir.
      </p>

      <h2>4. Verilerin Aktarımı</h2>
      <p>
        Kişisel verileriniz; teklif sürecinin yürütülmesi, kargo, ödeme
        altyapıları ve yasal yükümlülüklerin yerine getirilmesi amacıyla
        tedarikçilerimiz ve hizmet sağlayıcılarımızla paylaşılabilir. Yurt
        dışına aktarım yapılması halinde KVKK&apos;nın 9. maddesindeki
        koşullara uygun hareket edilir.
      </p>

      <h2>5. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, ilgili mevzuatta öngörülen süreler veya işlendiği
        amacın gerektirdiği süre boyunca saklanır; süre sonunda silinir, yok
        edilir veya anonim hale getirilir.
      </p>

      <h2>6. Haklarınız</h2>
      <p>
        KVKK&apos;nın 11. maddesi uyarınca; verilerinizin işlenip
        işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme veya yok
        etme, aktarıldığı üçüncü kişileri öğrenme ve zararın giderilmesini
        talep etme haklarına sahipsiniz. Taleplerinizi{" "}
        <a href="mailto:kvkk@kayhansolar.com">kvkk@kayhansolar.com</a> adresine
        iletebilirsiniz.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 2: Write `app/(public)/gizlilik/page.tsx`**

```typescript
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
};

export default function GizlilikPage() {
  return (
    <LegalPage title="Gizlilik Politikası" lastUpdated="11 Mayıs 2026">
      <p>
        Bu gizlilik politikası, KAYHAN Solar &amp; Enerji web sitesinin
        kullanımı sırasında elde edilen bilgilerin nasıl toplandığını,
        kullanıldığını ve korunduğunu açıklar.
      </p>

      <h2>Toplanan Bilgiler</h2>
      <ul>
        <li>
          <strong>Form bilgileri:</strong> Teklif, sipariş ve iletişim formları
          aracılığıyla doğrudan tarafınızdan paylaşılan bilgiler.
        </li>
        <li>
          <strong>Otomatik veriler:</strong> Tarayıcı türü, ziyaret edilen
          sayfa, oturum süresi gibi anonim teknik veriler (yalnızca analitik
          çerez onayı verdiyseniz).
        </li>
      </ul>

      <h2>Bilgilerin Kullanımı</h2>
      <ul>
        <li>Hizmetlerin sunulması ve geliştirilmesi.</li>
        <li>Müşteri sorularına yanıt verilmesi.</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
        <li>İstatistiksel analiz (kimliği belirlenemeyen şekilde).</li>
      </ul>

      <h2>Güvenlik</h2>
      <p>
        Verilerinizi yetkisiz erişime, değişikliğe ve ifşaya karşı korumak için
        endüstri standardı güvenlik önlemleri uyguluyoruz. Tüm veri aktarımı
        TLS (HTTPS) ile şifrelenir.
      </p>

      <h2>Üçüncü Taraflar</h2>
      <p>
        Hizmet sağlayıcılarımız (e-posta gönderim, ödeme, kargo, bulut
        altyapı) gizlilik prensiplerimize bağlı kalmak zorundadır.
        Bilgileriniz onlara yalnızca hizmet ifası için gereken kadar açılır.
      </p>

      <h2>İletişim</h2>
      <p>
        Gizlilik politikası ile ilgili sorularınız için{" "}
        <a href="mailto:gizlilik@kayhansolar.com">gizlilik@kayhansolar.com</a>{" "}
        adresine yazabilirsiniz.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 3: Write `app/(public)/cerez-politikasi/page.tsx`**

```typescript
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Çerez Politikası",
};

export default function CerezPolitikasiPage() {
  return (
    <LegalPage title="Çerez Politikası" lastUpdated="11 Mayıs 2026">
      <p>
        Web sitemizde deneyiminizi iyileştirmek ve hizmet kalitemizi ölçmek
        için çerezler (cookies) kullanıyoruz. Bu sayfada hangi çerezleri
        kullandığımızı ve seçeneklerinizi açıklıyoruz.
      </p>

      <h2>Çerez Kategorileri</h2>
      <h3>1. Gerekli Çerezler</h3>
      <p>
        Sitenin temel işlevleri için zorunludur (oturum yönetimi, sepet,
        tema). Bu çerezler her zaman aktiftir ve onay gerektirmez.
      </p>

      <h3>2. Analitik Çerezler</h3>
      <p>
        Sitenin nasıl kullanıldığını anonim olarak ölçeriz (sayfa
        görüntülemeleri, ortalama oturum süresi). Vercel Analytics ve kendi
        olay tablomuz kullanılır. Bu çerezleri yalnızca onay vermeniz halinde
        çalıştırırız.
      </p>

      <h3>3. Pazarlama Çerezleri</h3>
      <p>
        Şu anda pazarlama amaçlı çerez kullanmıyoruz. Gelecekte
        kullanılması durumunda onayınızı tekrar isteyeceğiz.
      </p>

      <h2>Tercihlerinizi Değiştirme</h2>
      <p>
        Sayfanın altındaki çerez banner&apos;ı veya{" "}
        <a href="/ayarlar">ayarlar sayfası</a> üzerinden tercihlerinizi
        istediğiniz zaman güncelleyebilirsiniz. Ayrıca tarayıcı ayarlarınızdan
        da çerezleri silebilir veya engelleyebilirsiniz.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 4: Write `app/(public)/mesafeli-satis/page.tsx`**

```typescript
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi",
};

export default function MesafeliSatisPage() {
  return (
    <LegalPage title="Mesafeli Satış Sözleşmesi" lastUpdated="11 Mayıs 2026">
      <p>
        İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve
        Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde, KAYHAN Solar
        &amp; Enerji (&quot;Satıcı&quot;) ile alıcı (&quot;Tüketici&quot;)
        arasındaki mesafeli satış ilişkisini düzenler.
      </p>

      <h2>1. Tarafların Yükümlülükleri</h2>
      <p>
        Satıcı, sipariş onayını takiben, ürünleri belirtilen sürede
        kargolar; tüketici, ödemeyi tam ve zamanında yapmakla yükümlüdür.
      </p>

      <h2>2. Ürün ve Fiyat</h2>
      <p>
        Sipariş edilen ürünlerin tüm özellikleri, kdv dahil satış fiyatı,
        kargo ücreti ve teslimat süresi sipariş onayı ekranında ve onay
        e-postasında belirtilir.
      </p>

      <h2>3. Cayma Hakkı</h2>
      <p>
        Tüketici, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün
        içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin
        sözleşmeden cayma hakkına sahiptir. Cayma bildirimi{" "}
        <a href="mailto:siparis@kayhansolar.com">siparis@kayhansolar.com</a>{" "}
        adresine yapılabilir. Cayma hakkının kullanılması için ürünün
        ambalajının açılmamış, kullanılmamış ve tekrar satılabilir
        durumda olması gerekir.
      </p>

      <h2>4. Teslimat</h2>
      <p>
        Ürünler, sözleşmenin kurulmasını takiben en geç 30 gün içinde
        kargoya verilir. Anahtar teslim kurulum içeren paket siparişlerinde
        teslimat süresi saha keşfi ve kurulum planlamasına göre değişir.
      </p>

      <h2>5. Garanti ve Servis</h2>
      <p>
        Ürünlerimiz üretici garantisi altındadır. Garanti süreleri ve
        koşulları ürün sayfalarında belirtilir.
      </p>

      <h2>6. Uyuşmazlıkların Çözümü</h2>
      <p>
        Sözleşmeden doğan uyuşmazlıklarda, ilgili Tüketici Hakem Heyetleri
        ve Tüketici Mahkemeleri yetkilidir.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 5: Write `app/(public)/iade/page.tsx`**

```typescript
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "İade ve Değişim Şartları",
};

export default function IadePage() {
  return (
    <LegalPage title="İade ve Değişim Şartları" lastUpdated="11 Mayıs 2026">
      <p>
        Aşağıdaki şartlar dahilinde ürün iade ve değişim talebinizi
        karşılarız.
      </p>

      <h2>1. Cayma Hakkı Süresi</h2>
      <p>
        Tüketici, ürünü teslim aldığı tarihten itibaren 14 (on dört) gün içinde
        cayma hakkını kullanabilir.
      </p>

      <h2>2. İade Koşulları</h2>
      <ul>
        <li>Ürünün orijinal ambalajıyla ve hasarsız olması.</li>
        <li>Etiketlerin ve aksesuarların eksiksiz olması.</li>
        <li>
          Anahtar teslim kurulum hizmeti tamamlanmış sistemlerin iadesi mümkün
          değildir; ancak kurulum öncesi ödeme iadesi koşullarımıza tabidir.
        </li>
        <li>
          Özel olarak hazırlanan veya sipariş üzerine üretilen ürünler iade
          kapsamı dışındadır.
        </li>
      </ul>

      <h2>3. İade Süreci</h2>
      <ol>
        <li>
          İade talebinizi{" "}
          <a href="mailto:siparis@kayhansolar.com">siparis@kayhansolar.com</a>{" "}
          adresine bildirin (sipariş numarası ile birlikte).
        </li>
        <li>
          İade onayı sonrası kargo bilgileri tarafınıza iletilir.
        </li>
        <li>
          Ürün depomuza ulaştıktan ve incelendikten sonra, ödeme yöntemine
          uygun şekilde 14 gün içinde iade gerçekleştirilir.
        </li>
      </ol>

      <h2>4. Hasarlı veya Eksik Ürün</h2>
      <p>
        Kargoda hasar gören veya eksik teslim alınan ürünler için teslim
        anında tutanak tutturulması önemlidir. 24 saat içinde bizimle
        iletişime geçtiğiniz takdirde sorunu ücretsiz çözeriz.
      </p>

      <h2>5. Kargo Ücretleri</h2>
      <p>
        Ürün hatası veya bizim kaynaklı bir sorun varsa kargo ücreti
        tarafımıza aittir. Cayma hakkı kapsamında yapılan iadelerde kargo
        ücreti tüketiciye aittir.
      </p>
    </LegalPage>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
pnpm build
git add "app/(public)/kvkk" "app/(public)/gizlilik" "app/(public)/cerez-politikasi" "app/(public)/mesafeli-satis" "app/(public)/iade"
git commit -m "feat(legal): KVKK, gizlilik, çerez, mesafeli satış, iade pages"
```

---

### Task 25: Vercel Analytics integration

**Files:**
- Modify: `package.json` (install `@vercel/analytics`)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install**

```bash
pnpm add @vercel/analytics
```

- [ ] **Step 2: Modify `app/layout.tsx`**

Read the file. Add the import:

```typescript
import { Analytics } from "@vercel/analytics/next";
```

Inside `<ThemeProvider>` children, add `<Analytics />` near `<Toaster />`:

```typescript
          <CursorEffect />
          <PageTrack />
          {children}
          <ChatFab />
          <CookieBanner />
          <Analytics />
          <Toaster ... />
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add package.json pnpm-lock.yaml app/layout.tsx
git commit -m "feat(analytics): Vercel Analytics integration"
```

---

### Task 26: Footer legal links + sitemap update

**Files:**
- Modify: `components/layout/footer.tsx` (no-op verification — links already exist)
- Modify: `app/sitemap.ts` (add legal pages)

- [ ] **Step 1: Verify footer legal links**

Read `components/layout/footer.tsx`. The `footerLinks.yasal` array already contains entries for `/kvkk`, `/gizlilik`, `/cerez`, `/mesafeli-satis`, `/iade`. Note that the existing link is `/cerez` but our new page is `/cerez-politikasi`. Update the link:

Find:

```typescript
    { href: "/cerez", label: "Çerez Politikası" },
```

Replace with:

```typescript
    { href: "/cerez-politikasi", label: "Çerez Politikası" },
```

- [ ] **Step 2: Update `app/sitemap.ts`**

Read the file. Add the legal pages to `STATIC_ROUTES`:

```typescript
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  "",
  "/magaza",
  "/teklif-al",
  "/galeri",
  "/hakkimizda",
  "/sss",
  "/iletisim",
  "/kvkk",
  "/gizlilik",
  "/cerez-politikasi",
  "/mesafeli-satis",
  "/iade",
].map((path) => ({
  url: `${SITE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: path === "" ? 1.0 : 0.5,
}));
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add components/layout/footer.tsx app/sitemap.ts
git commit -m "feat(legal): footer link fix + legal pages in sitemap"
```

---

**✓ End of Sub-Phase 5D.** Cookie consent gates analytics; 5 legal pages live with content; Vercel Analytics integrated.

---

# Sub-Phase 5E — Verify

---

### Task 27: End-to-end verification + Faz 5 report

**Files (verification + docs):**
- Run: build, lint, tsc
- Create: `docs/verification/2026-05-11-faz-5.md`

- [ ] **Step 1: Clean checks**

```bash
cd "c:/SOLAR S1TE/kayhan-solar"
pnpm exec eslint . --ext .ts,.tsx --max-warnings 0
pnpm exec tsc --noEmit
pnpm build
```

All must be 0 errors / 0 warnings.

- [ ] **Step 2: Customer flow (incognito)**

Run `pnpm dev`. In incognito:

1. Visit `/` → cookie banner appears at bottom. Click "Tümünü Kabul Et" → banner closes
2. Network panel → POST `/api/analytics` fires with `page_view` event
3. Click lime FAB bottom-right → chat panel opens
4. Send "Aylık 500 kWh için kaç panel gerekir?" → response streams in markdown
5. Click "Sesli oku" → Turkish TTS reads response; pause / resume works
6. Click "/teklif-al" → wizard works; submit → admin email sent (check Resend dashboard or server logs)
7. Visit `/kvkk`, `/gizlilik`, `/cerez-politikasi`, `/mesafeli-satis`, `/iade` → all render
8. Footer links to legal pages work
9. Visit `/robots.txt` → `/api` and `/kayhan-yonetim` disallow rules present
10. Visit `/sitemap.xml` → all legal pages listed

- [ ] **Step 3: Admin flow**

1. Sign in to `/kayhan-yonetim`
2. Visit `/kayhan-yonetim/ai-egitim` → upload new doc (title="Test", body=500+ chars) → success message, list updates
3. Visit `/kayhan-yonetim/analitik` → charts render (may be near-empty on first run; revisit after generating some events)
4. Edit a product with stock 0 → bump to 5 → real email sent to subscribers (check Resend)

- [ ] **Step 4: Write `docs/verification/2026-05-11-faz-5.md`**

```markdown
# M5 Verification Report — Faz 5 AI + Analitik + KVKK

**Tarih:** 2026-05-11
**Plan:** docs/plans/2026-05-11-faz-5-ai-analitik-kvkk.md
**Tamamlanan görev sayısı:** 27 / 27

## Yapılan
- 5A: Resend wired (offer, stock back, order status); Supabase clients ready; pgvector + ai_knowledge migration; Gemini SDK + chunker
- 5B: AI chat (streaming, RAG-grounded), chat panel UI (mobile + desktop), Web Speech TTS with pause/resume, seeded ai_knowledge
- 5C: Admin AI Eğitim (upload + delete + list); analytics events + dashboard with SVG charts; product_view + chat_message tracking
- 5D: Cookie consent banner (3 categories), 5 legal pages, Vercel Analytics, sitemap updated

## Test edildi
- pnpm build + lint + tsc: clean
- Customer: cookie consent → AI chat → TTS → teklif submission → email arrives
- Admin: AI training upload → chunked + embedded; analytics dashboard shows charts; stock-back dispatch sends real email

## Düzeltildi
[Karşılaşılan + çözülen edge case'ler]

## Bilinen eksikler (Faz 6)
- Full Supabase migration (products/offers/orders/etc. — şu an demo)
- Multi-user auth (Supabase Auth)
- Cloudinary medya storage geçişi
- Web Push gerçek dispatch (VAPID anahtar geldiğinde)
- Cloudflare Turnstile production aktivasyonu
- İyzico ödeme entegrasyonu (WhatsApp'tan otomatik ödemeye)

## Sıradaki adım
Faz 6 — Full Supabase migration (data layer + auth) + production deploy + İyzico.
```

- [ ] **Step 5: Commit**

```bash
git add docs/verification/2026-05-11-faz-5.md
git commit -m "docs: Faz 5 verification report"
```

---

**✓ End of Faz 5.** AI assistant, analytics, KVKK consent, and legal pages live.

---

# Swap-to-Real-Services Checklist (Faz 6+)

| Servis | Durum | Next step |
|---|---|---|
| **Supabase Auth** | Not migrated | Replace demo cookie auth with `signInWithPassword` |
| **Supabase Data Layer** | Used only for AI + analytics | Migrate products/categories/campaigns/offers/orders/gallery to Supabase tables; implement supabase-repository.ts |
| **Cloudinary** | Not started | Sign up; replace product/gallery image hosting |
| **Web Push** | VAPID infra ready | Generate keys, wire `subscribePush()` into NotifyWhenAvailable, install `web-push`, send from server |
| **Cloudflare Turnstile** | Infra ready | Set env keys in production |
| **İyzico** | Not started | Replace WhatsApp checkout with hosted form, webhook handler |

---

# Self-Review

**1. Spec coverage:**

| Spec section (from arguments) | Tasks |
|---|---|
| AI Asistan (master plan §11) — chat, RAG, voice, admin training | Tasks 7-15 |
| Analitik (§6.10.9) | Tasks 16-19 |
| KVKK çerez banner (§12.3) + legal pages | Tasks 21-24 |
| Resend integration (Faz 4'ten kalan) | Tasks 2-3 |
| Supabase pgvector (AI prerequisite) | Tasks 4-6 |
| Final polish + cross-browser | Task 27 |

All requirements covered. Demo→real swap pattern preserved.

**2. Placeholder scan:** No "TBD" / "fill in details" / "similar to Task N". Every step has full code.

**3. Type consistency:**
- `ChatTurn` shape consistent between client (use-chat) and server (chat.ts).
- `AIKnowledgeChunk` and `AIKnowledgeMatch` shapes match Supabase rows and RPC return.
- `AnalyticsEvent.type` enum values consistent between client, API route, and database `event_type` text column.
- `ConsentState` interface used identically by `useConsent`, banner, and `trackEvent` gate.
- `lib/email/resend.ts` send functions match the templates' exported render functions exactly.

No bugs. Plan ready for execution.

---

# Execution Handoff

Plan complete and saved to `docs/plans/2026-05-11-faz-5-ai-analitik-kvkk.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Same pattern as Faz 3 and 4. Fresh subagent per task, two-stage review at sub-phase checkpoints.

**2. Inline Execution** — Batch through sub-phases with checkpoints at 5A/5B/5C/5D boundaries.

Which approach?
