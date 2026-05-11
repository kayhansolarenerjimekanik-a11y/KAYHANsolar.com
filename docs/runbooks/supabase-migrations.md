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
