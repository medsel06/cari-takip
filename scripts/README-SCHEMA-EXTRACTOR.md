# Veritabanı Şema Çıkarıcı

Bu klasörde Supabase veritabanınızın tüm şema bilgilerini çıkarmak için 3 farklı yöntem bulunmaktadır.

## 📋 İçindekiler

- [Yöntem 1: SQL Sorguları (En Kolay)](#yöntem-1-sql-sorguları-en-kolay)
- [Yöntem 2: Node.js Script (Basit)](#yöntem-2-nodejs-script-basit)
- [Yöntem 3: TypeScript Script (Detaylı)](#yöntem-3-typescript-script-detaylı)

---

## Yöntem 1: SQL Sorguları (En Kolay) ⭐ ÖNERİLEN

### Adımlar:

1. **Supabase Dashboard'a gidin**
   - https://supabase.com/dashboard
   - Projenizi seçin

2. **SQL Editor'ü açın**
   - Sol menüden "SQL Editor" seçeneğine tıklayın
   - "New Query" ile yeni bir sorgu oluşturun

3. **SQL sorgularını çalıştırın**
   - `database-queries.sql` dosyasını açın
   - İstediğiniz sorguyu kopyalayıp SQL Editor'e yapıştırın
   - "Run" butonuna tıklayın
   - Sonuçları CSV olarak indirin

### Örnek Sorgular:

#### Tüm Tabloları Listele:
```sql
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

#### Tablo Sütunlarını Göster:
```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

#### Foreign Key İlişkilerini Göster:
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

#### RLS Policy'lerini Göster:
```sql
SELECT
  tablename,
  policyname,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Yöntem 2: Node.js Script (Basit)

### Gereksinimler:
- Node.js kurulu olmalı
- `.env` dosyanızda Supabase bilgileri olmalı

### Adımlar:

1. **Dependencies'leri yükleyin:**
```bash
npm install
```

2. **.env dosyanızı kontrol edin:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# veya
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. **Script'i çalıştırın:**
```bash
node scripts/extract-schema.js
```

4. **Sonuçlar:**
   - `database-schema/schema-YYYY-MM-DD.json` - JSON formatında
   - `database-schema/schema-YYYY-MM-DD.md` - Markdown rapor

---

## Yöntem 3: TypeScript Script (Detaylı)

### Gereksinimler:
- Node.js ve TypeScript kurulu olmalı
- `.env` dosyanızda **SERVICE_ROLE_KEY** olmalı (anon key yeterli değil)

### Adımlar:

1. **Script'i derleyin:**
```bash
npx tsx scripts/extract-database-schema.ts
```

veya

```bash
npm run extract-schema
```

2. **Sonuçlar:**
   - Tüm tablolar ve sütunlar
   - Foreign key ilişkileri
   - İndeksler
   - RLS Policy'leri
   - Fonksiyonlar
   - Trigger'lar
   - View'lar
   - Enum'lar
   - Sequence'lar

---

## 📊 Çıkan Veriler

### JSON Çıktısı:
```json
{
  "extracted_at": "2025-10-30T10:30:00.000Z",
  "tables": [
    {
      "name": "customers",
      "row_count": 150,
      "columns": ["id", "name", "email", "created_at"]
    }
  ],
  "foreignKeys": [...],
  "indexes": [...],
  "policies": [...],
  "functions": [...],
  "triggers": [...],
  "views": [...],
  "enums": [...]
}
```

### Markdown Raporu:
Okunabilir, dokümantasyon formatında rapor

---

## 🔒 Güvenlik Notu

- **SERVICE_ROLE_KEY'i asla paylaşmayın!**
- **`.env` dosyasını git'e eklemeyin!**
- Schema bilgilerini güvenli bir yerde saklayın

---

## 💡 İpuçları

### En hızlı yöntem:
SQL sorgularını doğrudan Supabase SQL Editor'de çalıştırın.

### En detaylı yöntem:
TypeScript script'ini kullanın (tüm metadata dahil).

### Sadece tablo listesi istiyorsanız:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### Tablo boyutlarını görmek için:
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

---

## 🆘 Sorun Giderme

### "exec_sql fonksiyonu bulunamadı" hatası:
SQL sorgularını doğrudan SQL Editor'de çalıştırın.

### "Permission denied" hatası:
SERVICE_ROLE_KEY kullandığınızdan emin olun (anon key yeterli değil).

### "Table not found" hatası:
Tablo adını ve schema'yı kontrol edin (çoğu tablo 'public' schema'dadır).

---

## 📚 Ek Kaynaklar

- [Supabase SQL Editor Docs](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL Information Schema](https://www.postgresql.org/docs/current/information-schema.html)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)

---

**Oluşturma Tarihi:** 30 Ekim 2025
**Versiyon:** 1.0.0
