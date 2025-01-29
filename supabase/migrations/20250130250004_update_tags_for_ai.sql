-- Make created_by nullable and add is_ai_generated column to tags
ALTER TABLE tags 
  ALTER COLUMN created_by DROP NOT NULL,
  ADD COLUMN is_ai_generated BOOLEAN NOT NULL DEFAULT false;

-- Make created_by nullable and add is_ai_generated column to ticket_tags
ALTER TABLE ticket_tags 
  ALTER COLUMN created_by DROP NOT NULL,
  ADD COLUMN is_ai_generated BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies to allow AI to create tags
DROP POLICY IF EXISTS "Organization members can create tags" ON tags;
CREATE POLICY "Organization members can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM customers WHERE user_id = auth.uid()
    )
    OR is_ai_generated = true
  );

-- Update RLS policies to allow AI to create ticket tags
DROP POLICY IF EXISTS "Organization members can create ticket tags" ON ticket_tags;
CREATE POLICY "Organization members can create ticket tags"
  ON ticket_tags FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT t.id FROM tickets t
      JOIN employees e ON e.organization_id = t.organization_id
      WHERE e.user_id = auth.uid()
      UNION
      SELECT t.id FROM tickets t
      JOIN customers c ON c.organization_id = t.organization_id
      WHERE c.user_id = auth.uid()
    )
    OR is_ai_generated = true
  ); 