-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create an enum for document processing status
create type document_processing_status as enum (
  'pending',
  'processing',
  'processed',
  'failed'
);

-- Create an enum for vector store status
create type vector_store_status as enum (
  'not_built',
  'building',
  'needs_update',
  'up_to_date'
);

-- Documents table to store the original documents
create table documents (
  id bigint primary key generated always as identity,
  name text not null,
  file_type text not null,
  file_size bigint not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536), -- OpenAI's text-embedding-3-small dimension
  status document_processing_status default 'pending',
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade
);

-- Document chunks table for storing processed segments
create table document_chunks (
  id bigint primary key generated always as identity,
  document_id bigint references documents(id) on delete cascade,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  tokens integer,
  chunk_index integer not null, -- To maintain order of chunks
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  organization_id uuid not null references public.organizations(id) on delete cascade
);

-- Vector store status table (single row per organization)
create table vector_store_metadata (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  total_documents integer default 0,
  processed_documents integer default 0,
  failed_documents integer default 0,
  total_chunks integer default 0,
  last_rebuild timestamp with time zone,
  last_update timestamp with time zone default timezone('utc'::text, now()),
  status vector_store_status default 'not_built',
  embedding_model text default 'text-embedding-3-small',
  chunk_size integer default 500,
  chunk_overlap integer default 50,
  error_message text
);

-- Create indexes for better query performance
create index on documents (organization_id);
create index on documents (status);
create index on documents (created_at);
create index on document_chunks (document_id);
create index on document_chunks (organization_id);

-- Create a GiST index for faster similarity searches
create index on document_chunks 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Function to match documents based on embedding similarity
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float default 0.8,
  match_count int default 5,
  filter_organization_id uuid default null
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float,
  document_id bigint
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.document_id
  from document_chunks dc
  where
    dc.embedding is not null
    and (filter_organization_id is null or dc.organization_id = filter_organization_id)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to update vector store status
create or replace function update_vector_store_status(org_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  total_docs integer;
  processed_docs integer;
  failed_docs integer;
  total_chunks integer;
  new_status vector_store_status;
begin
  -- Get document counts
  select 
    count(*),
    count(*) filter (where status = 'processed'),
    count(*) filter (where status = 'failed')
  into total_docs, processed_docs, failed_docs
  from documents
  where organization_id = org_id;

  -- Get chunk count
  select count(*)
  into total_chunks
  from document_chunks
  where organization_id = org_id;

  -- Determine status
  if total_docs = 0 then
    new_status := 'not_built';
  elsif processed_docs = total_docs then
    new_status := 'up_to_date';
  elsif failed_docs > 0 then
    new_status := 'needs_update';
  else
    new_status := 'building';
  end if;

  -- Insert or update status
  insert into vector_store_metadata (
    organization_id,
    total_documents,
    processed_documents,
    failed_documents,
    total_chunks,
    status,
    last_update
  )
  values (
    org_id,
    total_docs,
    processed_docs,
    failed_docs,
    total_chunks,
    new_status,
    now()
  )
  on conflict (organization_id) do update
  set
    total_documents = excluded.total_documents,
    processed_documents = excluded.processed_documents,
    failed_documents = excluded.failed_documents,
    total_chunks = excluded.total_chunks,
    status = excluded.status,
    last_update = excluded.last_update;
end;
$$;

-- Trigger to automatically update vector store status
create or replace function trigger_update_vector_store_status()
returns trigger
language plpgsql
security definer
as $$
begin
  perform update_vector_store_status(
    case 
      when TG_OP = 'DELETE' then OLD.organization_id
      else NEW.organization_id
    end
  );
  return null;
end;
$$;

create trigger documents_status_change
after insert or update of status or delete on documents
for each row execute function trigger_update_vector_store_status();

-- RLS Policies
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table vector_store_metadata enable row level security;

-- Documents policies
create policy "Users can view their organization's documents"
  on documents for select
  using (organization_id in (
    select id from public.organizations where created_by = auth.uid()
  ));

create policy "Users can insert documents into their organization"
  on documents for insert
  with check (organization_id in (
    select id from public.organizations where created_by = auth.uid()
  ));

-- Document chunks policies
create policy "Users can view their organization's chunks"
  on document_chunks for select
  using (organization_id in (
    select id from public.organizations where created_by = auth.uid()
  ));

-- Vector store metadata policies
create policy "Users can view their organization's vector store metadata"
  on vector_store_metadata for select
  using (organization_id in (
    select id from public.organizations where created_by = auth.uid()
  ));

-- Update documents table to add updated_at trigger
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();
