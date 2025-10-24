-- e-Fatura ayarları için company_settings tablosu
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Uyumsoft API ayarları
  uyumsoft_username TEXT,
  uyumsoft_password TEXT,
  uyumsoft_base_url TEXT DEFAULT 'https://efatura-test.uyumsoft.com.tr',
  is_test_mode BOOLEAN DEFAULT true,
  api_type TEXT DEFAULT 'SOAP', -- REST veya SOAP
  
  -- e-Fatura ayarları
  e_invoice_enabled BOOLEAN DEFAULT false,
  default_scenario TEXT DEFAULT 'TICARIFATURA',
  gb_ettn_prefix TEXT DEFAULT 'GIB',
  pk_ettn_prefix TEXT DEFAULT 'PK',
  
  -- Diğer ayarlar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  UNIQUE(company_id)
);

-- İndex
CREATE INDEX idx_company_settings_company ON company_settings(company_id);

-- RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company settings" ON company_settings
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company settings" ON company_settings
  FOR UPDATE USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their company settings" ON company_settings
  FOR INSERT WITH CHECK (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));