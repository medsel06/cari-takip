'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  DollarSign,
  Filter,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Tag,
  Building,
  Wallet,
  User
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import CategoryManagementModal from '@/components/CategoryManagementModal';

// Kategori kodundan Türkçe isim üretme fonksiyonu
const getCategoryName = (categoryCode: string | null): string => {
  if (!categoryCode) return 'Genel';
  
  const categoryMap: Record<string, string> = {
    // Gider kategorileri
    'KIRA': 'Kira Giderleri',
    'ELEKTRIK': 'Elektrik Giderleri', 
    'SU': 'Su Giderleri',
    'DOGALGAZ': 'Doğalgaz Giderleri',
    'TELEFON': 'Telefon/İnternet',
    'YAKIT': 'Yakıt Giderleri',
    'PERSONEL': 'Personel Giderleri',
    'KARGO': 'Kargo Giderleri',
    'VERGI': 'Vergi ve Harçlar',
    'SIGORTA': 'Sigorta Giderleri',
    'BAKIM': 'Bakım ve Onarım',
    'DIGER': 'Diğer Giderler',
    // Gelir kategorileri
    'SATIS': 'Satış Gelirleri',
    'HIZMET': 'Hizmet Gelirleri',
    'KIRA_GELIR': 'Kira Gelirleri',
    'FAIZ': 'Faiz Gelirleri',
    'other_income': 'Diğer Gelirler',
    'other_expense': 'Diğer Giderler'
  };
  
  return categoryMap[categoryCode] || categoryCode;
};

interface CashMovement {
  id: string;
  movement_no: string;
  account_id: string | null;
  movement_type: 'IN' | 'OUT';
  amount: string;
  currency: string;
  description: string;
  category: string;
  customer_id: string | null;
  payment_method: string | null;
  document_no: string;
  movement_date: string;
  created_at: string;
  // Relations
  customers?: {
    id: string;
    name: string;
    code: string;
  } | null;
  cash_accounts?: {
    id: string;
    account_name: string;
  } | null;
}

interface TransformedIncomeExpense {
  id: string;
  type: 'income' | 'expense';
  movement_no: string;
  category_id: string;
  category: {
    id: string;
    name: string;
    type: string;
  };
  amount: number;
  currency: string;
  description: string;
  transaction_date: string;
  payment_status: 'paid' | 'unpaid';
  payment_method?: string;
  document_no?: string;
  created_at: string;
  // İlişkili veriler
  customer?: {
    id: string;
    name: string;
    code: string;
  } | null;
  account?: {
    id: string;
    name: string;
    account_type: string;
    icon?: React.ReactNode;
  } | null;
}

