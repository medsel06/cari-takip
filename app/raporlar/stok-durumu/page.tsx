'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function StokDurumuRaporuPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  useEffect(() => {
    fetchUserAndProducts();
  }, []);

  const fetchUserAndProducts = async () => {
    const supabase = createClient();
    
    try {
      console.log('Kullanıcı bilgileri alınıyor...');
      
      // Session'ı kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session:', session, 'Error:', sessionError);
      
      if (!session) {
        // Session yoksa user'ı yenilemeyi dene
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

      // Ürünleri getir
      const { data, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      console.log('Products:', data?.length, 'records found');

      if (productsError) {
        console.error('Products error:', productsError);
        setError(`Ürünler yüklenemedi: ${productsError.message}`);
      } else {
        setProducts(data || []);
      }
    } catch (err: any) {
      console.error('Genel hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = products.map(product => ({
      'Ürün Kodu': product.code,
      'Ürün Adı': product.name,
      'Birim': product.unit || 'Adet',
      'Mevcut Stok': product.current_stock || 0,
      'Min. Stok': product.min_stock || 0,
      'Alış Fiyatı': (product.purchase_price || 0).toFixed(2),
      'Satış Fiyatı': (product.sale_price || 0).toFixed(2),
      'Stok Değeri': ((product.current_stock || 0) * (product.purchase_price || 0)).toFixed(2),
      'Durum': (product.current_stock || 0) <= (product.min_stock || 0) ? 'KRİTİK' : 'NORMAL'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Durumu');
    XLSX.writeFile(wb, `stok_durumu_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const totalValue = products.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.purchase_price || 0)), 0);
    const criticalCount = products.filter(p => (p.current_stock || 0) <= (p.min_stock || 0)).length;
    return { totalValue, criticalCount, totalCount: products.length };
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Stok Durumu Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={fetchUserAndProducts}
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stok Durumu Raporu</h1>
        <p className="text-gray-600">Güncel stok durumu ve değer analizi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Ürün</div>
          <div className="text-2xl font-bold text-gray-900">{totals.totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Kritik Stok</div>
          <div className="text-2xl font-bold text-red-600">{totals.criticalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Stok Değeri</div>
          <div className="text-2xl font-bold text-gray-900">₺{totals.totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Excel Export */}
      {products.length > 0 && (
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
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">Kayıt bulunamadı.</p>
            <p className="text-sm text-gray-400">Stok modülünden ürün ekledikten sonra bu raporu görüntüleyebilirsiniz.</p>
            <a href="/stok/ekle" className="mt-3 inline-block text-blue-600 hover:text-blue-800 underline text-sm">
              Yeni Ürün Ekle →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alış F.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satış F.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={(product.current_stock || 0) <= (product.min_stock || 0) ? 'text-red-600 font-semibold' : ''}>
                        {product.current_stock || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.min_stock || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unit || 'Adet'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{(product.purchase_price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₺{(product.sale_price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (product.current_stock || 0) <= (product.min_stock || 0)
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {(product.current_stock || 0) <= (product.min_stock || 0) ? 'KRİTİK' : 'NORMAL'}
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
        <p>Debug: {products.length} ürün listelendi.</p>
        {userInfo && <p>User ID: {userInfo.id}</p>}
      </div>
    </div>
  );
}