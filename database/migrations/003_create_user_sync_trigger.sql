-- ALSE Users Tablosu Otomatik Senkronizasyon
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- 1. Mevcut durumu kontrol ettik ✅ (Tüm kullanıcılar senkron)

-- 2. Otomatik senkronizasyon için trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Yeni kullanıcıyı public.users tablosuna ekle
    INSERT INTO public.users (id, email, full_name, company_id, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        NULL, -- İlk kayıtta company_id NULL (firma kurulum sayfasında doldurulacak)
        'admin' -- İlk kullanıcı admin
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Email güncelleme durumu için trigger
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger AS $$
BEGIN
    -- Email değişikliğini public.users tablosuna yansıt
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
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- 5. Email UNIQUE constraint kontrolü
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_email_key;

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_email_unique;

ALTER TABLE public.users 
ADD CONSTRAINT users_email_unique UNIQUE (email);

-- 6. Test: Trigger'ın çalıştığını kontrol etmek için
-- (Bu sadece test amaçlıdır, production'da kullanmayın)
/*
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- Test kullanıcısı oluştur
    INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    VALUES (
        test_user_id,
        'trigger_test_' || test_user_id || '@test.com',
        '{"full_name": "Trigger Test User"}'::jsonb,
        NOW(),
        NOW()
    );
    
    -- public.users'da olup olmadığını kontrol et
    IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
        RAISE NOTICE 'Trigger başarılı! Test kullanıcısı public.users tablosuna eklendi.';
        -- Test kullanıcısını sil
        DELETE FROM auth.users WHERE id = test_user_id;
    ELSE
        RAISE WARNING 'Trigger çalışmadı! Kullanıcı public.users tablosunda yok.';
    END IF;
END $$;
*/

-- 7. Başarı mesajı
SELECT 'Trigger başarıyla oluşturuldu! Artık yeni kayıtlar otomatik senkronize edilecek.' as message;