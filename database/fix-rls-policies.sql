-- SUPABASE SQL EDITOR'DE ÇALIŞTIRIN

-- 1. Company ID fonksiyonu oluştur
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Products tablosu için policy'leri düzelt
DROP POLICY IF EXISTS "products_user_company" ON products;

-- SELECT için
CREATE POLICY "products_select_company" 
ON products FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

-- INSERT için - company_id otomatik doldurulsun
CREATE POLICY "products_insert_company" 
ON products FOR INSERT 
TO authenticated 
WITH CHECK (
  company_id = auth.company_id() 
  OR company_id IS NULL -- NULL ise trigger/default dolduracak
);

-- UPDATE için
CREATE POLICY "products_update_company" 
ON products FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

-- DELETE için
CREATE POLICY "products_delete_company" 
ON products FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- 3. Default value ekle (opsiyonel)
ALTER TABLE products 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- 4. Diğer tablolar için de aynı işlemi yap
-- Customers
DROP POLICY IF EXISTS "customers_user_company" ON customers;

CREATE POLICY "customers_select_company" 
ON customers FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "customers_insert_company" 
ON customers FOR INSERT 
TO authenticated 
WITH CHECK (
  company_id = auth.company_id() 
  OR company_id IS NULL
);

CREATE POLICY "customers_update_company" 
ON customers FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "customers_delete_company" 
ON customers FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

ALTER TABLE customers 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- 5. Stock movements için
DROP POLICY IF EXISTS "stock_movements_user_company" ON stock_movements;

CREATE POLICY "stock_movements_select_company" 
ON stock_movements FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "stock_movements_insert_company" 
ON stock_movements FOR INSERT 
TO authenticated 
WITH CHECK (
  company_id = auth.company_id() 
  OR company_id IS NULL
);

CREATE POLICY "stock_movements_update_company" 
ON stock_movements FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "stock_movements_delete_company" 
ON stock_movements FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

ALTER TABLE stock_movements 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- 6. Account movements için
DROP POLICY IF EXISTS "account_movements_user_company" ON account_movements;

CREATE POLICY "account_movements_select_company" 
ON account_movements FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "account_movements_insert_company" 
ON account_movements FOR INSERT 
TO authenticated 
WITH CHECK (
  company_id = auth.company_id() 
  OR company_id IS NULL
);

CREATE POLICY "account_movements_update_company" 
ON account_movements FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "account_movements_delete_company" 
ON account_movements FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

ALTER TABLE account_movements 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();
