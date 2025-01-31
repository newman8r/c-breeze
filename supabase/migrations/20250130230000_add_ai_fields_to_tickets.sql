-- Add AI-related fields to tickets table
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;

-- Add an index on created_by_ai for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tickets_created_by_ai ON tickets(created_by_ai);

-- Add a GIN index on ai_metadata for efficient JSON querying
CREATE INDEX IF NOT EXISTS idx_tickets_ai_metadata ON tickets USING GIN (ai_metadata);

-- Add comment explaining the fields
COMMENT ON COLUMN tickets.created_by_ai IS 'Flag indicating if this ticket was created by the AI system';
COMMENT ON COLUMN tickets.ai_metadata IS 'JSON metadata containing AI analysis and processing details'; 