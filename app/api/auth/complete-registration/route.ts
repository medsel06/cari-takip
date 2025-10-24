import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, fullName, companyName, taxNumber } = body;

    // Service role client - RLS'i bypass eder
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Transaction benzeri işlem
    let companyId: string | null = null;

    try {
      // 1. Firma oluştur
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: companyName,
          tax_number: taxNumber || null
        })
        .select()
        .single();

      if (companyError) {
        throw new Error(`Firma oluşturulamadı: ${companyError.message}`);
      }

      companyId = companyData.id;
      console.log('Firma oluşturuldu:', companyId);

      // 2. Users tablosuna ekle/güncelle
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: email,
          full_name: fullName,
          company_id: companyId,
          role: 'admin'
        });

      if (userError) {
        throw new Error(`Kullanıcı güncellenemedi: ${userError.message}`);
      }

      // 3. Varsayılan kategorileri oluştur
      const defaultCategories = [
        // Giderler
        { company_id: companyId, code: 'G001', name: 'Kira Giderleri', type: 'expense' },
        { company_id: companyId, code: 'G002', name: 'Elektrik Giderleri', type: 'expense' },
        { company_id: companyId, code: 'G003', name: 'Su Giderleri', type: 'expense' },
        { company_id: companyId, code: 'G004', name: 'Doğalgaz Giderleri', type: 'expense' },
        { company_id: companyId, code: 'P001', name: 'Maaş Ödemeleri', type: 'expense' },
        { company_id: companyId, code: 'P002', name: 'SGK Ödemeleri', type: 'expense' },
        { company_id: companyId, code: 'I001', name: 'Ofis Malzemeleri', type: 'expense' },
        { company_id: companyId, code: 'D001', name: 'Diğer Giderler', type: 'expense' },
        // Gelirler
        { company_id: companyId, code: 'GEL001', name: 'Satış Gelirleri', type: 'income' },
        { company_id: companyId, code: 'GEL002', name: 'Hizmet Gelirleri', type: 'income' },
        { company_id: companyId, code: 'GEL003', name: 'Diğer Gelirler', type: 'income' },
      ];

      const { error: categoryError } = await supabaseAdmin
        .from('income_expense_categories')
        .insert(defaultCategories);

      if (categoryError) {
        console.error('Kategori oluşturma hatası:', categoryError);
        // Kritik değil, devam et
      }

      return NextResponse.json({
        success: true,
        companyId,
        message: 'Kayıt başarıyla tamamlandı'
      });

    } catch (error) {
      // Hata durumunda rollback
      if (companyId) {
        await supabaseAdmin
          .from('companies')
          .delete()
          .eq('id', companyId);
      }
      throw error;
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Kayıt işlemi başarısız' 
      },
      { status: 500 }
    );
  }
}