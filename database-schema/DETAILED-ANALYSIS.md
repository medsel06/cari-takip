# Veritabanı Tam Analiz Raporu

**Tarih:** 2025-10-30
**Veritabanı:** cari-takip (Supabase)

---

## 📊 GENEL ÖZET

- **Toplam Tablo:** 18 adet
- **Toplam Sütun:** 146 adet
- **Foreign Key:** 47 ilişki
- **RLS Policy:** 25 güvenlik kuralı
- **İndeks:** 42 adet

---

## 🗂️ TABLO YAPISI VE İLİŞKİLER

### 1. **companies** (Şirketler) - MERKEZİ TABLO
**Sütunlar:** id, name, tax_number, phone, email, address, city, created_at, updated_at
**Kayıt:** 5

**Bağlı Tablolar (CASCADE DELETE):**
- users (kullanıcılar)
- customers (cariler)
- products (ürünler)
- invoices (faturalar)
- stock_movements (stok hareketleri)
- account_movements (cari hareketler)
- checks (çekler)
- cash_accounts (kasa/banka)
- cash_movements (nakit hareketler)
- company_settings (ayarlar)
- expense_categories (gider kategorileri)
- expense_invoices (gider faturaları)
- income_expense_categories (gelir/gider kategorileri)
- income_expenses (gelir/gider kayıtları)

---

### 2. **users** (Kullanıcılar)
**Sütunlar:** id, company_id, email, full_name, role, is_active, created_at, updated_at
**Kayıt:** 4

**İlişkiler:**
- → companies (FK: company_id)
- ← Tüm tablolardaki created_by alanları

**RLS Policy:**
- Service role tam erişim
- Kullanıcılar kendi profilini güncelleyebilir
- Kullanıcılar şirket kullanıcılarını görebilir

---

### 3. **customers** (Cariler)
**Sütunlar:** id, company_id, code, name, type, phone, email, address, city, tax_number, tax_office, balance, credit_limit, risk_level, is_active, created_by, created_at, updated_at
**Kayıt:** 7

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → users (FK: created_by)
- ← account_movements (cari hareketler)
- ← stock_movements (stok hareketleri)
- ← checks (çekler - 3 farklı ilişki: customer, drawer, endorser)
- ← invoices (faturalar)
- ← income_expenses (gelir/gider)
- ← cash_movements (nakit hareketler)

**Unique Constraint:** company_id + code (şirket içinde kod unique)

**İndeksler:**
- idx_customers_company
- idx_customers_type (company_id, type)

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 4. **products** (Ürünler)
**Sütunlar:** id, company_id, code, name, description, barcode, unit, product_type, category, current_stock, min_stock, max_stock, purchase_price, sale_price, tax_rate, is_active, created_by, created_at, updated_at
**Kayıt:** 4

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → users (FK: created_by)
- ← stock_movements (stok hareketleri)
- ← invoice_items (fatura kalemleri)

**Unique Constraint:** company_id + code

**İndeksler:**
- idx_products_company
- idx_products_code (company_id, code)

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 5. **invoices** (Faturalar)
**Sütunlar:** id, company_id, customer_id, invoice_no, invoice_date, invoice_type, status, subtotal, tax_amount, total_amount, payment_status, due_date, notes, created_by, created_at, updated_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → customers (FK: customer_id)
- → users (FK: created_by)
- ← invoice_items (fatura kalemleri, CASCADE DELETE)
- ← income_expenses (gelir/gider)

**Unique Constraint:** company_id + invoice_no

**İndeksler:**
- idx_invoices_customer
- idx_invoices_date

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 6. **invoice_items** (Fatura Kalemleri)
**Sütunlar:** id, invoice_id, product_id, quantity, unit_price, tax_rate, tax_amount, total_amount, description
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → invoices (FK: invoice_id, CASCADE DELETE)
- → products (FK: product_id)

**RLS Policy:**
- Faturanın şirketine göre erişim (invoice üzerinden)

---

