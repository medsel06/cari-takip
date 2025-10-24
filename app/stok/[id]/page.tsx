'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  User,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  category: string;
}

interface StockMovement {
  id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  unit_price: number;
  total_price: number;
  movement_date: string;
  description: string;
  reference_no: string;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function UrunDetayPage() {
  const params = useParams();
  const productId = params.id as string;
  const supabase = createClient();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all');

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const fetchProductData = async () => {
    try {
      // Ürün bilgilerini getir
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Stok hareketlerini getir
      const { data: movementData, error: movementError } = await supabase
        .from('stock_movements')
        .select(`
          *,
          customer:customers(id, name, code)
        `)
        .eq('product_id', productId)
        .order('movement_date', { ascending: false });

      if (movementError) throw movementError;
      setMovements(movementData || []);
    } catch (error) {
      console.error('Error fetching product data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in') return m.movement_type === 'IN';
    if (activeTab === 'out') return m.movement_type === 'OUT';
    return true;
  });

  const totalIn = movements
    .filter(m => m.movement_type === 'IN')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOut = movements
    .filter(m => m.movement_type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0);

  const stockStatus = product && product.current_stock < product.min_stock;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ürün bulunamadı.</p>
        <Link href="/stok" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Stok listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/stok"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Stok Listesine Dön
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Ürün Kodu: {product.code} • Kategori: {product.category}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Ürün Bilgileri */}
        <div className="lg:col-span-1">
          {/* Stok Durumu */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stok Durumu</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Mevcut Stok</p>
                <p className={`text-2xl font-bold ${stockStatus ? 'text-red-600' : 'text-green-600'}`}>
                  {product.current_stock} {product.unit}
                </p>
                {stockStatus && (
                  <div className="flex items-center mt-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Kritik stok seviyesi
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Minimum Stok</span>
                  <span className="text-sm font-medium">{product.min_stock} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Toplam Giriş</span>
                  <span className="text-sm font-medium text-green-600">+{totalIn} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Toplam Çıkış</span>
                  <span className="text-sm font-medium text-red-600">-{totalOut} {product.unit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fiyat Bilgileri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fiyat Bilgileri</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Alış Fiyatı</span>
                <span className="text-sm font-medium">{formatCurrency(product.purchase_price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Satış Fiyatı</span>
                <span className="text-sm font-medium">{formatCurrency(product.sale_price)}</span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Kar Marjı</span>
                  <span className="text-sm font-medium text-green-600">
                    %{((product.sale_price - product.purchase_price) / product.purchase_price * 100).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Stok Hareketleri */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Tab Headers */}
            <div className="border-b border-gray-200 px-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Tüm Hareketler ({movements.length})
                </button>
                <button
                  onClick={() => setActiveTab('in')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'in'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingDown className="inline-block h-4 w-4 mr-1" />
                  Girişler ({movements.filter(m => m.movement_type === 'IN').length})
                </button>
                <button
                  onClick={() => setActiveTab('out')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'out'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="inline-block h-4 w-4 mr-1" />
                  Çıkışlar ({movements.filter(m => m.movement_type === 'OUT').length})
                </button>
              </nav>
            </div>

            {/* Movements List */}
            <div className="p-6">
              {filteredMovements.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {activeTab === 'all' ? 'Henüz stok hareketi yok' :
                   activeTab === 'in' ? 'Henüz giriş hareketi yok' :
                   'Henüz çıkış hareketi yok'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            {movement.movement_type === 'IN' ? (
                              <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
                            ) : (
                              <TrendingUp className="h-5 w-5 text-red-500 mr-2" />
                            )}
                            <span className={`font-medium ${
                              movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.movement_type === 'IN' ? 'Giriş' : 'Çıkış'}
                            </span>
                            <span className="mx-2 text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {formatDate(movement.movement_date || movement.created_at)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Miktar:</span> {movement.quantity} {product.unit}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Birim Fiyat:</span> {formatCurrency(movement.unit_price)}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Belge No:</span> {movement.reference_no}
                              </p>
                            </div>

                            <div>
                              {movement.customer && (
                                <Link
                                  href={`/firma-detay?customer_id=${movement.customer.id}`}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <User className="inline-block h-4 w-4 mr-1" />
                                  {movement.customer.name}
                                </Link>
                              )}
                              <p className="text-sm text-gray-600 mt-1">
                                {movement.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-lg font-semibold">
                            {formatCurrency(movement.total_price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}