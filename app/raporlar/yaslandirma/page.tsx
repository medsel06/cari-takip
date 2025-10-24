'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, differenceInDays, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CustomerBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  total_balance: number;
  current: number; // 0-30 gün
  overdue_30: number; // 31-60 gün
  overdue_60: number; // 61-90 gün
  overdue_90: number; // 91-120 gün
  overdue_120_plus: number; // 120+ gün
}

export default function YaslandirmaRaporuPage() {
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all'); // all, customer, supplier
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserAndBalances();
  }, []);

  const fetchUserAndBalances = async () => {
    const supabase = createClient();
    
    try {
      console.log('Yaşlandırma raporu - Kullanıcı bilgileri alınıyor...');
      
      // Session'ı kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
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
        setError(`Müşteriler yüklenemedi: ${customersError.message}`);
        setLoading(false);
        return;
      }

      // Her müşteri için vadeli hareketleri analiz et
      const today = new Date();
      const customersWithAging = [];

      for (const customer of customersData || []) {
        // Vadeli borç hareketlerini getir
        const { data: movements } = await supabase
          .from('account_movements')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('movement_type', 'DEBT')
          .not('due_date', 'is', null);

        let current = 0;
        let overdue_30 = 0;
        let overdue_60 = 0;
        let overdue_90 = 0;
        let overdue_120_plus = 0;

        // Her hareketi vade tarihine göre kategorize et
        movements?.forEach(movement => {
          const dueDate = new Date(movement.due_date);
          const daysPastDue = differenceInDays(today, dueDate);
          const amount = parseFloat(movement.amount || 0);

          if (daysPastDue <= 0) {
            current += amount; // Henüz vadesi gelmemiş
          } else if (daysPastDue <= 30) {
            current += amount; // 0-30 gün
          } else if (daysPastDue <= 60) {
            overdue_30 += amount; // 31-60 gün
          } else if (daysPastDue <= 90) {
            overdue_60 += amount; // 61-90 gün
          } else if (daysPastDue <= 120) {
            overdue_90 += amount; // 91-120 gün
          } else {
            overdue_120_plus += amount; // 120+ gün
          }
        });

        const total_balance = current + overdue_30 + overdue_60 + overdue_90 + overdue_120_plus;

        if (total_balance > 0 || !showOnlyOverdue) {
          customersWithAging.push({
            ...customer,
            total_balance,
            current,
            overdue_30,
            overdue_60,
            overdue_90,
            overdue_120_plus
          });
        }
      }

      setCustomers(customersWithAging);
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    let filtered = [...customers];

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType || c.type === 'both');
    }

    // Sadece vadesi geçenler
    if (showOnlyOverdue) {
      filtered = filtered.filter(c => 
        c.overdue_30 > 0 || c.overdue_60 > 0 || c.overdue_90 > 0 || c.overdue_120_plus > 0
      );
    }

    return filtered;
  };

  const filteredCustomers = getFilteredCustomers();

  const exportToExcel = () => {
    const data = filteredCustomers.map(customer => ({
      'Cari Kodu': customer.code,
      'Cari Adı': customer.name,
      'Tip': customer.type === 'customer' ? 'Müşteri' : customer.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi',
      'Telefon': customer.phone || '-',
      'Vadesi Gelmemiş / 0-30 Gün': customer.current.toFixed(2),
      '31-60 Gün': customer.overdue_30.toFixed(2),
      '61-90 Gün': customer.overdue_60.toFixed(2),
      '91-120 Gün': customer.overdue_90.toFixed(2),
      '120+ Gün': customer.overdue_120_plus.toFixed(2),
      'Toplam Borç': customer.total_balance.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yaşlandırma Raporu');

    // Sütun genişlikleri
    const colWidths = [
      { wch: 15 }, // Cari Kodu
      { wch: 30 }, // Cari Adı
      { wch: 12 }, // Tip
      { wch: 15 }, // Telefon
      { wch: 20 }, // 0-30 Gün
      { wch: 15 }, // 31-60 Gün
      { wch: 15 }, // 61-90 Gün
      { wch: 15 }, // 91-120 Gün
      { wch: 15 }, // 120+ Gün
      { wch: 15 }  // Toplam
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `yaslandirma_raporu_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const totals = filteredCustomers.reduce((acc, customer) => ({
      total: acc.total + customer.total_balance,
      current: acc.current + customer.current,
      overdue_30: acc.overdue_30 + customer.overdue_30,
      overdue_60: acc.overdue_60 + customer.overdue_60,
      overdue_90: acc.overdue_90 + customer.overdue_90,
      overdue_120_plus: acc.overdue_120_plus + customer.overdue_120_plus
    }), {
      total: 0,
      current: 0,
      overdue_30: 0,
      overdue_60: 0,
      overdue_90: 0,
      overdue_120_plus: 0
    });

    return totals;
  };

  const totals = calculateTotals();

  const getAgingPercentage = (value: number) => {
    if (totals.total === 0) return 0;
    return (value / totals.total) * 100;
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Yaşlandırma Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndBalances}
              className="block text-sm text-red-600 underline hover:text-red-800"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Yaşlandırma Raporu</h1>
        <p className="text-gray-600">Vadesi geçmiş alacakların yaş analizi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Alacak</div>
          <div className="text-xl font-bold text-gray-900">₺{totals.total.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-700">0-30 Gün</div>
          <div className="text-xl font-bold text-green-800">₺{totals.current.toFixed(2)}</div>
          <div className="text-xs text-green-600">%{getAgingPercentage(totals.current).toFixed(1)}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-sm text-yellow-700">31-60 Gün</div>
          <div className="text-xl font-bold text-yellow-800">₺{totals.overdue_30.toFixed(2)}</div>
          <div className="text-xs text-yellow-600">%{getAgingPercentage(totals.overdue_30).toFixed(1)}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
          <div className="text-sm text-orange-700">61-90 Gün</div>
          <div className="text-xl font-bold text-orange-800">₺{totals.overdue_60.toFixed(2)}</div>
          <div className="text-xs text-orange-600">%{getAgingPercentage(totals.overdue_60).toFixed(1)}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-red-700">91-120 Gün</div>
          <div className="text-xl font-bold text-red-800">₺{totals.overdue_90.toFixed(2)}</div>
          <div className="text-xs text-red-600">%{getAgingPercentage(totals.overdue_90).toFixed(1)}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <div className="text-sm text-purple-700">120+ Gün</div>
          <div className="text-xl font-bold text-purple-800">₺{totals.overdue_120_plus.toFixed(2)}</div>
          <div className="text-xs text-purple-600">%{getAgingPercentage(totals.overdue_120_plus).toFixed(1)}</div>
        </div>
      </div>

      {/* Yaşlandırma Grafiği */}
      {totals.total > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Yaşlandırma Dağılımı</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="w-24 text-sm">0-30 Gün</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${getAgingPercentage(totals.current)}%` }}
                  >
                    {getAgingPercentage(totals.current) > 10 && (
                      <span className="text-xs text-white font-medium">
                        %{getAgingPercentage(totals.current).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-28 text-right text-sm">₺{totals.current.toFixed(2)}</div>
            </div>

            <div className="flex items-center">
              <div className="w-24 text-sm">31-60 Gün</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-yellow-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${getAgingPercentage(totals.overdue_30)}%` }}
                  >
                    {getAgingPercentage(totals.overdue_30) > 10 && (
                      <span className="text-xs text-white font-medium">
                        %{getAgingPercentage(totals.overdue_30).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-28 text-right text-sm">₺{totals.overdue_30.toFixed(2)}</div>
            </div>

            <div className="flex items-center">
              <div className="w-24 text-sm">61-90 Gün</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${getAgingPercentage(totals.overdue_60)}%` }}
                  >
                    {getAgingPercentage(totals.overdue_60) > 10 && (
                      <span className="text-xs text-white font-medium">
                        %{getAgingPercentage(totals.overdue_60).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-28 text-right text-sm">₺{totals.overdue_60.toFixed(2)}</div>
            </div>

            <div className="flex items-center">
              <div className="w-24 text-sm">91-120 Gün</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-red-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${getAgingPercentage(totals.overdue_90)}%` }}
                  >
                    {getAgingPercentage(totals.overdue_90) > 10 && (
                      <span className="text-xs text-white font-medium">
                        %{getAgingPercentage(totals.overdue_90).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-28 text-right text-sm">₺{totals.overdue_90.toFixed(2)}</div>
            </div>

            <div className="flex items-center">
              <div className="w-24 text-sm">120+ Gün</div>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${getAgingPercentage(totals.overdue_120_plus)}%` }}
                  >
                    {getAgingPercentage(totals.overdue_120_plus) > 10 && (
                      <span className="text-xs text-white font-medium">
                        %{getAgingPercentage(totals.overdue_120_plus).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-28 text-right text-sm">₺{totals.overdue_120_plus.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtre ve Butonlar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tümü</option>
          <option value="customer">Müşteriler</option>
          <option value="supplier">Tedarikçiler</option>
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOnlyOverdue}
            onChange={(e) => setShowOnlyOverdue(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Sadece vadesi geçenleri göster</span>
        </label>

        {filteredCustomers.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        )}
      </div>

      {/* Risk Uyarısı */}
      {totals.overdue_120_plus > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Dikkat! ₺{totals.overdue_120_plus.toFixed(2)} tutarında 120 günden eski alacak bulunuyor.
            </p>
            <p className="text-sm text-red-700 mt-1">
              Bu alacaklar için acil tahsilat aksiyonu alınmalıdır.
            </p>
          </div>
        </div>
      )}

      {/* Detay Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Vadeli alacak bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">0-30 Gün</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">31-60 Gün</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">61-90 Gün</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">91-120 Gün</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">120+ Gün</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {customer.current > 0 ? `₺${customer.current.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {customer.overdue_30 > 0 ? (
                        <span className="text-yellow-600">₺{customer.overdue_30.toFixed(2)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {customer.overdue_60 > 0 ? (
                        <span className="text-orange-600">₺{customer.overdue_60.toFixed(2)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {customer.overdue_90 > 0 ? (
                        <span className="text-red-600">₺{customer.overdue_90.toFixed(2)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {customer.overdue_120_plus > 0 ? (
                        <span className="text-purple-600 font-semibold">₺{customer.overdue_120_plus.toFixed(2)}</span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                      ₺{customer.total_balance.toFixed(2)}
                    </td>
                  </tr>
                ))}
                
                {/* Toplam Satırı */}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="px-6 py-3 text-right">TOPLAM:</td>
                  <td className="px-6 py-3 text-right">₺{totals.current.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-yellow-600">₺{totals.overdue_30.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-orange-600">₺{totals.overdue_60.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-red-600">₺{totals.overdue_90.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-purple-600">₺{totals.overdue_120_plus.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right">₺{totals.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Bilgisi - Production'da kaldırın */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
        <p>Debug: {filteredCustomers.length} cari listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}