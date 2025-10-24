'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [result, setResult] = useState('');
  const supabase = createClient();

  const testCompanyInsert = async () => {
    try {
      // 1. Mevcut kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResult('Kullanıcı bulunamadı. Önce login olun.');
        return;
      }

      // 2. RPC fonksiyonunu çağır
      const testTaxNumber = 'TEST' + Date.now();
      const { data, error } = await supabase.rpc('create_company_and_link_user', {
        p_company_name: 'Test Firma ' + new Date().toLocaleTimeString(),
        p_tax_number: testTaxNumber
      });

      if (error) {
        setResult(`HATA: ${JSON.stringify(error, null, 2)}`);
        console.error('RPC hatası:', error);
      } else {
        setResult(`BAŞARILI: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      setResult(`CATCH HATASI: ${err.message}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Company Insert Test</h1>
      
      <button
        onClick={testCompanyInsert}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Et
      </button>

      <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
        {result || 'Butona tıklayın...'}
      </pre>
    </div>
  );
}
