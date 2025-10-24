'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Repeat } from 'lucide-react'
import type { CashMovementFormData, CashAccount, Customer, ExpenseCategory } from '@/lib/types'

export default function NewCashMovementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  
  const [formData, setFormData] = useState<CashMovementFormData>({
    account_id: '',
    movement_type: 'income',
    amount: 0,
    currency: 'TRY',
    exchange_rate: 1,
    description: '',
    category: '',
    customer_id: '',
    target_account_id: '',
    payment_method: 'cash',
    document_no: '',
    movement_date: new Date().toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      // Hesapları getir
      const { data: accountsData } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountsData || [])

      // Müşterileri getir
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name')

      setCustomers(customersData || [])

      // Kategorileri getir
      const { data: categoriesData } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('category_name')

      setCategories(categoriesData || [])

    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    }
  }

  const generateMovementNo = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `NH-${year}${month}${day}-${random}`
  }

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

      // Transfer işlemi için kontrol
      if (formData.movement_type === 'transfer_out' && !formData.target_account_id) {
        throw new Error('Transfer işlemi için hedef hesap seçmelisiniz')
      }

      // Ana hareketi ekle
      const { error: insertError } = await supabase
        .from('cash_movements')
        .insert({
          ...formData,
          movement_no: generateMovementNo(),
          company_id: userData.company_id,
          created_by: user.id,
          customer_id: formData.customer_id || null,
          target_account_id: formData.target_account_id || null
        })

      if (insertError) throw insertError

      // Transfer işlemi ise karşı hareketi de oluştur
      if (formData.movement_type === 'transfer_out' && formData.target_account_id) {
        const { error: transferError } = await supabase
          .from('cash_movements')
          .insert({
            movement_no: generateMovementNo(),
            company_id: userData.company_id,
            account_id: formData.target_account_id,
            movement_type: 'transfer_in',
            amount: formData.amount,
            currency: formData.currency,
            exchange_rate: formData.exchange_rate,
            description: `Transfer: ${formData.description}`,
            category: 'transfer',
            payment_method: 'transfer',
            document_no: formData.document_no,
            movement_date: formData.movement_date,
            created_by: user.id
          })

        if (transferError) throw transferError
      }

      router.push('/nakit')
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const getCategoryOptions = () => {
    switch (formData.movement_type) {
      case 'income':
        return [
          { value: 'sales', label: 'Satış Tahsilatı' },
          { value: 'check_collection', label: 'Çek Tahsilatı' },
          { value: 'other_income', label: 'Diğer Gelir' }
        ]
      case 'expense':
        return categories.map(cat => ({
          value: cat.category_code,
          label: cat.category_name
        }))
      default:
        return []
    }
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
          <h1 className="text-xl font-semibold text-gray-900">Yeni Nakit Hareketi</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşlem Türü *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, movement_type: 'income' }))}
                className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  formData.movement_type === 'income'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Gelir</div>
                  <div className="text-xs text-gray-500">Para girişi</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, movement_type: 'expense' }))}
                className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  formData.movement_type === 'expense'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <TrendingDown className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Gider</div>
                  <div className="text-xs text-gray-500">Para çıkışı</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, movement_type: 'transfer_out' }))}
                className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  formData.movement_type === 'transfer_out'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Repeat className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Transfer</div>
                  <div className="text-xs text-gray-500">Hesaplar arası</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="movement_date" className="block text-sm font-medium text-gray-700 mb-1">
              İşlem Tarihi *
            </label>
            <input
              type="date"
              id="movement_date"
              name="movement_date"
              value={formData.movement_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className={formData.movement_type === 'transfer_out' ? 'grid grid-cols-2 gap-4' : ''}>
            <div>
              <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 mb-1">
                {formData.movement_type === 'transfer_out' ? 'Kaynak Hesap *' : 'Hesap *'}
              </label>
              <select
                id="account_id"
                name="account_id"
                value={formData.account_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            {formData.movement_type === 'transfer_out' && (
              <div>
                <label htmlFor="target_account_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Hedef Hesap *
                </label>
                <select
                  id="target_account_id"
                  name="target_account_id"
                  value={formData.target_account_id}
                  onChange={handleChange}
                  required={formData.movement_type === 'transfer_out'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seçiniz</option>
                  {accounts
                    .filter(a => a.id !== formData.account_id)
                    .map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Tutar *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

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
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {formData.movement_type !== 'transfer_out' && (
            <>
              <div>
                <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri/Tedarikçi
                </label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seçiniz</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seçiniz</option>
                  {getCategoryOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                Ödeme Yöntemi
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Nakit</option>
                <option value="bank_transfer">Banka Transferi</option>
                <option value="eft">EFT</option>
                <option value="credit_card">Kredi Kartı</option>
                <option value="check">Çek</option>
              </select>
            </div>

            <div>
              <label htmlFor="document_no" className="block text-sm font-medium text-gray-700 mb-1">
                Belge No
              </label>
              <input
                type="text"
                id="document_no"
                name="document_no"
                value={formData.document_no}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Dekont, makbuz no vb."
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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