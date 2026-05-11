# Supabase Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the live app from in-memory demo data + HMAC-cookie auth to real Supabase (Postgres + Auth + Storage), without changing any UI, server action, or route. The repository/auth interfaces already exist as stubs — this plan fills them in, sets up the database, seeds it from current mock data, and switches `AUTH_MODE=supabase` + `DATA_MODE=supabase`.

**Architecture:**
- **Database** — 18 tables defined in `KAYHAN_Solar_Master_Plan.md` §5 (we ship a real `supabase/schema.sql` derived from it), RLS policies for public-read / admin-write.
- **Auth** — `supabase-provider.ts` becomes the real implementation: `signInWithPassword` against Supabase Auth, mirror user into `public.profiles`, keep our existing HMAC session cookie as the app's own session (Supabase access token stays server-side via `@supabase/ssr` cookies). This means **zero changes to `proxy.ts` or any consumer of `getSession()`**.
- **Data** — `supabase-repository.ts` becomes a real `Repository` implementation using the service-role client on the server. Domain types (camelCase) and DB columns (snake_case) are bridged by a tiny mapping layer in `lib/data/mappers.ts`.
- **Storage** — three buckets (`product-media`, `gallery-media`, `offer-media`) created via SQL; admin uploads switch from data-URL placeholders to signed upload URLs.
- **Demo code stays intact.** `AUTH_MODE`/`DATA_MODE` env still selects between demo and supabase; we just flip the value. This keeps a working fallback during cutover and a fast local-dev mode that doesn't hit the network.

**Tech Stack:** `@supabase/supabase-js` v2, `@supabase/ssr` (Next.js 16 cookie integration), `dotenv-cli` (for one-shot seed scripts), existing Next 16 / TS / Tailwind setup. No UI changes.

**Master plan reference:** §5 (Schema), §9 (Sync), §12 (Auth & Security).

---

## Sub-Phase Breakdown

Execute in order. Each sub-phase is a deployable, reversible checkpoint.

| Sub-phase | Tasks | Outcome |
|---|---|---|
| **A — Pre-flight** | 1–3 | Packages installed, env complete, Supabase project reachable. |
| **B — Database** | 4–9 | Schema + indexes + RLS + storage buckets live in Supabase. |
| **C — Clients** | 10–13 | Browser, server (cookie), and service-role clients. |
| **D — Auth provider** | 14–18 | `supabase-provider.ts` real; admin user created; login works against Supabase. |
| **E — Repository (read paths)** | 19–25 | List/get methods for all 8 entities. Site loads from Supabase in read-only mode. |
| **F — Repository (write paths)** | 26–32 | Create/update/delete for all entities. Admin panel fully functional. |
| **G — Seed** | 33–34 | Current mock data imported, including admin user. |
| **H — Storage helper** | 35 | `lib/supabase/storage.ts` ready (wiring deferred to follow-up plan). |
| **I — Cutover + verify** | 36–39 | `*_MODE=supabase` in `.env.local`, full smoke test, post-cutover checklist. |

---

## File Structure

### New files

```
supabase/
  schema.sql                  Full DDL (18 tables + indexes + RLS + storage buckets)
  seed.sql                    Initial site_settings rows + admin profile placeholder
  README.md                   How to apply schema + run seed script

lib/supabase/
  browser.ts                  createBrowserClient — for client components only
  server.ts                   createServerClient — reads cookies, for RSC/route handlers
  admin.ts                    createServiceRoleClient — bypasses RLS, server-only

lib/data/
  mappers.ts                  snake_case <-> camelCase row mappers per entity
  supabase/                   (new subfolder for split repository)
    products.ts
    categories.ts
    campaigns.ts
    offers.ts
    orders.ts
    gallery.ts
    settings.ts
    notifications.ts
    stock-subscriptions.ts

scripts/
  seed-supabase.ts            Reads lib/mock/data.ts, inserts into Supabase
  create-admin.ts             Creates the admin user via supabase.auth.admin.createUser
```

### Modified files

```
.env.local                    Add NEXT_PUBLIC_SUPABASE_ANON_KEY (already set) — no change
.env.local.example            Already updated — no change
lib/auth/supabase-provider.ts Replace stub with real implementation
lib/data/supabase-repository.ts Replace stub Proxy with real Repository delegating to lib/data/supabase/*
package.json                  Add @supabase/supabase-js, @supabase/ssr, dotenv-cli (dev), tsx (dev)
```

---

## Task List

### Sub-phase A — Pre-flight

#### Task 1: Install Supabase packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime packages**

```bash
cd "C:\SOLAR S1TE\kayhan-solar"
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Install dev packages (for seed scripts)**

```bash
pnpm add -D dotenv-cli tsx
```

- [ ] **Step 3: Verify installation**

Run: `pnpm list @supabase/supabase-js @supabase/ssr`
Expected: both shown with versions, no peer-dep warnings.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Supabase client + ssr packages"
```

---

#### Task 2: Verify env vars present

**Files:**
- Read-only: `.env.local`

- [ ] **Step 1: Inspect `.env.local`**

Open `.env.local` and confirm all four exist and are non-empty:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` (currently unused by app code — informational)

- [ ] **Step 2: Verify URL reachable**

```bash
curl -sS -o NUL -w "%{http_code}\n" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health"
```

Expected: `200`. If not, stop and check the project URL.

---

#### Task 3: Create supabase/ directory + README

**Files:**
- Create: `supabase/README.md`

- [ ] **Step 1: Write README**

```markdown
# Supabase setup

Anything in this folder is the source of truth for the Supabase project state. Schema lives in `schema.sql`; one-off seed rows in `seed.sql`.

## Applying schema

1. Open Supabase Dashboard > SQL Editor for project `ljehpnhcqdipyqxdcwwn`.
2. Paste contents of `schema.sql`, click Run. Should print "Success. No rows returned."
3. Paste contents of `seed.sql`, click Run.
4. From repo root: `pnpm tsx scripts/create-admin.ts` to create the admin auth user.
5. From repo root: `pnpm tsx scripts/seed-supabase.ts` to import mock products/categories/campaigns/gallery.

## Re-applying

`schema.sql` is idempotent (every `create table` uses `if not exists`, every `create policy` is wrapped in `do $$ begin ... exception when others then null; end $$`). Safe to re-run.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/README.md
git commit -m "docs: supabase setup README"
```

---

### Sub-phase B — Database

#### Task 4: Write schema.sql (tables + indexes)

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Copy DDL from master plan**

Source: `C:\SOLAR S1TE\KAYHAN_Solar_Master_Plan.md` §5.1 (line 416 onward). Copy the 18 `create table` statements and their indexes verbatim into `supabase/schema.sql`, with these modifications:

- Wrap every `create table public.X (...)` as `create table if not exists public.X (...)`.
- Drop the `auth.users` reference on `profiles.id` for now if the test project has no auth users yet — but in our case we'll create the admin first (Task 14) so keep it.
- Keep the `create extension if not exists vector;` line above `ai_knowledge`.

- [ ] **Step 2: Verify by reading the file**

Run: `wc -l supabase/schema.sql`
Expected: ~400+ lines covering all 18 tables.

- [ ] **Step 3: Apply to Supabase**

Supabase Dashboard > SQL Editor > paste the file > Run.
Expected: "Success. No rows returned."

- [ ] **Step 4: Sanity check in Dashboard**

Table Editor — confirm 18 tables exist under `public` schema.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(supabase): schema for 18 core tables"
```

---

#### Task 5: Add RLS policies

**Files:**
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Append RLS section**

At the bottom of `supabase/schema.sql`, append (these are the master plan §5.2 policies, expanded for every public-facing table):

