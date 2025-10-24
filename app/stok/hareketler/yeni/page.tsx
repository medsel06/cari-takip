'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Package, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Search,
  Plus,
  Minus,
  PlusCircle,
  ChevronDown
} from 'lucide-react';
import { Product, Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductRow {
  product: Product | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  searchTerm: string;
  showDropdown: boolean;
}

export default function StokHareketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [dailySequence, setDailySequence] = useState(0);
  
  // Form state
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('OUT');
  const [selectedProducts, setSelectedProducts] = useState<ProductRow[]>([{
    product: null,
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    searchTerm: '',
    showDropdown: false
  }]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [description, setDescription] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDocumentNoGenerated, setIsDocumentNoGenerated] = useState(false);
  
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    unit: 'KG',
    purchase_price: 0,
    sale_price: 0,
    min_stock: 0
  });
  
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    code: '',
    name: '',
    type: 'customer' as 'customer' | 'supplier' | 'both',
    phone: '',
    email: '',
    address: '',
    city: '',
    tax_number: ''
  });
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    console.log('=== MAL ALIŞ/SATIŞ SAYFASI YÜKLENDİ ===');
    fetchData();
  }, []);
  
  // Debug için global erişim
  useEffect(() => {
    (window as any).debugProducts = products;
    (window as any).debugCustomers = customers;
    console.log('State güncellendi - Products:', products.length, 'Customers:', customers.length);
  }, [products, customers]);

  useEffect(() => {
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (movementType === 'IN') {
      setDescription('Mal Alımı');
    } else {
      setDescription('Mal Satışı');
    }
  }, [movementType]);

  // Sayfa yüklenince veya tarih değişince belge numarasını oluştur
  useEffect(() => {
    if (companyName && !isDocumentNoGenerated) {
      generateAndSetDocumentNo();
    }
  }, [companyName, movementDate]);

  const generateAndSetDocumentNo = async () => {
    const newDocNo = await generateDocumentNo();
    setDocumentNo(newDocNo);
    setIsDocumentNoGenerated(true);
  };

  const fetchData = async () => {
    try {
      // Önce kullanıcının şirket bilgilerini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('company:companies(name)')
        .eq('id', user.id)
        .single();
        
      if (userData?.company?.name) {
        setCompanyName(userData.company.name);
      }
      
      // Bugünün kaçıncı işlemi olduğunu bul
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('stock_movements')
        .select('reference_no', { count: 'exact', head: true })
        .gte('movement_date', today)
        .lt('movement_date', today + 'T23:59:59');
      
      setDailySequence((count || 0) + 1);
      
      // RLS otomatik olarak company_id filtrelemesi yapıyor
      // Ürünleri getir - OPTİMİZE EDİLMİŞ
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, code, name, unit, current_stock, purchase_price, sale_price')
        .eq('is_active', true)  // Sadece aktif ürünler
        .order('name')
        .limit(500);  // Maksimum 500 ürün
      
      console.log('Products sorgu sonucu:', { productsData, productsError });
      
      if (productsError) {
        console.error('Ürün hatası:', productsError);
      }

      // Carileri getir - RLS otomatik filtreliyor - OPTİMİZE EDİLMİŞ
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, code, name, type, phone, balance')
        .eq('is_active', true)
        .order('name')
        .limit(500);  // Maksimum 500 müşteri
        
      console.log('Customers sorgu sonucu:', { customersData, customersError });

      if (customersError) {
        console.error('Müşteri hatası:', customersError);
      }

      setProducts(productsData || []);
      setCustomers(customersData || []);
      
      // Debug için
      console.log('State güncellendi - Products:', productsData?.length, 'Customers:', customersData?.length);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const generateDocumentNo = async () => {
    // Form gönderilmeden önce güncel sıra numarasını al
    // İŞlem tarihini kullan, bugünün tarihini değil!
    const selectedDate = movementDate || new Date().toISOString().split('T')[0];
    const startOfDay = selectedDate + 'T00:00:00';
    const endOfDay = selectedDate + 'T23:59:59';
    
    // SEÇİLEN TARİHTEKİ benzersiz belge sayısını bul
    const { data: todayMovements } = await supabase
      .from('stock_movements')
      .select('reference_no')
      .gte('movement_date', selectedDate)
      .lte('movement_date', selectedDate);
    
    // Benzersiz reference_no'ları say
    const uniqueReferences = new Set(todayMovements?.map(m => m.reference_no) || []);
    const currentSequence = uniqueReferences.size + 1;
    
    // Firma adının ilk kelimesinin ilk 3 harfini al
    let prefix = 'DOC'; // Varsayılan
    if (companyName) {
      // Türkçe karakterleri İngilizce karşılıklarına çevir
      const cleanName = companyName
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      
      // İlk kelimeyi al ve ilk 3 harfini kullan
      const firstWord = cleanName.split(' ')[0];
      if (firstWord.length >= 3) {
        prefix = firstWord.substring(0, 3).toUpperCase();
      } else {
        // Eğer ilk kelime 3 harften kısaysa, tamamını al
        prefix = firstWord.toUpperCase();
      }
    }
    
    // İşlem tarihinden DDMMYY formatında tarih oluştur
    const dateObj = new Date(selectedDate + 'T12:00:00'); // Timezone sorunlarını önlemek için
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString().slice(2);
    const dateStr = `${day}${month}${year}`;
    
    // Günlük sıra numarası (3 haneli)
    const sequence = currentSequence.toString().padStart(3, '0');
    
    return `${prefix}-${dateStr}-${sequence}`;
  };

  const handleProductSearch = (index: number, searchTerm: string) => {
    const newProducts = [...selectedProducts];
    newProducts[index] = {
      ...newProducts[index],
      searchTerm,
      showDropdown: true
    };
    setSelectedProducts(newProducts);
  };

  const handleProductSelect = (index: number, product: Product) => {
    const newProducts = [...selectedProducts];
    newProducts[index] = {
      ...newProducts[index],
      product,
      unit_price: movementType === 'IN' ? product.purchase_price : product.sale_price,
      total_price: newProducts[index].quantity * (movementType === 'IN' ? product.purchase_price : product.sale_price),
      searchTerm: '',
      showDropdown: false
    };
    setSelectedProducts(newProducts);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newProducts = [...selectedProducts];
    newProducts[index].quantity = quantity;
    newProducts[index].total_price = quantity * newProducts[index].unit_price;
    setSelectedProducts(newProducts);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newProducts = [...selectedProducts];
    newProducts[index].unit_price = price;
    newProducts[index].total_price = newProducts[index].quantity * price;
    setSelectedProducts(newProducts);
  };

  const addProductRow = () => {
    setSelectedProducts([...selectedProducts, {
      product: null,
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      searchTerm: '',
      showDropdown: false
    }]);
  };

  const removeProductRow = (index: number) => {
    if (selectedProducts.length > 1) {
      setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => sum + item.total_price, 0);
  };

  const generateProductCode = () => {
    const prefix = 'PRD';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  };

  const generateCustomerCode = () => {
    const prefix = movementType === 'IN' ? 'T' : 'M';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  };

  const handleNewCustomer = async () => {
    if (!newCustomer.name) {
      toast.error('Lütfen cari adı girin');
      return;
    }

    try {
      const customerCode = newCustomer.code || generateCustomerCode();
      const customerType = movementType === 'IN' ? 'supplier' : 'customer';

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          code: customerCode,
          name: newCustomer.name,
          type: newCustomer.type || customerType,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: newCustomer.address,
          city: newCustomer.city,
          tax_number: newCustomer.tax_number,
          balance: 0,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setCustomers([...customers, data]);
      setSelectedCustomer(data);
      setNewCustomer({
        code: '',
        name: '',
        type: customerType,
        phone: '',
        email: '',
        address: '',
        city: '',
        tax_number: ''
      });
      setShowNewCustomerModal(false);
      setCustomerSearch('');
      
      toast.success('Cari başarıyla eklendi');
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error(error.message || 'Cari eklenirken hata oluştu');
    }
  };

  const handleNewProduct = async () => {
    if (!newProduct.name) {
      toast.error('Lütfen ürün adı girin');
      return;
    }

    try {
      const productCode = newProduct.code || generateProductCode();

      const { data, error } = await supabase
        .from('products')
        .insert([{
          // company_id otomatik olarak auth.company_id() default value ile eklenecek
          code: productCode,
          name: newProduct.name,
          unit: newProduct.unit,
          purchase_price: newProduct.purchase_price,
          sale_price: newProduct.sale_price,
          min_stock: newProduct.min_stock,
          current_stock: 0,
          category: 'Genel'
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts([...products, data]);
      setNewProduct({
        code: '',
        name: '',
        unit: 'KG',
        purchase_price: 0,
        sale_price: 0,
        min_stock: 0
      });
      setShowNewProductModal(false);
      
      toast.success('Ürün başarıyla eklendi');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Ürün eklenirken hata oluştu');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error('Lütfen bir cari seçin');
      return;
    }

    const validProducts = selectedProducts.filter(item => item.product !== null);
    if (validProducts.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    if (movementType === 'OUT') {
      for (const item of validProducts) {
        if (item.product && item.quantity > item.product.current_stock) {
          toast.error(`${item.product.name} için yetersiz stok! Mevcut: ${item.product.current_stock}`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const docNo = documentNo; // Artık otomatik oluşturulmuş durumda
      const totalAmount = calculateTotal();

      const stockMovements = validProducts.map(item => ({
        // company_id otomatik olarak auth.company_id() default value ile eklenecek
        product_id: item.product!.id,
        customer_id: selectedCustomer.id,
        movement_type: movementType,
        movement_subtype: movementType === 'IN' ? 'purchase' : 'sale',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        description: `${description} - ${selectedCustomer.name}`,
        reference_no: docNo,
        movement_date: movementDate,
        created_by: null,
      }));

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements);

      if (stockError) throw stockError;

      const { error: accountError } = await supabase
        .from('account_movements')
        .insert([{
          // company_id otomatik olarak auth.company_id() default value ile eklenecek
          customer_id: selectedCustomer.id,
          movement_type: movementType === 'IN' ? 'CREDIT' : 'DEBT',
          amount: totalAmount,
          description: `${description} - ${docNo}`,
          document_type: movementType === 'IN' ? 'purchase' : 'sale',
          document_no: docNo,
          due_date: null,
          is_paid: false,
          paid_amount: 0,
          created_by: null,
        }]);

      if (accountError) throw accountError;

      // Başarılı işlem sonrası - sadece satış için fatura seçeneği
      if (movementType === 'OUT') {
        toast.success('Mal satışı başarıyla kaydedildi!', {
          duration: 5000,
          action: {
            label: 'Fatura Oluştur',
            onClick: () => {
              // Fatura bilgilerini sessionStorage'a kaydet
              sessionStorage.setItem('invoiceData', JSON.stringify({
                customer_id: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                document_no: docNo,
                items: validProducts.map(item => ({
                  product_id: item.product!.id,
                  product_name: item.product!.name,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total_price: item.total_price,
                  unit: item.product!.unit
                })),
                total_amount: totalAmount,
                movement_type: movementType
              }));
              // Direkt fatura sayfasına git, geri dönme
              window.location.href = '/fatura/yeni?from=stock-movement';
            }
          }
        });
      } else {
        // Alış için sadece başarı mesajı
        toast.success('Mal alışı başarıyla kaydedildi!');
      }
      
      // Sıra numarası artık her seferinde yeniden hesaplanıyor
      
      // 3 saniye sonra listeye dön
      setTimeout(() => {
        router.push('/stok/hareketler');
      }, 3000);
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    if (!customerSearch) {
      return customers.filter(c => {
        const matchesType = movementType === 'IN' 
          ? ['supplier', 'both'].includes(c.type) 
          : ['customer', 'both'].includes(c.type);
        return matchesType;
      });
    }
    
    const searchLower = customerSearch.toLocaleLowerCase('tr-TR');
    return customers.filter(c => {
      const nameLower = c.name.toLocaleLowerCase('tr-TR');
      const codeLower = c.code.toLocaleLowerCase('tr-TR');
      const matchesSearch = nameLower.includes(searchLower) || codeLower.includes(searchLower);
      const matchesType = movementType === 'IN' 
        ? ['supplier', 'both'].includes(c.type) 
        : ['customer', 'both'].includes(c.type);
      return matchesSearch && matchesType;
    });
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) {
      return products;
    }
    
    const searchLower = searchTerm.toLocaleLowerCase('tr-TR');
    return products.filter(p => {
      const nameLower = p.name.toLocaleLowerCase('tr-TR');
      const codeLower = p.code.toLocaleLowerCase('tr-TR');
      return nameLower.includes(searchLower) || codeLower.includes(searchLower);
    });
  };

  const closeAllDropdowns = () => {
    setShowCustomerDropdown(false);
    const newProducts = selectedProducts.map(p => ({ ...p, showDropdown: false }));
    setSelectedProducts(newProducts);
  };

  return (
    <div onClick={closeAllDropdowns}>
      <div className="mb-6">
        <Link
          href="/stok/hareketler"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Mal Alış/Satış Listesine Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mal Alış / Satış</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Hareket Tipi ve Cari Seçimi */}
          <div className="bg-white rounded-lg shadow p-6" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol taraf - Cari Seçimi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} Seçimi
                </h2>
                <div className="relative">
                  {!selectedCustomer ? (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={(e) => {
                            e.stopPropagation();
                            setShowCustomerDropdown(true);
                          }}
                          placeholder={`${movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} ara...`}
                          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>

                      {showCustomerDropdown && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                          {getFilteredCustomers().length > 0 ? (
                            getFilteredCustomers().map(customer => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomer(customer);
                                  setCustomerSearch('');
                                  setShowCustomerDropdown(false);
                                }}
                                className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                              >
                                <div className="font-medium">{customer.name}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4">
                              <p className="text-sm text-gray-500 mb-3">
                                {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} bulunamadı
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewCustomer(prev => ({ 
                                    ...prev, 
                                    name: customerSearch,
                                    type: movementType === 'IN' ? 'supplier' : 'customer'
                                  }));
                                  setShowNewCustomerModal(true);
                                  setShowCustomerDropdown(false);
                                }}
                                className="w-full inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                              >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Yeni {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} Ekle
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{selectedCustomer.name}</div>
                          <div className="text-sm text-gray-500">
                            {selectedCustomer.phone || 'Telefon bilgisi yok'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(null);
                            setCustomerSearch('');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sağ taraf - İşlem Tipi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Tipi</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('IN')}
                    className={`px-4 py-2 rounded-md border-2 transition-all flex items-center justify-center gap-2 ${
                      movementType === 'IN'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Mal Alışı</span>
                    <span className="text-xs text-gray-500">Giriş</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('OUT')}
                    className={`px-4 py-2 rounded-md border-2 transition-all flex items-center justify-center gap-2 ${
                      movementType === 'OUT'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Mal Satışı</span>
                    <span className="text-xs text-gray-500">Çıkış</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ürün Seçimi */}
          <div className="bg-white rounded-lg shadow p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ürünler</h2>
              <button
                type="button"
                onClick={addProductRow}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ürün Ekle
              </button>
            </div>

            <div className="space-y-4">
              {selectedProducts.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Ürün Seçimi */}
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ürün
                      </label>
                      {!item.product ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={item.searchTerm}
                            onChange={(e) => handleProductSearch(index, e.target.value)}
                            onFocus={(e) => {
                              e.stopPropagation();
                              handleProductSearch(index, item.searchTerm);
                            }}
                            placeholder="Ürün ara..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {item.showDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {getFilteredProducts(item.searchTerm).length > 0 ? (
                                getFilteredProducts(item.searchTerm).map(product => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProductSelect(index, product);
                                    }}
                                    className="w-full px-4 py-2 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {product.code} • Stok: {product.current_stock} {product.unit}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4">
                                  <p className="text-sm text-gray-500 mb-3">Ürün bulunamadı</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewProduct(prev => ({ ...prev, name: item.searchTerm }));
                                      setShowNewProductModal(true);
                                      closeAllDropdowns();
                                    }}
                                    className="w-full inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Yeni Ürün Ekle
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="bg-gray-50 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newProducts = [...selectedProducts];
                            newProducts[index] = {
                              ...newProducts[index],
                              product: null,
                              searchTerm: ''
                            };
                            setSelectedProducts(newProducts);
                          }}
                        >
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-gray-500">
                            Stok: {item.product.current_stock} {item.product.unit}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Miktar */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miktar
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0.01"
                        step="0.01"
                        disabled={!item.product}
                      />
                    </div>

                    {/* Birim Fiyat */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Birim Fiyat
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        disabled={!item.product}
                      />
                    </div>

                    {/* Toplam */}
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Toplam
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md font-semibold">
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>

                    {/* Sil */}
                    <div className="md:col-span-1">
                      {selectedProducts.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProductRow(index);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Toplam */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Genel Toplam:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          </div>

          {/* İşlem Bilgileri */}
          <div className="bg-white rounded-lg shadow p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Bilgileri</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="documentNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Belge No
                </label>
                <input
                  type="text"
                  id="documentNo"
                  value={documentNo}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="movementDate" className="block text-sm font-medium text-gray-700 mb-1">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  id="movementDate"
                  value={movementDate}
                  onChange={(e) => {
                    setMovementDate(e.target.value);
                    setIsDocumentNoGenerated(false); // Tarih değişince yeniden oluştur
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Aksiyonları */}
          <div className="flex justify-end space-x-4 pb-6">
            <Link
              href="/stok/hareketler"
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

      {/* Yeni Ürün Modal */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowNewProductModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Yeni Ürün Ekle</h3>
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  setNewProduct({
                    code: '',
                    name: '',
                    unit: 'KG',
                    purchase_price: 0,
                    sale_price: 0,
                    min_stock: 0
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Kodu
                  <span className="text-xs text-gray-500 ml-2">(Opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={newProduct.code}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Otomatik oluşturulur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı*
                </label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ürün adı"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim
                </label>
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Adet">Adet</option>
                  <option value="KG">KG</option>
                  <option value="Litre">Litre</option>
                  <option value="Metre">Metre</option>
                  <option value="Paket">Paket</option>
                  <option value="Koli">Koli</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alış Fiyatı
                  </label>
                  <input
                    type="number"
                    value={newProduct.purchase_price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Satış Fiyatı
                  </label>
                  <input
                    type="number"
                    value={newProduct.sale_price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stok
                </label>
                <input
                  type="number"
                  value={newProduct.min_stock}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, min_stock: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewProductModal(false);
                  setNewProduct({
                    code: '',
                    name: '',
                    unit: 'KG',
                    purchase_price: 0,
                    sale_price: 0,
                    min_stock: 0
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleNewProduct}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Cari Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowNewCustomerModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Yeni {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} Ekle
              </h3>
              <button
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setNewCustomer({
                    code: '',
                    name: '',
                    type: movementType === 'IN' ? 'supplier' : 'customer',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    tax_number: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cari Kodu
                  <span className="text-xs text-gray-500 ml-2">(Opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.code}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Otomatik oluşturulur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} Adı*
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`${movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} adı`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip
                </label>
                <select
                  value={newCustomer.type}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, type: e.target.value as 'customer' | 'supplier' | 'both' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer">Müşteri</option>
                  <option value="supplier">Tedarikçi</option>
                  <option value="both">Her İkisi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0555 555 5555"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="İstanbul"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vergi No
                </label>
                <input
                  type="text"
                  value={newCustomer.tax_number}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, tax_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Detaylı adres"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setNewCustomer({
                    code: '',
                    name: '',
                    type: movementType === 'IN' ? 'supplier' : 'customer',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    tax_number: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleNewCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}