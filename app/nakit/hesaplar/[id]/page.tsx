'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import type { CashAccount, CashMovement } from '@/lib/types'

export default function CashAccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string

  const [account, setAccount] = useState<CashAccount | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [accountId])

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

      // Hesap bilgilerini getir
      const { data: accountData, error: accountError } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('company_id', userData.company_id)
        .single()

      if (accountError) throw accountError
      setAccount(accountData)

      // Hareketleri getir
      const { data: movementsData, error: movementsError } = await supabase
        .from('cash_movements')
        .select(`
          id,
          movement_type,
          amount,
          description,
          movement_no,
          movement_date,
          created_at,
          customers!customer_id(name)
        `)
        .eq('account_id', accountId)
        .eq('company_id', userData.company_id)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (movementsError) throw movementsError
      setMovements(movementsData || [])

      // İstatistikleri hesapla
      const totalIncome = (movementsData || [])
        .filter(m => m.movement_type === 'IN')
        .reduce((sum, m) => sum + m.amount, 0)

      const totalExpense = (movementsData || [])
        .filter(m => m.movement_type === 'OUT')
        .reduce((sum, m) => sum + m.amount, 0)

      setStats({
        totalIncome,
        totalExpense,
        balance: accountData?.balance || 0
      })

    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'OUT':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'TRANSFER':
        return <ArrowLeftRight className="w-5 h-5 text-blue-600" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-gray-600 mb-4">Hesap bulunamadı</div>
        <Link
          href="/nakit"
          className="text-blue-600 hover:text-blue-700"
        >
          Nakit Yönetimine Dön
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/nakit"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nakit Yönetimine Dön
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {account.account_name}
          </h1>
          <p className="text-sm text-gray-500">
            Hesap Kodu: {account.account_code}
          </p>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Güncel Bakiye</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.balance)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              stats.balance >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {stats.balance >= 0 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Hareketler Tablosu */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Hesap Hareketleri</h2>
        </div>
        <div className="overflow-x-auto">
          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Henüz hareket bulunmuyor
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hareket No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(movement.movement_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.movement_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {movement.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.customers?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.movement_type)}
                        <span className={`${
                          movement.movement_type === 'IN' ? 'text-green-600' :
                          movement.movement_type === 'OUT' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {movement.movement_type === 'IN' ? 'Gelir' :
                           movement.movement_type === 'OUT' ? 'Gider' : 'Transfer'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-semibold ${
                        movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.movement_type === 'IN' ? '+' : '-'}
                        {formatCurrency(movement.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