```sql
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.categories enable row level security;
alter table public.campaigns enable row level security;
alter table public.gallery_posts enable row level security;
alter table public.gallery_media enable row level security;
alter table public.offers enable row level security;
alter table public.offer_media enable row level security;
alter table public.orders enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.site_settings enable row level security;
alter table public.faqs enable row level security;

-- Helper: is_admin() — reads role from profiles for current auth.uid()
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$ language sql security definer stable;

-- Profiles: users read/update their own row; admin reads all
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles
  for all using (public.is_admin());

-- Public read tables (anyone, including anon)
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (is_active = true);
drop policy if exists "product_media public read" on public.product_media;
create policy "product_media public read" on public.product_media
  for select using (true);
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories
  for select using (is_active = true);
drop policy if exists "campaigns public read" on public.campaigns;
create policy "campaigns public read" on public.campaigns
  for select using (is_active = true);
drop policy if exists "gallery_posts public read" on public.gallery_posts;
create policy "gallery_posts public read" on public.gallery_posts
  for select using (is_active = true);
drop policy if exists "gallery_media public read" on public.gallery_media;
create policy "gallery_media public read" on public.gallery_media
  for select using (true);
drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read" on public.site_settings
  for select using (true);
drop policy if exists "faqs public read" on public.faqs;
create policy "faqs public read" on public.faqs
  for select using (is_active = true);

-- Admin-only write tables
do $$ begin
  perform 1;
exception when others then null;
end $$;

-- Catalog admin-write
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin());
drop policy if exists "product_media admin write" on public.product_media;
create policy "product_media admin write" on public.product_media
  for all using (public.is_admin());
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin());
drop policy if exists "campaigns admin write" on public.campaigns;
create policy "campaigns admin write" on public.campaigns
  for all using (public.is_admin());
drop policy if exists "gallery_posts admin write" on public.gallery_posts;
create policy "gallery_posts admin write" on public.gallery_posts
  for all using (public.is_admin());
drop policy if exists "gallery_media admin write" on public.gallery_media;
create policy "gallery_media admin write" on public.gallery_media
  for all using (public.is_admin());
drop policy if exists "site_settings admin write" on public.site_settings;
create policy "site_settings admin write" on public.site_settings
  for all using (public.is_admin());

-- Offers: anyone can insert (anon contact); admin reads all; submitter reads own (if logged in)
drop policy if exists "offers anon insert" on public.offers;
create policy "offers anon insert" on public.offers
  for insert with check (true);
drop policy if exists "offers admin read" on public.offers;
create policy "offers admin read" on public.offers
  for select using (public.is_admin() or (user_id is not null and auth.uid() = user_id));
drop policy if exists "offers admin update" on public.offers;
create policy "offers admin update" on public.offers
  for update using (public.is_admin());
drop policy if exists "offer_media anon insert" on public.offer_media;
create policy "offer_media anon insert" on public.offer_media
  for insert with check (true);
drop policy if exists "offer_media read" on public.offer_media;
create policy "offer_media read" on public.offer_media
  for select using (public.is_admin());

-- Orders: anyone can insert (WhatsApp checkout); admin reads/updates all; owner reads own
drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert" on public.orders
  for insert with check (true);
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders
  for select using (public.is_admin() or (user_id is not null and auth.uid() = user_id));
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (public.is_admin());

-- Stock notifications: anyone inserts; admin sees all
drop policy if exists "stock_notif anon insert" on public.stock_notifications;
create policy "stock_notif anon insert" on public.stock_notifications
  for insert with check (true);
drop policy if exists "stock_notif admin all" on public.stock_notifications;
create policy "stock_notif admin all" on public.stock_notifications
  for all using (public.is_admin());

-- Admin notifications: admin-only
drop policy if exists "admin_notif admin all" on public.admin_notifications;
create policy "admin_notif admin all" on public.admin_notifications
  for all using (public.is_admin());
```

- [ ] **Step 2: Apply in SQL Editor**

Paste the appended section (or re-run full file) > Run.
Expected: "Success. No rows returned." If any policy already exists, the `drop policy if exists` line prevents the error.

- [ ] **Step 3: Verify RLS is on**

Dashboard > Authentication > Policies — every table listed above shows the "RLS Enabled" badge.

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(supabase): RLS policies + is_admin() helper"
```

---

#### Task 6: Create storage buckets

**Files:**
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Append storage section**

```sql
-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4','application/pdf']),
  ('gallery-media', 'gallery-media', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4']),
  ('offer-media', 'offer-media', false, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4','application/pdf'])
on conflict (id) do nothing;

-- Public buckets: anyone can read
drop policy if exists "public buckets read" on storage.objects;
create policy "public buckets read" on storage.objects
  for select using (bucket_id in ('product-media','gallery-media'));

-- Admin writes everywhere
drop policy if exists "admin storage write" on storage.objects;
create policy "admin storage write" on storage.objects
  for all using (public.is_admin());

-- Offer media: anon can insert (offer form upload), admin reads
drop policy if exists "offer-media anon insert" on storage.objects;
create policy "offer-media anon insert" on storage.objects
  for insert with check (bucket_id = 'offer-media');
drop policy if exists "offer-media admin read" on storage.objects;
create policy "offer-media admin read" on storage.objects
  for select using (bucket_id = 'offer-media' and public.is_admin());
```

- [ ] **Step 2: Apply and verify**

Run in SQL Editor.
Dashboard > Storage — three buckets visible.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(supabase): storage buckets for media"
```

---

#### Task 7: Write seed.sql for site_settings

**Files:**
- Create: `supabase/seed.sql`

- [ ] **Step 1: Write the file**

```sql
-- Initial site_settings keyed rows mirroring lib/mock/data.ts:mockSiteSettings
insert into public.site_settings (key, value) values
  ('contact_phone', '"+90 555 555 55 55"'::jsonb),
  ('contact_email', '"info@kayhansolar.com"'::jsonb),
  ('whatsapp_number', '"905555555555"'::jsonb),
  ('address', '{"city":"Diyarbakır","full":"KAYHAN Solar & Enerji — Diyarbakır, Türkiye","mapsUrl":"https://maps.google.com/?q=Diyarbakir"}'::jsonb),
  ('social_media', '{"instagram":"https://instagram.com/kayhansolar","facebook":"https://facebook.com/kayhansolar","youtube":"https://youtube.com/@kayhansolar"}'::jsonb)
on conflict (key) do nothing;
```

- [ ] **Step 2: Apply in SQL Editor**

Run.
Expected: 5 rows inserted (or 0 if re-run).

- [ ] **Step 3: Verify**

`select * from public.site_settings;` — 5 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat(supabase): seed initial site_settings"
```

---

#### Task 8: Add updated_at trigger

**Files:**
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Append trigger**

```sql
-- Auto-update updated_at on row update
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Apply and commit**

```bash
git add supabase/schema.sql
git commit -m "feat(supabase): updated_at triggers"
```

---

#### Task 9: Database checkpoint

- [ ] **Step 1: From SQL Editor, run smoke queries**

```sql
select count(*) from public.products;          -- 0
select count(*) from public.site_settings;     -- 5
select tablename from pg_tables where schemaname='public' order by tablename;  -- 18 rows
select * from storage.buckets;                  -- 3 rows
```

- [ ] **Step 2: Note the checkpoint in commit log**

```bash
git commit --allow-empty -m "checkpoint: supabase database ready"
```

---

### Sub-phase C — Clients

#### Task 10: Browser client

**Files:**
- Create: `lib/supabase/browser.ts`

- [ ] **Step 1: Write the file**

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env.",
  );
}

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!client) client = createBrowserClient(url, anonKey);
  return client;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/browser.ts
git commit -m "feat(supabase): browser client"
```

---

#### Task 11: Server (cookie-aware) client

**Files:**
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Write the file**

```ts
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerSupabase() {
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
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a RSC where cookies are read-only — safe to ignore.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat(supabase): server client with cookie sync"
```

---

#### Task 12: Service-role admin client

**Files:**
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Write the file**

```ts
import "server-only";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.",
  );
}

// Singleton — service-role bypasses RLS, so only import this from trusted server contexts.
export const adminSupabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat(supabase): service-role admin client"
```

---

#### Task 13: Client smoke test

**Files:**
- Temporary: create `app/api/_health/supabase/route.ts`, delete after verifying.

- [ ] **Step 1: Write a temporary health route**

```ts
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const { count, error } = await adminSupabase
    .from("site_settings")
    .select("*", { count: "exact", head: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, siteSettingsCount: count });
}
```

- [ ] **Step 2: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 3: Hit the route**

In a browser or with curl: `http://localhost:3000/api/_health/supabase`
Expected: `{"ok":true,"siteSettingsCount":5}`. If 500, fix env or client before continuing.

