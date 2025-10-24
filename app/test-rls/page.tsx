'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestRLSPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const runTests = async () => {
    setResults([]);
    setLoading(true);

    const tests = [];

    // 1. Auth Test
    const { data: { user } } = await supabase.auth.getUser();
    tests.push({
      name: 'Auth Status',
      result: user ? `✅ Logged in as ${user.email}` : '❌ Not logged in'
    });

    if (!user) {
      setResults(tests);
      setLoading(false);
      return;
    }

    // 2. User Company Test
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    tests.push({
      name: 'User Record',
      result: userData ? `✅ Company: ${userData.company_id}` : `❌ Error: ${userError?.message}`
    });

    // 3. Direct SQL Test (no RLS)
    const { data: sqlTest, error: sqlError } = await supabase.rpc('get_auth_company_id');
    tests.push({
      name: 'Company Function',
      result: sqlTest ? `✅ Returns: ${sqlTest}` : `❌ Error: ${sqlError?.message}`
    });

    // 4. Products Test
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');
    
    tests.push({
      name: 'Products Query',
      result: productsError 
        ? `❌ Error: ${productsError.message}` 
        : `✅ Found ${products?.length || 0} products`
    });

    // 5. Customers Test
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*');
    
    tests.push({
      name: 'Customers Query',
      result: customersError 
        ? `❌ Error: ${customersError.message}` 
        : `✅ Found ${customers?.length || 0} customers`
    });

    // 6. RLS Policy Check
    const { data: policies } = await supabase
      .rpc('get_policies_for_table', { table_name: 'products' })
      .catch(() => ({ data: null }));

    tests.push({
      name: 'RLS Policies',
      result: policies ? `ℹ️ ${policies.length} policies found` : 'ℹ️ Cannot check policies'
    });

    setResults(tests);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">RLS Debug Tool</h1>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Running Tests...' : 'Run All Tests'}
      </button>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((test, idx) => (
            <div key={idx} className="p-3 bg-gray-100 rounded flex justify-between">
              <span className="font-medium">{test.name}:</span>
              <span className={test.result.includes('❌') ? 'text-red-600' : 'text-green-600'}>
                {test.result}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p className="text-sm">Bu test aracı RLS sorunlarını tespit eder.</p>
        <p className="text-sm mt-1">Eğer products/customers 0 dönüyorsa RLS policy sorunu var.</p>
      </div>
    </div>
  );
}
