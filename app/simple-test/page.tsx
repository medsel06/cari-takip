'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SimpleTest() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  const runTest = async () => {
    setResults([]);
    setLoading(true);

    try {
      // 1. Auth testi
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        setResults(prev => [...prev, { 
          test: 'Auth', 
          status: '❌', 
          message: 'Kullanıcı bulunamadı. Giriş yapın.' 
        }]);
        setLoading(false);
        return;
      }

      setResults(prev => [...prev, { 
        test: 'Auth', 
        status: '✅', 
        message: `Kullanıcı: ${user.email}` 
      }]);

      // 2. Company ID testi
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        setResults(prev => [...prev, { 
          test: 'Company ID', 
          status: '❌', 
          message: 'Company ID bulunamadı',
          error: userError 
        }]);
        setLoading(false);
        return;
      }

      setResults(prev => [...prev, { 
        test: 'Company ID', 
        status: '✅', 
        message: `Company: ${userData.company_id}` 
      }]);

      // 3. Products testi
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .limit(1);

      setResults(prev => [...prev, { 
        test: 'Products', 
        status: productsError ? '❌' : '✅', 
        message: productsError ? productsError.message : `${products?.length || 0} ürün bulundu`,
        error: productsError 
      }]);

      // 4. Customers testi
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .limit(1);

      setResults(prev => [...prev, { 
        test: 'Customers', 
        status: customersError ? '❌' : '✅', 
        message: customersError ? customersError.message : `${customers?.length || 0} müşteri bulundu`,
        error: customersError 
      }]);

    } catch (error: any) {
      setResults(prev => [...prev, { 
        test: 'Genel Hata', 
        status: '❌', 
        message: error.message 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Basit RLS Test</h1>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Test Ediliyor...' : 'Testi Başlat'}
      </button>

      <div className="space-y-2">
        {results.map((result, idx) => (
          <div key={idx} className="p-3 bg-gray-100 rounded">
            <div className="flex items-center gap-2">
              <span className="text-xl">{result.status}</span>
              <span className="font-medium">{result.test}:</span>
              <span className="text-gray-600">{result.message}</span>
            </div>
            {result.error && (
              <pre className="text-xs text-red-600 mt-2">
                {JSON.stringify(result.error, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