- [ ] **Step 4: Delete the route + commit**

```bash
rm "app/(public)/api/_health/supabase/route.ts"  # or wherever you put it
git add -A
git commit -m "chore: remove temporary supabase health route"
```

---

### Sub-phase D — Auth provider

#### Task 14: Create the admin user

**Files:**
- Create: `scripts/create-admin.ts`

- [ ] **Step 1: Write the script**

```ts
import { adminSupabase } from "../lib/supabase/admin";

const email = process.env.DEMO_ADMIN_EMAIL;
const password = process.env.DEMO_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("DEMO_ADMIN_EMAIL or DEMO_ADMIN_PASSWORD missing");
  process.exit(1);
}

async function main() {
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

  // Mirror into profiles with role=admin
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
```

- [ ] **Step 2: Run it**

```bash
pnpm dotenv -e .env.local -- tsx scripts/create-admin.ts
```

Expected output:
```
Created user admin@kayhansolar.com, id=<uuid>
Profile upserted with role=admin
```

- [ ] **Step 3: Verify in Dashboard**

Authentication > Users — `admin@kayhansolar.com` exists, email_confirmed_at is set.
Table Editor > profiles — one row with `role='admin'`.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-admin.ts
git commit -m "feat(scripts): create-admin one-shot for Supabase auth"
```

---

#### Task 15: Implement supabase auth provider

**Files:**
- Modify: `lib/auth/supabase-provider.ts` (full rewrite)

- [ ] **Step 1: Replace the file**

```ts
import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";

import { SESSION_MAX_AGE_SECONDS } from "./cookies";
import type { AuthProvider, SignInResult } from "./provider";

export const supabaseAuthProvider: AuthProvider = {
  async signIn(email, password): Promise<SignInResult> {
    const normalizedEmail = email.trim().toLowerCase();

    // Authenticate via Supabase Auth (we don't persist its session — we still mint our own HMAC cookie via setSessionCookie())
    const { data, error } = await adminSupabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: "E-posta veya şifre hatalı" };
    }

    // Fetch role from profiles
    const { data: profile, error: profileErr } = await adminSupabase
      .from("profiles")
      .select("role, email")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profile) {
      return { ok: false, error: "Profil bulunamadı. Yöneticiyle iletişime geçin." };
    }
    if (!["admin", "moderator", "assistant"].includes(profile.role)) {
      return { ok: false, error: "Bu hesabın yönetim paneline erişim yetkisi yok." };
    }

    const now = Math.floor(Date.now() / 1000);
    return {
      ok: true,
      payload: {
        email: profile.email,
        role: profile.role as "admin" | "moderator" | "assistant",
        iat: now,
        exp: now + SESSION_MAX_AGE_SECONDS,
      },
    };
  },
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/supabase-provider.ts
git commit -m "feat(auth): real supabase auth provider"
```

---

#### Task 16: Live-fire test the auth provider (still in demo mode)

The provider is wired but `AUTH_MODE=demo` is still active. Force-test it via a temporary route.

**Files:**
- Temporary: `app/api/_health/auth/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { supabaseAuthProvider } from "@/lib/auth/supabase-provider";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const result = await supabaseAuthProvider.signIn(email, password);
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Hit it**

```bash
curl -X POST http://localhost:3000/api/_health/auth -H "Content-Type: application/json" -d '{"email":"admin@kayhansolar.com","password":"kayhan2026"}'
```

Expected: `{"ok":true,"payload":{"email":"admin@kayhansolar.com","role":"admin","iat":...,"exp":...}}`

Test bad password:
```bash
curl -X POST http://localhost:3000/api/_health/auth -H "Content-Type: application/json" -d '{"email":"admin@kayhansolar.com","password":"WRONG"}'
```

Expected: `{"ok":false,"error":"E-posta veya şifre hatalı"}`

- [ ] **Step 3: Delete the route + commit**

```bash
rm -r "app/(public)/api/_health"
git add -A
git commit -m "chore: remove temporary auth smoke route"
```

---

#### Task 17: Wire trigger to auto-create profiles on signup (future-proofing)

**Files:**
- Modify: `supabase/schema.sql` (append)

- [ ] **Step 1: Append**

```sql
-- When a new auth user is created, mirror into profiles with role=customer
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_auth_users_to_profiles on auth.users;
create trigger trg_auth_users_to_profiles after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply and commit**

```bash
git add supabase/schema.sql
git commit -m "feat(supabase): auto-create profiles on signup"
```

---

#### Task 18: Auth checkpoint

- [ ] **Step 1: Confirm everything for D**

- `scripts/create-admin.ts` ran successfully
- `supabaseAuthProvider.signIn` returns `ok:true` for correct creds, `ok:false` for wrong
- Profiles table has admin row
- Trigger exists

Empty commit:
```bash
git commit --allow-empty -m "checkpoint: supabase auth ready"
```

---

### Sub-phase E — Repository (read paths)

#### Task 19: Field mappers

**Files:**
- Create: `lib/data/mappers.ts`

- [ ] **Step 1: Write mappers for each entity**

```ts
import type {
  AdminNotification,
  Campaign,
  Category,
  GalleryPost,
  Offer,
  Order,
  Product,
  SiteSettings,
  StockSubscription,
} from "./types";

// ===== Product =====
export function rowToProduct(row: Record<string, any>, media: Record<string, any>[] = []): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description ?? "",
    longDescription: row.long_description ?? undefined,
    technicalSpecs: row.technical_specs ?? undefined,
    categoryId: row.category_id,
    brand: row.brand ?? undefined,
    supplierUrl: row.supplier_url ?? undefined,
    supplierPrice: row.supplier_price ? Number(row.supplier_price) : undefined,
    markupPercentage: row.markup_percentage ? Number(row.markup_percentage) : undefined,
    currentPrice: Number(row.current_price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 3,
    badges: row.badges ?? [],
    isActive: row.is_active ?? true,
    isFeatured: row.is_featured ?? false,
    isNewArrival: row.is_new_arrival ?? false,
    media: media.map((m) => ({
      id: m.id,
      type: m.media_type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url ?? undefined,
      altText: m.alt_text ?? undefined,
    })),
    createdAt: row.created_at,
  };
}

export function productToInsert(p: Omit<Product, "id" | "createdAt">) {
  return {
    slug: p.slug,
    name: p.name,
    short_description: p.shortDescription,
    long_description: p.longDescription ?? null,
    technical_specs: p.technicalSpecs ?? null,
    category_id: p.categoryId,
    brand: p.brand ?? null,
    supplier_url: p.supplierUrl ?? null,
    supplier_price: p.supplierPrice ?? null,
    markup_percentage: p.markupPercentage ?? null,
    current_price: p.currentPrice,
    compare_at_price: p.compareAtPrice ?? null,
    stock_quantity: p.stockQuantity,
    low_stock_threshold: p.lowStockThreshold,
    badges: p.badges,
    is_active: p.isActive,
    is_featured: p.isFeatured,
    is_new_arrival: p.isNewArrival,
  };
}

// ===== Category =====
export function rowToCategory(row: Record<string, any>): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? null,
    iconUrl: row.icon_url ?? undefined,
    displayOrder: row.display_order ?? 0,
  };
}
export function categoryToInsert(c: Omit<Category, "id">) {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    parent_id: c.parentId ?? null,
    icon_url: c.iconUrl ?? null,
    display_order: c.displayOrder,
  };
}

