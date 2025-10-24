'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

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
  product: {
    id: string;
    name: string;
    code: string;
    unit: string;
  };
  customer: {
    id: string;
    name: string;
    code: string;
  };
}

interface GroupedMovement {
  reference_no: string;
  movement_type: 'IN' | 'OUT';
  movement_date: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  total_amount: number;
  item_count: number;
  items: StockMovement[];
}

export default function StokHareketListePage() {
  const supabase = createClient();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [groupedMovements, setGroupedMovements] = useState<GroupedMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'IN' | 'OUT'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(id, name, code, unit),
          customer:customers(id, name, code)
        `)
        .eq('company_id', userData.company_id)
        .order('movement_date', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
      
      // Hareketleri reference_no'ya göre grupla
      const grouped = groupMovementsByReference(data || []);
      setGroupedMovements(grouped);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const groupMovementsByReference = (movements: StockMovement[]): GroupedMovement[] => {
    const groups: { [key: string]: GroupedMovement } = {};
    
    movements.forEach(movement => {
      const key = movement.reference_no;
      
      if (!groups[key]) {
        groups[key] = {
          reference_no: movement.reference_no,
          movement_type: movement.movement_type,
          movement_date: movement.movement_date,
          customer: movement.customer,
          total_amount: 0,
          item_count: 0,
          items: []
        };
      }
      
      groups[key].total_amount += movement.total_price;
      groups[key].item_count += 1;
      groups[key].items.push(movement);
    });
    
    // Gruplari tarihe göre sırala
    return Object.values(groups).sort((a, b) => 
      new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime()
    );
  };

  const handleView = (referenceNo: string) => {
    const group = groupedMovements.find(g => g.reference_no === referenceNo);
    if (group && group.items.length > 0) {
      // İlk ürünün ID'sini kullanarak detay sayfasına yönlendir
      window.location.href = `/stok/hareketler/${group.items[0].id}`;
    }
  };

  const handleEdit = (referenceNo: string) => {
    const group = groupedMovements.find(g => g.reference_no === referenceNo);
    if (group && group.items.length > 0) {
      // İlk ürünün ID'sini kullanarak düzenleme sayfasına yönlendir
      window.location.href = `/stok/hareketler/${group.items[0].id}/duzenle`;
    }
  };

  const handleDelete = async (referenceNo: string) => {
    if (!confirm('Bu hareketi silmek istediğinizden emin misiniz? Tüm ürünler silinecektir.')) return;

    try {
      // Aynı reference_no'ya sahip tüm kayıtları sil
      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .eq('reference_no', referenceNo);

      if (error) throw error;
      
      // State'i güncelle
      setMovements(movements.filter(m => m.reference_no !== referenceNo));
      const newGrouped = groupedMovements.filter(g => g.reference_no !== referenceNo);
      setGroupedMovements(newGrouped);
      
      alert('Hareket başarıyla silindi');
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Silme işlemi sırasında hata oluştu');
    }
  };

  const filteredGroups = groupedMovements.filter(group => {
    // Tip filtresi
    if (filterType !== 'all' && group.movement_type !== filterType) return false;
    
    // Tarih filtresi
    if (startDate && group.movement_date < startDate) return false;
    if (endDate && group.movement_date > endDate) return false;
    
    // Arama filtresi
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        group.customer?.name.toLowerCase().includes(search) ||
        group.reference_no.toLowerCase().includes(search) ||
        group.items.some(item => 
          item.product?.name.toLowerCase().includes(search) ||
          item.product?.code.toLowerCase().includes(search)
        )
      );
    }
    
    return true;
  });

  const totalIn = filteredGroups
    .filter(g => g.movement_type === 'IN')
    .reduce((sum, g) => sum + g.total_amount, 0);
    
  const totalOut = filteredGroups
    .filter(g => g.movement_type === 'OUT')
    .reduce((sum, g) => sum + g.total_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link
            href="/stok"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Stok Yönetimine Dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mal Alış/Satış Listesi</h1>
        </div>
        
        <Link
          href="/stok/hareketler/yeni"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Hareket
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="IN">Alışlar</option>
              <option value="OUT">Satışlar</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Başlangıç"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bitiş"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t flex justify-end space-x-6 text-sm">
          <div className="flex items-center">
            <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-gray-600 mr-2">Toplam Alış:</span>
            <span className="font-semibold text-green-600">{formatCurrency(totalIn)}</span>
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-gray-600 mr-2">Toplam Satış:</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totalOut)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="w-full overflow-x-auto lg:overflow-visible">
          <table className="w-full lg:table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[10%] px-2 lg:px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tarih
                </th>
                <th className="w-[10%] px-2 lg:px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  Belge
                </th>
                <th className="w-[8%] px-2 lg:px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tür
                </th>
                <th className="w-[25%] lg:w-[22%] px-2 lg:px-3 xl:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cari
                </th>
                <th className="w-[15%] lg:w-[15%] px-2 lg:px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Kalem Sayısı
                </th>
                <th className="w-[15%] px-2 lg:px-3 xl:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Toplam
                </th>
                <th className="w-[8%] lg:w-[10%] px-2 lg:px-3 xl:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr key={group.reference_no} className="hover:bg-gray-50">
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-xs text-gray-900">
                      <div className="font-medium">
                        {formatDate(group.movement_date)}
                      </div>
                      <div className="text-[10px] text-gray-500 md:hidden">
                        {group.reference_no}
                      </div>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-xs text-gray-900 hidden md:table-cell">
                      <div className="truncate font-medium">
                        {group.reference_no}
                      </div>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-center">
                      <span className={`inline-flex items-center justify-center px-1 lg:px-2 py-0.5 rounded text-[10px] lg:text-xs font-medium ${
                        group.movement_type === 'IN'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {group.movement_type === 'IN' ? (
                          <>
                            <TrendingDown className="h-3 w-3 mr-0.5 hidden xl:inline-block" />
                            <span className="hidden lg:inline">Alış</span>
                            <span className="lg:hidden">A</span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-3 w-3 mr-0.5 hidden xl:inline-block" />
                            <span className="hidden lg:inline">Satış</span>
                            <span className="lg:hidden">S</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3">
                      <button
                        onClick={() => window.location.href = `/firma-detay?customer_id=${group.customer?.id}`}
                        className="text-left hover:underline block w-full"
                      >
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {group.customer?.name}
                        </div>
                      </button>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {group.item_count} Kalem
                      </span>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-xs font-semibold text-gray-900 text-right">
                      <div className="whitespace-nowrap text-base">
                        {formatCurrency(group.total_amount)}
                      </div>
                    </td>
                    <td className="px-2 lg:px-3 xl:px-4 py-2 lg:py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(group.reference_no)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(group.reference_no)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.reference_no)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}