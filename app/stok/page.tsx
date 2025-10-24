'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Eye, 
  Package,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Trash2,
  BarChart,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Product } from '@/lib/types';

export default function StokPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'out'>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // RLS açık olduğu için direkt ürünleri getir
      // RLS otomatik olarak sadece kullanıcının firmasındaki ürünleri getirecek
      const { data, error } = await supabase
        .from('products')
        .select('id, code, name, barcode, unit, product_type, current_stock, min_stock, max_stock, purchase_price, sale_price')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Ürünler getirilirken hata:', error);
        throw error;
      }
      
      console.log('Getirilen ürün sayısı:', data?.length);
      console.log('Ürünler:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Ürünler yüklenirken hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  // Stok durumunu hesapla
  const getStockStatus = (product: Product) => {
    if (product.current_stock <= 0) {
      return { text: 'Stok Yok', color: 'text-red-600 bg-red-50', badge: 'bg-red-100 text-red-800' };
    } else if (product.current_stock < product.min_stock) {
      return { text: 'Kritik', color: 'text-orange-600 bg-orange-50', badge: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: 'Yeterli', color: 'text-green-600 bg-green-50', badge: 'bg-green-100 text-green-800' };
    }
  };

  // Filtreleme
  const filteredProducts = products.filter(product => {
    // Metin araması
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));

    // Durum filtresi
    let matchesStatus = true;
    if (filterStatus === 'critical') {
      matchesStatus = product.current_stock < product.min_stock && product.current_stock > 0;
    } else if (filterStatus === 'out') {
      matchesStatus = product.current_stock <= 0;
    }

    return matchesSearch && matchesStatus;
  });

  // Özet istatistikler
  const stats = {
    totalProducts: products.length,
    criticalStock: products.filter(p => p.current_stock < p.min_stock && p.current_stock > 0).length,
    outOfStock: products.filter(p => p.current_stock <= 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.current_stock * p.purchase_price), 0)
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchProducts();
      alert('Ürün başarıyla silindi');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ürün silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stok Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">Toplam {products.length} ürün</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-card border text-foreground rounded-lg hover:bg-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          <Link
            href="/stok/ekle"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Ürün
          </Link>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Toplam Ürün</p>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="card rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Kritik Stok</p>
              <p className="text-2xl font-bold text-orange-600">{stats.criticalStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="card rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stokta Yok</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="card rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stok Değeri</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <BarChart className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="card rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ürün adı, kodu veya barkod ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü ({products.length})
            </button>
            <button
              onClick={() => setFilterStatus('critical')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'critical' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kritik ({stats.criticalStock})
            </button>
            <button
              onClick={() => setFilterStatus('out')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'out' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tükenen ({stats.outOfStock})
            </button>
          </div>
        </div>
      </div>

      {/* Ürün Tablosu */}
      <div className="card rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Ürün Bilgisi
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Stok Durumu
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Alış Fiyatı
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Satış Fiyatı
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Kar Marjı
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-lg font-medium">Ürün bulunamadı</p>
                    <p className="text-sm mt-1">Arama kriterlerinizi değiştirin veya yeni ürün ekleyin</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const profit = product.sale_price - product.purchase_price;
                  const profitMargin = product.purchase_price > 0 
                    ? (profit / product.purchase_price * 100).toFixed(1)
                    : '0';

                  return (
                    <tr key={product.id} className="hover:bg-secondary transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">Kod: {product.code}</div>
                          {product.barcode && (
                            <div className="text-xs text-muted-foreground/70">Barkod: {product.barcode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {product.current_stock} {product.unit}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Min: {product.min_stock} {product.unit}
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.badge}`}>
                            {status.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{formatCurrency(product.purchase_price)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{formatCurrency(product.sale_price)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-green-600">{formatCurrency(profit)}</div>
                          <div className="text-xs text-muted-foreground">%{profitMargin}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/stok/${product.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/stok/${product.id}/duzenle`}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}