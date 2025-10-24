'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Plus, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Building2,
  PiggyBank
} from 'lucide-react'
import type { CashAccount, CashMovement } from '@/lib/types'

export default function CashPage() {
  const [accounts, setAccounts] = useState<CashAccount[]>([])
  const [recentMovements, setRecentMovements] = useState<CashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    cash: 0,
    bank: 0,
    pos: 0,
    creditCard: 0,
    total: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Kullanıcı bilgilerini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      // Hesapları getir
      const { data: accountsData, error: accountsError } = await supabase
        .from('cash_accounts')
        .select('id, account_name, account_code, account_type, balance, currency')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('account_name')
        .limit(50);

      if (accountsError) {
        console.error('Hesaplar yüklenirken hata:', accountsError)
      } else {
        setAccounts(accountsData || [])
        
        // Toplamları hesapla
        const totals = (accountsData || []).reduce((acc, account) => {
          switch (account.account_type) {
            case 'cash':
              acc.cash += account.balance
              break
            case 'bank':
              acc.bank += account.balance
              break
            case 'pos':
              acc.pos += account.balance
              break
            case 'credit_card':
              acc.creditCard += account.balance
              break
          }
          acc.total += account.balance
          return acc
        }, { cash: 0, bank: 0, pos: 0, creditCard: 0, total: 0 })
        
        setTotals(totals)
      }

      // Son hareketleri getir
      const { data: movementsData, error: movementsError } = await supabase
        .from('cash_movements')
        .select(`
          *,
          account:cash_accounts!account_id(*),
          customer:customers!customer_id(*)
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (movementsError) {
        console.error('Hareketler yüklenirken hata:', movementsError)
      } else {
        setRecentMovements(movementsData || [])
      }

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Banknote className="w-5 h-5" />
      case 'bank':
        return <Building2 className="w-5 h-5" />
      case 'pos':
        return <CreditCard className="w-5 h-5" />
      case 'credit_card':
        return <PiggyBank className="w-5 h-5" />
      default:
        return <Banknote className="w-5 h-5" />
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'expense':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'transfer_in':
      case 'transfer_out':
        return <ArrowLeftRight className="w-5 h-5 text-blue-600" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Nakit Yönetimi</h1>
        <div className="flex gap-2">
          <Link
            href="/nakit/hesaplar/yeni"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Hesap
          </Link>
          <Link
            href="/nakit/hareketler/yeni"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Hareket
          </Link>
          <Link
            href="/nakit/transfer"
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfer
          </Link>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kasa</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.cash)}
              </p>
            </div>
            <Banknote className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Banka</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.bank)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">POS</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.pos)}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kredi Kartı</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.creditCard)}
              </p>
            </div>
            <PiggyBank className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.total)}
              </p>
            </div>
            <Banknote className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Hesaplar ve Son Hareketler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hesaplar */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Hesaplar</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {accounts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz hesap tanımlanmamış
                </p>
              ) : (
                accounts.map((account) => (
                  <Link
                    key={account.id}
                    href={`/nakit/hesaplar/${account.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getAccountIcon(account.account_type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {account.account_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {account.account_code}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(account.balance)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {account.currency}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Son Hareketler */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Son Hareketler</h2>
            <Link
              href="/nakit/hareketler"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Tümünü Gör
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentMovements.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz hareket bulunmuyor
                </p>
              ) : (
                recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getMovementIcon(movement.movement_type)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {movement.description || movement.movement_no}
                        </p>
                        <p className="text-sm text-gray-500">
                          {movement.account?.account_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        movement.movement_type === 'income' || movement.movement_type === 'transfer_in'
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {movement.movement_type === 'income' || movement.movement_type === 'transfer_in' ? '+' : '-'}
                        {formatCurrency(movement.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(movement.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}