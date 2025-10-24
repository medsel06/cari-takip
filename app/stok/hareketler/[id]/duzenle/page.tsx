'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  id?: string; // Mevcut kayıtlar için
  product: Product | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  searchTerm: string;
  showDropdown: boolean;
  isExisting?: boolean; // Mevcut kayıt mı yoksa yeni eklenen mi
}

interface StockMovement {
  id: string;
  product_id: string;
  customer_id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  unit_price: number;
  total_price: number;
  movement_date: string;
  description: string;
  reference_no: string;
  created_at: string;
}

export default function StokHareketDuzenlePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Form state
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('OUT');
  const [selectedProducts, setSelectedProducts] = useState<ProductRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [description, setDescription] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [movementDate, setMovementDate] = useState('');
  const [originalDocumentNo, setOriginalDocumentNo] = useState(''); // Aynı belge no ile kayıt için
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchMovementAndRelated();
    }
  }, [params.id]);

  const fetchMovementAndRelated = async () => {
    try {
      // Önce tüm verileri getir
      const [productsRes, customersRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').eq('is_active', true).order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (customersRes.error) throw customersRes.error;
      
      setProducts(productsRes.data || []);
      setCustomers(customersRes.data || []);

      // İlk hareketi getir (aynı belge no'ya sahip ilk kayıt)
      const { data: firstMovement, error: firstError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('id', params.id)
        .single();

      if (firstError) throw firstError;
      
      if (firstMovement) {
        // Aynı belge no'ya sahip tüm hareketleri getir
        const { data: allMovements, error: movementsError } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('reference_no', firstMovement.reference_no)
          .order('created_at');

        if (movementsError) throw movementsError;

        // Form alanlarını doldur
        setMovementType(firstMovement.movement_type);
        setDescription(firstMovement.description || '');
        setDocumentNo(firstMovement.reference_no || '');
        setOriginalDocumentNo(firstMovement.reference_no || '');
        setMovementDate(firstMovement.movement_date || firstMovement.created_at.split('T')[0]);
        
        // Müşteriyi seç
        const customer = customersRes.data?.find(c => c.id === firstMovement.customer_id);
        if (customer) setSelectedCustomer(customer);

        // Ürünleri listele
        const productRows: ProductRow[] = allMovements.map(movement => {
          const product = productsRes.data?.find(p => p.id === movement.product_id);
          return {
            id: movement.id,
            product: product || null,
            quantity: movement.quantity,
            unit_price: movement.unit_price,
            total_price: movement.total_price,
            searchTerm: '',
            showDropdown: false,
            isExisting: true
          };
        });
        
        setSelectedProducts(productRows);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setInitialLoading(false);
    }
  };

  const closeAllDropdowns = () => {
    setShowCustomerDropdown(false);
    const newProducts = selectedProducts.map(p => ({ ...p, showDropdown: false }));
    setSelectedProducts(newProducts);
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
      showDropdown: false,
      isExisting: false
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

  const getFilteredCustomers = () => {
    if (!customerSearch) {
      return customers.filter(c => {
        const matchesType = movementType === 'IN' 
          ? ['supplier', 'both'].includes(c.type) 
          : ['customer', 'both'].includes(c.type);
        return matchesType;
      });
    }
    
    const searchLower = customerSearch.toLowerCase();
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchLower) || 
                           c.code.toLowerCase().includes(searchLower);
      const matchesType = movementType === 'IN' 
        ? ['supplier', 'both'].includes(c.type) 
        : ['customer', 'both'].includes(c.type);
      return matchesSearch && matchesType;
    });
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return products;
    
    const searchLower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      p.code.toLowerCase().includes(searchLower)
    );
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

    setLoading(true);

    try {
      // Önce eski kayıtları sil (aynı belge no'ya sahip olanları)
      const { error: deleteError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('reference_no', originalDocumentNo);

      if (deleteError) throw deleteError;

      // Yeni kayıtları ekle
      const stockMovements = validProducts.map(item => ({
        product_id: item.product!.id,
        customer_id: selectedCustomer.id,
        movement_type: movementType,
        movement_subtype: movementType === 'IN' ? 'purchase' : 'sale',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        description: description || `${movementType === 'IN' ? 'Mal Alışı' : 'Mal Satışı'} - ${selectedCustomer.name}`,
        reference_no: documentNo,
        movement_date: movementDate,
        created_by: null,
      }));

      const { error: stockError } = await supabase
        .from('stock_movements')
        .insert(stockMovements);

      if (stockError) throw stockError;

      toast.success('Hareket başarıyla güncellendi!');
      setTimeout(() => {
        router.push('/stok/hareketler');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Güncelleme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!selectedProducts.length && !initialLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hareket bulunamadı.</p>
        <Link href="/stok/hareketler" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Listeye dön
        </Link>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Mal {movementType === 'IN' ? 'Alış' : 'Satış'} Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Hareket Tipi ve Cari Seçimi */}
          <div className="bg-white rounded-lg shadow p-6" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* İşlem Tipi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Tipi</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={true}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 cursor-not-allowed opacity-75 ${
                      movementType === 'IN'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <TrendingDown className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <div className="font-semibold">Mal Alışı</div>
                      <div className="text-xs text-gray-500">Tedarikçiden giriş</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={true}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 cursor-not-allowed opacity-75 ${
                      movementType === 'OUT'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">Mal Satışı</div>
                      <div className="text-xs text-gray-500">Müşteriye çıkış</div>
                    </div>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">* İşlem tipi değiştirilemez</p>
              </div>

              {/* Cari Seçimi */}
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
                                <div className="text-sm text-gray-500">
                                  {customer.code} • {customer.city || 'Şehir belirtilmemiş'}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4">
                              <p className="text-sm text-gray-500">
                                {movementType === 'IN' ? 'Tedarikçi' : 'Müşteri'} bulunamadı
                              </p>
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
                            {selectedCustomer.code} • {selectedCustomer.phone || 'Telefon yok'}
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
                                  <p className="text-sm text-gray-500">Ürün bulunamadı</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belge No
                </label>
                <input
                  type="text"
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
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
              {loading ? 'Güncelleniyor...' : 'Güncelle'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}