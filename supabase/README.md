# Supabase setup

Anything in this folder is the source of truth for the Supabase project state. Schema lives in `migrations/`; one-off seed rows in `seed.sql` (when applicable).

## Applying migrations

The project ships with `pnpm run db:migrate` (see `scripts/apply-migrations.ts`) that connects via the pooler URI in `DATABASE_URL` and applies every `.sql` file under `supabase/migrations/` in name order.

Manual fallback: Supabase Dashboard → SQL Editor → paste contents → Run.

## Cutover scripts (from Supabase Cutover plan)

- `pnpm run db:migrate` — apply migrations
- `pnpm run seed:ai` — seed AI knowledge base (Faz 5)
- `pnpm run seed:supabase` — import mock products/categories/campaigns/gallery into Supabase (Cutover plan Task 34)
- `pnpm tsx scripts/create-admin.ts` — create admin auth user in Supabase (Cutover plan Task 14)

## Re-applying

All migrations use `create ... if not exists` so they're safe to re-run.
