-- Enable pgvector extension
create extension if not exists vector;

-- ============================================
-- RESET (safe for fresh projects)
-- ============================================
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists business_profiles cascade;
drop table if exists users cascade;
drop table if exists documents cascade;
drop function if exists match_documents cascade;

-- ============================================
-- KNOWLEDGE BASE
-- ============================================

create table if not exists documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  source_file text,
  source_type text, -- 'pdf', 'video', 'audio', 'docx', 'text'
  coach text default 'general', -- 'hormozi', 'robbins', 'wilde', 'framework', 'cross-coach', etc.
  topic text default 'general', -- 'offers', 'mindset', 'sales-scripts', 'framework', etc.
  chunk_index integer,
  created_at timestamptz default now()
);

-- Index for fast similarity search
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Full text search index
create index if not exists documents_content_idx
  on documents using gin(to_tsvector('english', content));

-- Index for coach/topic filtering
create index if not exists documents_coach_idx on documents (coach);
create index if not exists documents_topic_idx on documents (topic);
create index if not exists documents_coach_topic_idx on documents (coach, topic);

-- ============================================
-- USERS / SUBSCRIPTIONS
-- ============================================

create table if not exists users (
  id text primary key, -- Supabase Auth user ID
  email text unique not null,
  full_name text,
  plan text default 'free' check (plan in ('free', 'premium')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text default 'inactive',
  messages_used_today integer default 0,
  messages_reset_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CONVERSATIONS
-- ============================================

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  app text not null default 'business-coach' check (app in ('business-coach', 'dm-slap', 'objection-card', 'call-reflect')),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb default '[]', -- referenced document chunks
  created_at timestamptz default now()
);

-- ============================================
-- BUSINESS PROFILES (user context for better coaching)
-- ============================================

create table if not exists business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  app text not null default 'business-coach' check (app in ('business-coach', 'dm-slap', 'objection-card', 'call-reflect')),
  business_name text,
  industry text,
  stage text, -- 'idea', 'pre-revenue', 'early', 'growth', 'scaling'
  monthly_revenue numeric,
  target_revenue numeric,
  biggest_challenge text,
  target_customer text,
  current_offer text,
  goals text,
  updated_at timestamptz default now(),
  unique(user_id, app)
);

-- ============================================
-- MATCH FUNCTION FOR RAG
-- ============================================

-- Basic match function (backwards compatible)
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
  coach text,
  topic text,
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
    documents.coach,
    documents.topic,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

-- Coach-filtered match function for mentor-mode RAG
create or replace function match_documents_by_coach(
  query_embedding vector(1536),
  filter_coaches text[] default '{}',
  match_threshold float default 0.65,
  match_count int default 8
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  source_file text,
  source_type text,
  coach text,
  topic text,
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
    documents.coach,
    documents.topic,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
    and (
      array_length(filter_coaches, 1) is null
      or documents.coach = any(filter_coaches)
    )
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table business_profiles enable row level security;

-- Users can only see their own data
create policy "Users can view own profile" on users
  for select using (id = current_setting('app.current_user_id', true));

create policy "Users can update own profile" on users
  for update using (id = current_setting('app.current_user_id', true));

create policy "Users can view own conversations" on conversations
  for all using (user_id = current_setting('app.current_user_id', true));

create policy "Users can view own messages" on messages
  for all using (
    conversation_id in (
      select id from conversations
      where user_id = current_setting('app.current_user_id', true)
    )
  );

create policy "Users can manage own business profile" on business_profiles
  for all using (user_id = current_setting('app.current_user_id', true));

-- Documents are readable by all authenticated users
alter table documents enable row level security;
create policy "Documents readable by all" on documents
  for select using (true);

-- Service role can insert documents (for ingestion pipeline)
create policy "Service role can insert documents" on documents
  for insert with check (true);
