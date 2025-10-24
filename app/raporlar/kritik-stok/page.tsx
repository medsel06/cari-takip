'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, AlertTriangle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  stock_percentage: number;
  status: 'critical' | 'warning' | 'normal';
}

export default function KritikStokRaporuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyCritical, setShowOnlyCritical] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserAndProducts();
  }, [showOnlyCritical]);

  const fetchUserAndProducts = async () => {
    const supabase = createClient();
    
    try {
      console.log('Kritik stok - Kullanıcı bilgileri alınıyor...');
      
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

      // Ürünleri getir
      const { data, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      console.log('Products:', data?.length, 'records found');

      if (productsError) {
        setError(`Ürünler yüklenemedi: ${productsError.message}`);
      } else {
        // Stok durumunu hesapla
        const productsWithStatus = (data || []).map(product => {
          const percentage = product.min_stock > 0 
            ? (product.current_stock / product.min_stock) * 100 
            : 100;
          
          let status: 'critical' | 'warning' | 'normal' = 'normal';
          if (percentage <= 25) {
            status = 'critical';
          } else if (percentage <= 50) {
            status = 'warning';
          }

          return {
            ...product,
            stock_percentage: percentage,
            status
          };
        });

        // Sadece kritik ve uyarı durumundaki ürünleri göster
        const filteredProducts = showOnlyCritical 
          ? productsWithStatus.filter(p => p.status !== 'normal')
          : productsWithStatus;

        setProducts(filteredProducts);
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
      'Birim': product.unit,
      'Mevcut Stok': product.current_stock,
      'Min. Stok': product.min_stock,
      'Stok %': product.stock_percentage.toFixed(0) + '%',
      'Eksik Miktar': Math.max(0, product.min_stock - product.current_stock),
      'Durum': product.status === 'critical' ? 'KRİTİK' : product.status === 'warning' ? 'UYARI' : 'NORMAL',
      'Tahmini Alış Maliyeti': (Math.max(0, product.min_stock - product.current_stock) * product.purchase_price).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kritik Stok');
    XLSX.writeFile(wb, `kritik_stok_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const calculateTotals = () => {
    const criticalCount = products.filter(p => p.status === 'critical').length;
    const warningCount = products.filter(p => p.status === 'warning').length;
    const totalShortage = products.reduce((sum, p) => sum + Math.max(0, p.min_stock - p.current_stock), 0);
    const totalCost = products.reduce((sum, p) => {
      const shortage = Math.max(0, p.min_stock - p.current_stock);
      return sum + (shortage * p.purchase_price);
    }, 0);
    return { criticalCount, warningCount, totalShortage, totalCost };
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Kritik Stok Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3 space-y-2">
            <button 
              onClick={() => fetchUserAndProducts()}
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Kritik Stok Raporu</h1>
        <p className="text-gray-600">Stok seviyesi düşük olan ürünler</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-600 font-medium">Kritik Ürünler</div>
              <div className="text-2xl font-bold text-red-700">{totals.criticalCount}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-yellow-600 font-medium">Uyarı Durumu</div>
              <div className="text-2xl font-bold text-yellow-700">{totals.warningCount}</div>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Toplam Eksik</div>
          <div className="text-2xl font-bold text-gray-900">{totals.totalShortage}</div>
          <div className="text-xs text-gray-500">Birim</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tahmini Maliyet</div>
          <div className="text-2xl font-bold text-gray-900">₺{totals.totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Min. stok için</div>
        </div>
      </div>

      {/* Filtre ve Butonlar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyCritical}
              onChange={(e) => setShowOnlyCritical(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Sadece kritik ve uyarı durumundaki ürünleri göster</span>
          </label>
        </div>

        {products.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        )}
      </div>

      {/* Uyarı Mesajı */}
      {totals.criticalCount > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              Dikkat! {totals.criticalCount} üründe kritik stok seviyesi
            </p>
            <p className="text-sm text-red-700 mt-1">
              Bu ürünler için acil sipariş vermenizi öneririz.
            </p>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Kritik stok seviyesinde ürün bulunmuyor.</p>
            <p className="text-sm text-gray-400 mt-2">
              {showOnlyCritical ? 'Tüm ürünleri görmek için filtreyi kaldırabilirsiniz.' : 'Harika! Stok seviyeleriniz normal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mevcut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eksik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Maliyet</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4">
                      <div className="flex justify-center">
                        {product.status === 'critical' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                        ) : product.status === 'warning' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        product.status === 'critical' ? 'text-red-600' : 
                        product.status === 'warning' ? 'text-yellow-600' : ''
                      }`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.min_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden max-w-[60px]">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              product.status === 'critical' ? 'bg-red-500' : 
                              product.status === 'warning' ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(product.stock_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{product.stock_percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {Math.max(0, product.min_stock - product.current_stock) > 0 ? (
                        <span className="font-medium text-red-600">-{Math.max(0, product.min_stock - product.current_stock)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {Math.max(0, product.min_stock - product.current_stock) > 0 ? (
                        <span className="font-medium">₺{(Math.max(0, product.min_stock - product.current_stock) * product.purchase_price).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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