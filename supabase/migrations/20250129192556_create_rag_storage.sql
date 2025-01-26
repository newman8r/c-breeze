-- Create a bucket for RAG documents
insert into storage.buckets (id, name, public)
values ('rag_documents', 'rag_documents', false);

-- Create storage policies for the RAG documents bucket
create policy "Users can upload RAG documents to their organization"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'rag_documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their organization's RAG documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'rag_documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their organization's RAG documents"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'rag_documents' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create a function to generate a secure file path for RAG documents
create or replace function generate_rag_document_path(
  user_id uuid,
  original_filename text
)
returns text
language plpgsql
as $$
declare
  file_ext text;
  unique_filename text;
begin
  -- Extract file extension
  file_ext := substr(original_filename, strpos(original_filename, '.'));
  if file_ext = '' then
    file_ext := '.txt';
  end if;

  -- Generate unique filename: user_id/yyyy/mm/uuid.ext
  unique_filename := user_id || '/' ||
                    to_char(now(), 'YYYY/MM') || '/' ||
                    gen_random_uuid() || file_ext;

  return unique_filename;
end;
$$;
