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

drop policy if exists "analytics_service_role_all" on public.analytics_events;
create policy "analytics_service_role_all"
  on public.analytics_events for all
  to service_role
  using (true) with check (true);

drop policy if exists "analytics_anon_insert" on public.analytics_events;
create policy "analytics_anon_insert"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);
