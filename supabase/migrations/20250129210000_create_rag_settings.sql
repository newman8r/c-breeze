-- Create enum for RAG system status
create type rag_system_status as enum (
  'up_to_date',
  'needs_rebuild',
  'not_built'
);

-- Create table for RAG settings
create table if not exists public.rag_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  chunk_size integer not null default 500,
  chunk_overlap integer not null default 50,
  embedding_model text not null default 'text-embedding-3-small',
  last_rebuild_at timestamptz,
  total_chunks integer not null default 0,
  status rag_system_status not null default 'not_built',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure only one settings record per organization
  constraint rag_settings_organization_unique unique (organization_id)
);

-- Add RLS policies
alter table public.rag_settings enable row level security;

-- Allow organization members to view settings
create policy "Organization members can view RAG settings"
  on public.rag_settings
  for select
  using (
    exists (
      select 1 from public.employees e
      where e.user_id = auth.uid()
      and e.organization_id = rag_settings.organization_id
    )
  );

-- Allow organization admins to update settings
create policy "Organization admins can update RAG settings"
  on public.rag_settings
  for update
  using (
    exists (
      select 1 from public.employees e
      where e.user_id = auth.uid()
      and e.organization_id = rag_settings.organization_id
      and e.role = 'admin'
    )
  );

-- Allow organization admins to insert settings
create policy "Organization admins can insert RAG settings"
  on public.rag_settings
  for insert
  with check (
    exists (
      select 1 from public.employees e
      where e.user_id = auth.uid()
      and e.organization_id = rag_settings.organization_id
      and e.role = 'admin'
    )
  );

-- Create function to update updated_at on changes
create trigger handle_rag_settings_updated_at
  before update on public.rag_settings
  for each row
  execute function public.handle_updated_at();

-- Create function to initialize RAG settings for new organizations
create or replace function public.initialize_rag_settings()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.rag_settings (
    organization_id,
    chunk_size,
    chunk_overlap,
    embedding_model,
    status
  ) values (
    NEW.id,
    500,  -- default chunk size
    50,   -- default overlap
    'text-embedding-3-small',  -- default model
    'not_built'
  );
  return NEW;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_organization_created on public.organizations;

-- Create trigger to automatically create RAG settings for new organizations
create trigger on_organization_created
  after insert on public.organizations
  for each row
  execute function public.initialize_rag_settings();

-- Add comment to explain the table's purpose
comment on table public.rag_settings is 'Stores organization-level settings and status for the RAG (Retrieval Augmented Generation) system';

-- Grant necessary permissions
grant usage on type public.rag_system_status to anon, authenticated;
grant select on public.rag_settings to authenticated; 