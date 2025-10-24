-- SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Multi-tenant RLS için Database Function + Default Value Çözümü

-- ========================================
-- 1. Company ID'yi döndüren güvenli fonksiyon
-- ========================================
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  -- Kullanıcının company_id'sini al
  SELECT u.company_id INTO company_id
  FROM public.users u
  WHERE u.id = auth.uid();
  
  -- Eğer company_id bulunamazsa hata fırlat
  IF company_id IS NULL THEN
    RAISE EXCEPTION 'No company_id found for user %', auth.uid();
  END IF;
  
  RETURN company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Fonksiyona public erişim ver
GRANT EXECUTE ON FUNCTION auth.company_id() TO authenticated;

-- ========================================
-- 2. Tablolarda Default Value Ayarla
-- ========================================

-- Products tablosu
ALTER TABLE public.products 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Customers tablosu
ALTER TABLE public.customers 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Stock movements tablosu
ALTER TABLE public.stock_movements 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Account movements tablosu
ALTER TABLE public.account_movements 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Checks tablosu
ALTER TABLE public.checks 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Cash accounts tablosu (varsa)
ALTER TABLE public.cash_accounts 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- Cash movements tablosu (varsa)
ALTER TABLE public.cash_movements 
ALTER COLUMN company_id 
SET DEFAULT auth.company_id();

-- ========================================
-- 3. RLS Policy'lerini Güncelle
-- ========================================

-- PRODUCTS tablosu için
DROP POLICY IF EXISTS "products_user_company" ON products;

-- SELECT policy
CREATE POLICY "Enable read for company users" 
ON products FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

-- INSERT policy - company_id kontrolü yok çünkü default value ile doldurulacak
CREATE POLICY "Enable insert for company users" 
ON products FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Default value kullanılacağı için true

-- UPDATE policy
CREATE POLICY "Enable update for company users" 
ON products FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id()); -- company_id değiştirilemesin

-- DELETE policy
CREATE POLICY "Enable delete for company users" 
ON products FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- CUSTOMERS tablosu için
DROP POLICY IF EXISTS "customers_user_company" ON customers;

CREATE POLICY "Enable read for company users" 
ON customers FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "Enable insert for company users" 
ON customers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for company users" 
ON customers FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Enable delete for company users" 
ON customers FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- STOCK_MOVEMENTS tablosu için
DROP POLICY IF EXISTS "stock_movements_user_company" ON stock_movements;

CREATE POLICY "Enable read for company users" 
ON stock_movements FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "Enable insert for company users" 
ON stock_movements FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for company users" 
ON stock_movements FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Enable delete for company users" 
ON stock_movements FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- ACCOUNT_MOVEMENTS tablosu için
DROP POLICY IF EXISTS "account_movements_user_company" ON account_movements;

CREATE POLICY "Enable read for company users" 
ON account_movements FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "Enable insert for company users" 
ON account_movements FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for company users" 
ON account_movements FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Enable delete for company users" 
ON account_movements FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- CHECKS tablosu için
DROP POLICY IF EXISTS "checks_user_company" ON checks;

CREATE POLICY "Enable read for company users" 
ON checks FOR SELECT 
TO authenticated 
USING (company_id = auth.company_id());

CREATE POLICY "Enable insert for company users" 
ON checks FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for company users" 
ON checks FOR UPDATE 
TO authenticated 
USING (company_id = auth.company_id())
WITH CHECK (company_id = auth.company_id());

CREATE POLICY "Enable delete for company users" 
ON checks FOR DELETE 
TO authenticated 
USING (company_id = auth.company_id());

-- ========================================
-- 4. Test için kontrol sorguları
-- ========================================

-- Fonksiyonun çalıştığını test et (SQL Editor'de authenticated olarak çalıştırın)
SELECT auth.company_id();

-- Default value'ların ayarlandığını kontrol et
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'company_id'
    AND table_name IN ('products', 'customers', 'stock_movements', 'account_movements', 'checks')
ORDER BY table_name;

-- Policy'lerin oluşturulduğunu kontrol et
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('products', 'customers', 'stock_movements', 'account_movements', 'checks')
ORDER BY tablename, policyname;
