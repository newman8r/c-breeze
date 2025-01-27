-- Update the vector size for OpenAI embeddings
ALTER TABLE rag_chunks
ALTER COLUMN embedding TYPE vector(1536);

-- Update the index to use the new vector size
DROP INDEX IF EXISTS rag_chunks_embedding_idx;
CREATE INDEX rag_chunks_embedding_idx ON rag_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); 