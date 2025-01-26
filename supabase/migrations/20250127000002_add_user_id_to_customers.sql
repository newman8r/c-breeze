-- Add user_id to customers
ALTER TABLE customers
  ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for user_id
CREATE INDEX customers_user_id_idx ON customers(user_id);

-- Update RLS policies for customers to use user_id
DROP POLICY IF EXISTS "Customers can view their own data" ON customers;
DROP POLICY IF EXISTS "Employees can view organization customers" ON customers;

CREATE POLICY "Customers can view their own data"
  ON customers FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Employees can view organization customers"
  ON customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE user_id = auth.uid()
    )
  ); 