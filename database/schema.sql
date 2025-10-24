-- Şirketler Tablosu
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Kullanıcılar Tablosu
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ürünler Tablosu
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'Adet',
  current_stock DECIMAL(15,2) DEFAULT 0,
  min_stock DECIMAL(15,2) DEFAULT 0,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  sale_price DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(company_id, code)
);

-- Stok Hareketleri Tablosu
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  movement_subtype TEXT, -- 'purchase', 'sale', 'return', 'adjustment'
  quantity DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),
  description TEXT,
  reference_no TEXT, -- Fatura no, irsaliye no vs.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cariler (Müşteri/Tedarikçi) Tablosu
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'customer' CHECK (type IN ('customer', 'supplier', 'both')),
  phone TEXT,
  mobile TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  tax_office TEXT,
  tax_number TEXT,
  authorized_person TEXT,
  balance DECIMAL(15,2) DEFAULT 0,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(company_id, code)
);

-- Cari Hareketler Tablosu
CREATE TABLE account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('DEBT', 'CREDIT')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  document_type TEXT, -- 'invoice', 'payment', 'check', etc.
  document_no TEXT,
  due_date DATE,
  is_paid BOOLEAN DEFAULT false,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Çekler Tablosu
CREATE TABLE checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  check_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT,
  account_number TEXT,
  drawer_name TEXT, -- Keşideci
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'portfolio' CHECK (status IN (
    'portfolio', -- Portföyde
    'collected', -- Tahsil edildi
    'returned',  -- İade/Karşılıksız
    'endorsed',  -- Ciro edildi
    'in_bank'    -- Bankaya verildi
  )),
  type TEXT NOT NULL CHECK (type IN ('received', 'issued')), -- Alınan/Verilen
  description TEXT,
  endorsement_date DATE, -- Ciro tarihi
  endorsement_to TEXT,   -- Kime ciro edildi
  collection_date DATE,  -- Tahsil tarihi
  return_date DATE,      -- İade tarihi
  return_reason TEXT,    -- İade nedeni
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- INDEXES
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_account_movements_customer ON account_movements(customer_id);
CREATE INDEX idx_account_movements_date ON account_movements(created_at);
CREATE INDEX idx_checks_company ON checks(company_id);
CREATE INDEX idx_checks_status ON checks(status);
CREATE INDEX idx_checks_due_date ON checks(due_date);

-- RLS (Row Level Security) Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Products policies
CREATE POLICY "Users can view their company products" ON products
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create products for their company" ON products
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company products" ON products
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Similar policies for other tables...

-- Helper Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checks_updated_at BEFORE UPDATE ON checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update product stock after movement
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'IN' THEN
    UPDATE products 
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.product_id;
  ELSE
    UPDATE products 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_on_movement
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Function to update customer balance after account movement
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'DEBT' THEN
    UPDATE customers 
    SET balance = balance + NEW.amount
    WHERE id = NEW.customer_id;
  ELSE
    UPDATE customers 
    SET balance = balance - NEW.amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_balance_on_movement
AFTER INSERT ON account_movements
FOR EACH ROW EXECUTE FUNCTION update_customer_balance();