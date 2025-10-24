'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Check {
  id: string;
  check_number: string;
  bank_name: string;
  amount: number;
  due_date: string;
  status: string;
  type: string;
  description: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  days_to_due: number;
}

const statusLabels: Record<string, string> = {
  portfolio: 'Portföyde',
  collected: 'Tahsil Edildi',
  returned: 'İade',
  endorsed: 'Ciro Edildi',
  in_bank: 'Bankada',
  protested: 'Protestolu'
};

export default function CekPortfoyRaporuPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [userInfo, setUserInfo] = useState<any>(null);
  
  useEffect(() => {
    fetchUserAndChecks();
  }, []);

  const fetchUserAndChecks = async () => {
    const supabase = createClient();
    
    try {
      console.log('Çek portföy - Kullanıcı bilgileri alınıyor...');
      
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

      // Çekleri getir
      const { data, error: checksError } = await supabase
        .from('checks')
        .select(`
          *,
          customer:customers(id, name, code)
        `)
        .eq('company_id', userProfile.company_id)
        .order('due_date', { ascending: true });

      console.log('Checks:', data?.length, 'records found');

      if (checksError) {
        console.error('Checks error:', checksError);
        setError(`Çekler yüklenemedi: ${checksError.message}`);
      } else {
        // Vadeye kalan gün hesapla
        const today = new Date();
        const checksWithDays = (data || []).map(check => {
          const dueDate = new Date(check.due_date);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...check,
            days_to_due: diffDays
          };
        });
        
        setChecks(checksWithDays);
      }
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const filteredChecks = getFilteredChecks();
    const data = filteredChecks.map(check => ({
      'Çek No': check.check_number,
      'Banka': check.bank_name,
      'Cari': check.customer?.name || '-',
      'Tutar': check.amount.toFixed(2),
      'Vade Tarihi': format(new Date(check.due_date), 'dd.MM.yyyy', { locale: tr }),
      'Vadeye Kalan': check.days_to_due < 0 ? `${Math.abs(check.days_to_due)} gün geçti` : `${check.days_to_due} gün`,
      'Durum': statusLabels[check.status],
      'Tip': check.type === 'received' ? 'Alınan' : 'Verilen',
      'Açıklama': check.description || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Çek Portföyü');
    XLSX.writeFile(wb, `cek_portfoy_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const getFilteredChecks = () => {
    let filtered = [...checks];

    // Durum filtresi
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    return filtered;
  };

  const filteredChecks = getFilteredChecks();

  const calculateTotals = () => {
    const totalAmount = filteredChecks.reduce((sum, c) => sum + c.amount, 0);
    const overdueCount = filteredChecks.filter(c => c.days_to_due < 0).length;
    const portfolioAmount = filteredChecks.filter(c => c.status === 'portfolio').reduce((sum, c) => sum + c.amount, 0);
    const weekCount = filteredChecks.filter(c => c.days_to_due >= 0 && c.days_to_due <= 7).length;
    return { totalAmount, overdueCount, portfolioAmount, weekCount, totalCount: filteredChecks.length };
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Çek Portföy Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndChecks}
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Çek Portföy Raporu</h1>
        <p className="text-gray-600">Çek durumu ve vade analizi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Çek</div>
          <div className="text-xl font-bold text-gray-900">{totals.totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Tutar</div>
          <div className="text-xl font-bold text-gray-900">₺{totals.totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Portföyde</div>
          <div className="text-xl font-bold text-blue-600">₺{totals.portfolioAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Vadesi Geçen</div>
          <div className="text-xl font-bold text-red-600">{totals.overdueCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Bu Hafta</div>
          <div className="text-xl font-bold text-orange-600">{totals.weekCount}</div>
        </div>
      </div>

      {/* Filtre ve Butonlar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="portfolio">Portföyde</option>
          <option value="collected">Tahsil Edildi</option>
          <option value="returned">İade</option>
          <option value="endorsed">Ciro Edildi</option>
          <option value="in_bank">Bankada</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Tipler</option>
          <option value="received">Alınan</option>
          <option value="issued">Verilen</option>
        </select>

        {filteredChecks.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">Kayıt bulunamadı.</p>
            <p className="text-sm text-gray-400">Çek modülünden çek ekledikten sonra bu raporu görüntüleyebilirsiniz.</p>
            <a href="/cek" className="mt-3 inline-block text-blue-600 hover:text-blue-800 underline text-sm">
              Çek Modülüne Git →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çek No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banka</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChecks.map((check) => (
                  <tr key={check.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{check.check_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{check.bank_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{check.customer?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{check.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(check.due_date), 'dd.MM.yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        check.days_to_due < 0 ? 'text-red-600' : 
                        check.days_to_due <= 7 ? 'text-orange-600' : 
                        'text-gray-600'
                      }`}>
                        {check.days_to_due < 0 ? `${Math.abs(check.days_to_due)} gün geçti` : `${check.days_to_due} gün`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        check.status === 'portfolio' ? 'bg-blue-100 text-blue-800' :
                        check.status === 'collected' ? 'bg-green-100 text-green-800' :
                        check.status === 'returned' ? 'bg-red-100 text-red-800' :
                        check.status === 'endorsed' ? 'bg-purple-100 text-purple-800' :
                        check.status === 'in_bank' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {statusLabels[check.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        check.type === 'received' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {check.type === 'received' ? 'Alınan' : 'Verilen'}
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
        <p>Debug: {filteredChecks.length} çek listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}