'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  Plus, 
  FileText, 
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Send
} from 'lucide-react'
import type { Invoice } from '@/lib/types'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sale' | 'purchase'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => {
    fetchInvoices()
  }, [filter, statusFilter, dateRange])

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_no,
          invoice_date,
          invoice_type,
          payment_status,
          total_amount,
          paid_amount,
          customer:customers!customer_id(
            id,
            name
          )
        `)
        .eq('company_id', userData.company_id)
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end)
        .order('invoice_date', { ascending: false })
        .limit(200)

      // Fatura tipi filtresi
      if (filter !== 'all') {
        if (filter === 'sale') {
          query = query.in('invoice_type', ['sale', 'return_sale'])
        } else {
          query = query.in('invoice_type', ['purchase', 'return_purchase'])
        }
      }

      // Ödeme durumu filtresi
      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Faturalar yüklenirken hata:', error)
      // Tablo boş olabilir, sorun değil
      } else {
        setInvoices(data || [])
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
    return new Date(date).toLocaleDateString('tr-TR')
  }

  const getInvoiceTypeLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Satış Faturası'
      case 'purchase': return 'Alış Faturası'
      case 'return_sale': return 'Satış İade Faturası'
      case 'return_purchase': return 'Alış İade Faturası'
      default: return type
    }
  }

  const getInvoiceTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
      case 'return_purchase':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'purchase':
      case 'return_sale':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'unpaid':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi'
      case 'partial': return 'Kısmi Ödendi'
      case 'unpaid': return 'Ödenmedi'
      default: return status
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      invoice.invoice_no.toLowerCase().includes(searchLower) ||
      invoice.customer?.name.toLowerCase().includes(searchLower) ||
      invoice.description?.toLowerCase().includes(searchLower)
    )
  })

  const totals = filteredInvoices.reduce((acc, invoice) => {
    const amount = invoice.total_amount
    if (invoice.invoice_type === 'sale' || invoice.invoice_type === 'return_purchase') {
      acc.income += amount
    } else {
      acc.expense += amount
    }
    
    if (invoice.payment_status === 'unpaid') {
      acc.unpaid += amount
    } else if (invoice.payment_status === 'partial') {
      acc.unpaid += (amount - invoice.paid_amount)
    }
    
    return acc
  }, { income: 0, expense: 0, unpaid: 0 })

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
        <h1 className="text-2xl font-semibold text-gray-900">Faturalar</h1>
        <div className="flex gap-2">
          <Link
            href="/fatura/ayarlar"
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            e-Fatura Ayarları
          </Link>
          <Link
            href="/fatura/yeni?type=sale"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Satış Faturası
          </Link>
          <Link
            href="/fatura/yeni?type=purchase"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Alış Faturası
          </Link>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <ArrowUpRight className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.expense)}
              </p>
            </div>
            <ArrowDownRight className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bekleyen Ödemeler</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totals.unpaid)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="search" className="sr-only">Ara</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Fatura no, müşteri ara..."
                className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Faturalar</option>
              <option value="sale">Satış Faturaları</option>
              <option value="purchase">Alış Faturaları</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="unpaid">Ödenmemiş</option>
              <option value="partial">Kısmi Ödenmiş</option>
              <option value="paid">Ödenmiş</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Fatura Listesi */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fatura No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri/Tedarikçi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tür
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/fatura/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {invoice.invoice_no}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customer?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getInvoiceTypeIcon(invoice.invoice_type)}
                        <span className="text-sm text-gray-700">
                          {getInvoiceTypeLabel(invoice.invoice_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(invoice.payment_status)}
                        <span className={`text-sm font-medium ${
                          invoice.payment_status === 'paid' ? 'text-green-600' :
                          invoice.payment_status === 'partial' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {getPaymentStatusLabel(invoice.payment_status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </div>
                        {invoice.payment_status === 'partial' && (
                          <div className="text-xs text-gray-500">
                            Ödenen: {formatCurrency(invoice.paid_amount)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/fatura/${invoice.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Detay
                        </Link>
                        {invoice.is_e_invoice && (
                          <span className="text-green-600" title="e-Fatura">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}