'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createUyumsoftClient } from '@/lib/uyumsoft/api'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FileText, 
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Printer,
  Mail
} from 'lucide-react'
import type { Invoice, InvoiceItem, Customer } from '@/lib/types'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [eInvoiceEnabled, setEInvoiceEnabled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchInvoice()
      checkEInvoiceSettings()
    }
  }, [params.id])

  const checkEInvoiceSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { data, error } = await supabase
        .from('company_settings')
        .select('e_invoice_enabled')
        .eq('company_id', userData.company_id)
        .single()

      setEInvoiceEnabled(data?.e_invoice_enabled || false)
    } catch (error) {
      console.error('e-Fatura ayarları kontrol edilirken hata:', error)
    }
  }

  const fetchInvoice = async () => {
    try {
      // Faturayı getir
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers!customer_id(*)
        `)
        .eq('id', params.id)
        .single()

      if (invoiceError) throw invoiceError

      // Fatura kalemlerini getir
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('invoice_id', params.id)
        .order('line_no', { ascending: true })

      if (itemsError) throw itemsError

      setInvoice(invoiceData)
      setCustomer(invoiceData.customer)
      setItems(itemsData || [])
    } catch (error) {
      console.error('Fatura yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendEInvoice = async () => {
    if (!invoice || !customer) {
      alert('Fatura veya müşteri bilgisi eksik!')
      return
    }

    // e-Fatura için zorunlu alan kontrolleri
    const errors = []
    
    if (!customer.tax_number) {
      errors.push('Müşteri vergi numarası')
    }
    
    if (!customer.tax_office) {
      errors.push('Müşteri vergi dairesi')
    }
    
    if (!customer.address) {
      errors.push('Müşteri adresi')
    }
    
    if (!invoice.invoice_no || invoice.invoice_no.includes('202520252025')) {
      errors.push('Geçerli fatura numarası')
    }
    
    if (errors.length > 0) {
      alert(`e-Fatura göndermek için eksik bilgiler:\n\n${errors.join('\n')}\n\nLütfen müşteri bilgilerini tamamlayın!`)
      return
    }

    // Onay al
    const confirmMessage = `${customer.name} adlı müşteriye ${invoice.invoice_no} numaralı faturayı e-Fatura olarak göndermek istediğinize emin misiniz?\n\nTutar: ${formatCurrency(invoice.total_amount)}`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setSending(true)
    try {
      const uyumsoftClient = createUyumsoftClient()
      const result = await uyumsoftClient.sendInvoice(invoice, items, customer)

      // e-Fatura bilgilerini güncelle
      const { error } = await supabase
        .from('invoices')
        .update({
          is_e_invoice: true,
          e_invoice_uuid: result.uuid || result.ETTN,
          e_invoice_status: 'sent',
          e_invoice_response: JSON.stringify(result),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      if (error) throw error

      alert('e-Fatura başarıyla gönderildi!')
      await fetchInvoice() // Sayfayı yenile
    } catch (error: any) {
      console.error('e-Fatura gönderilirken hata:', error)
      alert(`e-Fatura gönderilemedi: ${error.message}`)
    } finally {
      setSending(false)
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

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'partial':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'unpaid':
        return <XCircle className="w-5 h-5 text-red-600" />
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Fatura bulunamadı.</p>
        <Link href="/fatura" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Fatura listesine dön
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/fatura"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Fatura #{invoice.invoice_no}
          </h1>
          {invoice.is_e_invoice && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
              e-Fatura
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            PDF İndir
          </button>
        </div>
      </div>

      {/* e-Fatura Durumu */}
      {invoice.is_e_invoice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">e-Fatura Bilgileri</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p><strong>UUID:</strong> {invoice.e_invoice_uuid}</p>
                <p><strong>Durum:</strong> {invoice.e_invoice_status}</p>
                {invoice.e_invoice_id && (
                  <p><strong>e-Fatura No:</strong> {invoice.e_invoice_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fatura Detayları */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol - Fatura Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Müşteri Bilgileri */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Müşteri Bilgileri</h2>
            {customer ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Müşteri</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergi No</p>
                  <p className="font-medium">{customer.tax_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vergi Dairesi</p>
                  <p className="font-medium">{customer.tax_office || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="font-medium">{customer.phone || '-'}</p>
                </div>
                {customer.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Adres</p>
                    <p className="font-medium">{customer.address}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Müşteri bilgisi yok</p>
            )}
          </div>

          {/* Fatura Kalemleri */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Fatura Kalemleri</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ürün/Hizmet
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Miktar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Birim Fiyat
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      KDV %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        %{item.tax_rate}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ - Özet ve İşlemler */}
        <div className="space-y-6">
          {/* Fatura Özeti */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fatura Özeti</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Fatura Tarihi</span>
                <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
              </div>
              
              {invoice.due_date && (
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Vade Tarihi</span>
                  <span className="font-medium">{formatDate(invoice.due_date)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Ödeme Durumu</span>
                <div className="flex items-center gap-2">
                  {getPaymentStatusIcon(invoice.payment_status)}
                  <span className={`font-medium ${
                    invoice.payment_status === 'paid' ? 'text-green-600' :
                    invoice.payment_status === 'partial' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {getPaymentStatusLabel(invoice.payment_status)}
                  </span>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>İndirim</span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>KDV</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Genel Toplam</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>
                {invoice.payment_status === 'partial' && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Ödenen</span>
                    <span>{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* İşlemler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İşlemler</h2>
            <div className="space-y-2">
              {!invoice.is_e_invoice && (
                <button
                  onClick={sendEInvoice}
                  disabled={sending}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Gönderiliyor...' : 'e-Fatura Gönder'}
                </button>
              )}
              <Link
                href={`/cari/tahsilat?customer_id=${customer?.id}&amount=${invoice.total_amount - invoice.paid_amount}`}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Tahsilat Girişi
              </Link>
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Kopyala
              </button>
            </div>
          </div>

          {/* Notlar */}
          {invoice.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notlar</h2>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}