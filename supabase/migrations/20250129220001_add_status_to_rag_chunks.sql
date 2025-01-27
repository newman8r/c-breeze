-- First create the enum type
CREATE TYPE public.rag_chunk_status AS ENUM ('pending', 'processed', 'failed');

-- Add status and error_message columns to rag_chunks table
ALTER TABLE rag_chunks
ADD COLUMN status rag_chunk_status NOT NULL DEFAULT 'pending',
ADD COLUMN error_message text; 
