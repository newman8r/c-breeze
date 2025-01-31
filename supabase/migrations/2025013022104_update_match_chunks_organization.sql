-- Update the match_chunks function to handle organization filtering
create or replace function match_chunks(
    query_embedding vector(1536),
    match_threshold float default 0.8,
    match_count int default 5,
    organization_id uuid default null
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
    join public.rag_documents docs on docs.id = chunks.document_id
    where 1 - (chunks.embedding <=> query_embedding) > match_threshold
    and (organization_id is null or docs.organization_id = organization_id)
    and docs.status = 'processed'
    order by chunks.embedding <=> query_embedding
    limit match_count;
$$; 