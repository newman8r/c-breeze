-- Add created_by_ai flag to customers table
ALTER TABLE customers 
ADD COLUMN created_by_ai BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN customers.created_by_ai IS 'Indicates if this customer was automatically created by AI';

-- Create an index for efficient filtering
CREATE INDEX idx_customers_created_by_ai ON customers(created_by_ai); 