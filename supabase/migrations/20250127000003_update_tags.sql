-- Create tag type enum
CREATE TYPE tag_type AS ENUM ('system', 'custom');

-- Add new columns to tags table
ALTER TABLE tags 
  ADD COLUMN type tag_type NOT NULL DEFAULT 'custom',
  ADD COLUMN created_by UUID REFERENCES auth.users(id),
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add created_by to ticket_tags
ALTER TABLE ticket_tags
  ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update RLS policies
DROP POLICY IF EXISTS "Organization members can view their tags" ON tags;
DROP POLICY IF EXISTS "Employees can create tags" ON tags;
DROP POLICY IF EXISTS "Employees can update their organization tags" ON tags;
DROP POLICY IF EXISTS "Employees can delete their organization tags" ON tags;

CREATE POLICY "Organization members can view their tags"
  ON tags FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create tags"
  ON tags FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their organization tags"
  ON tags FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can delete their organization tags"
  ON tags FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Add some default system tags
INSERT INTO tags (name, description, color, type, organization_id, created_by)
SELECT 
  system_tags.name,
  system_tags.description,
  system_tags.color,
  'system'::tag_type,
  org.id,
  (SELECT id FROM auth.users LIMIT 1) -- Using first user as creator for system tags
FROM 
  organizations org,
  (VALUES 
    ('urgent', 'High priority items requiring immediate attention', '#FF0000'),
    ('bug', 'Issues related to system bugs or errors', '#FF8C00'),
    ('feature', 'New feature requests or enhancements', '#008000'),
    ('question', 'General questions or inquiries', '#0000FF'),
    ('documentation', 'Documentation related items', '#800080')
  ) AS system_tags(name, description, color)
ON CONFLICT (organization_id, name) DO NOTHING; 