// ===== Campaign =====
export function rowToCampaign(row: Record<string, any>): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    bannerImageUrl: row.banner_image_url ?? undefined,
    ruleType: row.rule_type,
    ruleConfig: row.rule_config,
    applicableTo: row.applicable_to,
    targetIds: row.target_ids ?? [],
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active ?? true,
    displayOnHomepage: row.display_on_homepage ?? false,
    displayPriority: row.display_priority ?? 0,
  };
}
export function campaignToInsert(c: Omit<Campaign, "id">) {
  return {
    slug: c.slug,
    title: c.title,
    description: c.description ?? null,
    banner_image_url: c.bannerImageUrl ?? null,
    rule_type: c.ruleType,
    rule_config: c.ruleConfig,
    applicable_to: c.applicableTo,
    target_ids: c.targetIds,
    start_date: c.startDate,
    end_date: c.endDate ?? null,
    is_active: c.isActive,
    display_on_homepage: c.displayOnHomepage,
    display_priority: c.displayPriority,
  };
}

// ===== Offer =====
export function rowToOffer(row: Record<string, any>): Offer {
  return {
    id: row.id,
    fullName: row.full_name,
    city: row.city,
    district: row.district,
    installationLocation: row.installation_location,
    installationAddress: row.installation_address ?? undefined,
    appliances: row.appliances_to_run ?? [],
    detailedDescription: row.detailed_description ?? "",
    phone: row.phone,
    email: row.email ?? undefined,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    adminResponse: row.admin_response ?? undefined,
    respondedAt: row.responded_at ?? undefined,
    createdAt: row.created_at,
  };
}
export function offerToInsert(o: Omit<Offer, "id" | "status" | "createdAt">) {
  return {
    full_name: o.fullName,
    city: o.city,
    district: o.district,
    installation_location: o.installationLocation,
    installation_address: o.installationAddress ?? null,
    appliances_to_run: o.appliances,
    detailed_description: o.detailedDescription,
    phone: o.phone,
    email: o.email ?? null,
  };
}

// ===== Order =====
export function rowToOrder(row: Record<string, any>): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    items: row.items,
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost ?? 0),
    total: Number(row.total),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email ?? undefined,
    shippingAddress: row.shipping_address,
    status: row.status,
    paymentMethod: row.payment_method ?? "whatsapp",
    createdAt: row.created_at,
  };
}
export function orderToInsert(o: Omit<Order, "id" | "orderNumber" | "createdAt">, orderNumber: string) {
  return {
    order_number: orderNumber,
    items: o.items,
    subtotal: o.subtotal,
    shipping_cost: o.shippingCost,
    total: o.total,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail ?? null,
    shipping_address: o.shippingAddress,
    status: o.status,
    payment_method: o.paymentMethod,
  };
}

// ===== Gallery =====
export function rowToGallery(row: Record<string, any>, media: Record<string, any>[] = []): GalleryPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    installationDate: row.installation_date ?? undefined,
    systemPowerKw: row.system_power_kw ? Number(row.system_power_kw) : undefined,
    media: media.map((m) => ({
      id: m.id,
      type: m.media_type,
      url: m.url,
      thumbnailUrl: m.thumbnail_url ?? undefined,
    })),
    isFeatured: row.is_featured ?? false,
  };
}
export function galleryToInsert(g: Omit<GalleryPost, "id">) {
  return {
    slug: g.slug,
    title: g.title,
    description: g.description ?? null,
    location: g.location ?? null,
    installation_date: g.installationDate ?? null,
    system_power_kw: g.systemPowerKw ?? null,
    is_featured: g.isFeatured,
  };
}

// ===== Notification =====
export function rowToNotification(row: Record<string, any>): AdminNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message ?? "",
    relatedId: row.related_id ?? undefined,
    relatedType: row.related_type ?? undefined,
    isRead: row.is_read ?? false,
    createdAt: row.created_at,
  };
}

// ===== StockSubscription =====
export function rowToStockSub(row: Record<string, any>): StockSubscription {
  return {
    id: row.id,
    productId: row.product_id,
    email: row.email ?? undefined,
    pushSubscriptionJson: row.push_subscription ? JSON.stringify(row.push_subscription) : undefined,
    isNotified: row.is_notified ?? false,
    createdAt: row.created_at,
  };
}

// ===== SiteSettings (key-value -> object) =====
export function rowsToSettings(rows: { key: string; value: any }[]): SiteSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    contactPhone: map.get("contact_phone") ?? "",
    contactEmail: map.get("contact_email") ?? "",
    whatsappNumber: map.get("whatsapp_number") ?? "",
    address: map.get("address") ?? { city: "", full: "" },
    socialMedia: map.get("social_media") ?? {},
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/mappers.ts
git commit -m "feat(data): row<->domain mappers for all entities"
```

---

#### Task 20: Supabase repository — products + categories (read)

**Files:**
- Create: `lib/data/supabase/products.ts`, `lib/data/supabase/categories.ts`

- [ ] **Step 1: Products read**

`lib/data/supabase/products.ts`:

```ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { productToInsert, rowToProduct } from "../mappers";
import type { Product } from "../types";

async function fetchMedia(productIds: string[]): Promise<Map<string, any[]>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("product_media")
    .select("*")
    .in("product_id", productIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, any[]>();
  for (const row of data ?? []) {
    const list = map.get(row.product_id) ?? [];
    list.push(row);
    map.set(row.product_id, list);
  }
  return map;
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await adminSupabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const mediaByProduct = await fetchMedia((data ?? []).map((r) => r.id));
  return (data ?? []).map((r) => rowToProduct(r, mediaByProduct.get(r.id) ?? []));
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([id])).get(id) ?? [];
  return rowToProduct(data, media);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await adminSupabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchMedia([data.id])).get(data.id) ?? [];
  return rowToProduct(data, media);
}
```

- [ ] **Step 2: Categories read**

`lib/data/supabase/categories.ts`:

```ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { categoryToInsert, rowToCategory } from "../mappers";
import type { Category } from "../types";

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await adminSupabase
    .from("categories")
    .select("*")
    .order("display_order");
  if (error) throw error;
  return (data ?? []).map(rowToCategory);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase/
git commit -m "feat(data/supabase): products + categories read paths"
```

---

#### Task 21: Supabase repository — campaigns + gallery (read)

**Files:**
- Create: `lib/data/supabase/campaigns.ts`, `lib/data/supabase/gallery.ts`

- [ ] **Step 1: Campaigns**

```ts
// lib/data/supabase/campaigns.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { campaignToInsert, rowToCampaign } from "../mappers";
import type { Campaign } from "../types";

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await adminSupabase
    .from("campaigns")
    .select("*")
    .order("display_priority", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await adminSupabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToCampaign(data) : null;
}
```

- [ ] **Step 2: Gallery**

```ts
// lib/data/supabase/gallery.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { galleryToInsert, rowToGallery } from "../mappers";
import type { GalleryPost } from "../types";

async function fetchGalleryMedia(postIds: string[]): Promise<Map<string, any[]>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await adminSupabase
    .from("gallery_media")
    .select("*")
    .in("post_id", postIds)
    .order("display_order");
  if (error) throw error;
  const map = new Map<string, any[]>();
  for (const row of data ?? []) {
    const list = map.get(row.post_id) ?? [];
    list.push(row);
    map.set(row.post_id, list);
  }
  return map;
}

export async function listGalleryPosts(): Promise<GalleryPost[]> {
  const { data, error } = await adminSupabase
    .from("gallery_posts")
    .select("*")
    .order("display_order");
  if (error) throw error;
  const mediaByPost = await fetchGalleryMedia((data ?? []).map((r) => r.id));
  return (data ?? []).map((r) => rowToGallery(r, mediaByPost.get(r.id) ?? []));
}

