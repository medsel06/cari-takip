'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

interface EInvoiceSettings {
  uyumsoft_username: string;
  uyumsoft_password: string;
  uyumsoft_base_url: string;
  is_test_mode: boolean;
  e_invoice_enabled: boolean;
  default_scenario: string;
  gb_ettn_prefix: string;
  pk_ettn_prefix: string;
}

export default function EInvoiceSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [settings, setSettings] = useState<EInvoiceSettings>({
    uyumsoft_username: '',
    uyumsoft_password: '',
    uyumsoft_base_url: 'https://efatura-test.uyumsoft.com.tr',
    is_test_mode: true,
    e_invoice_enabled: false,
    default_scenario: 'TICARIFATURA',
    gb_ettn_prefix: 'GIB',
    pk_ettn_prefix: 'PK',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Şirket ayarlarını getir
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', userData.company_id)
        .single();

      if (data) {
        setSettings({
          uyumsoft_username: data.uyumsoft_username || '',
          uyumsoft_password: data.uyumsoft_password || '',
          uyumsoft_base_url: data.uyumsoft_base_url || 'https://efatura-test.uyumsoft.com.tr',
          is_test_mode: data.is_test_mode ?? true,
          e_invoice_enabled: data.e_invoice_enabled ?? false,
          default_scenario: data.default_scenario || 'TICARIFATURA',
          gb_ettn_prefix: data.gb_ettn_prefix || 'GIB',
          pk_ettn_prefix: data.pk_ettn_prefix || 'PK',
        });
      }
    } catch (error) {
      console.error('Ayarlar yüklenirken hata:', error);
      setMessage({ type: 'error', text: 'Ayarlar yüklenirken hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Önce mevcut kayıt var mı kontrol et
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', userData.company_id)
        .single();

      if (existing) {
        // Güncelle
        const { error } = await supabase
          .from('company_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', userData.company_id);

        if (error) throw error;
      } else {
        // Yeni kayıt oluştur
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_id: userData.company_id,
            ...settings,
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi' });
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      setMessage({ type: 'error', text: 'Ayarlar kaydedilirken hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">e-Fatura Ayarları</h2>
          <p className="mt-1 text-sm text-gray-500">
            Uyumsoft e-Fatura entegrasyon ayarlarını yapılandırın
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Genel Ayarlar */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Ayarlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="e_invoice_enabled"
                  checked={settings.e_invoice_enabled}
                  onChange={(e) => setSettings({ ...settings, e_invoice_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="e_invoice_enabled" className="ml-2 block text-sm text-gray-700">
                  e-Fatura Aktif
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_test_mode"
                  checked={settings.is_test_mode}
                  onChange={(e) => setSettings({ ...settings, is_test_mode: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_test_mode" className="ml-2 block text-sm text-gray-700">
                  Test Modu
                </label>
              </div>
            </div>
          </div>

          {/* API Ayarları */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">API Bağlantı Bilgileri</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="uyumsoft_username" className="block text-sm font-medium text-gray-700">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  id="uyumsoft_username"
                  value={settings.uyumsoft_username}
                  onChange={(e) => setSettings({ ...settings, uyumsoft_username: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Uyumsoft kullanıcı adınız"
                />
              </div>

              <div>
                <label htmlFor="uyumsoft_password" className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <input
                  type="password"
                  id="uyumsoft_password"
                  value={settings.uyumsoft_password}
                  onChange={(e) => setSettings({ ...settings, uyumsoft_password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Uyumsoft şifreniz"
                />
              </div>

              <div>
                <label htmlFor="uyumsoft_base_url" className="block text-sm font-medium text-gray-700">
                  API URL
                </label>
                <input
                  type="text"
                  id="uyumsoft_base_url"
                  value={settings.uyumsoft_base_url}
                  onChange={(e) => setSettings({ ...settings, uyumsoft_base_url: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Test için: https://efatura-test.uyumsoft.com.tr<br/>
                  Canlı için: https://edonusumapi.uyum.com.tr
                </p>
              </div>
            </div>
          </div>

          {/* Fatura Ayarları */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fatura Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="default_scenario" className="block text-sm font-medium text-gray-700">
                  Varsayılan Senaryo
                </label>
                <select
                  id="default_scenario"
                  value={settings.default_scenario}
                  onChange={(e) => setSettings({ ...settings, default_scenario: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="TICARIFATURA">Ticari Fatura</option>
                  <option value="TEMELFATURA">Temel Fatura</option>
                  <option value="KAMU">Kamu</option>
                </select>
              </div>

              <div>
                <label htmlFor="gb_ettn_prefix" className="block text-sm font-medium text-gray-700">
                  GİB ETTN Öneki
                </label>
                <input
                  type="text"
                  id="gb_ettn_prefix"
                  value={settings.gb_ettn_prefix}
                  onChange={(e) => setSettings({ ...settings, gb_ettn_prefix: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="GIB"
                />
              </div>

              <div>
                <label htmlFor="pk_ettn_prefix" className="block text-sm font-medium text-gray-700">
                  PK ETTN Öneki
                </label>
                <input
                  type="text"
                  id="pk_ettn_prefix"
                  value={settings.pk_ettn_prefix}
                  onChange={(e) => setSettings({ ...settings, pk_ettn_prefix: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PK"
                />
              </div>
            </div>
          </div>

          {/* Canlı Ortam URL'leri */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Endpoint URL'leri:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Test Ortamı:</strong></p>
              <p className="font-mono">https://efatura-test.uyumsoft.com.tr</p>
              <p><strong>Canlı Ortam:</strong></p>
              <p className="font-mono">https://efatura.uyumsoft.com.tr</p>
              <p className="font-mono">https://edonusumapi.uyum.com.tr</p>
              <p className="mt-2">WSDL: [URL]/Services/Integration?wsdl</p>
            </div>
          </div>

          {/* Uyarı */}
          {settings.is_test_mode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Test Modu Aktif</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Test modunda gönderilen faturalar gerçek değildir ve mali değeri yoktur.
                    Canlı ortama geçmek için test modunu kapatın.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mesajlar */}
          {message && (
            <div className={`rounded-md p-4 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <p className={`ml-3 text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Kaydet Butonu */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}