-- Çek tahsilat durumu güncellendiğinde çalışacak trigger
-- Bu trigger çek durumu "collected" olduğunda otomatik nakit hareketi oluşturur

-- Önce mevcut trigger'ı kaldır (varsa)
DROP TRIGGER IF EXISTS trigger_cash_movement_on_check_collection ON checks;
DROP FUNCTION IF EXISTS create_cash_movement_on_check_collection();

-- Trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION create_cash_movement_on_check_collection()
RETURNS TRIGGER AS $$
DECLARE
    v_cash_account_id UUID;
    v_movement_no TEXT;
    v_movement_type TEXT;
    v_description TEXT;
BEGIN
    -- Sadece durum değişikliklerinde çalış
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Çek tahsil edildiğinde (collected)
        IF NEW.status = 'collected' AND OLD.status != 'collected' THEN
            
            -- İlk aktif kasa/banka hesabını bul
            SELECT id INTO v_cash_account_id
            FROM cash_accounts
            WHERE company_id = NEW.company_id
              AND is_active = true
              AND account_type IN ('cash', 'bank')
            ORDER BY 
                CASE account_type 
                    WHEN 'cash' THEN 1 
                    WHEN 'bank' THEN 2 
                END
            LIMIT 1;
            
            -- Hesap bulunamadıysa varsayılan kasa hesabı oluştur
            IF v_cash_account_id IS NULL THEN
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
                    NEW.company_id,
                    'KASA-001',
                    'Merkez Kasa',
                    'cash',
                    'TRY',
                    0,
                    0,
                    true,
                    NEW.created_by
                ) RETURNING id INTO v_cash_account_id;
            END IF;
            
            -- Hareket tipini belirle
            IF NEW.type = 'received' THEN
                v_movement_type := 'income';
                v_description := 'Çek Tahsilatı - Çek No: ' || NEW.check_number || ' - ' || COALESCE(NEW.bank_name, '');
            ELSE
                v_movement_type := 'expense';
                v_description := 'Çek Ödemesi - Çek No: ' || NEW.check_number || ' - ' || COALESCE(NEW.bank_name, '');
            END IF;
            
            -- Hareket numarası oluştur
            v_movement_no := 'NAK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
            
            -- Nakit hareketi oluştur
            INSERT INTO cash_movements (
                company_id,
                movement_no,
                account_id,
                movement_type,
                amount,
                currency,
                description,
                category,
                reference_type,
                reference_id,
                customer_id,
                movement_date,
                created_by
            ) VALUES (
                NEW.company_id,
                v_movement_no,
                v_cash_account_id,
                v_movement_type,
                NEW.amount,
                'TRY',
                v_description,
                'check_collection',
                'check',
                NEW.id,
                NEW.customer_id,
                COALESCE(NEW.collection_date, CURRENT_DATE),
                NEW.created_by
            );
            
            -- Hesap bakiyesini güncelle
            IF v_movement_type = 'income' THEN
                UPDATE cash_accounts
                SET balance = balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = v_cash_account_id;
            ELSE
                UPDATE cash_accounts
                SET balance = balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = v_cash_account_id;
            END IF;
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
CREATE TRIGGER trigger_cash_movement_on_check_collection
AFTER UPDATE ON checks
FOR EACH ROW
EXECUTE FUNCTION create_cash_movement_on_check_collection();