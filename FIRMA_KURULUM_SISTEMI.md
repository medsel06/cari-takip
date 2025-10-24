# 🚀 ALSE Firma Kurulum Sistemi - Yapılan Değişiklikler

## ✅ TAMAMLANAN İŞLER

### 1. **Veritabanı Güncellemeleri**
   - ✅ `companies` tablosuna eksik kolonlar eklendi
   - ✅ Migration dosyası oluşturuldu: `database/migrations/001_update_companies_table.sql`

### 2. **Middleware Güncellemesi** 
   - ✅ Kullanıcı giriş kontrolü eklendi
   - ✅ Company kontrolü eklendi
   - ✅ Firma yoksa ayarlara otomatik yönlendirme

### 3. **Register Sayfası Düzeltmesi**
   - ✅ Sadece kullanıcı kaydı yapıyor (company oluşturmuyor)
   - ✅ `company_id` NULL olarak kaydediyor
   - ✅ Modern UI tasarımı

### 4. **Ayarlar Sayfası - İlk Kurulum Modu**
   - ✅ İlk kurulum için özel UI
   - ✅ Basit form ile firma oluşturma
   - ✅ Başarılı kurulum sonrası dashboard'a yönlendirme

## 📋 KULLANIM AKIŞI

```
1. Yeni kullanıcı kayıt olur → company_id NULL
2. Login yapar → Middleware kontrol eder
3. Firma yoksa → /ayarlar?setup=true'ya yönlendirilir
4. Firma bilgilerini girer
5. Kaydet'e basar → Firma oluşturulur + Kullanıcı bağlanır
6. Dashboard'a yönlendirilir → Sistem hazır!
```

## 🛠️ YAPMAINIZ GEREKENLER

### 1. **Veritabanı Migration'ı Çalıştırın**

Supabase SQL Editor'de şu komutu çalıştırın:

```sql
-- Companies tablosuna eksik kolonları ekle
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS tax_number TEXT,
ADD COLUMN IF NOT EXISTS tax_office TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'retail',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'FTR',
ADD COLUMN IF NOT EXISTS invoice_series TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS last_invoice_no INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS e_invoice_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS e_invoice_username TEXT,
ADD COLUMN IF NOT EXISTS e_invoice_password TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'tr',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS stock_tracking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS negative_stock_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_backup BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_alert BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS due_payment_alert BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_days_before INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Update trigger ekle (eğer fonksiyon yoksa önce onu oluştur)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger oluştur
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. **Test Adımları**

```bash
# 1. Projeyi başlatın
npm run dev

# 2. Yeni bir kullanıcı ile test edin:
- /register'a gidin
- Yeni hesap oluşturun
- Login olun
- Otomatik olarak ayarlara yönlendirileceksiniz
- Firma bilgilerini girin
- Kaydet'e basın
- Dashboard'a yönlendirileceksiniz
```

### 3. **Mevcut Kullanıcılar İçin**

Eğer mevcut kullanıcılar varsa ve company_id'leri NULL ise:
- Login olduklarında otomatik olarak ayarlara yönlendirilecekler
- Firma bilgilerini girip sistemi kullanmaya başlayabilecekler

## 🐛 SORUN GİDERME

### Sorun: "Ayarlar sayfası kaydetmiyor"
**Çözüm:** 
- Supabase'de companies tablosunun güncellendiğinden emin olun
- RLS politikalarını kontrol edin (gerekirse geçici olarak kapatın)
- Network sekmesinden hata mesajlarını kontrol edin

### Sorun: "Middleware çalışmıyor"
**Çözüm:**
- Next.js sunucusunu yeniden başlatın
- .env.local dosyasında Supabase anahtarlarının doğru olduğundan emin olun

### Sorun: "Register'da hata alıyorum"
**Çözüm:**
- Supabase Auth ayarlarını kontrol edin
- Email onayı kapalı olmalı (development için)

## 🎯 SONUÇ

Artık sisteminizde:
- ✅ Kullanıcılar kayıt olabiliyor
- ✅ İlk girişte firma kurulumu zorunlu
- ✅ Firma kurulduktan sonra sistem kullanılabiliyor
- ✅ Güvenli ve profesyonel bir akış var

## 📞 DESTEK

Herhangi bir sorun yaşarsanız:
1. Önce migration'ı çalıştırdığınızdan emin olun
2. Browser console'u kontrol edin
3. Network sekmesinden API hatalarını inceleyin
4. Supabase logs'larını kontrol edin

---
**Hazırlayan:** Claude AI Assistant
**Tarih:** ${new Date().toLocaleDateString('tr-TR')}
