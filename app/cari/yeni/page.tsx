'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewCustomerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'customer',
    tax_number: '',
    tax_office: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    postal_code: '',
    country: 'Türkiye',
    payment_term: 0,
    credit_limit: 0,
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.code) {
      newErrors.code = 'Müşteri kodu zorunludur'
    }

    if (!formData.name) {
      newErrors.name = 'Müşteri adı zorunludur'
    }

    // e-Fatura için zorunlu alanlar
    if (!formData.tax_number) {
      newErrors.tax_number = 'Vergi numarası e-Fatura için zorunludur'
    } else if (formData.tax_number.length !== 10 && formData.tax_number.length !== 11) {
      newErrors.tax_number = 'Vergi no 10 haneli (VKN) veya 11 haneli (TCKN) olmalıdır'
    }

    if (!formData.tax_office) {
      newErrors.tax_office = 'Vergi dairesi e-Fatura için zorunludur'
    }

    if (!formData.address) {
      newErrors.address = 'Adres e-Fatura için zorunludur'
    }

    if (!formData.city) {
      newErrors.city = 'İl bilgisi zorunludur'
    }

    if (!formData.district) {
      newErrors.district = 'İlçe bilgisi zorunludur'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { error } = await supabase
        .from('customers')
        .insert({
          company_id: userData.company_id,
          ...formData,
          balance: 0,
          created_by: user.id
        })

      if (error) throw error

      alert('Müşteri başarıyla kaydedildi!')
      router.push('/cari')
    } catch (error: any) {
      console.error('Müşteri kaydedilirken hata:', error)
      alert(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/cari" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Yeni Müşteri/Tedarikçi
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Genel Bilgiler</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tür <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="customer">Müşteri</option>
              <option value="supplier">Tedarikçi</option>
              <option value="both">Her İkisi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri Kodu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.code ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="M001"
            />
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="ABC Ticaret Ltd. Şti."
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vergi Numarası <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value.replace(/\D/g, '') })}
              className={`w-full px-3 py-2 border ${errors.tax_number ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="1234567890 (VKN) veya 12345678901 (TCKN)"
              maxLength={11}
            />
            {errors.tax_number && <p className="text-red-500 text-sm mt-1">{errors.tax_number}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vergi Dairesi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tax_office}
              onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.tax_office ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="Beyoğlu V.D."
            />
            {errors.tax_office && <p className="text-red-500 text-sm mt-1">{errors.tax_office}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="0212 555 55 55"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="info@example.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="Mahalle, Cadde, Sokak, Bina No, Daire No"
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İl <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="İstanbul"
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlçe <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.district ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500`}
              placeholder="Beyoğlu"
            />
            {errors.district && <p className="text-red-500 text-sm mt-1">{errors.district}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticari Bilgiler</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vade (Gün)
            </label>
            <input
              type="number"
              value={formData.payment_term}
              onChange={(e) => setFormData({ ...formData, payment_term: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="30"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kredi Limiti
            </label>
            <input
              type="number"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="10000.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-sm text-yellow-800">
          <strong>Önemli:</strong> e-Fatura göndermek için Vergi Numarası, Vergi Dairesi ve Adres bilgileri zorunludur.
          Bu bilgiler eksik olan müşterilere e-Fatura gönderilemez.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/cari"
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          İptal
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  )
}