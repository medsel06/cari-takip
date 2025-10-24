'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Save, X, DollarSign, FileText, Calendar, Search, CreditCard, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { Customer, Check } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function TahsilatOdemePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer_id');
  const customerName = searchParams.get('customer_name');
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableChecks, setAvailableChecks] = useState<Check[]>([]);
  const [selectedChecks, setSelectedChecks] = useState<Check[]>([]);
  const [showCheckSelection, setShowCheckSelection] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    movement_type: 'CREDIT' as 'DEBT' | 'CREDIT',
    amount: 0,
    description: '',
    document_type: 'payment',
    document_no: '',
    due_date: '',
    payment_method: 'cash', // cash, transfer, check, credit_card, check_endorsement
    check_payment_type: 'new' as 'new' | 'endorsement', // new: yeni çek, endorsement: mevcut çek ciro
  });

  // Çek bilgileri
  const [checkData, setCheckData] = useState({
    check_number: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    drawer_name: '',
    check_due_date: '',
  });

  useEffect(() => {
    fetchCustomers();
    if (formData.movement_type === 'DEBT') {
      fetchAvailableChecks();
    }
  }, [formData.movement_type]);

  useEffect(() => {
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setFormData(prev => ({ ...prev, customer_id: customerId }));
      }
    }
  }, [customerId, customers]);

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
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAvailableChecks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Portföyde olan (ciro edilebilir) alınan çekleri getir
      const { data, error } = await supabase
        .from('checks')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('company_id', userData.company_id)
        .eq('type', 'received')
        .eq('status', 'portfolio')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) console.log('No available checks found');
      setAvailableChecks(data || []);
    } catch (error) {
      // Sessizce geç, çek olmayabilir
      setAvailableChecks([]);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setSearchTerm('');
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateDocumentNo = () => {
    const prefix = formData.movement_type === 'CREDIT' ? 'TAH' : 'ODE';
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${dateStr}-${random}`;
  };

  const getDescriptionTemplate = () => {
    const type = formData.movement_type === 'CREDIT' ? 'Tahsilat' : 'Ödeme';
    const method = {
      'cash': 'Nakit',
      'transfer': 'Havale/EFT',
      'check': 'Çek',
      'credit_card': 'Kredi Kartı'
    }[formData.payment_method];
    
    return `${method} ${type}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Lütfen bir cari seçin');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Tutar 0\'dan büyük olmalıdır');
      return;
    }

    // Çek seçildiyse çek bilgileri zorunlu
    if (formData.payment_method === 'check' && formData.check_payment_type === 'new') {
      if (!checkData.check_number || !checkData.bank_name || !checkData.check_due_date) {
        toast.error('Çek bilgilerini doldurun');
        return;
      }
    }

    // Ciro işlemi için çek seçimi kontrolü
    if (formData.payment_method === 'check' && formData.check_payment_type === 'endorsement') {
      if (selectedChecks.length === 0) {
        toast.error('Lütfen ciro edilecek çekleri seçin');
        return;
      }
      const totalCheckAmount = selectedChecks.reduce((sum, check) => sum + check.amount, 0);
      if (Math.abs(totalCheckAmount - formData.amount) > 0.01) {
        toast.error(`Seçilen çeklerin toplamı (${formatCurrency(totalCheckAmount)}) işlem tutarına eşit olmalıdır`);
        return;
      }
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

      // Belge numarası yoksa otomatik oluştur
      const documentNo = formData.document_no || generateDocumentNo();

      // Açıklama yoksa şablon kullan
      const description = formData.description || getDescriptionTemplate();

      // 1. Eğer çek ile ödeme/tahsilat ise
      if (formData.payment_method === 'check') {
        if (formData.check_payment_type === 'new') {
          // Yeni çek oluştur
          const { data: checkRecord, error: checkError } = await supabase
            .from('checks')
            .insert([{
              company_id: userData.company_id,
              customer_id: formData.customer_id,
              check_number: checkData.check_number,
              bank_name: checkData.bank_name,
              branch_name: checkData.branch_name || null,
              account_number: checkData.account_number || null,
              drawer_name: checkData.drawer_name || selectedCustomer.name,
              amount: formData.amount,
              due_date: checkData.check_due_date,
              status: 'portfolio',
              type: formData.movement_type === 'CREDIT' ? 'received' : 'issued',
              description: description,
              created_by: user?.id,
            }])
            .select()
            .single();

          if (checkError) throw checkError;
          console.log('Oluşturulan çek:', checkRecord);
        } else {
          // Mevcut çekleri ciro et
          for (const check of selectedChecks) {
            // Çek durumunu güncelle
            const { error: updateError } = await supabase
              .from('checks')
              .update({
                status: 'endorsed',
                endorsement_date: new Date().toISOString().split('T')[0],
                endorsement_to: selectedCustomer.name,
                endorser: formData.customer_id
              })
              .eq('id', check.id);

            if (updateError) throw updateError;

            // Ciro geçmişine ekle
            const { error: endorsementError } = await supabase
              .from('check_endorsements')
              .insert([{
                check_id: check.id,
                from_customer_id: check.customer_id,
                to_customer_id: formData.customer_id,
                endorsement_date: new Date().toISOString().split('T')[0],
                amount: check.amount,
                description: `${selectedCustomer.name} firmasına ciro edildi`,
                created_by: user.id
              }]);

            if (endorsementError) console.error('Ciro geçmişi kaydedilemedi:', endorsementError);
          }
        }
      }

      // 2. Cari hareketi ekle
      const { error } = await supabase
        .from('account_movements')
        .insert([{
          company_id: userData.company_id,
          customer_id: formData.customer_id,
          movement_type: formData.movement_type,
          amount: formData.amount,
          description: formData.payment_method === 'check' && formData.check_payment_type === 'endorsement' 
            ? `${description} - Ciro edilen çek sayısı: ${selectedChecks.length}`
            : formData.payment_method === 'check' && checkData.check_number
            ? `${description} - Çek No: ${checkData.check_number}`
            : description,
          document_type: formData.document_type,
          document_no: documentNo,
          payment_method: formData.payment_method,
          due_date: formData.payment_method === 'check' && formData.check_payment_type === 'new' 
            ? checkData.check_due_date 
            : (formData.due_date || null),
          is_paid: formData.payment_method !== 'check' && formData.movement_type === 'CREDIT',
          paid_amount: formData.payment_method !== 'check' && formData.movement_type === 'CREDIT' ? formData.amount : 0,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast.success('\u0130\u015flem ba\u015far\u0131yla kaydedildi');
      
      // Başarılı - cari detayına yönlendir
      router.push(`/cari/${formData.customer_id}`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCheckData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href={customerId ? `/cari/${customerId}` : "/cari"}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {customerId ? 'Cari Detayına Dön' : 'Cari Listesine Dön'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Tahsilat / Ödeme Girişi</h1>
        {customerName && (
          <p className="text-sm text-gray-600 mt-1">Müşteri: {decodeURIComponent(customerName)}</p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* İşlem Tipi ve Cari Seçimi */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol taraf - İşlem Tipi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Tipi</h2>
                <div className="grid grid-cols-2 max-w-md gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, movement_type: 'CREDIT' }))}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      formData.movement_type === 'CREDIT'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Tahsilat</div>
                      <div className="text-xs text-gray-500">Müşteriden para girişi</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, movement_type: 'DEBT' }))}
                    className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      formData.movement_type === 'DEBT'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Ödeme</div>
                      <div className="text-xs text-gray-500">Tedarikçiye para çıkışı</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sağ taraf - Cari Seçimi */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {formData.movement_type === 'CREDIT' ? 'Müşteri' : 'Tedarikçi'} Seçimi
                </h2>
                
                {!selectedCustomer ? (
                  <div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`${formData.movement_type === 'CREDIT' ? 'Müşteri' : 'Tedarikçi'} ara (ad veya kod)`}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                      {filteredCustomers
                        .filter(c => {
                          if (formData.movement_type === 'CREDIT') {
                            return ['customer', 'both'].includes(c.type);
                          } else {
                            return ['supplier', 'both'].includes(c.type);
                          }
                        })
                        .length > 0 ? (
                        filteredCustomers
                          .filter(c => {
                            if (formData.movement_type === 'CREDIT') {
                              return ['customer', 'both'].includes(c.type);
                            } else {
                              return ['supplier', 'both'].includes(c.type);
                            }
                          })
                          .map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full px-4 py-3 hover:bg-gray-50 text-left"
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">
                                {customer.code} • Bakiye: {formatCurrency(customer.balance)}
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                          {formData.movement_type === 'CREDIT' ? 'Müşteri' : 'Tedarikçi'} bulunamadı
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-500">
                          {selectedCustomer.code} • Bakiye: {formatCurrency(selectedCustomer.balance)}
                        </div>
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* İşlem Detayları */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlem Detayları</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Tutar (₺)*
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                  Ödeme Yöntemi*
                </label>
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Nakit</option>
                  <option value="transfer">Havale/EFT</option>
                  <option value="check">Çek</option>
                  <option value="credit_card">Kredi Kartı</option>
                </select>
              </div>

              <div>
                <label htmlFor="document_no" className="block text-sm font-medium text-gray-700 mb-1">
                  Belge No
                  <span className="text-xs text-gray-500 ml-2">(Boş bırakılırsa otomatik oluşturulur)</span>
                </label>
                <input
                  type="text"
                  id="document_no"
                  name="document_no"
                  value={formData.document_no}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TAH-20240101-001"
                />
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  İşlem Tarihi
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
                  <span className="text-xs text-gray-500 ml-2">(Boş bırakılırsa otomatik oluşturulur)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="İşlem açıklaması..."
                />
              </div>
            </div>
          </div>

          {/* Çek Bilgileri - Sadece çek seçiliyse göster */}
          {formData.payment_method === 'check' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <CreditCard className="inline-block h-5 w-5 mr-2" />
                Çek Bilgileri
              </h2>
              
              {/* Ödeme yaparken çek seçim opsiyonu */}
              {formData.movement_type === 'DEBT' && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Çek Türü
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, check_payment_type: 'new' }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.check_payment_type === 'new'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <div className="text-sm font-medium">Yeni Çek</div>
                      <div className="text-xs text-gray-500">Kendi çekimizi kesilir</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, check_payment_type: 'endorsement' }));
                        setShowCheckSelection(true);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.check_payment_type === 'endorsement'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ArrowRightLeft className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-sm font-medium">Ciro</div>
                      <div className="text-xs text-gray-500">Müşteriden alınan çek</div>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Yeni çek bilgileri */}
              {formData.check_payment_type === 'new' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="check_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Çek No*
                    </label>
                    <input
                      type="text"
                      id="check_number"
                      name="check_number"
                      required={formData.payment_method === 'check' && formData.check_payment_type === 'new'}
                      value={checkData.check_number}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12345678"
                    />
                  </div>

                  <div>
                    <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Banka Adı*
                    </label>
                    <input
                      type="text"
                      id="bank_name"
                      name="bank_name"
                      required={formData.payment_method === 'check' && formData.check_payment_type === 'new'}
                      value={checkData.bank_name}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Banka adı"
                    />
                  </div>

                  <div>
                    <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Şube
                    </label>
                    <input
                      type="text"
                      id="branch_name"
                      name="branch_name"
                      value={checkData.branch_name}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Şube adı"
                    />
                  </div>

                  <div>
                    <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Hesap No
                    </label>
                    <input
                      type="text"
                      id="account_number"
                      name="account_number"
                      value={checkData.account_number}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Hesap numarası"
                    />
                  </div>

                  <div>
                    <label htmlFor="drawer_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Keşideci
                    </label>
                    <input
                      type="text"
                      id="drawer_name"
                      name="drawer_name"
                      value={checkData.drawer_name}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.movement_type === 'CREDIT' ? 'Müşteri adı' : 'Firma adınız'}
                    />
                  </div>

                  <div>
                    <label htmlFor="check_due_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Vade Tarihi*
                    </label>
                    <input
                      type="date"
                      id="check_due_date"
                      name="check_due_date"
                      required={formData.payment_method === 'check' && formData.check_payment_type === 'new'}
                      value={checkData.check_due_date}
                      onChange={handleCheckChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Ciro edilecek çekler */}
              {formData.check_payment_type === 'endorsement' && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Portföyünüzdeki çekleri seçin (Toplam: {formatCurrency(formData.amount)} olmalı)
                    </p>
                    {selectedChecks.length > 0 && (
                      <p className="text-sm font-medium text-green-600">
                        Seçilen: {selectedChecks.length} adet - 
                        Toplam: {formatCurrency(selectedChecks.reduce((sum, check) => sum + check.amount, 0))}
                      </p>
                    )}
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {availableChecks.length > 0 ? (
                      <div className="divide-y">
                        {availableChecks.map(check => {
                          const isSelected = selectedChecks.some(c => c.id === check.id);
                          return (
                            <label
                              key={check.id}
                              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChecks([...selectedChecks, check]);
                                    } else {
                                      setSelectedChecks(selectedChecks.filter(c => c.id !== check.id));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <div>
                                  <div className="font-medium text-sm">
                                    {check.check_number} - {check.bank_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {check.customer?.name} • Vade: {formatDate(check.due_date)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-sm">
                                  {formatCurrency(check.amount)}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        Ciro edilebilir çek bulunamadı
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Not:</strong> {formData.movement_type === 'CREDIT' ? 
                    'Müşteriden alınan çek bilgileri girilmektedir.' : 
                    formData.check_payment_type === 'new' ?
                    'Kendi çekiniz keşide edilecektir.' :
                    'Müşterilerden alınan çekler ciro edilecektir.'}
                </p>
              </div>
            </div>
          )}

          {/* İşlem Özeti */}
          {selectedCustomer && formData.amount > 0 && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">İşlem Özeti</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cari:</span>
                  <span className="font-medium">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">İşlem Tipi:</span>
                  <span className={`font-medium ${
                    formData.movement_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.movement_type === 'CREDIT' ? 'Tahsilat' : 'Ödeme'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tutar:</span>
                  <span className="font-medium">{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ödeme Yöntemi:</span>
                  <span className="font-medium">
                    {{
                      'cash': 'Nakit',
                      'transfer': 'Havale/EFT',
                      'check': 'Çek',
                      'credit_card': 'Kredi Kartı'
                    }[formData.payment_method]}
                  </span>
                </div>
                {formData.payment_method === 'check' && checkData.check_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Çek No:</span>
                    <span className="font-medium">{checkData.check_number}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">İşlem Sonrası Bakiye:</span>
                  <span className={`font-semibold text-lg ${
                    (selectedCustomer.balance + (formData.movement_type === 'DEBT' ? formData.amount : -formData.amount)) > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(
                      selectedCustomer.balance + (formData.movement_type === 'DEBT' ? formData.amount : -formData.amount)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Aksiyonları */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/cari"
              className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading || !selectedCustomer || formData.amount <= 0}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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