'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Calendar,
  Search,
  ShoppingCart,
  Truck,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type TabType = 'purchases' | 'sales' | 'payments';

interface PurchaseItem {
  id: string;
  product_name: string;
  date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface SaleItem {
  id: string;
  product_name: string;
  date: string;  
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface PaymentItem {
  id: string;
  date: string;
  amount: number;
  type: 'payment' | 'collection';
  payment_method: string;
  description: string;
}

export default function FirmaDetayPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('purchases');
  
  // Data states
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  
  // Summary data
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalPayments: 0,
    totalCollections: 0,
    netBalance: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // URL'den gelen customer_id varsa otomatik seç
    if (customerId && customers.length > 0 && !selectedCustomer) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerData();
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      // Önce kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Kullanıcı bulunamadı');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        console.error('Company ID bulunamadı');
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerData = async () => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      // Önce kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Stok hareketlerini getir
      const { data: stockMovements, error: stockError } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name, unit)
        `)
        .eq('company_id', userData.company_id)
        .eq('customer_id', selectedCustomer.id)
        .order('movement_date', { ascending: false });

      if (stockError) {
        console.error('Stock movements error:', stockError);
      }

      // Alış (Firmadan aldığımız) ve Satış (Firmaya sattığımız) ayır
      const purchaseData = stockMovements?.filter(m => m.movement_type === 'IN') || [];  // Firmadan aldıklarımız
      const saleData = stockMovements?.filter(m => m.movement_type === 'OUT') || [];     // Firmaya sattıklarımız

      // Alışları formatla
      const formattedPurchases: PurchaseItem[] = purchaseData.map(item => ({
        id: item.id,
        product_name: item.product?.name || 'Ürün bulunamadı',
        date: item.movement_date || item.created_at,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total_amount: item.total_price || 0
      }));

      // Satışları formatla
      const formattedSales: SaleItem[] = saleData.map(item => ({
        id: item.id,
        product_name: item.product?.name || 'Ürün bulunamadı',
        date: item.movement_date || item.created_at,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total_amount: item.total_price || 0
      }));

      setPurchases(formattedPurchases);
      setSales(formattedSales);

      // Tahsilat ve ödemeleri getir
      const { data: accountMovements } = await supabase
        .from('account_movements')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('customer_id', selectedCustomer.id)
        .in('document_type', ['payment', 'collection'])
        .order('created_at', { ascending: false });

      const formattedPayments: PaymentItem[] = accountMovements?.map(item => ({
        id: item.id,
        date: item.due_date || item.created_at,
        amount: item.amount,
        type: item.movement_type === 'DEBT' ? 'payment' : 'collection',
        payment_method: item.payment_method || 'Nakit',
        description: item.description || ''
      })) || [];

      setPayments(formattedPayments);

      // Özeti hesapla
      const totalPurchases = formattedPurchases.reduce((sum, item) => sum + item.total_amount, 0);
      const totalSales = formattedSales.reduce((sum, item) => sum + item.total_amount, 0);
      const totalPayments = formattedPayments
        .filter(p => p.type === 'payment')
        .reduce((sum, item) => sum + item.amount, 0);
      const totalCollections = formattedPayments
        .filter(p => p.type === 'collection')
        .reduce((sum, item) => sum + item.amount, 0);

      setSummary({
        totalPurchases,  // Firmadan aldıklarımız (borçlandıklarımız)
        totalSales,      // Firmaya sattıklarımız (alacaklandıklarımız)
        totalPayments,   // Firmaya yaptığımız ödemeler
        totalCollections,// Firmadan aldığımız tahsilatlar
        netBalance: (totalSales - totalCollections) - (totalPurchases - totalPayments)
        // Net = (Alacaklarımız - Tahsilatlarımız) - (Borçlarımız - Ödemelerimiz)
      });

    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm('');
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'purchases':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mal Cinsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alış Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar (KG)
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
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Henüz alış kaydı bulunmuyor
                    </td>
                  </tr>
                ) : (
                  purchases.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {purchases.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Toplam Alış:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(summary.totalPurchases)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );

      case 'sales':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mal Cinsi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satış Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar (KG)
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
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Henüz satış kaydı bulunmuyor
                    </td>
                  </tr>
                ) : (
                  sales.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.quantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sales.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Toplam Satış:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(summary.totalSales)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );

      case 'payments':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlem Tipi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Şekli
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Henüz tahsilat/ödeme kaydı bulunmuyor
                    </td>
                  </tr>
                ) : (
                  payments.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.type === 'collection' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.type === 'collection' ? 'Tahsilat' : 'Ödeme'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{
                          'cash': 'Nakit',
                          'transfer': 'Havale/EFT',
                          'check': 'Çek',
                          'credit_card': 'Kredi Kartı'
                        }[item.payment_method] || item.payment_method}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                        item.type === 'collection' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {payments.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Toplam Tahsilat:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                      {formatCurrency(summary.totalCollections)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Toplam Ödeme:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                      {formatCurrency(summary.totalPayments)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ana Sayfaya Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Firma Bazlı Detay</h1>
        <p className="text-sm text-gray-600 mt-1">
          Seçtiğiniz firma ile yaptığınız tüm alış, satış ve tahsilat/ödeme işlemlerini buradan görebilirsiniz.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Firma Seçimi */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Firma Seçimi</h2>
          
          {!selectedCustomer ? (
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Firma ara (ad veya kod)"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Arama yapılmadığı zaman boş göster */}
              {searchTerm && (
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full px-4 py-2 hover:bg-gray-50 text-left"
                      >
                        <div className="font-medium">
                          {customer.name}
                          <span className="ml-2 text-sm font-normal text-gray-400">
                            ({customer.type === 'customer' ? 'Müşteri' : 
                              customer.type === 'supplier' ? 'Tedarikçi' : 'Müşteri ve Tedarikçi'})
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      Firma bulunamadı
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">
                    {selectedCustomer.name}
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({selectedCustomer.type === 'customer' ? 'Müşteri' : 
                        selectedCustomer.type === 'supplier' ? 'Tedarikçi' : 'Müşteri ve Tedarikçi'})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setPurchases([]);
                    setSales([]);
                    setPayments([]);
                    setSummary({
                      totalPurchases: 0,
                      totalSales: 0,
                      totalPayments: 0,
                      totalCollections: 0,
                      netBalance: 0
                    });
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-white"
                >
                  Firma Değiştir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ana İçerik */}
        {selectedCustomer && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sol Taraf - Tab İçeriği */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('purchases')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'purchases'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <ShoppingCart className="inline-block h-4 w-4 mr-2" />
                    Alışlar
                  </button>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'sales'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="inline-block h-4 w-4 mr-2" />
                    Satışlar
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'payments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="inline-block h-4 w-4 mr-2" />
                    Tahsilat/Ödemeler
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>

            {/* Sağ Taraf - Özet Bilgiler */}
            <div className="bg-white rounded-lg shadow p-6 h-fit">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bakiye Özeti</h3>
              
              <div className="space-y-4">
                <div className="pb-4 border-b">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Toplam Alış</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(summary.totalPurchases)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Toplam Satış</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(summary.totalSales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Toplam Tahsilat</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(summary.totalCollections)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Toplam Ödeme</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(summary.totalPayments)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Net Bakiye</span>
                    <span className={`text-xl font-bold ${
                      summary.netBalance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(Math.abs(summary.netBalance))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {summary.netBalance > 0 ? 'Alacaklı' : summary.netBalance < 0 ? 'Borçlu' : 'Bakiyesiz'}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 space-y-2">
                  <Link
                    href={`/stok/hareketler/yeni?customer_id=${selectedCustomer.id}`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700"
                  >
                    <Package className="inline-block h-4 w-4 mr-2" />
                    Yeni Alış/Satış
                  </Link>
                  <Link
                    href={`/cari/tahsilat/yeni?customer_id=${selectedCustomer.id}`}
                    className="block w-full px-4 py-2 bg-green-600 text-white text-center rounded-md hover:bg-green-700"
                  >
                    <DollarSign className="inline-block h-4 w-4 mr-2" />
                    Tahsilat/Ödeme
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}