export async function getGalleryPostBySlug(slug: string): Promise<GalleryPost | null> {
  const { data, error } = await adminSupabase.from("gallery_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const media = (await fetchGalleryMedia([data.id])).get(data.id) ?? [];
  return rowToGallery(data, media);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase/campaigns.ts lib/data/supabase/gallery.ts
git commit -m "feat(data/supabase): campaigns + gallery read paths"
```

---

#### Task 22: Supabase repository — offers + orders (read)

**Files:**
- Create: `lib/data/supabase/offers.ts`, `lib/data/supabase/orders.ts`

- [ ] **Step 1: Offers**

```ts
// lib/data/supabase/offers.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { offerToInsert, rowToOffer } from "../mappers";
import type { Offer, OfferStatus } from "../types";

export async function listOffers(status?: OfferStatus): Promise<Offer[]> {
  let q = adminSupabase.from("offers").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOffer);
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const { data, error } = await adminSupabase.from("offers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToOffer(data) : null;
}
```

- [ ] **Step 2: Orders**

```ts
// lib/data/supabase/orders.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { orderToInsert, rowToOrder } from "../mappers";
import type { Order, OrderStatus } from "../types";

export async function listOrders(status?: OrderStatus): Promise<Order[]> {
  let q = adminSupabase.from("orders").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await adminSupabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToOrder(data) : null;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase/offers.ts lib/data/supabase/orders.ts
git commit -m "feat(data/supabase): offers + orders read paths"
```

---

#### Task 23: Supabase repository — settings + notifications + stock-subs (read)

**Files:**
- Create: `lib/data/supabase/settings.ts`, `notifications.ts`, `stock-subscriptions.ts`

- [ ] **Step 1: Settings**

```ts
// lib/data/supabase/settings.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowsToSettings } from "../mappers";
import type { SiteSettings } from "../types";

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await adminSupabase.from("site_settings").select("key, value");
  if (error) throw error;
  return rowsToSettings(data ?? []);
}
```

- [ ] **Step 2: Notifications**

```ts
// lib/data/supabase/notifications.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowToNotification } from "../mappers";
import type { AdminNotification } from "../types";

export async function listNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await adminSupabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNotification);
}

export async function unreadCount(): Promise<number> {
  const { count, error } = await adminSupabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 3: Stock subs**

```ts
// lib/data/supabase/stock-subscriptions.ts
import "server-only";
import { adminSupabase } from "@/lib/supabase/admin";
import { rowToStockSub } from "../mappers";
import type { StockSubscription } from "../types";

export async function listStockSubscriptions(productId?: string): Promise<StockSubscription[]> {
  let q = adminSupabase.from("stock_notifications").select("*").order("created_at", { ascending: false });
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToStockSub);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/data/supabase/
git commit -m "feat(data/supabase): settings + notifications + stock-subs read paths"
```

---

#### Task 24: Aggregate read-only supabaseRepository

**Files:**
- Modify: `lib/data/supabase-repository.ts` (full rewrite)

- [ ] **Step 1: Replace the stub Proxy**

```ts
import "server-only";

import * as Campaigns from "./supabase/campaigns";
import * as Categories from "./supabase/categories";
import * as Gallery from "./supabase/gallery";
import * as Notifications from "./supabase/notifications";
import * as Offers from "./supabase/offers";
import * as Orders from "./supabase/orders";
import * as Products from "./supabase/products";
import * as Settings from "./supabase/settings";
import * as StockSubs from "./supabase/stock-subscriptions";

import type { Repository } from "./repository";

const notImpl = (name: string) => () => {
  throw new Error(`supabaseRepository.${name} not yet implemented`);
};

export const supabaseRepository: Repository = {
  // Products
  listProducts: Products.listProducts,
  getProductById: Products.getProductById,
  getProductBySlug: Products.getProductBySlug,
  createProduct: notImpl("createProduct") as Repository["createProduct"],
  updateProduct: notImpl("updateProduct") as Repository["updateProduct"],
  deleteProduct: notImpl("deleteProduct") as Repository["deleteProduct"],
  // Categories
  listCategories: Categories.listCategories,
  createCategory: notImpl("createCategory") as Repository["createCategory"],
  updateCategory: notImpl("updateCategory") as Repository["updateCategory"],
  deleteCategory: notImpl("deleteCategory") as Repository["deleteCategory"],
  // Campaigns
  listCampaigns: Campaigns.listCampaigns,
  getCampaignById: Campaigns.getCampaignById,
  createCampaign: notImpl("createCampaign") as Repository["createCampaign"],
  updateCampaign: notImpl("updateCampaign") as Repository["updateCampaign"],
  deleteCampaign: notImpl("deleteCampaign") as Repository["deleteCampaign"],
  // Offers
  listOffers: Offers.listOffers,
  getOfferById: Offers.getOfferById,
  createOffer: notImpl("createOffer") as Repository["createOffer"],
  updateOffer: notImpl("updateOffer") as Repository["updateOffer"],
  // Orders
  listOrders: Orders.listOrders,
  getOrderById: Orders.getOrderById,
  createOrder: notImpl("createOrder") as Repository["createOrder"],
  updateOrderStatus: notImpl("updateOrderStatus") as Repository["updateOrderStatus"],
  // Gallery
  listGalleryPosts: Gallery.listGalleryPosts,
  getGalleryPostBySlug: Gallery.getGalleryPostBySlug,
  createGalleryPost: notImpl("createGalleryPost") as Repository["createGalleryPost"],
  updateGalleryPost: notImpl("updateGalleryPost") as Repository["updateGalleryPost"],
  deleteGalleryPost: notImpl("deleteGalleryPost") as Repository["deleteGalleryPost"],
  // Settings
  getSettings: Settings.getSettings,
  updateSettings: notImpl("updateSettings") as Repository["updateSettings"],
  // Notifications
  listNotifications: Notifications.listNotifications,
  unreadCount: Notifications.unreadCount,
  markNotificationRead: notImpl("markNotificationRead") as Repository["markNotificationRead"],
  markAllNotificationsRead: notImpl("markAllNotificationsRead") as Repository["markAllNotificationsRead"],
  pushNotification: notImpl("pushNotification") as Repository["pushNotification"],
  // Stock subs
  listStockSubscriptions: StockSubs.listStockSubscriptions,
  createStockSubscription: notImpl("createStockSubscription") as Repository["createStockSubscription"],
  deleteStockSubscription: notImpl("deleteStockSubscription") as Repository["deleteStockSubscription"],
  markStockSubscriptionNotified: notImpl("markStockSubscriptionNotified") as Repository["markStockSubscriptionNotified"],
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase-repository.ts
git commit -m "feat(data): aggregate supabaseRepository (read-only)"
```

---

#### Task 25: Read-path smoke test

Still in `*_MODE=demo`. Temporarily force the supabase repo via a route.

**Files:**
- Temporary: `app/(public)/api/_health/repo/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { supabaseRepository } from "@/lib/data/supabase-repository";

export async function GET() {
  const [products, categories, settings] = await Promise.all([
    supabaseRepository.listProducts(),
    supabaseRepository.listCategories(),
    supabaseRepository.getSettings(),
  ]);
  return NextResponse.json({
    productsCount: products.length,
    categoriesCount: categories.length,
    contactEmail: settings.contactEmail,
  });
}
```

- [ ] **Step 2: Run and hit**

```bash
pnpm dev
curl http://localhost:3000/api/_health/repo
```

Expected: `{"productsCount":0,"categoriesCount":0,"contactEmail":"info@kayhansolar.com"}` (0 products/categories because we haven't seeded yet — that's Task 33).

- [ ] **Step 3: Delete the route + commit**

```bash
rm -r "app/(public)/api/_health"
git add -A
git commit -m "chore: remove temporary repo smoke route"
```

---

### Sub-phase F — Repository (write paths)

#### Task 26: Helper — pushNotification + genOrderNumber

These are used by createOffer and createOrder. Extract them.

**Files:**
- Modify: `lib/data/supabase/notifications.ts` (append)

- [ ] **Step 1: Add write methods**

```ts
// append to lib/data/supabase/notifications.ts
import type { NotificationType } from "../types";

export async function pushNotification(data: {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "offer" | "order" | "product";
}): Promise<AdminNotification> {
  const { data: row, error } = await adminSupabase
    .from("admin_notifications")
    .insert({
      type: data.type,
      title: data.title,
      message: data.message,
      related_id: data.relatedId ?? null,
      related_type: data.relatedType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToNotification(row);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await adminSupabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await adminSupabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data/supabase/notifications.ts
git commit -m "feat(data/supabase): notification writes"
```

---

#### Task 27: Products write paths (+ low-stock side-effect)

**Files:**
- Modify: `lib/data/supabase/products.ts` (append)

- [ ] **Step 1: Append write functions**

```ts
import { pushNotification } from "./notifications";

export async function createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
  const { data: row, error } = await adminSupabase
    .from("products")
    .insert(productToInsert(data))
    .select()
    .single();
  if (error) throw error;

  if (data.media.length > 0) {
    const inserts = data.media.map((m, i) => ({
      product_id: row.id,
      media_type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnailUrl ?? null,
      alt_text: m.altText ?? null,
      display_order: i,
    }));
    const { error: mediaErr } = await adminSupabase.from("product_media").insert(inserts);
    if (mediaErr) throw mediaErr;
  }
  return (await getProductById(row.id))!;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const prev = await getProductById(id);
  if (!prev) throw new Error(`Product ${id} not found`);

  // Map only the columns that map cleanly. Media handled separately.
  const update: Record<string, any> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.shortDescription !== undefined) update.short_description = patch.shortDescription;
  if (patch.longDescription !== undefined) update.long_description = patch.longDescription;
  if (patch.technicalSpecs !== undefined) update.technical_specs = patch.technicalSpecs;
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
  if (patch.brand !== undefined) update.brand = patch.brand;
  if (patch.currentPrice !== undefined) update.current_price = patch.currentPrice;
  if (patch.compareAtPrice !== undefined) update.compare_at_price = patch.compareAtPrice;
  if (patch.stockQuantity !== undefined) update.stock_quantity = patch.stockQuantity;
  if (patch.lowStockThreshold !== undefined) update.low_stock_threshold = patch.lowStockThreshold;
  if (patch.badges !== undefined) update.badges = patch.badges;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.isFeatured !== undefined) update.is_featured = patch.isFeatured;
  if (patch.isNewArrival !== undefined) update.is_new_arrival = patch.isNewArrival;

  if (Object.keys(update).length > 0) {
    const { error } = await adminSupabase.from("products").update(update).eq("id", id);
    if (error) throw error;
  }

  if (patch.media !== undefined) {
    await adminSupabase.from("product_media").delete().eq("product_id", id);
    if (patch.media.length > 0) {
      const inserts = patch.media.map((m, i) => ({
        product_id: id,
        media_type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null,
        alt_text: m.altText ?? null,
        display_order: i,
      }));
      await adminSupabase.from("product_media").insert(inserts);
    }
  }

  const next = (await getProductById(id))!;

  // Low-stock notification (parity with demo behavior)
  if (
    patch.stockQuantity !== undefined &&
    next.stockQuantity > 0 &&
    next.stockQuantity <= next.lowStockThreshold &&
    prev.stockQuantity > prev.lowStockThreshold
  ) {
    await pushNotification({
      type: "low_stock",
      title: "Stok Azaldı",
      message: `${next.name} — ${next.stockQuantity} adet kaldı`,
      relatedId: id,
      relatedType: "product",
    });
  }
  return next;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await adminSupabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data/supabase/products.ts
git commit -m "feat(data/supabase): product writes incl. low-stock notification"
```

---

#### Task 28: Categories + campaigns + gallery write paths

**Files:**
- Modify: `lib/data/supabase/categories.ts`, `campaigns.ts`, `gallery.ts` (append)

- [ ] **Step 1: Categories**

```ts
export async function createCategory(data: Omit<Category, "id">): Promise<Category> {
  const { data: row, error } = await adminSupabase
    .from("categories")
    .insert(categoryToInsert(data))
    .select()
    .single();
  if (error) throw error;
  return rowToCategory(row);
}
export async function updateCategory(id: string, patch: Partial<Category>): Promise<Category> {
  const update: Record<string, any> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.parentId !== undefined) update.parent_id = patch.parentId;
  if (patch.iconUrl !== undefined) update.icon_url = patch.iconUrl;
  if (patch.displayOrder !== undefined) update.display_order = patch.displayOrder;
  const { data: row, error } = await adminSupabase.from("categories").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToCategory(row);
}
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await adminSupabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Campaigns** (same shape — see code template)

```ts
export async function createCampaign(data: Omit<Campaign, "id">): Promise<Campaign> {
  const { data: row, error } = await adminSupabase
    .from("campaigns")
    .insert(campaignToInsert(data))
    .select()
    .single();
  if (error) throw error;
  return rowToCampaign(row);
}
export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign> {
  const update: Record<string, any> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.bannerImageUrl !== undefined) update.banner_image_url = patch.bannerImageUrl;
  if (patch.ruleType !== undefined) update.rule_type = patch.ruleType;
  if (patch.ruleConfig !== undefined) update.rule_config = patch.ruleConfig;
  if (patch.applicableTo !== undefined) update.applicable_to = patch.applicableTo;
  if (patch.targetIds !== undefined) update.target_ids = patch.targetIds;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.displayOnHomepage !== undefined) update.display_on_homepage = patch.displayOnHomepage;
  if (patch.displayPriority !== undefined) update.display_priority = patch.displayPriority;
  const { data: row, error } = await adminSupabase.from("campaigns").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToCampaign(row);
}
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await adminSupabase.from("campaigns").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Gallery** (with media — mirror products pattern)

