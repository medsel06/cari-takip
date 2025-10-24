'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  Building,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Plus,
  Filter
} from 'lucide-react';
import { Customer, AccountMovement } from '@/lib/types';
import { formatCurrency, formatDate, customerTypeLabels, accountMovementTypeLabels } from '@/lib/utils';

export default function CariDetayPage() {
  const params = useParams();
  const supabase = createClient();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'detail' | 'movements' | 'analysis'>('detail');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState<'all' | 'DEBT' | 'CREDIT'>('all');

  // İstatistikler
  const [stats, setStats] = useState({
    totalDebt: 0,
    totalCredit: 0,
    balance: 0,
    transactionCount: 0,
    lastTransactionDate: '',
    overdueAmount: 0,
    overdueCount: 0,
  });

  useEffect(() => {
    if (params.id) {
      fetchCustomerData();
      fetchMovements();
    }
  }, [params.id]);

  useEffect(() => {
    calculateStats();
  }, [movements]);

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false }); // Yeniden eskiye sıralama

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const filteredMovements = movements.filter(m => {
      if (typeFilter !== 'all' && m.movement_type !== typeFilter) return false;
      if (dateFilter.start && new Date(m.created_at) < new Date(dateFilter.start)) return false;
      if (dateFilter.end && new Date(m.created_at) > new Date(dateFilter.end)) return false;
      return true;
    });

    const totalDebt = filteredMovements
      .filter(m => m.movement_type === 'DEBT')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalCredit = filteredMovements
      .filter(m => m.movement_type === 'CREDIT')
      .reduce((sum, m) => sum + m.amount, 0);

    const today = new Date();
    const overdueMovements = movements.filter(m => 
      m.movement_type === 'DEBT' && 
      !m.is_paid && 
      m.due_date && 
      new Date(m.due_date) < today
    );

    setStats({
      totalDebt,
      totalCredit,
      balance: totalDebt - totalCredit,
      transactionCount: filteredMovements.length,
      lastTransactionDate: movements[0]?.created_at || '',
      overdueAmount: overdueMovements.reduce((sum, m) => sum + (m.amount - m.paid_amount), 0),
      overdueCount: overdueMovements.length,
    });
  };

  const exportToExcel = async () => {
    const { exportToExcel } = await import('@/lib/utils');
    
    const data = movements.map(m => ({
      'Tarih': formatDate(m.created_at),
      'Açıklama': m.description,
      'Belge No': m.document_no || '-',
      'Vade': m.due_date ? formatDate(m.due_date) : '-',
      'Borç': m.movement_type === 'DEBT' ? m.amount : 0,
      'Alacak': m.movement_type === 'CREDIT' ? m.amount : 0,
      'Bakiye': 0, // Hesaplanacak
    }));

    // Bakiye hesapla
    let balance = 0;
    data.forEach(row => {
      balance += row.Borç - row.Alacak;
      row.Bakiye = balance;
    });

    exportToExcel(data, `${customer?.name}_ekstre_${new Date().toISOString().split('T')[0]}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cari bulunamadı.</p>
        <Link href="/cari" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Cari listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cari"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cari Listesine Dön
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {customer.code}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {customerTypeLabels[customer.type]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {customer.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href={`/cari/${customer.id}/duzenle`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
            <Link
              href={`/cari/tahsilat/yeni?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tahsilat/Ödeme
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Toplam Borç</span>
            <TrendingUp className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalDebt)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Toplam Alacak</span>
            <TrendingDown className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCredit)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Bakiye</span>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          <p className={`text-2xl font-bold ${stats.balance > 0 ? 'text-red-600' : stats.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Vadesi Geçen</span>
            <Calendar className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.overdueAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.overdueCount} adet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('detail')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'detail'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cari Bilgileri
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hesap Hareketleri ({movements.length})
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analiz
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Cari Bilgileri Tab */}
          {activeTab === 'detail' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* İletişim Bilgileri */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h3>
                <div className="space-y-3">
                  {customer.authorized_person && (
                    <div className="flex items-start">
                      <Building className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Yetkili Kişi</p>
                        <p className="text-gray-900">{customer.authorized_person}</p>
                      </div>
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Telefon</p>
                        <p className="text-gray-900">{customer.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {customer.mobile && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cep Telefonu</p>
                        <p className="text-gray-900">{customer.mobile}</p>
                      </div>
                    </div>
                  )}
                  
                  {customer.email && (
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">E-posta</p>
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800">
                          {customer.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {(customer.address || customer.city) && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Adres</p>
                        <p className="text-gray-900">
                          {customer.address}
                          {customer.address && customer.city && ' - '}
                          {customer.city}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticari Bilgiler */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticari Bilgiler</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vergi Dairesi</p>
                    <p className="text-gray-900">{customer.tax_office || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vergi No / TC Kimlik No</p>
                    <p className="text-gray-900">{customer.tax_number || '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kredi Limiti</p>
                    <p className="text-gray-900">{formatCurrency(customer.credit_limit)}</p>
                    {customer.balance > customer.credit_limit && customer.credit_limit > 0 && (
                      <p className="text-xs text-red-600 mt-1">Kredi limiti aşıldı!</p>
                    )}
                  </div>
                  
                  {customer.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Notlar</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hesap Hareketleri Tab */}
          {activeTab === 'movements' && (
            <div>
              {/* Filtreler */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Başlangıç Tarihi
                      </label>
                      <input
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hareket Tipi
                      </label>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Tümü</option>
                        <option value="DEBT">Borç</option>
                        <option value="CREDIT">Alacak</option>
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel'e Aktar
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600">Dönem Borç:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(stats.totalDebt)}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600">Dönem Alacak:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(stats.totalCredit)}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="text-gray-600">Dönem Bakiye:</span>
                    <span className={`ml-2 font-semibold ${stats.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(stats.balance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hareketler Tablosu */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Belge No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vade
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Borç
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alacak
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bakiye
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const filteredMovements = movements.filter(m => {
                        if (typeFilter !== 'all' && m.movement_type !== typeFilter) return false;
                        if (dateFilter.start && new Date(m.created_at) < new Date(dateFilter.start)) return false;
                        if (dateFilter.end && new Date(m.created_at) > new Date(dateFilter.end)) return false;
                        return true;
                      });

                      if (filteredMovements.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                              Hareket bulunamadı.
                            </td>
                          </tr>
                        );
                      }

                      // Bakiye hesaplaması için önce tüm hareketleri tersine çevir (eskiden yeniye)
                      const sortedForBalance = [...filteredMovements].reverse();
                      const balanceMap = new Map();
                      let runningBalance = 0;
                      
                      // Eskiden yeniye bakiye hesapla
                      sortedForBalance.forEach(movement => {
                        runningBalance += movement.movement_type === 'DEBT' ? movement.amount : -movement.amount;
                        balanceMap.set(movement.id, runningBalance);
                      });

                      // Gösterim için yeniden eskiye sıralı listeyi kullan
                      return filteredMovements.map((movement) => {
                        const currentBalance = balanceMap.get(movement.id) || 0;
                        const isOverdue = movement.due_date && new Date(movement.due_date) < new Date() && !movement.is_paid;
                        
                        return (
                          <tr key={movement.id} className={isOverdue ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(movement.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {movement.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.document_no || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.due_date ? formatDate(movement.due_date) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                              {movement.movement_type === 'DEBT' ? (
                                <span className="text-red-600">{formatCurrency(movement.amount)}</span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                              {movement.movement_type === 'CREDIT' ? (
                                <span className="text-green-600">{formatCurrency(movement.amount)}</span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                              <span className={currentBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(Math.abs(currentBalance))}
                                {currentBalance > 0 ? ' (B)' : currentBalance < 0 ? ' (A)' : ''}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analiz Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* Özet Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">İşlem Özeti</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Toplam İşlem:</dt>
                      <dd className="font-medium">{stats.transactionCount} adet</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Son İşlem:</dt>
                      <dd className="font-medium">
                        {stats.lastTransactionDate ? formatDate(stats.lastTransactionDate) : '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Ortalama Tutar:</dt>
                      <dd className="font-medium">
                        {formatCurrency(
                          stats.transactionCount > 0 
                            ? (stats.totalDebt + stats.totalCredit) / stats.transactionCount 
                            : 0
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Risk Analizi</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Risk Durumu:</dt>
                      <dd className="font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          stats.overdueAmount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {stats.overdueAmount > 0 ? 'Riskli' : 'Normal'}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Limit Kullanımı:</dt>
                      <dd className="font-medium">
                        {customer.credit_limit > 0 
                          ? `${Math.round((customer.balance / customer.credit_limit) * 100)}%`
                          : '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Vadesi Geçen:</dt>
                      <dd className="font-medium text-red-600">
                        {formatCurrency(stats.overdueAmount)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Tahsilat Performansı</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Tahsilat Oranı:</dt>
                      <dd className="font-medium">
                        {stats.totalDebt > 0 
                          ? `${Math.round((stats.totalCredit / stats.totalDebt) * 100)}%`
                          : '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Ödeme Süresi:</dt>
                      <dd className="font-medium">Hesaplanıyor...</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Grafik veya ek analizler buraya eklenebilir */}
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Detaylı analiz grafikleri yakında eklenecek.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}