### 7. **stock_movements** (Stok Hareketleri)
**Sütunlar:** id, company_id, product_id, customer_id, movement_type, movement_subtype, quantity, unit_price, total_price, description, reference_no, movement_date, created_by, created_at
**Kayıt:** 9

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → products (FK: product_id)
- → customers (FK: customer_id)
- → users (FK: created_by)

**İndeksler:**
- idx_stock_movements_product
- idx_stock_movements_date

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 8. **account_movements** (Cari Hareketler)
**Sütunlar:** id, company_id, customer_id, movement_type, amount, description, document_type, document_no, due_date, is_paid, paid_amount, payment_date, created_by, created_at, payment_method
**Kayıt:** 22

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → customers (FK: customer_id)
- → users (FK: created_by)

**İndeksler:**
- idx_account_movements_customer

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 9. **checks** (Çekler)
**Sütunlar:** id, company_id, customer_id, check_number, bank_name, branch_name, account_number, amount, due_date, status, type, endorsement_date, collection_date, description, created_by, created_at, updated_at, endorsement_to, endorser, drawer_name, drawer_id, branch_code, currency, issue_date, return_date, return_reason
**Kayıt:** 4

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → customers (FK: customer_id) - Çeki veren/alan cari
- → customers (FK: drawer_id) - Keşideci
- → customers (FK: endorser) - Ciro eden
- → users (FK: created_by)
- ← check_endorsements (çek ciro kayıtları)

**İndeksler:**
- idx_checks_drawer
- idx_checks_endorser
- idx_checks_due_date
- idx_checks_status

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 10. **check_endorsements** (Çek Ciro Kayıtları)
**Sütunlar:** id, check_id, from_customer_id, to_customer_id, endorsement_date, notes, created_by, created_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → checks (FK: check_id)
- → customers (FK: from_customer_id) - Ciroyu yapan
- → customers (FK: to_customer_id) - Ciroyu alan
- → users (FK: created_by)

---

### 11. **cash_accounts** (Kasa/Banka Hesapları)
**Sütunlar:** id, company_id, account_name, account_type, currency, balance, bank_name, branch_name, account_number, iban, is_active, created_at, updated_at, account_code, opening_balance, account_no, branch_code, created_by
**Kayıt:** 2

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → users (FK: created_by)
- ← cash_movements (nakit hareketler)

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 12. **cash_movements** (Nakit Hareketler)
**Sütunlar:** id, company_id, account_id, movement_type, amount, description, reference_no, related_document_type, related_document_id, movement_date, created_by, created_at, movement_no, category, customer_id, payment_method, document_no, currency, exchange_rate
**Kayıt:** 7

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → cash_accounts (FK: account_id)
- → customers (FK: customer_id)
- → users (FK: created_by)

**RLS Policy (5 adet):**
- SELECT: Şirket hareketlerini görüntüleme
- INSERT: Şirket için ekleme
- UPDATE: Şirket hareketlerini güncelleme
- DELETE: Şirket hareketlerini silme
- ALL: Genel şirket erişimi

---

### 13. **income_expenses** (Gelir/Gider Kayıtları)
**Sütunlar:** id, company_id, category_id, customer_id, invoice_id, transaction_type, amount, description, transaction_date, payment_method, reference_no, created_by, created_at, updated_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → income_expense_categories (FK: category_id)
- → customers (FK: customer_id, opsiyonel)
- → invoices (FK: invoice_id, opsiyonel)
- → users (FK: created_by)

**İndeksler:**
- idx_income_expenses_date

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 14. **income_expense_categories** (Gelir/Gider Kategorileri)
**Sütunlar:** id, company_id, parent_id, code, name, type, description, is_active, created_at, updated_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → income_expense_categories (FK: parent_id) - Hiyerarşik yapı
- ← income_expenses

**Unique Constraint:** company_id + code + type

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 15. **expense_invoices** (Gider Faturaları)
**Sütunlar:** id, company_id, category_id, expense_no, expense_date, vendor_name, vendor_tax_number, amount, tax_amount, total_amount, description, payment_status, created_by, created_at, updated_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → expense_categories (FK: category_id)
- → users (FK: created_by)

