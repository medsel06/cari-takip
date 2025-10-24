-- Add risk_level column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'normal' 
CHECK (risk_level IN ('normal', 'risky', 'blocked'));

-- Add index for risk_level
CREATE INDEX IF NOT EXISTS idx_customers_risk_level ON customers(risk_level);

-- Add comment
COMMENT ON COLUMN customers.risk_level IS 'Customer risk level: normal, risky, or blocked';

-- Update existing records to have default value
UPDATE customers 
SET risk_level = 'normal' 
WHERE risk_level IS NULL;