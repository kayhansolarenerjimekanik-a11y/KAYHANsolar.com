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