```ts
export async function createGalleryPost(data: Omit<GalleryPost, "id">): Promise<GalleryPost> {
  const { data: row, error } = await adminSupabase
    .from("gallery_posts")
    .insert(galleryToInsert(data))
    .select()
    .single();
  if (error) throw error;
  if (data.media.length > 0) {
    const inserts = data.media.map((m, i) => ({
      post_id: row.id,
      media_type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnailUrl ?? null,
      display_order: i,
    }));
    await adminSupabase.from("gallery_media").insert(inserts);
  }
  const fresh = await getGalleryPostBySlug(data.slug);
  return fresh!;
}
export async function updateGalleryPost(id: string, patch: Partial<GalleryPost>): Promise<GalleryPost> {
  const update: Record<string, any> = {};
  if (patch.slug !== undefined) update.slug = patch.slug;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.installationDate !== undefined) update.installation_date = patch.installationDate;
  if (patch.systemPowerKw !== undefined) update.system_power_kw = patch.systemPowerKw;
  if (patch.isFeatured !== undefined) update.is_featured = patch.isFeatured;
  if (Object.keys(update).length > 0) {
    const { error } = await adminSupabase.from("gallery_posts").update(update).eq("id", id);
    if (error) throw error;
  }
  if (patch.media !== undefined) {
    await adminSupabase.from("gallery_media").delete().eq("post_id", id);
    if (patch.media.length > 0) {
      const inserts = patch.media.map((m, i) => ({
        post_id: id,
        media_type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null,
        display_order: i,
      }));
      await adminSupabase.from("gallery_media").insert(inserts);
    }
  }
  const { data: row } = await adminSupabase.from("gallery_posts").select("*").eq("id", id).single();
  const mediaRows = await adminSupabase.from("gallery_media").select("*").eq("post_id", id).order("display_order");
  return rowToGallery(row!, mediaRows.data ?? []);
}
export async function deleteGalleryPost(id: string): Promise<void> {
  const { error } = await adminSupabase.from("gallery_posts").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/data/supabase/
git commit -m "feat(data/supabase): writes for categories, campaigns, gallery"
```

---

#### Task 29: Offers write paths (+ new-offer notification)

**Files:**
- Modify: `lib/data/supabase/offers.ts` (append)

- [ ] **Step 1: Append**

```ts
import { pushNotification } from "./notifications";

export async function createOffer(data: Omit<Offer, "id" | "status" | "createdAt">): Promise<Offer> {
  const { data: row, error } = await adminSupabase
    .from("offers")
    .insert(offerToInsert(data))
    .select()
    .single();
  if (error) throw error;
  const offer = rowToOffer(row);
  await pushNotification({
    type: "new_offer",
    title: "Yeni Teklif",
    message: `${offer.fullName} adlı müşteriden teklif`,
    relatedId: offer.id,
    relatedType: "offer",
  });
  return offer;
}

export async function updateOffer(id: string, patch: Partial<Offer>): Promise<Offer> {
  const update: Record<string, any> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.adminNotes !== undefined) update.admin_notes = patch.adminNotes;
  if (patch.adminResponse !== undefined) {
    update.admin_response = patch.adminResponse;
    update.responded_at = new Date().toISOString();
  }
  const { data: row, error } = await adminSupabase.from("offers").update(update).eq("id", id).select().single();
  if (error) throw error;
  return rowToOffer(row);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data/supabase/offers.ts
git commit -m "feat(data/supabase): offer writes + new-offer notification"
```

