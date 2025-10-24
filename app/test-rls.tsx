'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';

export default function TestPage() {
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    testConnection();
  }, []);
  
  const testConnection = async () => {
    console.log('=== TEST BAŞLADI ===');
    
    // 1. Auth kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    console.log('1. Kullanıcı:', user?.email, user?.id);
    
    if (!user) {
      console.error('Kullanıcı girişi yapılmamış!');
      return;
    }
    
    // 2. Users tablosu kontrolü
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    console.log('2. User data:', userData, 'Error:', userError);
    console.log('   Company ID:', userData?.company_id);
    
    // 3. Products kontrolü
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
      
    console.log('3. Products:', products?.length, 'adet', 'Error:', productsError);
    if (products?.length) {
      console.log('   İlk ürün:', products[0]);
    }
    
    // 4. Customers kontrolü
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*');
      
    console.log('4. Customers:', customers?.length, 'adet', 'Error:', customersError);
    if (customers?.length) {
      console.log('   İlk müşteri:', customers[0]);
    }
    
    console.log('=== TEST BİTTİ ===');
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">RLS Test Sayfası</h1>
      <p>Console'u kontrol edin...</p>
    </div>
  );
}
