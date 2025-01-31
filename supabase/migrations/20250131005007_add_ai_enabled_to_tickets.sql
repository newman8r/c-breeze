ALTER TABLE tickets
ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the field
COMMENT ON COLUMN tickets.ai_enabled IS 'Controls whether AI agents can respond to messages in this ticket';

-- Update existing tickets to have AI enabled by default
UPDATE tickets SET ai_enabled = true WHERE ai_enabled IS NULL;
