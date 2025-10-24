'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CashAccountFormData } from '@/lib/types'

export default function NewCashAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<CashAccountFormData>({
    account_code: '',
    account_name: '',
    account_type: 'cash',
    currency: 'TRY',
    opening_balance: 0,
    bank_name: '',
    branch_name: '',
    account_no: '',
    iban: '',
    is_active: true
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Kullanıcı bulunamadı')

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) throw new Error('Şirket bilgisi bulunamadı')

      // IBAN formatla
      let formattedIban = formData.iban
      if (formData.iban) {
        formattedIban = formData.iban.replace(/\s/g, '').toUpperCase()
        // TR ile başlamıyorsa ekle
        if (!formattedIban.startsWith('TR')) {
          formattedIban = 'TR' + formattedIban
        }
      }

      const { error: insertError } = await supabase
        .from('cash_accounts')
        .insert({
          ...formData,
          iban: formattedIban || null,
          company_id: userData.company_id,
          created_by: user.id,
          balance: formData.opening_balance // Başlangıç bakiyesi
        })

      if (insertError) throw insertError

      router.push('/nakit')
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/nakit"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Nakit Yönetimine Dön
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Yeni Kasa/Banka Hesabı</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="account_code" className="block text-sm font-medium text-gray-700 mb-1">
                Hesap Kodu *
              </label>
              <input
                type="text"
                id="account_code"
                name="account_code"
                value={formData.account_code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="ör: KASA-01, BANKA-01"
              />
            </div>

            <div>
              <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-1">
                Hesap Türü *
              </label>
              <select
                id="account_type"
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Kasa</option>
                <option value="bank">Banka</option>
                <option value="pos">POS</option>
                <option value="credit_card">Kredi Kartı</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mb-1">
              Hesap Adı *
            </label>
            <input
              type="text"
              id="account_name"
              name="account_name"
              value={formData.account_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="ör: Merkez Kasa, Garanti Bankası Ticari Hesap"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Para Birimi
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="TRY">TRY - Türk Lirası</option>
                <option value="USD">USD - Amerikan Doları</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - İngiliz Sterlini</option>
              </select>
            </div>

            <div>
              <label htmlFor="opening_balance" className="block text-sm font-medium text-gray-700 mb-1">
                Açılış Bakiyesi
              </label>
              <input
                type="number"
                id="opening_balance"
                name="opening_balance"
                value={formData.opening_balance}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Banka hesabı için ek alanlar */}
          {(formData.account_type === 'bank' || formData.account_type === 'credit_card') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Banka Adı
                  </label>
                  <input
                    type="text"
                    id="bank_name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Şube Adı
                  </label>
                  <input
                    type="text"
                    id="branch_name"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="account_no" className="block text-sm font-medium text-gray-700 mb-1">
                    Hesap No
                  </label>
                  <input
                    type="text"
                    id="account_no"
                    name="account_no"
                    value={formData.account_no}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Aktif hesap
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href="/nakit"
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}