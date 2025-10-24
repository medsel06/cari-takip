-- Çek durumu değiştiğinde nakit hareketi oluşturan trigger
CREATE OR REPLACE FUNCTION create_cash_movement_on_check_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_cash_account_id UUID;
    v_movement_no TEXT;
BEGIN
    -- Sadece durum değişikliklerinde çalış
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Alınan çek tahsil edildiğinde
        IF NEW.type = 'received' AND NEW.status = 'collected' AND OLD.status != 'collected' THEN
            -- Varsayılan kasa hesabını bul (nakit kasa)
            SELECT id INTO v_cash_account_id
            FROM cash_accounts
            WHERE company_id = NEW.company_id
              AND account_type = 'cash'
              AND is_active = true
            LIMIT 1;
            
            IF v_cash_account_id IS NOT NULL THEN
                -- Hareket numarası oluştur
                v_movement_no := 'NAK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
                
                -- Nakit girişi oluştur
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
                    'income',
                    NEW.amount,
                    'TRY',
                    'Çek Tahsilatı - Çek No: ' || NEW.check_number,
                    'check_collection',
                    'check',
                    NEW.id,
                    NEW.customer_id,
                    COALESCE(NEW.collection_date, CURRENT_DATE),
                    NEW.created_by
                );
                
                -- Kasa bakiyesini güncelle
                UPDATE cash_accounts
                SET balance = balance + NEW.amount
                WHERE id = v_cash_account_id;
            END IF;
            
        -- Verilen çek ödendiğinde
        ELSIF NEW.type = 'issued' AND NEW.status = 'collected' AND OLD.status != 'collected' THEN
            -- Varsayılan kasa hesabını bul
            SELECT id INTO v_cash_account_id
            FROM cash_accounts
            WHERE company_id = NEW.company_id
              AND account_type = 'cash'
              AND is_active = true
            LIMIT 1;
            
            IF v_cash_account_id IS NOT NULL THEN
                -- Hareket numarası oluştur
                v_movement_no := 'NAK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
                
                -- Nakit çıkışı oluştur
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
                    'expense',
                    NEW.amount,
                    'TRY',
                    'Çek Ödemesi - Çek No: ' || NEW.check_number,
                    'check_payment',
                    'check',
                    NEW.id,
                    NEW.customer_id,
                    COALESCE(NEW.collection_date, CURRENT_DATE),
                    NEW.created_by
                );
                
                -- Kasa bakiyesini güncelle
                UPDATE cash_accounts
                SET balance = balance - NEW.amount
                WHERE id = v_cash_account_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_create_cash_movement_on_check_status ON checks;
CREATE TRIGGER trigger_create_cash_movement_on_check_status
AFTER UPDATE ON checks
FOR EACH ROW
EXECUTE FUNCTION create_cash_movement_on_check_status_change();

-- Stok hareketi yapıldığında fatura bağlantısı için alan ekle
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES invoices(id);

-- Çek ciro geçmişi için tablo
CREATE TABLE IF NOT EXISTS check_endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id UUID NOT NULL REFERENCES checks(id),
    from_customer_id UUID REFERENCES customers(id),
    to_customer_id UUID REFERENCES customers(id),
    endorsement_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_check_endorsements_check ON check_endorsements(check_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_reference ON cash_movements(reference_type, reference_id);