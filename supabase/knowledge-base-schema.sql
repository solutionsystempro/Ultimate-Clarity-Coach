-- ============================================
-- KNOWLEDGE BASE SCHEMA
-- Paste this into Supabase SQL Editor and click Run
-- Project: https://zqovycbtjegvpwzwqwqr.supabase.co
-- ============================================

create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  source_file text,
  source_type text,
  chunk_index integer,
  created_at timestamptz default now()
);

create index documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index documents_content_idx
  on documents using gin(to_tsvector('english', content));

create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 8
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  source_file text,
  source_type text,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    documents.source_file,
    documents.source_type,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

alter table documents enable row level security;
create policy "Documents readable by all" on documents for select using (true);
create policy "Service role can insert" on documents for insert with check (true);
