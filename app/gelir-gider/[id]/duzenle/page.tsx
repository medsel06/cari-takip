'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// Kategori kodundan Türkçe isim üretme fonksiyonu
const getCategoryName = (categoryCode: string | null): string => {
  if (!categoryCode) return 'Genel';

  const categoryMap: Record<string, string> = {
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
  customers?: {
    id: string;
    name: string;
  } | null;
  cash_accounts?: {
    id: string;
    account_name: string;
  } | null;
}

interface FormData {
  description: string;
  payment_method: string;
  document_no: string;
  customer_id: string;
}

export default function IncomeExpenseEditPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [record, setRecord] = useState<CashMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryName, setCategoryName] = useState<string>('');
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [formData, setFormData] = useState<FormData>({
    description: '',
    payment_method: '',
    document_no: '',
    customer_id: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchRecord();
    fetchCustomers();
  }, [recordId]);

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

      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, code')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name');

      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

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
          customers!customer_id (
            id,
            name
          ),
          cash_accounts!account_id (
            id,
            account_name
          )
        `)
        .eq('id', recordId)
        .eq('company_id', userData.company_id)
        .single();

      if (error) throw error;

      setRecord(data);
      setFormData({
        description: data.description || '',
        payment_method: data.payment_method || '',
        document_no: data.document_no || '',
        customer_id: data.customer_id || ''
      });

      // Fetch category name
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
      toast.error('Kayıt yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('cash_movements')
        .update({
          description: formData.description,
          payment_method: formData.payment_method || null,
          document_no: formData.document_no || '',
          customer_id: formData.customer_id || null
        })
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Kayıt başarıyla güncellendi');
      router.push(`/gelir-gider/${recordId}`);
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Kayıt güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
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
      <div>
        <Link
          href={`/gelir-gider/${recordId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Detaya Dön
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          {type === 'income' ? (
            <>
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span>Gelir Düzenle</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-6 w-6 text-red-600" />
              <span>Gider Düzenle</span>
            </>
          )}
        </h1>
        <p className="text-sm text-gray-500">
          Hareket No: {record.movement_no}
        </p>
      </div>

      {/* Read-only Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 mb-3 font-medium">
          Temel Bilgiler (Değiştirilemez)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-600 font-medium">Tutar:</span>
            <span className={`ml-2 font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(record.amount))}
            </span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Tarih:</span>
            <span className="ml-2 text-gray-900">{formatDate(record.movement_date)}</span>
          </div>
          <div>
            <span className="text-blue-600 font-medium">Kategori:</span>
            <span className="ml-2 text-gray-900">{categoryName || getCategoryName(record.category)}</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Düzenlenebilir Bilgiler</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Açıklama giriniz..."
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma (Opsiyonel)
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Firma seçiniz (opsiyonel)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.code})
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ödeme Yöntemi
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              <option value="cash">Nakit</option>
              <option value="bank_transfer">Banka Transferi</option>
              <option value="credit_card">Kredi Kartı</option>
              <option value="check">Çek</option>
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge No
            </label>
            <input
              type="text"
              value={formData.document_no}
              onChange={(e) => setFormData({ ...formData, document_no: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Belge numarası giriniz..."
            />
          </div>

          {/* Cash Account (Read-only if already paid) */}
          {record.cash_accounts && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kasa/Banka Hesabı
              </label>
              <p className="text-sm text-gray-900">
                {record.cash_accounts.account_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Not: Ödeme yapıldıktan sonra hesap değiştirilemez
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <Link
            href={`/gelir-gider/${recordId}`}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
