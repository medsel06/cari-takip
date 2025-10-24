-- Email Onaylama Sorunu Çözümü
-- Supabase SQL Editor'de çalıştırın

-- 1. Onaylanmamış kullanıcıları görüntüle
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email_confirmed_at IS NULL;

-- 2. TÜM kullanıcıları onayla (Development için)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 3. Belirli bir kullanıcıyı onayla
-- UPDATE auth.users
-- SET email_confirmed_at = NOW()
-- WHERE email = 'kullanici@email.com';

-- 4. Sonucu kontrol et
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;