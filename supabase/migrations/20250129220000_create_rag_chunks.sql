-- Enable required extensions
create extension if not exists vector;
create extension if not exists moddatetime;

-- Create the chunks table
create table if not exists public.rag_chunks (
    id bigint primary key generated always as identity,
    document_id uuid not null references public.rag_documents(id) on delete cascade,
    content text not null,
    embedding vector(384), -- gte-small produces 384-dimensional vectors
    chunk_index integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index for faster similarity searches
create index if not exists rag_chunks_embedding_idx 
    on public.rag_chunks 
    using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- Add RLS policies
alter table public.rag_chunks enable row level security;

create policy "Users can view their own chunks"
    on public.rag_chunks for select
    using (
        exists (
            select 1 from public.rag_documents d
            where d.id = rag_chunks.document_id
            and d.user_id = auth.uid()
        )
    );

create policy "Users can insert their own chunks"
    on public.rag_chunks for insert
    with check (
        exists (
            select 1 from public.rag_documents d
            where d.id = document_id
            and d.user_id = auth.uid()
        )
    );

create policy "Users can update their own chunks"
    on public.rag_chunks for update
    using (
        exists (
            select 1 from public.rag_documents d
            where d.id = rag_chunks.document_id
            and d.user_id = auth.uid()
        )
    );

create policy "Users can delete their own chunks"
    on public.rag_chunks for delete
    using (
        exists (
            select 1 from public.rag_documents d
            where d.id = rag_chunks.document_id
            and d.user_id = auth.uid()
        )
    );

-- Add updated_at trigger
create trigger handle_updated_at before update on public.rag_chunks
    for each row execute procedure moddatetime (updated_at);

-- Create a function to match similar chunks
create or replace function match_chunks(
    query_embedding vector(384),
    match_threshold float default 0.8,
    match_count int default 5
)
returns table (
    id bigint,
    document_id uuid,
    content text,
    similarity float
)
language sql stable
as $$
    select
        chunks.id,
        chunks.document_id,
        chunks.content,
        1 - (chunks.embedding <=> query_embedding) as similarity
    from public.rag_chunks chunks
    where 1 - (chunks.embedding <=> query_embedding) > match_threshold
    order by chunks.embedding <=> query_embedding
    limit match_count;
$$; 
