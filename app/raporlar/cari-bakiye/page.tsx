'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function CariBakiyeRaporuPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  useEffect(() => {
    fetchUserAndCustomers();
  }, []);

  const fetchUserAndCustomers = async () => {
    const supabase = createClient();
    
    try {
      console.log('Cari bakiye - Kullanıcı bilgileri alınıyor...');
      
      // Session'ı kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session, 'Error:', sessionError);
      
      if (!session) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User (retry):', user, 'Error:', userError);
        
        if (!user) {
          setError('Oturum süresi dolmuş olabilir. Lütfen sayfayı yenileyin veya tekrar giriş yapın.');
          setLoading(false);
          return;
        }
        setUserInfo(user);
      } else {
        setUserInfo(session.user);
      }

      // Company ID'yi al
      const userId = session?.user?.id || userInfo?.id;
      if (!userId) {
        setError('Kullanıcı ID bulunamadı');
        setLoading(false);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single();

      console.log('User Profile:', userProfile, 'Error:', profileError);

      if (profileError || !userProfile?.company_id) {
        setError('Şirket bilgisi bulunamadı. Ayarlar sayfasından şirket seçimi yapın.');
        setLoading(false);
        return;
      }

      // Müşterileri getir
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      console.log('Customers:', customersData?.length, 'records found');

      if (customersError) {
        console.error('Customers error:', customersError);
        setError(`Müşteriler yüklenemedi: ${customersError.message}`);
      } else {
        // Her müşteri için bakiye hesapla
        const customersWithBalance = [];
        
        for (const customer of customersData || []) {
          // Borç toplamı
          const { data: debtData } = await supabase
            .from('account_movements')
            .select('amount')
            .eq('customer_id', customer.id)
            .eq('movement_type', 'DEBT');
          
          // Alacak toplamı
          const { data: creditData } = await supabase
            .from('account_movements')
            .select('amount')
            .eq('customer_id', customer.id)
            .eq('movement_type', 'CREDIT');
          
          const debtTotal = debtData?.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 0;
          const creditTotal = creditData?.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 0;
          const balance = debtTotal - creditTotal;
          
          customersWithBalance.push({
            ...customer,
            debt_total: debtTotal,
            credit_total: creditTotal,
            balance: balance
          });
        }
        
        setCustomers(customersWithBalance);
      }
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = customers.map(customer => ({
      'Cari Kodu': customer.code,
      'Cari Adı': customer.name,
      'Tip': customer.type === 'customer' ? 'Müşteri' : customer.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi',
      'Toplam Borç': customer.debt_total.toFixed(2),
      'Toplam Alacak': customer.credit_total.toFixed(2),
      'Bakiye': customer.balance.toFixed(2),
      'Durum': customer.balance > 0 ? 'Borçlu' : customer.balance < 0 ? 'Alacaklı' : 'Bakiyeli'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cari Bakiyeler');
    XLSX.writeFile(wb, `cari_bakiyeler_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const totalDebt = customers.reduce((sum, c) => sum + c.debt_total, 0);
    const totalCredit = customers.reduce((sum, c) => sum + c.credit_total, 0);
    const netBalance = totalDebt - totalCredit;
    const debtorCount = customers.filter(c => c.balance > 0).length;
    const creditorCount = customers.filter(c => c.balance < 0).length;
    return { totalDebt, totalCredit, netBalance, debtorCount, creditorCount };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cari Bakiye Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndCustomers}
              className="block text-sm text-red-600 underline hover:text-red-800"
            >
              Tekrar Dene
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="block text-sm text-red-600 underline hover:text-red-800"
            >
              Giriş Sayfasına Git
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cari Bakiye Raporu</h1>
        <p className="text-gray-600">Müşteri ve tedarikçi bakiye durumu</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Borç</div>
          <div className="text-xl font-bold text-red-600">₺{totals.totalDebt.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Alacak</div>
          <div className="text-xl font-bold text-green-600">₺{totals.totalCredit.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Net Bakiye</div>
          <div className={`text-xl font-bold ${totals.netBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₺{Math.abs(totals.netBalance).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Borçlu Sayısı</div>
          <div className="text-xl font-bold text-gray-900">{totals.debtorCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Alacaklı Sayısı</div>
          <div className="text-xl font-bold text-gray-900">{totals.creditorCount}</div>
        </div>
      </div>

      {/* Excel Export */}
      {customers.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        </div>
      )}

      {/* Basit Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Kayıt bulunamadı.</p>
            <p className="text-sm text-gray-400">Cari modülünden müşteri/tedarikçi ekledikten sonra bu raporu görüntüleyebilirsiniz.</p>
            <a href="/cari/yeni" className="mt-3 inline-block text-blue-600 hover:text-blue-800 underline text-sm">
              Yeni Cari Ekle →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borç</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alacak</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        customer.type === 'customer' ? 'bg-blue-100 text-blue-800' : 
                        customer.type === 'supplier' ? 'bg-green-100 text-green-800' : 
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {customer.type === 'customer' ? 'Müşteri' : 
                         customer.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{customer.debt_total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{customer.credit_total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className={customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-600'}>
                        ₺{Math.abs(customer.balance).toFixed(2)}
                        {customer.balance !== 0 && (
                          <span className="text-xs ml-1">({customer.balance > 0 ? 'B' : 'A'})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        customer.balance > 0 ? 'bg-red-100 text-red-800' : 
                        customer.balance < 0 ? 'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.balance > 0 ? 'Borçlu' : 
                         customer.balance < 0 ? 'Alacaklı' : 'Bakiyeli'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Bilgisi - Production'da kaldırın */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
        <p>Debug: {customers.length} cari hesap listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}