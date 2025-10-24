-- RLS Sorun Tespiti
-- Supabase SQL Editor'de çalıştırın

-- 1. Hangi kullanıcı ile giriş yaptığınızı kontrol edin
SELECT 
    auth.uid() as current_user_id,
    u.email,
    u.company_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = auth.uid();

-- 2. Bu kullanıcının görebileceği ürünleri kontrol edin
SELECT 
    p.id,
    p.name,
    p.company_id,
    c.name as company_name
FROM products p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
);

-- 3. RLS politikalarını kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('products', 'customers', 'stock_movements', 'companies', 'users')
ORDER BY tablename, policyname;