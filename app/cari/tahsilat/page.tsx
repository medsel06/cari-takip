'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentMovement {
  id: string;
  customer_id: string;
  movement_type: 'DEBT' | 'CREDIT';
  amount: number;
  description: string;
  document_no: string;
  due_date: string;
  payment_method: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
}

export default function TahsilatListePage() {
  const supabase = createClient();
  const [movements, setMovements] = useState<PaymentMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'DEBT' | 'CREDIT'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('account_movements')
        .select(`
          *,
          customer:customers(id, name, code)
        `)
        .eq('company_id', userData.company_id)
        .in('document_type', ['payment', 'collection'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('account_movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMovements(movements.filter(m => m.id !== id));
      alert('Kayıt başarıyla silindi');
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Silme işlemi sırasında hata oluştu');
    }
  };

  const filteredMovements = movements.filter(movement => {
    // Tip filtresi
    if (filterType !== 'all' && movement.movement_type !== filterType) return false;
    
    // Tarih filtresi
    const movementDate = movement.due_date || movement.created_at;
    if (startDate && movementDate < startDate) return false;
    if (endDate && movementDate > endDate) return false;
    
    // Arama filtresi
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        movement.customer?.name.toLowerCase().includes(search) ||
        movement.customer?.code.toLowerCase().includes(search) ||
        movement.document_no?.toLowerCase().includes(search) ||
        movement.description.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const totalPayments = filteredMovements
    .filter(m => m.movement_type === 'DEBT')
    .reduce((sum, m) => sum + m.amount, 0);
    
  const totalCollections = filteredMovements
    .filter(m => m.movement_type === 'CREDIT')
    .reduce((sum, m) => sum + m.amount, 0);

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'Nakit',
      'transfer': 'Havale/EFT',
      'check': 'Çek',
      'credit_card': 'Kredi Kartı'
    };
    return methods[method] || method;
  };

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
            href="/cari"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cari Hesaplara Dön
          </Link>
          <h1 className="text-2xl font-bold">Tahsilat/Ödeme Listesi</h1>
        </div>
        
        <Link
          href="/cari/tahsilat/yeni"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Tahsilat/Ödeme
        </Link>
      </div>

      {/* Filters */}
      <div className="card rounded-lg mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ara..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="flex-1 py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Tümü</option>
              <option value="CREDIT">Tahsilatlar</option>
              <option value="DEBT">Ödemeler</option>
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Başlangıç"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 py-2 px-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Bitiş"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t flex justify-end space-x-6 text-sm">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-muted-foreground mr-2">Toplam Tahsilat:</span>
            <span className="font-semibold text-green-600">{formatCurrency(totalCollections)}</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-muted-foreground mr-2">Toplam Ödeme:</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totalPayments)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Belge No
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  İşlem Tipi
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Cari
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Ödeme Yöntemi
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                  Açıklama
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-secondary transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {formatDate(movement.due_date || movement.created_at)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {movement.document_no || '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        movement.movement_type === 'CREDIT'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        <DollarSign className="h-3 w-3 mr-1" />
                        {movement.movement_type === 'CREDIT' ? 'Tahsilat' : 'Ödeme'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => window.location.href = `/firma-detay?customer_id=${movement.customer?.id}`}
                        className="w-full text-left hover:underline"
                      >
                        <div className="text-sm font-medium cursor-pointer">{movement.customer?.name}</div>
                        <div className="text-xs text-muted-foreground">{movement.customer?.code}</div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                      {getPaymentMethodLabel(movement.payment_method || 'cash')}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      <button
                        onClick={() => {
                          // Çek içeren bir kayıtsa çek detayına yönlendir
                          if (movement.payment_method === 'check' && movement.description.includes('Çek No:')) {
                            // Açıklamadan çek numarasını çıkar
                            const checkNoMatch = movement.description.match(/Çek No: ([\w-]+)/);
                            if (checkNoMatch) {
                              // Çek numarasıyla çek detay sayfasına git
                              window.location.href = `/cek?search=${checkNoMatch[1]}`;
                            }
                          }
                        }}
                        className={`text-left ${
                          movement.payment_method === 'check' ? 'hover:underline cursor-pointer' : ''
                        }`}
                      >
                        <div className="max-w-xs truncate" title={movement.description}>
                          {movement.description}
                        </div>
                      </button>
                    </td>
                    <td className={`px-3 py-2.5 whitespace-nowrap text-sm font-semibold text-right ${
                      movement.movement_type === 'CREDIT' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {formatCurrency(movement.amount)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/cari/tahsilat/${movement.id}/duzenle`}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900 transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/firma-detay?customer_id=${movement.customer_id || movement.customer?.id}`}
                          className="inline-flex items-center justify-center text-green-600 hover:text-green-900 transition-colors"
                          title="Cari Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(movement.id)}
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-900 transition-colors"
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