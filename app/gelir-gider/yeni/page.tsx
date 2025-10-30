'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  FileText,
  Wallet,
  Building,
  CreditCard,
  Banknote,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  type: 'income' | 'expense';
  is_active: boolean;
  parent_id?: string;
}

interface CashAccount {
  id: string;
  name: string;
  account_type: 'cash' | 'bank' | 'pos' | 'credit_card';
  balance: number;
  currency: string;
  is_active: boolean;
}

interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function YeniGelirGiderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  const [formData, setFormData] = useState({
    category_id: '',
    amount: 0,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_status: 'unpaid' as 'paid' | 'unpaid',
    payment_method: 'cash' as 'cash' | 'bank' | 'credit_card' | 'check',
    cash_account_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    document_no: '',
    is_recurring: false,
    recurrence_period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Kategorileri getir - expense_categories tablosundan
      console.log('Fetching categories for type:', type);
      console.log('Company ID:', userData.company_id);
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .is('parent_id', null)  // Sadece ana kategoriler
        .order('category_name');

      console.log('Categories data:', categoriesData);
      console.log('Categories error:', categoriesError);

      setCategories(categoriesData || []);

      // Kasa/Banka hesaplarını getir
      const { data: accountsData, error: accountsError } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('account_name');

      if (accountsError) {
        console.error('Hesaplar yüklenirken hata:', accountsError);
      }

      setCashAccounts(accountsData || []);

      // Müşterileri/Tedarikçileri getir
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name');

      setCustomers(customersData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form Data before submit:', formData);
    console.log('Selected Customer:', selectedCustomer);
    console.log('Customer ID in form:', formData.customer_id);

    if (!formData.category_id) {
      toast.error('Lütfen kategori seçin');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Tutar 0\'dan büyük olmalıdır');
      return;
    }

    if (formData.payment_status === 'paid' && !formData.cash_account_id) {
      toast.error('Ödeme yapıldıysa kasa/banka hesabı seçmelisiniz');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bilgisi alınamadı');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('Şirket bilgisi bulunamadı');

      // Seçili kategorinin kodunu bul
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      const categoryCode = selectedCategory?.category_code || formData.category_id;

      // Gelir/Gider kaydı oluştur - cash_movements tablosuna
      // Hareket numarası oluştur
      const movementNo = `NH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 10000)}`;
      
      const { data, error } = await supabase
        .from('cash_movements')
        .insert([{
          company_id: userData.company_id,
          movement_no: movementNo,
          account_id: formData.payment_status === 'paid' && formData.cash_account_id ? formData.cash_account_id : null,
          movement_type: type, // 'income' veya 'expense'
          amount: formData.amount,
          currency: 'TRY',
          exchange_rate: 1,
          description: formData.description || '',
          category: categoryCode, // Kategori KODU (KIRA, ELEKTRIK vs)
          reference_type: null,
          reference_id: null,
          customer_id: formData.customer_id && formData.customer_id.trim() !== '' ? formData.customer_id : null,
          target_account_id: null,
          payment_method: formData.payment_status === 'paid' ? formData.payment_method : null,
          document_no: formData.document_no || '',
          movement_date: formData.transaction_date,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Eğer ödendi ise bakiyeyi güncelle
      if (formData.payment_status === 'paid' && formData.cash_account_id) {
        const { error: updateError } = await supabase
          .from('cash_accounts')
          .update({ 
            balance: type === 'income' 
              ? supabase.raw('balance + ?', [formData.amount])
              : supabase.raw('balance - ?', [formData.amount]),
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.cash_account_id);

        if (updateError) {
          console.error('Bakiye güncellenirken hata:', updateError);
        }
      }

      if (error) throw error;

      toast.success(`${type === 'income' ? 'Gelir' : 'Gider'} başarıyla kaydedildi`);
      router.push('/gelir-gider');
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Kayıt sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               value
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch('');
    setShowCustomerSearch(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const getCashAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="h-4 w-4" />;
      case 'bank': return <Building className="h-4 w-4" />;
      case 'pos': return <CreditCard className="h-4 w-4" />;
      case 'credit_card': return <CreditCard className="h-4 w-4" />;
      default: return <Banknote className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/gelir-gider"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Gelir-Gider Listesine Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Yeni Gelir / Gider Kaydı</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Tip Seçimi */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Tipi</h2>
            <div className="grid grid-cols-2 max-w-md gap-4">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`px-6 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  type === 'income'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-semibold">Gelir</div>
                  <div className="text-xs text-gray-500">Para girişi</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('expense')}
                className={`px-6 py-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  type === 'expense'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingDown className="h-8 w-8 text-red-600" />
                <div>
                  <div className="font-semibold">Gider</div>
                  <div className="text-xs text-gray-500">Para çıkışı</div>
                </div>
              </button>
            </div>
          </div>

          {/* Temel Bilgiler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Temel Bilgiler</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori*
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar (₺)*
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-1">
                  İşlem Tarihi*
                </label>
                <input
                  type="date"
                  id="transaction_date"
                  name="transaction_date"
                  value={formData.transaction_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Vade Tarihi
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detaylı açıklama..."
                />
              </div>
            </div>
          </div>

          {/* Ödeme Bilgileri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ödeme Bilgileri</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Durumu
                </label>
                <select
                  id="payment_status"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unpaid">Ödenmedi</option>
                  <option value="paid">Ödendi</option>
                </select>
              </div>

              {formData.payment_status === 'paid' && (
                <>
                  <div>
                    <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                      Ödeme Yöntemi
                    </label>
                    <select
                      id="payment_method"
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Nakit</option>
                      <option value="bank">Banka</option>
                      <option value="credit_card">Kredi Kartı</option>
                      <option value="check">Çek</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cash_account_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Kasa/Banka Hesabı*
                    </label>
                    <select
                      id="cash_account_id"
                      name="cash_account_id"
                      value={formData.cash_account_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.payment_status === 'paid'}
                    >
                      <option value="">Hesap seçin</option>
                      {cashAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} - {formatCurrency(account.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Ödeme Tarihi
                    </label>
                    <input
                      type="date"
                      id="payment_date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Belge Bilgileri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Belge ve İlişkili Bilgiler</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="document_no" className="block text-sm font-medium text-gray-700 mb-1">
                  Belge No / Fatura No
                </label>
                <input
                  type="text"
                  id="document_no"
                  name="document_no"
                  value={formData.document_no}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Fatura numarası"
                />
              </div>

              {/* Müşteri/Tedarikçi Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İlişkili Firma
                  <span className="text-xs text-gray-500 ml-2">(Opsiyonel)</span>
                </label>
                {!selectedCustomer ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerSearch(true);
                      }}
                      onFocus={() => setShowCustomerSearch(true)}
                      onBlur={() => {
                        // Dropdown kapanmadan önce kısa bir süre bekle
                        setTimeout(() => setShowCustomerSearch(false), 200);
                      }}
                      placeholder="Firma ara..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showCustomerSearch && customerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full px-4 py-2 hover:bg-gray-50 text-left border-b last:border-0"
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">Bakiye: {formatCurrency(customer.balance)}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500 text-center">Firma bulunamadı</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium">{selectedCustomer.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setFormData(prev => ({ ...prev, customer_id: '' }));
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Periyodik Ayarlar */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="is_recurring"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_recurring" className="text-lg font-semibold text-gray-900">
                <RefreshCw className="inline h-5 w-5 mr-2" />
                Periyodik {type === 'income' ? 'Gelir' : 'Gider'}
              </label>
            </div>
            
            {formData.is_recurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label htmlFor="recurrence_period" className="block text-sm font-medium text-gray-700 mb-1">
                    Tekrar Periyodu
                  </label>
                  <select
                    id="recurrence_period"
                    name="recurrence_period"
                    value={formData.recurrence_period}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Aylık</option>
                    <option value="quarterly">3 Aylık</option>
                    <option value="yearly">Yıllık</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Form Aksiyonları */}
          <div className="flex justify-end space-x-4 pb-6">
            <Link
              href="/gelir-gider"
              className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}