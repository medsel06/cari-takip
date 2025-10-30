'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  Tag,
  Building,
  Wallet,
  User,
  FileText,
  Edit
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

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
  created_by: string;
  // Relations
  customers?: {
    id: string;
    name: string;
    code: string;
  } | null;
  cash_accounts?: {
    id: string;
    account_name: string;
    account_type: string;
  } | null;
}

export default function IncomeExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [record, setRecord] = useState<CashMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchRecord();
  }, [recordId]);

  const fetchRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Fetch the record
      const { data, error } = await supabase
        .from('cash_movements')
        .select(`
          id,
          movement_no,
          movement_type,
          category,
          amount,
          currency,
          description,
          movement_date,
          payment_method,
          document_no,
          account_id,
          customer_id,
          created_at,
          created_by,
          customers!customer_id (
            id,
            name,
            code
          ),
          cash_accounts!account_id (
            id,
            account_name,
            account_type
          )
        `)
        .eq('id', recordId)
        .eq('company_id', userData.company_id)
        .single();

      if (error) throw error;

      setRecord(data);

      // Fetch category name from database or use default mapping
      if (data.category) {
        const { data: categoryData } = await supabase
          .from('expense_categories')
          .select('category_name')
          .eq('category_code', data.category)
          .eq('company_id', userData.company_id)
          .single();

        if (categoryData) {
          setCategoryName(categoryData.category_name);
        } else {
          setCategoryName(getCategoryName(data.category));
        }
      }
    } catch (error) {
      console.error('Error fetching record:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case 'cash': return <Wallet className="h-5 w-5 text-green-600" />;
      case 'bank': return <Building className="h-5 w-5 text-blue-600" />;
      default: return <Wallet className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methods: Record<string, string> = {
      'cash': 'Nakit',
      'bank_transfer': 'Banka Transferi',
      'credit_card': 'Kredi Kartı',
      'check': 'Çek'
    };
    return method ? methods[method] || method : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-gray-600 mb-4">Kayıt bulunamadı</div>
        <Link
          href="/gelir-gider"
          className="text-blue-600 hover:text-blue-700"
        >
          Gelir-Gider Listesine Dön
        </Link>
      </div>
    );
  }

  const type = record.movement_type === 'IN' ? 'income' : 'expense';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/gelir-gider"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Gelir-Gider Listesine Dön
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            {type === 'income' ? (
              <>
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span>Gelir Detayı</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-6 w-6 text-red-600" />
                <span>Gider Detayı</span>
              </>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            Hareket No: {record.movement_no}
          </p>
        </div>
        <Link
          href={`/gelir-gider/${record.id}/duzenle`}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Edit className="h-4 w-4 mr-2" />
          Düzenle
        </Link>
      </div>

      {/* Main Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Amount Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Tutar</span>
            <DollarSign className={`h-5 w-5 ${type === 'income' ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <p className={`text-3xl font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(record.amount))}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {record.currency}
          </p>
        </div>

        {/* Date Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">İşlem Tarihi</span>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatDate(record.movement_date)}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Durum</span>
            {record.account_id ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <p className={`text-2xl font-bold ${record.account_id ? 'text-green-600' : 'text-yellow-600'}`}>
            {record.account_id ? 'Ödendi' : 'Bekliyor'}
          </p>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Detay Bilgileri</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  <Tag className="inline h-4 w-4 mr-1" />
                  Kategori
                </label>
                <p className="text-base text-gray-900">{categoryName || getCategoryName(record.category)}</p>
              </div>

              {record.customers && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    <User className="inline h-4 w-4 mr-1" />
                    Firma
                  </label>
                  <Link
                    href={`/cari/${record.customers.id}`}
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {record.customers.name}
                  </Link>
                  <p className="text-sm text-gray-500">{record.customers.code}</p>
                </div>
              )}

              {record.cash_accounts && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                    {getAccountIcon(record.cash_accounts.account_type)}
                    Kasa/Banka Hesabı
                  </label>
                  <Link
                    href={`/nakit/hesaplar/${record.cash_accounts.id}`}
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {record.cash_accounts.account_name}
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Açıklama
                </label>
                <p className="text-base text-gray-900">{record.description || '-'}</p>
              </div>

              {record.payment_method && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Ödeme Yöntemi
                  </label>
                  <p className="text-base text-gray-900">{getPaymentMethodLabel(record.payment_method)}</p>
                </div>
              )}

              {record.document_no && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Belge No
                  </label>
                  <p className="text-base text-gray-900">{record.document_no}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Oluşturulma Tarihi
                </label>
                <p className="text-base text-gray-900">{formatDate(record.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link
          href={`/gelir-gider/${record.id}/duzenle`}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Edit className="h-4 w-4 mr-2" />
          Düzenle
        </Link>
        <Link
          href="/gelir-gider"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Listeye Dön
        </Link>
      </div>
    </div>
  );
}
