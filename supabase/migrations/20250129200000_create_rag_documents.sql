-- Create the rag_documents table
create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'pending',
  chunks integer default 0,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  metadata jsonb default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  processed_at timestamptz,
  error_message text
);

-- Add RLS policies
alter table public.rag_documents enable row level security;

create policy "Users can view their own documents"
  on public.rag_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own documents"
  on public.rag_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own documents"
  on public.rag_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own documents"
  on public.rag_documents for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_rag_documents_updated_at
  before update on public.rag_documents
  for each row
  execute function public.handle_updated_at(); 