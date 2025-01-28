-- Create an enum for processing status
create type document_chunk_status as enum ('pending', 'processing', 'completed', 'failed');

-- Create the document processing queue table
create table document_processing_queue (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references rag_documents(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  chunk_start bigint not null,
  chunk_size bigint not null,
  total_size bigint not null,
  status document_chunk_status not null default 'pending',
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  chunks_created integer default 0,
  attempt_count integer default 0
);

-- Add indexes for efficient querying
create index idx_doc_processing_status on document_processing_queue(status);
create index idx_doc_processing_document on document_processing_queue(document_id);
create index idx_doc_processing_org on document_processing_queue(organization_id);

-- Add a function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_document_processing_queue_updated_at
  before update on document_processing_queue
  for each row
  execute function update_updated_at_column();
