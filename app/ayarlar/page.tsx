'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  Settings,
  Save,
  Bell,
  Shield,
  Palette,
  Package,
  Store,
  Factory,
  Briefcase,
  CreditCard,
  Receipt,
  DollarSign,
  Calculator,
  AlertCircle,
  Check,
  X,
  Upload,
  Image
} from 'lucide-react';

export default function AyarlarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetupMode = searchParams.get('setup') === 'true';
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'invoice' | 'system' | 'notifications'>('company');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Firma bilgileri
  const [companyData, setCompanyData] = useState({
    name: '',
    tax_number: '',
    tax_office: '',
    address: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    website: '',
    sector: 'retail', // retail, wholesale, manufacturing, service
    logo_url: '',
    // Fatura bilgileri
    invoice_prefix: 'FTR',
    invoice_series: 'A',
    last_invoice_no: 0,
    e_invoice_enabled: false,
    e_invoice_username: '',
    e_invoice_password: '',
    // Ödeme bilgileri
    bank_name: '',
    iban: '',
    currency: 'TRY',
    // Sistem ayarları
    theme: 'light',
    language: 'tr',
    date_format: 'DD/MM/YYYY',
    decimal_places: 2,
    stock_tracking: true,
    negative_stock_allowed: false,
    auto_backup: true,
    // Bildirim ayarları
    email_notifications: true,
    sms_notifications: false,
    whatsapp_notifications: false,
    low_stock_alert: true,
    due_payment_alert: true,
    alert_days_before: 3
  });

  // Sektör seçenekleri
  const sectors = [
    { value: 'retail', label: 'Perakende', icon: Store, color: 'blue', description: 'Mağaza, market, butik işletmeler için' },
    { value: 'wholesale', label: 'Toptan', icon: Package, color: 'green', description: 'Toptan satış ve dağıtım firmaları için' },
    { value: 'manufacturing', label: 'Üretim', icon: Factory, color: 'purple', description: 'Üretim ve imalat işletmeleri için' },
    { value: 'service', label: 'Hizmet', icon: Briefcase, color: 'orange', description: 'Hizmet sektörü işletmeleri için' }
  ];

  // Modül ayarları (sektöre göre değişecek)
  const [moduleSettings, setModuleSettings] = useState({
    // Perakende
    barcode_system: false,
    pos_integration: false,
    loyalty_program: false,
    // Toptan
    bulk_invoicing: false,
    order_management: false,
    route_planning: false,
    // Üretim
    recipe_management: false,
    production_tracking: false,
    raw_material_tracking: false,
    // Hizmet
    project_based_invoicing: false,
    time_tracking: false,
    service_contracts: false,
    // Ortak modüller
    inventory_management: true,
    customer_management: true,
    invoice_management: true,
    payment_tracking: true,
    check_management: true,
    reporting: true,
    multi_warehouse: false,
    multi_currency: false
  });

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        setIsFirstSetup(true);
        setLoading(false);
        return;
      }

      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id)
        .single();

      if (error) throw error;

      if (company) {
        setCompanyData(prev => ({
          ...prev,
          ...company,
          sector: company.sector || 'retail'
        }));
        
        // Sektöre göre modülleri ayarla
        updateModulesForSector(company.sector || 'retail');
      }
    } catch (error) {
      console.error('Firma bilgileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateModulesForSector = (sector: string) => {
    setModuleSettings(prev => {
      const base = {
        ...prev,
        // Tüm modülleri kapat
        barcode_system: false,
        pos_integration: false,
        loyalty_program: false,
        bulk_invoicing: false,
        order_management: false,
        route_planning: false,
        recipe_management: false,
        production_tracking: false,
        raw_material_tracking: false,
        project_based_invoicing: false,
        time_tracking: false,
        service_contracts: false,
      };

      // Sektöre göre modülleri aç
      switch (sector) {
        case 'retail':
          return { ...base, barcode_system: true, pos_integration: true, loyalty_program: true };
        case 'wholesale':
          return { ...base, bulk_invoicing: true, order_management: true, route_planning: true, multi_warehouse: true };
        case 'manufacturing':
          return { ...base, recipe_management: true, production_tracking: true, raw_material_tracking: true };
        case 'service':
          return { ...base, project_based_invoicing: true, time_tracking: true, service_contracts: true };
        default:
          return base;
      }
    });
  };

  const handleSectorChange = (newSector: string) => {
    setCompanyData(prev => ({ ...prev, sector: newSector }));
    updateModulesForSector(newSector);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        // Yeni firma oluştur
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert([companyData])
          .select()
          .single();

        if (companyError) throw companyError;

        // Kullanıcıyı firmaya bağla
        const { error: userError } = await supabase
          .from('users')
          .update({ company_id: newCompany.id })
          .eq('id', user.id);

        if (userError) throw userError;
        
        // İlk kurulumda dashboard'a yönlendir
        if (isFirstSetup) {
          alert('Firma kurulumu başarıyla tamamlandı!');
          router.push('/');
          return;
        }
      } else {
        // Mevcut firmayı güncelle
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', userData.company_id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi!' });
      
      // 3 saniye sonra mesajı kaldır
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Kaydetme hatası:', error);
      setMessage({ type: 'error', text: error.message || 'Ayarlar kaydedilirken hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setCompanyData(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (error) {
      console.error('Logo yükleme hatası:', error);
      setMessage({ type: 'error', text: 'Logo yüklenirken hata oluştu' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // İlk kurulum modu için özel UI
  if (isFirstSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Hoşgeldin Mesajı */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
              🎉 Hoş Geldiniz!
            </h1>
            <p className="text-center text-gray-600">
              Sistemi kullanmaya başlamak için firma bilgilerinizi tamamlayın.
            </p>
          </div>

          {/* Basit Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-6">Firma Bilgileri</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma Adı *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: ABC Ticaret Ltd. Şti."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <textarea
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Firma adresi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vergi No
                </label>
                <input
                  type="text"
                  value={companyData.tax_number}
                  onChange={(e) => setCompanyData({ ...companyData, tax_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901"
                  maxLength={11}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !companyData.name}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kurulum Yapılıyor...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Sistemi Kurup Başla
                </>
              )}
            </button>

            {message && (
              <div className={`mt-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
          <p className="text-sm text-gray-600 mt-1">Firma bilgileri ve sistem ayarlarını yönetin</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {/* Mesaj */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('company')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Firma Bilgileri
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoice'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4 inline mr-2" />
            Fatura Ayarları
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Sistem Ayarları
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Bildirimler
          </button>
        </nav>
      </div>

      {/* Tab İçerikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel - Form */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'company' && (
            <>
              {/* Sektör Seçimi */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sektör Seçimi</h2>
                <div className="grid grid-cols-2 gap-4">
                  {sectors.map((sector) => {
                    const Icon = sector.icon;
                    const isSelected = companyData.sector === sector.value;
                    
                    return (
                      <button
                        key={sector.value}
                        onClick={() => handleSectorChange(sector.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              isSelected ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{sector.label}</div>
                            <div className="text-xs text-gray-500">{sector.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Firma Bilgileri */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Firma Bilgileri</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firma Adı*
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: ABC Ticaret Ltd. Şti."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vergi No / T.C. Kimlik No*
                    </label>
                    <input
                      type="text"
                      value={companyData.tax_number}
                      onChange={(e) => setCompanyData({ ...companyData, tax_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="12345678901"
                      maxLength={11}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vergi Dairesi*
                    </label>
                    <input
                      type="text"
                      value={companyData.tax_office}
                      onChange={(e) => setCompanyData({ ...companyData, tax_office: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: Kadıköy"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adres*
                    </label>
                    <textarea
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Firma adresi"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İl
                    </label>
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="İstanbul"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      İlçe
                    </label>
                    <input
                      type="text"
                      value={companyData.district}
                      onChange={(e) => setCompanyData({ ...companyData, district: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Kadıköy"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123 45 67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="info@firma.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Web Sitesi
                    </label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.firma.com"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Yükleme */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Firma Logosu</h2>
                
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    {companyData.logo_url ? (
                      <img src={companyData.logo_url} alt="Logo" className="max-w-full max-h-full rounded-lg" />
                    ) : (
                      <Image className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer inline-flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Logo Yükle
                    </label>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG veya SVG. Maks 2MB</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'invoice' && (
            <>
              {/* Fatura Ayarları */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fatura Numaralandırma</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fatura Öneki
                    </label>
                    <input
                      type="text"
                      value={companyData.invoice_prefix}
                      onChange={(e) => setCompanyData({ ...companyData, invoice_prefix: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="FTR"
                      maxLength={5}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fatura Serisi
                    </label>
                    <input
                      type="text"
                      value={companyData.invoice_series}
                      onChange={(e) => setCompanyData({ ...companyData, invoice_series: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="A"
                      maxLength={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Son Fatura No
                    </label>
                    <input
                      type="number"
                      value={companyData.last_invoice_no}
                      onChange={(e) => setCompanyData({ ...companyData, last_invoice_no: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Örnek Fatura No:</strong> {companyData.invoice_prefix}{companyData.invoice_series}{String(companyData.last_invoice_no + 1).padStart(6, '0')}
                  </p>
                </div>
              </div>

              {/* e-Fatura Ayarları */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">e-Fatura / e-Arşiv</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={companyData.e_invoice_enabled}
                      onChange={(e) => setCompanyData({ ...companyData, e_invoice_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">e-Fatura/e-Arşiv sistemi aktif</span>
                  </label>

                  {companyData.e_invoice_enabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kullanıcı Adı
                        </label>
                        <input
                          type="text"
                          value={companyData.e_invoice_username}
                          onChange={(e) => setCompanyData({ ...companyData, e_invoice_username: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Şifre
                        </label>
                        <input
                          type="password"
                          value={companyData.e_invoice_password}
                          onChange={(e) => setCompanyData({ ...companyData, e_invoice_password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ödeme Bilgileri */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Banka Bilgileri</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banka Adı
                    </label>
                    <input
                      type="text"
                      value={companyData.bank_name}
                      onChange={(e) => setCompanyData({ ...companyData, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: Ziraat Bankası"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={companyData.iban}
                      onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                      maxLength={32}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Varsayılan Para Birimi
                    </label>
                    <select
                      value={companyData.currency}
                      onChange={(e) => setCompanyData({ ...companyData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TRY">TRY - Türk Lirası</option>
                      <option value="USD">USD - Amerikan Doları</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - İngiliz Sterlini</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'system' && (
            <>
              {/* Modül Ayarları */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktif Modüller</h2>
                <p className="text-sm text-gray-600 mb-4">Sektörünüze göre önerilen modüller otomatik seçilmiştir</p>
                
                <div className="space-y-3">
                  {/* Ortak Modüller */}
                  <div className="pb-3 border-b">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Temel Modüller</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.inventory_management}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, inventory_management: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Stok Yönetimi</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.customer_management}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, customer_management: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Cari Hesap</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.invoice_management}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, invoice_management: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Fatura Yönetimi</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.payment_tracking}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, payment_tracking: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Tahsilat Takibi</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.check_management}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, check_management: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Çek Yönetimi</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.reporting}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, reporting: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Raporlama</span>
                      </label>
                    </div>
                  </div>

                  {/* Sektöre Özel Modüller */}
                  {companyData.sector === 'retail' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Perakende Modülleri</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.barcode_system}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, barcode_system: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Barkod Sistemi</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.pos_integration}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, pos_integration: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">POS Entegrasyonu</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.loyalty_program}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, loyalty_program: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Sadakat Programı</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {companyData.sector === 'wholesale' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Toptan Modülleri</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.bulk_invoicing}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, bulk_invoicing: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Toplu Faturalama</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.order_management}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, order_management: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Sipariş Yönetimi</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.route_planning}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, route_planning: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Rota Planlama</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {companyData.sector === 'manufacturing' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Üretim Modülleri</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.recipe_management}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, recipe_management: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Reçete Yönetimi</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.production_tracking}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, production_tracking: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Üretim Takibi</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.raw_material_tracking}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, raw_material_tracking: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Hammadde Takibi</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {companyData.sector === 'service' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Hizmet Modülleri</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.project_based_invoicing}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, project_based_invoicing: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Proje Bazlı Faturalama</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.time_tracking}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, time_tracking: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Zaman Takibi</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={moduleSettings.service_contracts}
                            onChange={(e) => setModuleSettings({ ...moduleSettings, service_contracts: e.target.checked })}
                            className="rounded text-blue-600"
                          />
                          <span className="text-sm">Hizmet Sözleşmeleri</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Gelişmiş Özellikler */}
                  <div className="pt-3 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Gelişmiş Özellikler</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.multi_warehouse}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, multi_warehouse: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Çoklu Depo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleSettings.multi_currency}
                          onChange={(e) => setModuleSettings({ ...moduleSettings, multi_currency: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">Çoklu Döviz</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sistem Tercihleri */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sistem Tercihleri</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tarih Formatı
                    </label>
                    <select
                      value={companyData.date_format}
                      onChange={(e) => setCompanyData({ ...companyData, date_format: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DD/MM/YYYY">GG/AA/YYYY (31/12/2024)</option>
                      <option value="MM/DD/YYYY">AA/GG/YYYY (12/31/2024)</option>
                      <option value="YYYY-MM-DD">YYYY-AA-GG (2024-12-31)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ondalık Basamak
                    </label>
                    <select
                      value={companyData.decimal_places}
                      onChange={(e) => setCompanyData({ ...companyData, decimal_places: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="0">0 (100)</option>
                      <option value="2">2 (100.00)</option>
                      <option value="3">3 (100.000)</option>
                      <option value="4">4 (100.0000)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={companyData.stock_tracking}
                        onChange={(e) => setCompanyData({ ...companyData, stock_tracking: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Stok takibi aktif</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={companyData.negative_stock_allowed}
                        onChange={(e) => setCompanyData({ ...companyData, negative_stock_allowed: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Eksi stok izin ver</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={companyData.auto_backup}
                        onChange={(e) => setCompanyData({ ...companyData, auto_backup: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Otomatik yedekleme</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              {/* Bildirim Kanalları */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bildirim Kanalları</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">E-posta Bildirimleri</div>
                        <div className="text-sm text-gray-500">Önemli olaylar için e-posta alın</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companyData.email_notifications}
                      onChange={(e) => setCompanyData({ ...companyData, email_notifications: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">SMS Bildirimleri</div>
                        <div className="text-sm text-gray-500">Kritik uyarılar için SMS alın</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companyData.sms_notifications}
                      onChange={(e) => setCompanyData({ ...companyData, sms_notifications: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">WhatsApp Bildirimleri</div>
                        <div className="text-sm text-gray-500">Anlık bildirimler için WhatsApp kullanın</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companyData.whatsapp_notifications}
                      onChange={(e) => setCompanyData({ ...companyData, whatsapp_notifications: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                  </label>
                </div>
              </div>

              {/* Bildirim Tercihleri */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bildirim Tercihleri</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Düşük Stok Uyarısı</div>
                      <div className="text-sm text-gray-500">Ürünler minimum stok seviyesine düştüğünde uyar</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companyData.low_stock_alert}
                      onChange={(e) => setCompanyData({ ...companyData, low_stock_alert: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Vade Hatırlatması</div>
                      <div className="text-sm text-gray-500">Vadesi yaklaşan ödemeler için hatırlat</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={companyData.due_payment_alert}
                      onChange={(e) => setCompanyData({ ...companyData, due_payment_alert: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                  </label>

                  {companyData.due_payment_alert && (
                    <div className="pl-6 border-l-2 border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kaç gün önceden hatırlat?
                      </label>
                      <input
                        type="number"
                        value={companyData.alert_days_before}
                        onChange={(e) => setCompanyData({ ...companyData, alert_days_before: parseInt(e.target.value) || 3 })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="30"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sağ Panel - Bilgi ve Yardım */}
        <div className="space-y-6">
          {/* Seçilen Sektör Bilgisi */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Seçili Sektör</h3>
            {(() => {
              const sector = sectors.find(s => s.value === companyData.sector);
              if (!sector) return null;
              const Icon = sector.icon;
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${sector.color}-100`}>
                      <Icon className={`w-6 h-6 text-${sector.color}-600`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{sector.label}</div>
                      <div className="text-xs text-gray-500">{sector.description}</div>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-600 mb-2">Bu sektör için önerilen özellikler:</div>
                    <div className="space-y-1">
                      {companyData.sector === 'retail' && (
                        <>
                          <div className="text-xs text-gray-700">• Barkod sistemi</div>
                          <div className="text-xs text-gray-700">• POS entegrasyonu</div>
                          <div className="text-xs text-gray-700">• Sadakat programı</div>
                        </>
                      )}
                      {companyData.sector === 'wholesale' && (
                        <>
                          <div className="text-xs text-gray-700">• Toplu faturalama</div>
                          <div className="text-xs text-gray-700">• Sipariş yönetimi</div>
                          <div className="text-xs text-gray-700">• Rota planlama</div>
                        </>
                      )}
                      {companyData.sector === 'manufacturing' && (
                        <>
                          <div className="text-xs text-gray-700">• Reçete yönetimi</div>
                          <div className="text-xs text-gray-700">• Üretim takibi</div>
                          <div className="text-xs text-gray-700">• Hammadde kontrolü</div>
                        </>
                      )}
                      {companyData.sector === 'service' && (
                        <>
                          <div className="text-xs text-gray-700">• Proje bazlı faturalama</div>
                          <div className="text-xs text-gray-700">• Zaman takibi</div>
                          <div className="text-xs text-gray-700">• Hizmet sözleşmeleri</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Yardım */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              <AlertCircle className="w-4 h-4 inline mr-2 text-blue-600" />
              İpuçları
            </h3>
            <div className="space-y-2 text-xs text-gray-700">
              <p>• Firma bilgilerinizi eksiksiz doldurun, faturalarınızda otomatik görünecektir.</p>
              <p>• Sektör seçiminiz, size özel modülleri aktif hale getirir.</p>
              <p>• e-Fatura kullanıyorsanız, entegrasyon bilgilerini doğru girdiğinizden emin olun.</p>
              <p>• Bildirim ayarlarını yaparak önemli olaylardan haberdar olun.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}