**Unique Constraint:** company_id + expense_no

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 16. **expense_categories** (Gider Kategorileri)
**Sütunlar:** id, company_id, parent_id, category_code, category_name, description, is_active, created_at, updated_at
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)
- → expense_categories (FK: parent_id) - Hiyerarşik
- ← expense_invoices

**Unique Constraint:** company_id + category_code

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 17. **company_settings** (Şirket Ayarları)
**Sütunlar:** id, company_id (unique), ayarlar...
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → companies (FK: company_id, CASCADE DELETE)

**Unique Constraint:** company_id (her şirketin 1 ayar kaydı)

**RLS Policy:**
- Şirket kullanıcıları tüm işlemleri yapabilir

---

### 18. **user_permissions** (Kullanıcı Yetkileri)
**Sütunlar:** id, user_id, module, permissions...
**Kayıt:** Bilinmiyor

**İlişkiler:**
- → users (FK: user_id, CASCADE DELETE)

**Unique Constraint:** user_id + module

**RLS Policy:**
- Service role tam erişim
- Kullanıcılar kendi yetkilerini görebilir

---

## 🔐 GÜVENLİK (RLS) YAPISI

**Ana Güvenlik Fonksiyonu:** `get_user_company_id()`
- Tüm policy'ler bu fonksiyonu kullanır
- Kullanıcının company_id'sini döndürür
- Multi-tenant yapı sağlar

**Policy Kuralları:**
1. **companies:** Sadece kendi şirketini görebilir
2. **users:** Şirket kullanıcılarını görebilir, kendi profilini düzenleyebilir
3. **Diğer tüm tablolar:** Şirket kullanıcıları ALL (SELECT, INSERT, UPDATE, DELETE)

**Özel Durumlar:**
- **service_role:** companies ve users tablolarında tam erişim
- **invoice_items:** invoice üzerinden şirket kontrolü

---

## 📈 PERFORMANS (İndeksler)

**Kritik İndeksler:**
1. **customers:** company_id, type (müşteri/tedarikçi ayrımı)
2. **products:** company_id, code (ürün arama)
3. **invoices:** customer_id, invoice_date (fatura sorgulama)
4. **stock_movements:** product_id, movement_date (stok takip)
5. **checks:** drawer_id, endorser, due_date, status (çek yönetimi)
6. **account_movements:** customer_id (cari ekstresi)
7. **income_expenses:** transaction_date (tarih bazlı raporlar)

**Unique Constraints:**
- Her şirkette kod/numara tekrar edemez (company_id + code/no)
- Email unique (users.email)
- user_permissions: user + module unique

---

## 🔄 VERİ AKIŞI

### Satış Süreci:
1. **Invoice oluştur** → invoices
2. **Ürün ekle** → invoice_items
3. **Stok düş** → stock_movements (OUT)
4. **Cari borç** → account_movements (DEBT)
5. **Nakit tahsilat** → cash_movements + account_movements güncelle

### Alım Süreci:
1. **Alış faturası** → expense_invoices veya invoices
2. **Stok artır** → stock_movements (IN)
3. **Cari alacak** → account_movements (CREDIT)
4. **Ödeme** → cash_movements

### Çek Süreci:
1. **Çek al/ver** → checks
2. **Ciro et** → check_endorsements + checks güncelle
3. **Tahsil et** → checks.status = 'collected'

---

## ⚠️ ÖNEMLİ NOKTALAR

1. **CASCADE DELETE:**
   - companies silince TÜM veri silinir
   - invoice silince invoice_items silinir
   - user silince user_permissions silinir

2. **Balance Hesaplamaları:**
   - customers.balance manuel mi yoksa hesaplanmış mı?
   - cash_accounts.balance güncel mi?

3. **Boş Tablolar:**
   - sales, purchases, stocks tabloları boş (kullanılmıyor mu?)
   - categories tablosu boş

4. **Hiyerarşik Yapılar:**
   - expense_categories (parent_id)
   - income_expense_categories (parent_id)

---

Bu rapor ile Excel import stratejinizi oluşturabiliriz! 🚀
