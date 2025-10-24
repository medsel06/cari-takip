-- ÖNEMLİ: Bu SQL'i Supabase SQL Editor'de çalıştırın

-- 1. Önce mevcut durumu kontrol edelim
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    u.id as user_id,
    u.email as user_email,
    u.full_name,
    u.company_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.created_at DESC;

-- 2. auth.users'da olan ama public.users'da olmayan kayıtları bulalım
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as full_name
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
);

-- 3. Eksik kayıtları ekleyelim
INSERT INTO public.users (id, email, full_name, company_id, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    NULL as company_id,
    'admin' as role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 4. Otomatik senkronizasyon için trigger oluşturalım
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Yeni kullanıcıyı public.users tablosuna ekle
    INSERT INTO public.users (id, email, full_name, company_id, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        NULL, -- İlk kayıtta company_id NULL
        'admin' -- İlk kullanıcı admin
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger'ı oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Email update trigger'ı (kullanıcı email'ini değiştirirse)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
    UPDATE public.users 
    SET 
        email = new.email,
        full_name = COALESCE(new.raw_user_meta_data->>'full_name', public.users.full_name)
    WHERE id = new.id;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 7. Users tablosunda email UNIQUE constraint'ini kontrol et
-- Eğer duplicate email varsa önce temizle
SELECT email, COUNT(*) 
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 8. Eğer duplicate yoksa, UNIQUE constraint ekle (yoksa)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_email_key;

ALTER TABLE public.users 
ADD CONSTRAINT users_email_unique UNIQUE (email);
