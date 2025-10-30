'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Eye, X, Save, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Check } from '@/lib/types';
import { formatCurrency, formatDate, checkStatusLabels, checkTypeLabels } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { logger, getErrorMessage } from '@/lib/logger';

const getCheckStatusLabel = (status: Check['status'], type: Check['type']) => {
  if (type === 'issued') {
    // Verilen çekler için özel etiketler
    switch (status) {
      case 'portfolio': return 'Verildi';
      case 'collected': return 'Ödendi';
      case 'returned': return 'İptal Edildi';
      default: return checkStatusLabels[status];
    }
  }
  // Alınan çekler için standart etiketler
  return checkStatusLabels[status];
};

export default function CekPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCheckModal, setShowNewCheckModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Yeni çek form state
  const [newCheck, setNewCheck] = useState({
    check_number: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    drawer_name: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0], // Bugünün tarihi
    type: 'received' as 'received' | 'issued',
    customer_id: '',
    description: ''
  });
  
  const supabase = createClient();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchChecks();
    fetchCustomers();
  }, []);

  const fetchChecks = async () => {
    try {
      // Önce kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('checks')
        .select(`
          id,
          check_number,
          bank_name,
          branch_name,
          account_number,
          drawer_name,
          amount,
          due_date,
          status,
          type,
          description,
          customer_id,
          customers!customer_id(name)
        `)
        .eq('company_id', userData.company_id)
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;

      setChecks(data || []);
    } catch (error: any) {
      logger.error('Error fetching checks:', error);
      const errorMsg = getErrorMessage(error);
      toast.error('Çekler yüklenirken hata oluştu: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
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
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  const handleSaveCheck = async () => {
    if (!newCheck.check_number || !newCheck.bank_name || !newCheck.due_date || newCheck.amount <= 0) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bilgisi alınamadı');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('Şirket bilgisi bulunamadı');

      const { error } = await supabase
        .from('checks')
        .insert([{
          company_id: userData.company_id,
          customer_id: newCheck.customer_id || null,
          check_number: newCheck.check_number,
          bank_name: newCheck.bank_name,
          branch_name: newCheck.branch_name || null,
          account_number: newCheck.account_number || null,
          drawer_name: newCheck.drawer_name || null,
          amount: newCheck.amount,
          due_date: newCheck.due_date,
          status: 'portfolio',
          type: newCheck.type,
          description: newCheck.description || null,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast.success('Çek başarıyla eklendi');
      setShowNewCheckModal(false);
      setNewCheck({
        check_number: '',
        bank_name: '',
        branch_name: '',
        account_number: '',
        drawer_name: '',
        amount: 0,
        due_date: '',
        type: 'received',
        customer_id: '',
        description: ''
      });
      fetchChecks();
    } catch (error: any) {
      logger.error('Error saving check:', error);
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg || 'Çek kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Çek durumunu kontrol eden fonksiyon
  const isCheckClosed = (check: Check) => {
    // Alınan çek tahsil edilmiş veya ciro edilmiş
    if (check.type === 'received' && (check.status === 'collected' || check.status === 'endorsed')) {
      return true;
    }
    // Verilen çek ödenmiş
    if (check.type === 'issued' && check.status === 'collected') {
      return true;
    }
    // Karşılıksız çekler de kapanmış sayılır
    if (check.status === 'returned') {
      return true;
    }
    return false;
  };

  // Vade kontrolü
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Satır stili belirleme
  const getRowClassName = (check: Check) => {
    if (isCheckClosed(check)) {
      return 'opacity-50 bg-gray-50 dark:bg-gray-800';
    }
    if (check.status === 'portfolio' && isOverdue(check.due_date)) {
      return 'bg-red-50 dark:bg-red-900/20 border-red-200';
    }
    return '';
  };

  const columns: ColumnDef<Check>[] = [
    {
      accessorKey: 'check_number',
      header: 'Çek No',
      cell: ({ row }) => {
        const check = row.original;
        const closed = isCheckClosed(check);
        return (
          <span className={`${
            closed ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {check.check_number}
          </span>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Tip',
      cell: ({ row }) => {
        const isReceived = row.original.type === 'received';
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isReceived 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {isReceived ? (
              <>
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Alınan
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3.5 w-3.5" />
                Verilen
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'bank_name',
      header: 'Banka',
    },
    {
      accessorKey: 'customers.name',
      header: 'Cari',
      cell: ({ row }) => {
        return row.original.customers?.name || '-';
      },
    },
    {
      accessorKey: 'amount',
      header: 'Tutar',
      cell: ({ row }) => {
        const check = row.original;
        const closed = isCheckClosed(check);
        return (
          <span className={`font-medium ${
            closed ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {formatCurrency(check.amount)}
          </span>
        );
      },
    },
    {
      accessorKey: 'due_date',
      header: 'Vade Tarihi',
      cell: ({ row }) => {
        const check = row.original;
        const closed = isCheckClosed(check);
        const overdue = !closed && check.status === 'portfolio' && isOverdue(check.due_date);
        return (
          <span className={`${
            closed ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {formatDate(check.due_date)}
            {overdue && ' (Geçti)'}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Durum',
      cell: ({ row }) => {
        const check = row.original;
        const closed = isCheckClosed(check);
        const overdue = !closed && check.status === 'portfolio' && isOverdue(check.due_date);
        
        let colorClass = '';
        if (closed) {
          colorClass = 'bg-gray-100 text-gray-600';
        } else if (overdue) {
          colorClass = 'bg-red-100 text-red-800 ring-1 ring-red-300';
        } else if (check.status === 'portfolio') {
          colorClass = 'bg-yellow-100 text-yellow-800';
        } else if (check.status === 'in_bank') {
          colorClass = 'bg-blue-100 text-blue-800';
        } else {
          colorClass = 'bg-gray-100 text-gray-800';
        }
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${colorClass}`}>
            {getCheckStatusLabel(check.status, check.type)}
            {overdue && ' (Vadesi Geçti)'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/cek/${row.original.id}`}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Görüntüle"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/cek/${row.original.id}/duzenle`}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Düzenle"
          >
            <Edit className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Çek Yönetimi</h1>
        <button
          onClick={() => setShowNewCheckModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Yeni Çek
        </button>
      </div>

      <div className="card rounded-lg">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={checks}
            searchKey="check_number"
            exportFilename="cek-listesi"
            initialSearchValue={searchTerm}
            rowClassName={getRowClassName}
          />
        </div>
      </div>

      {/* Yeni Çek Modal */}
      {showNewCheckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Yeni Çek Ekle</h2>
                <button
                  onClick={() => setShowNewCheckModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sol taraf - Çek Tipi ve Cari Seçimi */}
                <div className="space-y-4">
                  {/* Çek Tipi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Çek Tipi
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewCheck({ ...newCheck, type: 'received' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          newCheck.type === 'received'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <ArrowDownLeft className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold">Alınan Çek</div>
                          <div className="text-xs text-gray-500">Müşteriden alınan</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCheck({ ...newCheck, type: 'issued' })}
                        className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          newCheck.type === 'issued'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <ArrowUpRight className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-semibold">Verilen Çek</div>
                          <div className="text-xs text-gray-500">Tedarikçiye verilen</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Cari Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {newCheck.type === 'received' ? 'Müşteri' : 'Tedarikçi'}
                    </label>
                    <select
                      value={newCheck.customer_id}
                      onChange={(e) => setNewCheck({ ...newCheck, customer_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Cari seçin (opsiyonel)</option>
                      {customers
                        .filter(c => newCheck.type === 'received' 
                          ? ['customer', 'both'].includes(c.type)
                          : ['supplier', 'both'].includes(c.type)
                        )
                        .map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.code}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Sadece {newCheck.type === 'received' ? 'müşteri' : 'tedarikçi'} tipindeki cariler listelenir
                    </p>
                  </div>
                </div>

                {/* Sağ taraf - Diğer alanlar */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Çek No */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Çek No*
                      </label>
                      <input
                        type="text"
                        value={newCheck.check_number}
                        onChange={(e) => setNewCheck({ ...newCheck, check_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Çek numarası"
                      />
                    </div>

                    {/* Banka Adı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Banka Adı*
                      </label>
                      <input
                        type="text"
                        value={newCheck.bank_name}
                        onChange={(e) => setNewCheck({ ...newCheck, bank_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Banka adı"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Şube */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şube
                      </label>
                      <input
                        type="text"
                        value={newCheck.branch_name}
                        onChange={(e) => setNewCheck({ ...newCheck, branch_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Şube adı"
                      />
                    </div>

                    {/* Hesap No */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hesap No
                      </label>
                      <input
                        type="text"
                        value={newCheck.account_number}
                        onChange={(e) => setNewCheck({ ...newCheck, account_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hesap numarası"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Tutar */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tutar*
                      </label>
                      <input
                        type="number"
                        value={newCheck.amount}
                        onChange={(e) => setNewCheck({ ...newCheck, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                      />
                    </div>

                    {/* Vade Tarihi */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vade Tarihi*
                      </label>
                      <input
                        type="date"
                        value={newCheck.due_date}
                        onChange={(e) => setNewCheck({ ...newCheck, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Keşideci */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keşideci
                    </label>
                    <input
                      type="text"
                      value={newCheck.drawer_name}
                      onChange={(e) => setNewCheck({ ...newCheck, drawer_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Keşideci adı"
                    />
                  </div>
                </div>
              </div>

              {/* Açıklama */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={newCheck.description}
                  onChange={(e) => setNewCheck({ ...newCheck, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Çek hakkında açıklama..."
                />
              </div>

              {/* Butonlar */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowNewCheckModal(false);
                    setNewCheck({
                      check_number: '',
                      bank_name: '',
                      branch_name: '',
                      account_number: '',
                      drawer_name: '',
                      amount: 0,
                      due_date: '',
                      type: 'received',
                      customer_id: '',
                      description: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveCheck}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}