---

#### Task 30: Orders write paths (+ order number generation + new-order notification)

**Files:**
- Modify: `lib/data/supabase/orders.ts` (append)

- [ ] **Step 1: Append**

```ts
import { pushNotification } from "./notifications";

async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count, error } = await adminSupabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`);
  if (error) throw error;
  const seq = (count ?? 0) + 1;
  return `KH-${year}-${String(seq).padStart(6, "0")}`;
}

export async function createOrder(data: Omit<Order, "id" | "orderNumber" | "createdAt">): Promise<Order> {
  const orderNumber = await nextOrderNumber();
  const { data: row, error } = await adminSupabase
    .from("orders")
    .insert(orderToInsert(data, orderNumber))
    .select()
    .single();
  if (error) throw error;
  const order = rowToOrder(row);
  await pushNotification({
    type: "new_order",
    title: "Yeni Sipariş",
    message: `${order.orderNumber} — ${order.total.toLocaleString("tr-TR")} ₺`,
    relatedId: order.id,
    relatedType: "order",
  });
  return order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data: row, error } = await adminSupabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToOrder(row);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/data/supabase/orders.ts
git commit -m "feat(data/supabase): order writes + new-order notification"
```

---

#### Task 31: Settings + stock-subs writes

**Files:**
- Modify: `lib/data/supabase/settings.ts`, `stock-subscriptions.ts` (append)

- [ ] **Step 1: Settings — upsert pattern (one row per key)**

```ts
export async function updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const updates: { key: string; value: any }[] = [];
  if (patch.contactPhone !== undefined) updates.push({ key: "contact_phone", value: patch.contactPhone });
  if (patch.contactEmail !== undefined) updates.push({ key: "contact_email", value: patch.contactEmail });
  if (patch.whatsappNumber !== undefined) updates.push({ key: "whatsapp_number", value: patch.whatsappNumber });
  if (patch.address !== undefined) updates.push({ key: "address", value: patch.address });
  if (patch.socialMedia !== undefined) updates.push({ key: "social_media", value: patch.socialMedia });
  if (updates.length > 0) {
    const { error } = await adminSupabase.from("site_settings").upsert(updates, { onConflict: "key" });
    if (error) throw error;
  }
  return getSettings();
}
```

- [ ] **Step 2: Stock subs**

```ts
export async function createStockSubscription(data: {
  productId: string;
  email?: string;
  pushSubscriptionJson?: string;
}): Promise<StockSubscription> {
  const { data: row, error } = await adminSupabase
    .from("stock_notifications")
    .insert({
      product_id: data.productId,
      email: data.email ?? null,
      push_subscription: data.pushSubscriptionJson ? JSON.parse(data.pushSubscriptionJson) : null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToStockSub(row);
}

export async function deleteStockSubscription(id: string): Promise<void> {
  const { error } = await adminSupabase.from("stock_notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function markStockSubscriptionNotified(id: string): Promise<void> {
  const { error } = await adminSupabase
    .from("stock_notifications")
    .update({ is_notified: true, notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase/
git commit -m "feat(data/supabase): settings + stock-subs writes"
```

---

#### Task 32: Replace notImpl in supabase-repository.ts with real functions

**Files:**
- Modify: `lib/data/supabase-repository.ts`

- [ ] **Step 1: Swap every `notImpl(...)` for the real export**

Replace each `notImpl("createProduct") as Repository["createProduct"]` with `Products.createProduct`, etc. After this, the `notImpl` helper is unused — delete it.

Final file should have every method bound:

```ts
export const supabaseRepository: Repository = {
  listProducts: Products.listProducts,
  getProductById: Products.getProductById,
  getProductBySlug: Products.getProductBySlug,
  createProduct: Products.createProduct,
  updateProduct: Products.updateProduct,
  deleteProduct: Products.deleteProduct,
  listCategories: Categories.listCategories,
  createCategory: Categories.createCategory,
  updateCategory: Categories.updateCategory,
  deleteCategory: Categories.deleteCategory,
  listCampaigns: Campaigns.listCampaigns,
  getCampaignById: Campaigns.getCampaignById,
  createCampaign: Campaigns.createCampaign,
  updateCampaign: Campaigns.updateCampaign,
  deleteCampaign: Campaigns.deleteCampaign,
  listOffers: Offers.listOffers,
  getOfferById: Offers.getOfferById,
  createOffer: Offers.createOffer,
  updateOffer: Offers.updateOffer,
  listOrders: Orders.listOrders,
  getOrderById: Orders.getOrderById,
  createOrder: Orders.createOrder,
  updateOrderStatus: Orders.updateOrderStatus,
  listGalleryPosts: Gallery.listGalleryPosts,
  getGalleryPostBySlug: Gallery.getGalleryPostBySlug,
  createGalleryPost: Gallery.createGalleryPost,
  updateGalleryPost: Gallery.updateGalleryPost,
  deleteGalleryPost: Gallery.deleteGalleryPost,
  getSettings: Settings.getSettings,
  updateSettings: Settings.updateSettings,
  listNotifications: Notifications.listNotifications,
  unreadCount: Notifications.unreadCount,
  markNotificationRead: Notifications.markNotificationRead,
  markAllNotificationsRead: Notifications.markAllNotificationsRead,
  pushNotification: Notifications.pushNotification,
  listStockSubscriptions: StockSubs.listStockSubscriptions,
  createStockSubscription: StockSubs.createStockSubscription,
  deleteStockSubscription: StockSubs.deleteStockSubscription,
  markStockSubscriptionNotified: StockSubs.markStockSubscriptionNotified,
};
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: zero errors. If a signature mismatch surfaces, fix the mapper or function signature now.

- [ ] **Step 3: Commit**

```bash
git add lib/data/supabase-repository.ts
git commit -m "feat(data/supabase): wire all repository methods"
```

---

### Sub-phase G — Seed

#### Task 33: Write seed-supabase.ts script

**Files:**
- Create: `scripts/seed-supabase.ts`

- [ ] **Step 1: Write the script**

```ts
import { adminSupabase } from "../lib/supabase/admin";
import {
  mockCategories,
  mockProducts,
  mockCampaigns,
  mockGallery,
} from "../lib/mock/data";

async function main() {
  // 1. Categories
  console.log(`Seeding ${mockCategories.length} categories...`);
  for (const cat of mockCategories) {
    await adminSupabase.from("categories").upsert(
      {
        id: cat.id, // re-use mock id so product.categoryId stays valid
        slug: cat.slug,
        name: cat.name,
        description: cat.description ?? null,
        display_order: cat.displayOrder,
        is_active: true,
      },
      { onConflict: "id" },
    );
  }

  // 2. Products
  console.log(`Seeding ${mockProducts.length} products...`);
  for (const p of mockProducts) {
    const { error: prodErr } = await adminSupabase.from("products").upsert(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        short_description: p.shortDescription,
        long_description: p.longDescription ?? null,
        technical_specs: p.technicalSpecs ?? null,
        category_id: p.categoryId,
        brand: p.brand ?? null,
        current_price: p.currentPrice,
        compare_at_price: p.compareAtPrice ?? null,
        stock_quantity: p.stockQuantity,
        low_stock_threshold: p.lowStockThreshold,
        badges: p.badges,
        is_active: p.isActive,
        is_featured: p.isFeatured,
        is_new_arrival: p.isNewArrival,
        created_at: p.createdAt,
      },
      { onConflict: "id" },
    );
    if (prodErr) {
      console.error(`Product ${p.slug} failed:`, prodErr);
      continue;
    }
    // Media (delete then re-insert for idempotency)
    await adminSupabase.from("product_media").delete().eq("product_id", p.id);
    if (p.media.length > 0) {
      await adminSupabase.from("product_media").insert(
        p.media.map((m, i) => ({
          product_id: p.id,
          media_type: m.type,
          url: m.url,
          thumbnail_url: m.thumbnailUrl ?? null,
          alt_text: m.altText ?? null,
          display_order: i,
        })),
      );
    }
  }

  // 3. Campaigns
  console.log(`Seeding ${mockCampaigns.length} campaigns...`);
  for (const c of mockCampaigns) {
    await adminSupabase.from("campaigns").upsert(
      {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description ?? null,
        banner_image_url: c.bannerImageUrl ?? null,
        rule_type: c.ruleType,
        rule_config: c.ruleConfig,
        applicable_to: c.applicableTo,
        target_ids: c.targetIds,
        start_date: c.startDate,
        end_date: c.endDate ?? null,
        is_active: c.isActive,
        display_on_homepage: c.displayOnHomepage,
        display_priority: c.displayPriority,
      },
      { onConflict: "id" },
    );
  }

  // 4. Gallery
  console.log(`Seeding ${mockGallery.length} gallery posts...`);
  for (const g of mockGallery) {
    await adminSupabase.from("gallery_posts").upsert(
      {
        id: g.id,
        slug: g.slug,
        title: g.title,
        description: g.description ?? null,
        location: g.location ?? null,
        installation_date: g.installationDate ?? null,
        system_power_kw: g.systemPowerKw ?? null,
        is_featured: g.isFeatured,
      },
      { onConflict: "id" },
    );
    await adminSupabase.from("gallery_media").delete().eq("post_id", g.id);
    if (g.media.length > 0) {
      await adminSupabase.from("gallery_media").insert(
        g.media.map((m, i) => ({
          post_id: g.id,
          media_type: m.type,
          url: m.url,
          thumbnail_url: m.thumbnailUrl ?? null,
          display_order: i,
        })),
      );
    }
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Verify mock data export names**

Check `lib/mock/data.ts` exports `mockCategories`, `mockProducts`, `mockCampaigns`, `mockGallery`. If any has a different name (e.g., `mockGalleryPosts`), update the import.

- [ ] **Step 3: Commit script**

```bash
git add scripts/seed-supabase.ts
git commit -m "feat(scripts): seed-supabase from lib/mock/data"
```

---

#### Task 34: Run the seed

- [ ] **Step 1: Execute**

```bash
pnpm dotenv -e .env.local -- tsx scripts/seed-supabase.ts
```

Expected output (counts will match mock data):
```
Seeding 5 categories...
Seeding 8 products...
Seeding N campaigns...
Seeding M gallery posts...
Seed complete.
```

- [ ] **Step 2: Verify in Dashboard**

`select count(*) from products;` returns the expected number. Pick one product and confirm its `product_media` rows are present.

- [ ] **Step 3: Empty checkpoint commit**

```bash
git commit --allow-empty -m "checkpoint: supabase seeded with mock data"
```

---

### Sub-phase H — Storage helper only (wiring deferred)

> **Scope decision:** the admin product/gallery actions receive `media[]` as a JSON array with `url` already populated — meaning there's a client-side uploader earlier in the form flow. Replacing that uploader with Supabase Storage uploads is **its own plan** because it touches form components, not the data layer. The cutover doesn't depend on it: the app accepts any URL string. This sub-phase ships **only the server helper** so a follow-up plan can wire it in without changing the database state.

#### Task 35: Storage helper

**Files:**
- Create: `lib/supabase/storage.ts`

- [ ] **Step 1: Write helper**

```ts
import "server-only";
import { adminSupabase } from "./admin";

type Bucket = "product-media" | "gallery-media" | "offer-media";

export async function uploadFile(
  bucket: Bucket,
  path: string,
  file: ArrayBuffer,
  contentType: string,
): Promise<{ publicUrl: string }> {
  const { error } = await adminSupabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  const { data } = adminSupabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/storage.ts
git commit -m "feat(supabase): storage upload helper (wiring in follow-up plan)"
```

---

### Sub-phase I — Cutover + verify

#### Task 36: Pre-cutover smoke (still demo mode)

- [ ] **Step 1: Start dev server, hit every page**

```bash
pnpm dev
```

Open:
- `/` (homepage) — products and campaigns visible
- `/magaza` — product grid
- `/urun/jinko-550w-monokristal-panel` — product detail
- `/galeri` — gallery list
- `/teklif-al` — offer form
- `/kayhan-yonetim/giris` — login screen

Note what works. This is the baseline.

---

#### Task 37: Flip env to Supabase mode

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Edit env**

```diff
-AUTH_MODE=demo
-DATA_MODE=demo
+AUTH_MODE=supabase
+DATA_MODE=supabase
```

- [ ] **Step 2: Restart dev server**

```bash
# Ctrl+C then:
pnpm dev
```

- [ ] **Step 3: Hit homepage**

Open `/`. Expected: identical to demo baseline. If a 500 surfaces, the dev server logs will name the missing field — fix the mapper.

---

#### Task 38: Full smoke

Walk every flow and tick each box:

- [ ] **Public site**
  - [ ] `/` loads, products and campaigns visible
  - [ ] `/magaza` shows products with images
  - [ ] `/urun/<slug>` shows detail + technical specs
  - [ ] `/galeri` shows posts
  - [ ] `/teklif-al` — submit a fake offer. Confirm row appears in Supabase `offers` table and `admin_notifications` gets a new row.
  - [ ] `/sepet` + WhatsApp checkout — submit a fake order. Confirm `orders` table row + new order notification fires.

- [ ] **Admin (`/kayhan-yonetim`)**
  - [ ] Login with `admin@kayhansolar.com` / `kayhan2026` succeeds
  - [ ] Dashboard shows notification badge counts
  - [ ] Products list shows all seeded products
  - [ ] Create a new product — appears in list + Supabase `products` table
  - [ ] Edit a product (drop stock to 1) — low-stock notification fires
  - [ ] Delete the test product
  - [ ] Same for: categories, campaigns, gallery, offers, orders, site settings
  - [ ] Logout works — `/kayhan-yonetim` redirects to `/giris`

- [ ] **Server logs**
  - [ ] No "supabaseRepository.X not yet implemented" errors
  - [ ] No PostgrestError mentions of missing columns / RLS denials

If any item fails, fix the underlying mapper/query/policy, repeat that step. Do not move on with broken items.

- [ ] **Step 1: Document the result**

Create `docs/verification/2026-05-11-supabase-cutover.md` summarising which items passed and any issues encountered + their resolution (mirror the existing `2026-05-11-faz-3.md` format).

- [ ] **Step 2: Commit verification doc**

```bash
git add docs/verification/2026-05-11-supabase-cutover.md
git commit -m "docs: supabase cutover verification report"
```

---

#### Task 39: Post-cutover hygiene

- [ ] **Step 1: Update memory note**

(Manual — outside the codebase.) Update `MEMORY.md` integration entry: AUTH_MODE/DATA_MODE now `supabase`. Demo fallback still available by flipping back.

- [ ] **Step 2: Document the flip in repo**

Append a row to `kayhan-solar/CLAUDE.md` (or `AGENTS.md`) noting: "live mode is `supabase`. To run offline, flip both `*_MODE` flags to `demo` in `.env.local`."

- [ ] **Step 3: Push to GitHub**

```bash
git push -u origin main
```

(First push — origin was added but no commits ever went up.)

- [ ] **Step 4: Final checkpoint**

```bash
git commit --allow-empty -m "checkpoint: supabase live"
```

---

## Done criteria

- [ ] `AUTH_MODE=supabase`, `DATA_MODE=supabase`
- [ ] Login with admin creds works, lands on `/kayhan-yonetim`
- [ ] Every admin CRUD page round-trips through Supabase (verified via SQL Editor)
- [ ] Public site reads from Supabase (verified by editing a product in dashboard and seeing the change in `/urun/<slug>` after `revalidatePath`)
- [ ] No 500s in dev server log during full smoke
- [ ] Demo mode still works as fallback (flip env back, restart, baseline page loads)

## Rollback

If something explodes mid-cutover and you need to revert: edit `.env.local`, set both `*_MODE=demo`, restart dev server. Data in Supabase stays untouched; the demo in-memory store re-seeds from `lib/mock/data.ts`.
