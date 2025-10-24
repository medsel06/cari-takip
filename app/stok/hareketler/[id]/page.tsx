'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Package,
  User,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

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
  created_by: string;
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
    current_stock: number;
  };
  customer: {
    id: string;
    name: string;
    code: string;
    phone: string;
    email: string;
  };
}

export default function StokHareketDetayPage() {
  const params = useParams();
  const supabase = createClient();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');

  useEffect(() => {
    if (params.id) {
      fetchMovements();
    }
  }, [params.id]);

  const fetchMovements = async () => {
    try {
      // Önce parametredeki ID'ye sahip hareketi bul
      const { data: firstMovement, error: firstError } = await supabase
        .from('stock_movements')
        .select('reference_no, movement_type')
        .eq('id', params.id)
        .single();

      if (firstError) throw firstError;
      
      if (firstMovement) {
        setMovementType(firstMovement.movement_type);
        
        // Aynı reference_no'ya sahip tüm hareketleri getir
        const { data, error } = await supabase
          .from('stock_movements')
          .select(`
            *,
            product:products(id, name, code, unit, current_stock),
            customer:customers(id, name, code, phone, email)
          `)
          .eq('reference_no', firstMovement.reference_no)
          .order('created_at');

        if (error) throw error;
        setMovements(data || []);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz? Tüm ürünler silinecektir.')) return;

    try {
      if (movements.length > 0) {
        const { error } = await supabase
          .from('stock_movements')
          .delete()
          .eq('reference_no', movements[0].reference_no);

        if (error) throw error;
        
        toast.success('Hareket başarıyla silindi');
        setTimeout(() => {
          window.location.href = '/stok/hareketler';
        }, 1000);
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast.error('Silme işlemi sırasında hata oluştu');
    }
  };

  const calculateTotal = () => {
    return movements.reduce((sum, movement) => sum + movement.total_price, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!movements.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hareket bulunamadı.</p>
        <Link href="/stok/hareketler" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Listeye dön
        </Link>
      </div>
    );
  }

  const firstMovement = movements[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/stok/hareketler"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Mal Alış/Satış Listesine Dön
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mal {movementType === 'IN' ? 'Alış' : 'Satış'} Detayı
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Belge No: {firstMovement.reference_no}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href={`/stok/hareketler/${firstMovement.id}/duzenle`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Hareket Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* İşlem Özeti */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Bilgileri</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  İşlem Tipi
                </label>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    movementType === 'IN'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {movementType === 'IN' ? (
                      <>
                        <TrendingDown className="h-4 w-4 mr-1" />
                        Mal Alışı
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Mal Satışı
                      </>
                    )}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  İşlem Tarihi
                </label>
                <div className="flex items-center text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(firstMovement.movement_date || firstMovement.created_at)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Belge No
                </label>
                <div className="flex items-center text-gray-900">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  {firstMovement.reference_no}
                </div>
              </div>
              

            </div>
            
            {firstMovement.description && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Açıklama
                </label>
                <p className="text-gray-900">{firstMovement.description}</p>
              </div>
            )}
          </div>

          {/* Ürün Listesi */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Ürün Listesi ({movements.length} Kalem)</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Miktar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Birim Fiyat
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <Link 
                              href={`/stok/${movement.product?.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600"
                            >
                              {movement.product?.name}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {movement.product?.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {movement.quantity} {movement.product?.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(movement.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(movement.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      Genel Toplam:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-bold text-gray-900">
                      {formatCurrency(calculateTotal())}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Cari Bilgileri */}
          {firstMovement.customer && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} Bilgileri
              </h2>
              
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <User className="h-10 w-10 text-gray-400 mr-4 mt-1" />
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {firstMovement.customer.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Kod: {firstMovement.customer.code}
                    </p>
                    {firstMovement.customer.phone && (
                      <p className="text-sm text-gray-500 mt-1">
                        Tel: {firstMovement.customer.phone}
                      </p>
                    )}
                    {firstMovement.customer.email && (
                      <p className="text-sm text-gray-500">
                        Email: {firstMovement.customer.email}
                      </p>
                    )}
                  </div>
                </div>
                
                <Link
                  href={`/cari/${firstMovement.customer.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Cari Detayı →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon - Özet Bilgiler */}
        <div className="space-y-6">
          {/* Tutar Özeti */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Özeti</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Toplam Kalem</span>
                <span className="text-sm font-medium text-gray-900">
                  {movements.length} Kalem
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Toplam Miktar</span>
                <span className="text-sm font-medium text-gray-900">
                  {movements.reduce((sum, m) => sum + m.quantity, 0)} Birim
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-semibold text-gray-900">Genel Toplam</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>

          {/* Hızlı İşlemler */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Hızlı İşlemler</h3>
            
            <div className="space-y-2">
              <Link
                href="/stok/hareketler/yeni"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Yeni Hareket Ekle
              </Link>
              
              {firstMovement.customer && (
                <Link
                  href={`/cari/${firstMovement.customer.id}`}
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cariye Git
                </Link>
              )}
              
              {movementType === 'OUT' && (
                <button
                  onClick={() => {
                    // Fatura oluşturma için veriyi sessionStorage'a kaydet
                    sessionStorage.setItem('invoiceData', JSON.stringify({
                      customer_id: firstMovement.customer.id,
                      customer_name: firstMovement.customer.name,
                      document_no: firstMovement.reference_no,
                      items: movements.map(m => ({
                        product_id: m.product.id,
                        product_name: m.product.name,
                        quantity: m.quantity,
                        unit_price: m.unit_price,
                        total_price: m.total_price,
                        unit: m.product.unit
                      })),
                      total_amount: calculateTotal(),
                      movement_type: movementType
                    }));
                    window.location.href = '/fatura/yeni?from=stock-movement';
                  }}
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Fatura Oluştur
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
