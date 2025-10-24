'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package, 
  Save, 
  X,
  Barcode,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function StokEklePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    barcode: '',
    unit: 'Adet',
    min_stock: 0,
    max_stock: 0,
    current_stock: 0,
    purchase_price: 0,
    sale_price: 0,
    tax_rate: 20,
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Önce kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Kullanıcının company_id'sini al
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('User error:', userError);
        throw new Error('Kullanıcı bilgileri alınamadı');
      }

      if (!userData?.company_id) {
        throw new Error('Şirket bilgisi bulunamadı. Lütfen yöneticinizle iletişime geçin.');
      }

      // Ürünü ekle
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...formData,
          company_id: userData.company_id,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Product insert error:', error);
        throw new Error(error.message || 'Ürün eklenirken hata oluştu');
      }

      // Başarılı mesajı göster ve yönlendir
      alert('Ürün başarıyla eklendi!');
      router.push('/stok');
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Ürün eklenirken hata oluştu');
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

  // Kar marjı hesaplama
  const profitMargin = formData.purchase_price > 0 
    ? ((formData.sale_price - formData.purchase_price) / formData.purchase_price * 100).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/stok"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yeni Ürün Ekle</h1>
            <p className="text-sm text-gray-600 mt-1">Stok kartı oluşturun</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/stok')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <X className="w-4 h-4 inline mr-2" />
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 inline mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel - Ana Bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Temel Bilgiler */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Temel Bilgiler
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Kodu*
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  required
                  value={formData.code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="URN001"
                />
              </div>

              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Barkod
                </label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8690000000000"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ürün adını girin"
                />
              </div>

              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Birim
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Adet">Adet</option>
                  <option value="Kg">Kilogram</option>
                  <option value="Lt">Litre</option>
                  <option value="M">Metre</option>
                  <option value="M2">Metrekare</option>
                  <option value="M3">Metreküp</option>
                  <option value="Paket">Paket</option>
                  <option value="Koli">Koli</option>
                  <option value="Kutu">Kutu</option>
                  <option value="Palet">Palet</option>
                </select>
              </div>

              <div>
                <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-1">
                  KDV Oranı (%)
                </label>
                <select
                  id="tax_rate"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">%0</option>
                  <option value="1">%1</option>
                  <option value="10">%10</option>
                  <option value="20">%20</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Ürün hakkında açıklama..."
              />
            </div>
          </div>

          {/* Stok Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Stok Bilgileri
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="current_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Stoğu
                </label>
                <input
                  type="number"
                  id="current_stock"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stok
                </label>
                <input
                  type="number"
                  id="min_stock"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Bu değerin altında uyarı verir</p>
              </div>

              <div>
                <label htmlFor="max_stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Maksimum Stok
                </label>
                <input
                  type="number"
                  id="max_stock"
                  name="max_stock"
                  value={formData.max_stock}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Depo kapasitesi limiti</p>
              </div>
            </div>
          </div>

          {/* Fiyat Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Fiyat Bilgileri
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Alış Fiyatı (₺)
                </label>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Satış Fiyatı (₺)
                </label>
                <input
                  type="number"
                  id="sale_price"
                  name="sale_price"
                  value={formData.sale_price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Kar Marjı Gösterimi */}
            {formData.purchase_price > 0 && formData.sale_price > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Kar Marjı</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">%{profitMargin}</div>
                    <div className="text-sm text-gray-600">
                      ₺{(formData.sale_price - formData.purchase_price).toFixed(2)} kar
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Panel - Özet ve Notlar */}
        <div className="space-y-6">
          {/* Özet Kart */}
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ürün Özeti</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ürün Kodu:</span>
                <span className="font-medium">{formData.code || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ürün Adı:</span>
                <span className="font-medium">{formData.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Birim:</span>
                <span className="font-medium">{formData.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">KDV:</span>
                <span className="font-medium">%{formData.tax_rate}</span>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alış Fiyatı:</span>
                  <span className="font-medium">₺{formData.purchase_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-600">Satış Fiyatı:</span>
                  <span className="font-medium">₺{formData.sale_price.toFixed(2)}</span>
                </div>
                {formData.purchase_price > 0 && formData.sale_price > 0 && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Kar:</span>
                    <span className="font-medium text-green-600">
                      ₺{(formData.sale_price - formData.purchase_price).toFixed(2)} (%{profitMargin})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Uyarılar */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Dikkat Edilmesi Gerekenler</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Ürün kodu benzersiz olmalıdır</li>
                  <li>• Minimum stok uyarı seviyesidir</li>
                  <li>• KDV oranı faturalarda kullanılacaktır</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}