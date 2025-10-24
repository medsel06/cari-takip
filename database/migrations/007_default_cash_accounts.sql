-- Varsayılan kasa hesapları oluşturma
-- Her şirket için otomatik olarak bir merkez kasa ve banka hesabı oluşturur

-- Mevcut fonksiyonu kaldır
DROP FUNCTION IF EXISTS create_default_cash_accounts() CASCADE;

-- Yeni şirket oluşturulduğunda varsayılan hesapları oluşturan fonksiyon
CREATE OR REPLACE FUNCTION create_default_cash_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Merkez Kasa
    INSERT INTO cash_accounts (
        company_id,
        account_code,
        account_name,
        account_type,
        currency,
        balance,
        opening_balance,
        is_active,
        created_by
    ) VALUES (
        NEW.id,
        'KASA-001',
        'Merkez Kasa',
        'cash',
        'TRY',
        0,
        0,
        true,
        NEW.created_by
    );
    
    -- Ana Banka Hesabı
    INSERT INTO cash_accounts (
        company_id,
        account_code,
        account_name,
        account_type,
        currency,
        balance,
        opening_balance,
        is_active,
        created_by,
        bank_name,
        branch_name
    ) VALUES (
        NEW.id,
        'BANKA-001',
        'Ana Banka Hesabı',
        'bank',
        'TRY',
        0,
        0,
        true,
        NEW.created_by,
        'Banka Adı',
        'Şube Adı'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_create_default_cash_accounts ON companies;
CREATE TRIGGER trigger_create_default_cash_accounts
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION create_default_cash_accounts();

-- Mevcut şirketler için varsayılan hesapları oluştur (eğer yoksa)
INSERT INTO cash_accounts (
    company_id,
    account_code,
    account_name,
    account_type,
    currency,
    balance,
    opening_balance,
    is_active
)
SELECT 
    c.id,
    'KASA-001',
    'Merkez Kasa',
    'cash',
    'TRY',
    0,
    0,
    true
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM cash_accounts ca 
    WHERE ca.company_id = c.id 
    AND ca.account_type = 'cash'
    AND ca.account_code = 'KASA-001'
);

INSERT INTO cash_accounts (
    company_id,
    account_code,
    account_name,
    account_type,
    currency,
    balance,
    opening_balance,
    is_active,
    bank_name,
    branch_name
)
SELECT 
    c.id,
    'BANKA-001',
    'Ana Banka Hesabı',
    'bank',
    'TRY',
    0,
    0,
    true,
    'Banka Adı',
    'Şube Adı'
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM cash_accounts ca 
    WHERE ca.company_id = c.id 
    AND ca.account_type = 'bank'
    AND ca.account_code = 'BANKA-001'
);