export default function GelirGiderPage() {
  const [incomeExpenses, setIncomeExpenses] = useState<TransformedIncomeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const supabase = createClient();

  // Özet veriler
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    paidIncome: 0,
    paidExpense: 0,
    unpaidIncome: 0,
    unpaidExpense: 0,
  });

  useEffect(() => {
    fetchIncomeExpenses();
    fetchCategories();
  }, [filter, paymentFilter, dateFilter]);

  // Kategorileri veritabanından çek
  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data } = await supabase
        .from('expense_categories')
        .select('category_code, category_name')
        .eq('company_id', userData.company_id)
        .eq('is_active', true);

      if (data) {
        const categoryMap = data.reduce((acc, cat) => {
          acc[cat.category_code] = cat.category_name;
          return acc;
        }, {} as Record<string, string>);
        setCategories(categoryMap);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchIncomeExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // cash_movements tablosundan gelir-gider kayıtlarını çek
      let query = supabase
        .from('cash_movements')
        .select(`
          id,
          movement_no,
          movement_type,
          category,
          amount,
          description,
          movement_date,
          payment_method,
          account_id,
          customer_id,
          created_at,
          customers!customer_id (
            id,
            name,
            code
          ),
          cash_accounts!account_id (
            id,
            account_name
          )
        `)
        .eq('company_id', userData.company_id)
        .in('movement_type', ['IN', 'OUT']) // Sadece gelir-gider kayıtları (TRANSFER hariç)
        .order('movement_date', { ascending: false })
        .limit(200);

      // Tip filtresi
      if (filter === 'income') {
        query = query.eq('movement_type', 'IN');
      } else if (filter === 'expense') {
        query = query.eq('movement_type', 'OUT');
      }

      // Ödeme durumu filtresi - account_id var mı yok mu kontrolü
      if (paymentFilter === 'paid') {
        query = query.not('account_id', 'is', null);
      } else if (paymentFilter === 'unpaid') {
        query = query.is('account_id', null);
      }

      // Tarih filtresi
      if (dateFilter.start) {
        query = query.gte('movement_date', dateFilter.start);
      }
      if (dateFilter.end) {
        query = query.lte('movement_date', dateFilter.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Raw cash movements:', data);

      // Customer ve CashAccount bilgilerini ayrı çek
      const customerIds = [...new Set((data || []).map(item => item.customer_id).filter(Boolean))];
      const accountIds = [...new Set((data || []).map(item => item.account_id).filter(Boolean))];
      
      let customersMap: Record<string, any> = {};
      let accountsMap: Record<string, any> = {};
      
      // Customer bilgilerini çek
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, code')
          .in('id', customerIds);
        
        customersMap = (customersData || []).reduce((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
        console.log('Customers Map:', customersMap);
      }
      
      // CashAccount bilgilerini çek
      if (accountIds.length > 0) {
        const { data: accountsData } = await supabase
          .from('cash_accounts')
          .select('id, account_name, account_type, currency')
          .in('id', accountIds);

        accountsMap = (accountsData || []).reduce((acc, account) => {
          acc[account.id] = account;
          return acc;
        }, {});
        console.log('Accounts Map:', accountsMap);
      }

      // Veriyi dönüştür - profesyonel mapping
      const transformedData: TransformedIncomeExpense[] = (data || []).map((item: CashMovement) => ({
        id: item.id,
        type: item.movement_type === 'IN' ? 'income' : 'expense',
        movement_no: item.movement_no,
        category_id: item.category || '',
        category: {
          id: item.category || '',
          name: categories[item.category || ''] || getCategoryName(item.category),
          type: item.movement_type === 'IN' ? 'income' : 'expense'
        },
        amount: parseFloat(item.amount),
        currency: item.currency,
        description: item.description || '',
        transaction_date: item.movement_date,
        payment_status: item.account_id ? 'paid' : 'unpaid',
        payment_method: item.payment_method || undefined,
        document_no: item.document_no || undefined,
        created_at: item.created_at,
        // İlişkili tablolar - maplerden çek
        customer: item.customer_id ? customersMap[item.customer_id] : undefined,
        account: item.account_id ? {
          ...accountsMap[item.account_id],
          icon: getAccountIcon(accountsMap[item.account_id]?.account_type || 'cash')
        } : undefined,
      }));

      setIncomeExpenses(transformedData || []);
      calculateSummary(transformedData || []);
    } catch (error) {
      // Sessizce geç, tablo boş olabilir
      setIncomeExpenses([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="h-4 w-4" />;
      case 'bank': return <Building className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const calculateSummary = (data: TransformedIncomeExpense[]) => {
    const summary = data.reduce((acc, item) => {
      if (item.type === 'income') {
        acc.totalIncome += item.amount;
        if (item.payment_status === 'paid') {
          acc.paidIncome += item.amount;
        } else {
          acc.unpaidIncome += item.amount;
        }
      } else {
        acc.totalExpense += item.amount;
        if (item.payment_status === 'paid') {
          acc.paidExpense += item.amount;
        } else {
          acc.unpaidExpense += item.amount;
        }
      }
      return acc;
    }, {
      totalIncome: 0,
      totalExpense: 0,
      paidIncome: 0,
      paidExpense: 0,
      unpaidIncome: 0,
      unpaidExpense: 0,
    });

    setSummary(summary);
  };

  const columns: ColumnDef<TransformedIncomeExpense>[] = [
    {
      accessorKey: 'movement_no',
      header: 'Hareket No',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-gray-600">
          {row.original.movement_no}
        </span>
      ),
    },
    {
      accessorKey: 'transaction_date',
      header: 'Tarih',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          {formatDate(row.original.transaction_date)}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Tür',
      cell: ({ row }) => (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.original.type === 'income' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {row.original.type === 'income' ? (
            <>
              <TrendingUp className="h-3 w-3 mr-1" />
              Gelir
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 mr-1" />
              Gider
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category.name',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.category.name}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Açıklama',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.description || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'customer.name',
      header: 'Firma',
      cell: ({ row }) => {
        if (!row.original.customer) return <span className="text-gray-400">-</span>;
        return (
          <Link 
            href={`/cari/${row.original.customer.id}`}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <User className="h-4 w-4" />
            <span className="text-sm">{row.original.customer.name}</span>
          </Link>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Tutar',
      cell: ({ row }) => (
        <div className={`font-semibold ${
          row.original.type === 'income' ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(row.original.amount)}
          {row.original.currency !== 'TRY' && (
            <span className="text-xs ml-1 text-gray-500">{row.original.currency}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'account.name',
      header: 'Kasa/Banka',
      cell: ({ row }) => {
        if (!row.original.account) {
          return <span className="text-gray-400 text-sm">-</span>;
        }
        return (
          <div className="flex items-center gap-2">
            {row.original.account.icon}
            <span className="text-sm">{row.original.account.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Durum',
      cell: ({ row }) => {
        const status = row.original.payment_status;
        return (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'paid' 
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {status === 'paid' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ödendi
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Ödenmedi
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'document_no',
      header: 'Belge No',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {row.original.document_no || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/nakit/hareketler/${row.original.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Detay
          </Link>
          {row.original.payment_status === 'unpaid' && (
            <button
              onClick={() => {/* Ödeme yap modalı */}}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Öde
            </button>
          )}
        </div>
      ),
    },
  ];

  const exportToExcel = async () => {
    const { exportToExcel } = await import('@/lib/utils');
    
    const data = incomeExpenses.map(item => ({
      'Hareket No': item.movement_no,
      'Tarih': formatDate(item.transaction_date),
      'Tür': item.type === 'income' ? 'Gelir' : 'Gider',
      'Kategori': item.category.name,
      'Açıklama': item.description || '-',
      'Firma': item.customer?.name || '-',
      'Tutar': item.amount,
      'Para Birimi': item.currency,
      'Kasa/Banka': item.account?.name || '-',
      'Durum': item.payment_status === 'paid' ? 'Ödendi' : 'Ödenmedi',
      'Belge No': item.document_no || '-'
    }));

    exportToExcel(data, `gelir-gider_${new Date().toISOString().split('T')[0]}`);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gelir - Gider Yönetimi</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Tag className="h-5 w-5 mr-2" />
            Kategoriler
          </button>
          <Link
            href="/gelir-gider/yeni"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Kayıt
          </Link>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Toplam Gelir</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalIncome)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Tahsil: {formatCurrency(summary.paidIncome)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Toplam Gider</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalExpense)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Ödenen: {formatCurrency(summary.paidExpense)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Net Durum</span>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </div>
          <p className={`text-2xl font-bold ${
            summary.totalIncome - summary.totalExpense >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(summary.totalIncome - summary.totalExpense)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Bekleyen</span>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.unpaidIncome + summary.unpaidExpense)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gelir: {formatCurrency(summary.unpaidIncome)} | Gider: {formatCurrency(summary.unpaidExpense)}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="paid">Ödendi</option>
              <option value="unpaid">Ödenmedi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={incomeExpenses}
            searchKey="description"
          />
        </div>
      </div>

      {/* Kategori Yönetimi Modalı */}
      <CategoryManagementModal 
        isOpen={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={() => {
          fetchCategories();
          fetchIncomeExpenses();
        }}
      />
    </div>
  );
}