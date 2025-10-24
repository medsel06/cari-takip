'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, Search, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StockMovement {
  id: string;
  movement_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
  };
  created_by_user?: {
    full_name: string;
  };
}

export default function StokHareketleriRaporuPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all'); // all, IN, OUT
  const [searchTerm, setSearchTerm] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserAndMovements();
  }, []);

  const fetchUserAndMovements = async () => {
    const supabase = createClient();
    
    try {
      console.log('Stok hareketleri - Kullanıcı bilgileri alınıyor...');
      
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

      // Stok hareketlerini getir
      const { data, error: movementsError } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products!stock_movements_product_id_fkey(id, name, code, unit)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(500);

      console.log('Stock Movements:', data?.length, 'records found');

      if (movementsError) {
        console.error('Movements error:', movementsError);
        setError(`Stok hareketleri yüklenemedi: ${movementsError.message}`);
      } else {
        setMovements(data || []);
      }
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMovements = () => {
    let filtered = [...movements];

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.movement_type === filterType);
    }

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(movement => 
        movement.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredMovements = getFilteredMovements();

  const exportToExcel = () => {
    const data = filteredMovements.map(movement => ({
      'Tarih': format(new Date(movement.created_at), 'dd.MM.yyyy HH:mm', { locale: tr }),
      'Ürün Kodu': movement.product?.code || '-',
      'Ürün Adı': movement.product?.name || '-',
      'İşlem': movement.movement_type === 'IN' ? 'Giriş' : 'Çıkış',
      'Miktar': movement.quantity,
      'Birim': movement.product?.unit || '-',
      'Birim Fiyat': movement.unit_price.toFixed(2),
      'Toplam': movement.total_price.toFixed(2),
      'Açıklama': movement.description || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Hareketleri');
    XLSX.writeFile(wb, `stok_hareketleri_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const totalIn = filteredMovements.filter(m => m.movement_type === 'IN').reduce((sum, m) => sum + m.total_price, 0);
    const totalOut = filteredMovements.filter(m => m.movement_type === 'OUT').reduce((sum, m) => sum + m.total_price, 0);
    const countIn = filteredMovements.filter(m => m.movement_type === 'IN').length;
    const countOut = filteredMovements.filter(m => m.movement_type === 'OUT').length;
    return { totalIn, totalOut, countIn, countOut };
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Stok Hareketleri Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndMovements}
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stok Hareketleri Raporu</h1>
        <p className="text-gray-600">Detaylı stok giriş-çıkış hareketleri</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Giriş</div>
          <div className="text-xl font-bold text-green-600">₺{totals.totalIn.toFixed(2)}</div>
          <div className="text-xs text-gray-500">{totals.countIn} işlem</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Çıkış</div>
          <div className="text-xl font-bold text-red-600">₺{totals.totalOut.toFixed(2)}</div>
          <div className="text-xs text-gray-500">{totals.countOut} işlem</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Net Fark</div>
          <div className={`text-xl font-bold ${totals.totalIn - totals.totalOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₺{Math.abs(totals.totalIn - totals.totalOut).toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam İşlem</div>
          <div className="text-xl font-bold text-gray-900">{filteredMovements.length}</div>
        </div>
      </div>

      {/* Filtre ve Butonlar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün adı, kodu veya açıklama ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm İşlemler</option>
          <option value="IN">Girişler</option>
          <option value="OUT">Çıkışlar</option>
        </select>

        {filteredMovements.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredMovements.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Kayıt bulunamadı.</p>
            <p className="text-sm text-gray-400">Stok hareketleri ekledikten sonra bu raporu görüntüleyebilirsiniz.</p>
            <a href="/stok/hareketler/yeni" className="mt-3 inline-block text-blue-600 hover:text-blue-800 underline text-sm">
              Stok Hareketi Ekle →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Kodu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">B. Fiyat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(movement.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.product?.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.product?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-1 ${
                        movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.movement_type === 'IN' ? (
                          <>
                            <ArrowDown className="h-4 w-4" />
                            <span className="font-medium">Giriş</span>
                          </>
                        ) : (
                          <>
                            <ArrowUp className="h-4 w-4" />
                            <span className="font-medium">Çıkış</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.product?.unit || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₺{movement.unit_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₺{movement.total_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {movement.description || '-'}
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
        <p>Debug: {filteredMovements.length} hareket listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}