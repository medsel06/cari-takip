'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DueItem {
  id: string;
  type: 'check' | 'receivable' | 'payable';
  description: string;
  customer_name: string;
  amount: number;
  due_date: string;
  status: string;
  days_to_due: number;
}

export default function VadeRaporuPage() {
  const [items, setItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('week'); // today, week, month, all
  const [filterType, setFilterType] = useState('all'); // all, check, receivable, payable
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserAndDueItems();
  }, []);

  const fetchUserAndDueItems = async () => {
    const supabase = createClient();
    
    try {
      console.log('Vade raporu - Kullanıcı bilgileri alınıyor...');
      
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

      const allItems: DueItem[] = [];
      const today = new Date();

      // Çekleri getir
      const { data: checks } = await supabase
        .from('checks')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('company_id', userProfile.company_id)
        .in('status', ['portfolio', 'in_bank'])
        .order('due_date');

      if (checks) {
        checks.forEach(check => {
          const dueDate = new Date(check.due_date);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          allItems.push({
            id: check.id,
            type: 'check',
            description: `Çek No: ${check.check_number} - ${check.bank_name}`,
            customer_name: check.customer?.name || '',
            amount: check.type === 'received' ? check.amount : -check.amount,
            due_date: check.due_date,
            status: check.status,
            days_to_due: diffDays
          });
        });
      }

      // Cari vadelerini getir
      const { data: movements } = await supabase
        .from('account_movements')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('company_id', userProfile.company_id)
        .not('due_date', 'is', null)
        .order('due_date');

      if (movements) {
        movements.forEach(movement => {
          const dueDate = new Date(movement.due_date);
          const diffTime = dueDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          allItems.push({
            id: movement.id,
            type: movement.movement_type === 'DEBT' ? 'payable' : 'receivable',
            description: movement.description || 'Cari Hareket',
            customer_name: movement.customer?.name || '',
            amount: movement.movement_type === 'DEBT' ? -movement.amount : movement.amount,
            due_date: movement.due_date,
            status: 'pending',
            days_to_due: diffDays
          });
        });
      }

      console.log('Due Items:', allItems.length, 'records found');
      setItems(allItems);
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    let filtered = [...items];

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Tarih filtresi
    const today = new Date();
    if (period === 'today') {
      filtered = filtered.filter(item => 
        format(new Date(item.due_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      );
    } else if (period === 'week') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      filtered = filtered.filter(item => 
        isWithinInterval(new Date(item.due_date), { start: weekStart, end: weekEnd })
      );
    } else if (period === 'month') {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      filtered = filtered.filter(item => 
        isWithinInterval(new Date(item.due_date), { start: monthStart, end: monthEnd })
      );
    }

    // Tarihe göre sırala
    filtered.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    return filtered;
  };

  const filteredItems = getFilteredItems();

  const exportToExcel = () => {
    const data = filteredItems.map(item => ({
      'Vade Tarihi': format(new Date(item.due_date), 'dd.MM.yyyy', { locale: tr }),
      'Vadeye Kalan': item.days_to_due < 0 ? `${Math.abs(item.days_to_due)} gün geçti` : `${item.days_to_due} gün`,
      'Tip': item.type === 'check' ? 'Çek' : item.type === 'receivable' ? 'Alacak' : 'Borç',
      'Açıklama': item.description,
      'Cari': item.customer_name,
      'Tutar': Math.abs(item.amount).toFixed(2),
      'Giriş/Çıkış': item.amount > 0 ? 'Giriş' : 'Çıkış'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vade Raporu');
    XLSX.writeFile(wb, `vade_raporu_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const totalReceivable = filteredItems.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
    const totalPayable = Math.abs(filteredItems.filter(i => i.amount < 0).reduce((sum, i) => sum + i.amount, 0));
    const overdueCount = filteredItems.filter(i => i.days_to_due < 0).length;
    const todayCount = filteredItems.filter(i => i.days_to_due === 0).length;
    const netBalance = filteredItems.reduce((sum, i) => sum + i.amount, 0);
    return { totalReceivable, totalPayable, overdueCount, todayCount, netBalance };
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Vade Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndDueItems}
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vade Raporu</h1>
        <p className="text-gray-600">Çek ve cari hesap vadelerinin takibi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Alacak Toplamı</div>
          <div className="text-xl font-bold text-green-600">₺{totals.totalReceivable.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Borç Toplamı</div>
          <div className="text-xl font-bold text-red-600">₺{totals.totalPayable.toFixed(2)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Net Bakiye</div>
          <div className={`text-xl font-bold ${totals.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₺{Math.abs(totals.netBalance).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Vadesi Geçen</div>
          <div className="text-xl font-bold text-red-600">{totals.overdueCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Bugün</div>
          <div className="text-xl font-bold text-orange-600">{totals.todayCount}</div>
        </div>
      </div>

      {/* Filtre ve Butonlar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">Bugün</option>
          <option value="week">Bu Hafta</option>
          <option value="month">Bu Ay</option>
          <option value="all">Tümü</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Tipler</option>
          <option value="check">Çekler</option>
          <option value="receivable">Alacaklar</option>
          <option value="payable">Borçlar</option>
        </select>

        {filteredItems.length > 0 && (
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
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Seçilen dönemde vade bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vade Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vadeye Kalan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`font-medium ${item.days_to_due < 0 ? 'text-red-600' : ''}`}>
                        {format(new Date(item.due_date), 'dd.MM.yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        item.days_to_due < 0 ? 'text-red-600' : 
                        item.days_to_due === 0 ? 'text-orange-600' :
                        item.days_to_due <= 7 ? 'text-yellow-600' : 
                        'text-gray-600'
                      }`}>
                        {item.days_to_due < 0 ? `${Math.abs(item.days_to_due)} gün geçti` : 
                         item.days_to_due === 0 ? 'Bugün' :
                         `${item.days_to_due} gün`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.type === 'check' ? 'bg-blue-100 text-blue-800' :
                        item.type === 'receivable' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.type === 'check' ? 'Çek' :
                         item.type === 'receivable' ? 'Alacak' : 'Borç'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-2 font-medium ${
                        item.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.amount > 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                        ₺{Math.abs(item.amount).toFixed(2)}
                      </div>
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
        <p>Debug: {filteredItems.length} vade listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}