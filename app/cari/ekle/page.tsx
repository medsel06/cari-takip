'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { CustomerFormData } from '@/lib/types';

export default function CariEklePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CustomerFormData>({
    code: '',
    name: '',
    type: 'customer',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    district: '',
    tax_office: '',
    tax_number: '',
    authorized_person: '',
    authorized_phone: '',
    credit_limit: 0,
    risk_status: 'normal',
    payment_term: 30,
    currency: 'TRY',
    discount_rate: 0,
    notes: '',
    is_active: true,
  });

  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});

  // Otomatik kod önerisi
  useEffect(() => {
    generateNextCode();
  }, [formData.type]);

  const generateNextCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Yeni kod sistemi: M00001, T00001, MT0001
      let prefix = '';
      if (formData.type === 'supplier') {
        prefix = 'T';
      } else if (formData.type === 'customer') {
        prefix = 'M';
      } else {
        prefix = 'MT';
      }
      
      const { data } = await supabase
        .from('customers')
        .select('code')
        .eq('company_id', userData.company_id)
        .like('code', `${prefix}%`)
        .order('code', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        // Kodu parse et: M00001 -> 1, MT0001 -> 1
        const lastCode = data[0].code;
        const numberPart = lastCode.replace(/[A-Z]/g, ''); // Harfleri kaldır
        nextNumber = parseInt(numberPart) + 1;
      }
      
      const nextCode = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      setFormData(prev => ({ ...prev, code: nextCode }));
    } catch (error) {
      console.error('Error generating code:', error);
      // Hata durumunda varsayılan kod
      const prefix = formData.type === 'supplier' ? 'T' : formData.type === 'customer' ? 'M' : 'MT';
      setFormData(prev => ({ ...prev, code: `${prefix}00001` }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerFormData> = {};

    // Zorunlu alanlar
    if (!formData.name.trim()) {
      newErrors.name = 'Cari adı zorunludur';
    }

    // Email formatı
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }

    // Telefon formatı (basit kontrol)
    if (formData.phone && !/^[0-9\s\-\(\)+]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası girin';
    }

    // Vergi numarası kontrolü
    if (formData.tax_number) {
      if (formData.tax_number.length === 10 && !/^[0-9]{10}$/.test(formData.tax_number)) {
        newErrors.tax_number = 'Vergi numarası 10 haneli olmalıdır';
      } else if (formData.tax_number.length === 11 && !/^[0-9]{11}$/.test(formData.tax_number)) {
        newErrors.tax_number = 'TC Kimlik numarası 11 haneli olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) throw new Error('Şirket bilgisi bulunamadı');

      // Kodu oluştur
      if (!formData.code) {
        await generateNextCode();
      }

      // Kod benzersizlik kontrolü
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', userData.company_id)
        .eq('code', formData.code)
        .maybeSingle();

      if (existingCustomer) {
        setErrors({ code: 'Bu cari kodu zaten kullanılıyor' });
        setLoading(false);
        return;
      }

      // Cari oluştur
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...formData,
          company_id: userData.company_id,
          balance: 0,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      // Başarılı mesajı ve yönlendirme
      router.push(`/cari/${data.id}`);
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Cari eklenirken hata oluştu');
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
    // Hata varsa temizle
    if (errors[name as keyof CustomerFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // İller listesi
  const cities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
    'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
    'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
    'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
    'İçel (Mersin)', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
    'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
    'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
    'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
    'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
    'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/cari"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cari Listesine Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Yeni Cari Ekle</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Genel Bilgiler */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Genel Bilgiler</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Cari Tipi*
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="customer">Müşteri</option>
                    <option value="supplier">Tedarikçi</option>
                    <option value="both">Müşteri/Tedarikçi</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Cari Adı*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Firma adını girin"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="authorized_person" className="block text-sm font-medium text-gray-700 mb-1">
                    Yetkili Kişi
                  </label>
                  <input
                    type="text"
                    id="authorized_person"
                    name="authorized_person"
                    value={formData.authorized_person || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Yetkili adı soyadı"
                  />
                </div>

                <div>
                  <label htmlFor="credit_limit" className="block text-sm font-medium text-gray-700 mb-1">
                    Kredi Limiti (₺)
                  </label>
                  <input
                    type="number"
                    id="credit_limit"
                    name="credit_limit"
                    value={formData.credit_limit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0212 123 45 67"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Cep Telefonu
                  </label>
                  <input
                    type="text"
                    id="mobile"
                    name="mobile"
                    value={formData.mobile || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0532 123 45 67"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="firma@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    İl
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Açık adres"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vergi Bilgileri */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vergi Bilgileri</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="tax_office" className="block text-sm font-medium text-gray-700 mb-1">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    id="tax_office"
                    name="tax_office"
                    value={formData.tax_office || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Vergi dairesi adı"
                  />
                </div>

                <div>
                  <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Vergi No / TC Kimlik No
                  </label>
                  <input
                    type="text"
                    id="tax_number"
                    name="tax_number"
                    value={formData.tax_number || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.tax_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10 haneli vergi no veya 11 haneli TC"
                    maxLength={11}
                  />
                  {errors.tax_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.tax_number}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notlar</h2>
              
              <div>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Cari ile ilgili özel notlar..."
                />
              </div>
            </div>
          </div>

          {/* Form Aksiyonları */}
          <div className="flex justify-end space-x-4 pb-6">
            <Link
              href="/cari"
              className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
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