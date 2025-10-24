'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  X,
  Plus,
  Trash2,
  Search,
  Calculator,
  FileText,
  User,
  Package,
  Calendar,
  DollarSign,
  Copy,
  FileSpreadsheet,
  Barcode,
  Clock,
  Building2,
  CreditCard,
  Percent,
  AlertCircle,
  ChevronDown,
  Send,
  FileDown,
  Eye,
  Edit3,
  MoreVertical
} from 'lucide-react'
import type { Customer, Product, InvoiceFormData, InvoiceItemFormData } from '@/lib/types'

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invoiceType = searchParams.get('type') || 'sale'
  const fromStockMovement = searchParams.get('from') === 'stock-movement'
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchCustomer, setSearchCustomer] = useState('')
  const [searchProduct, setSearchProduct] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'notes' | 'attachments'>('items')
  const [isEInvoice, setIsEInvoice] = useState(false)
  const [isEArchive, setIsEArchive] = useState(false)
  
  // Form verileri
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_no: '',
    invoice_type: invoiceType as 'sale' | 'purchase',
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_time: new Date().toTimeString().slice(0, 5),
    due_date: '',
    currency: 'TRY',
    exchange_rate: 1,
    withholding_rate: 0,
    is_e_invoice: false,
    is_e_archive: false,
    description: '',
    notes: '',
    items: []
  })

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Tevkifat oranları
  const withholdingRates = [
    { value: 0, label: 'Tevkifat Yok' },
    { value: 20, label: '2/10 Tevkifat Uygula' },
    { value: 30, label: '3/10 Tevkifat Uygula' },
    { value: 50, label: '5/10 Tevkifat Uygula' },
    { value: 70, label: '7/10 Tevkifat Uygula' },
    { value: 90, label: '9/10 Tevkifat Uygula' },
  ]

  // İndirim türleri
  const discountTypes = [
    { value: 'percentage', label: '% İndirim' },
    { value: 'amount', label: 'Tutar İndirimi' },
  ]

  // Ödeme yöntemleri
  const paymentMethods = [
    { value: 'cash', label: 'Nakit' },
    { value: 'credit_card', label: 'Kredi Kartı' },
    { value: 'transfer', label: 'Havale/EFT' },
    { value: 'check', label: 'Çek' },
    { value: 'bond', label: 'Senet' },
  ]

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
    generateInvoiceNo()
    
    // Mal alış/satıştan gelen verileri al
    if (fromStockMovement) {
      const storedData = sessionStorage.getItem('invoiceData')
      if (storedData) {
        const data = JSON.parse(storedData)
        
        // Müşteri seç
        setFormData(prev => ({
          ...prev,
          customer_id: data.customer_id,
          invoice_type: data.movement_type === 'IN' ? 'purchase' : 'sale'
        }))
        
        // Kalemleri ekle
        const newItems: InvoiceItemFormData[] = data.items.map((item: any) => ({
          product_id: item.product_id,
          product_code: '',
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_rate: 0,
          discount_type: 'percentage',
          tax_rate: 20,
          description: `Belge No: ${data.document_no}`
        }))
        
        setFormData(prev => ({
          ...prev,
          items: newItems
        }))
        
        // SessionStorage'dan temizle
        sessionStorage.removeItem('invoiceData')
        
        // Toast mesajı
        setTimeout(() => {
          alert('Mal alış/satış verileri faturaya aktarıldı')
        }, 500)
      }
    }
  }, [fromStockMovement])

  const fetchCustomers = async () => {
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
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
      
      // Mal alış/satıştan gelen müşteriyi seç
      if (fromStockMovement && formData.customer_id) {
        const customer = data?.find(c => c.id === formData.customer_id)
        if (customer) {
          setSelectedCustomer(customer)
        }
      }
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error)
    }
  }

  const fetchProducts = async () => {
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
        .from('products')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('name')

      if (error) throw error
      console.log('Yüklenen ürünler:', data)
      setProducts(data || [])
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
    }
  }

  const generateInvoiceNo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const prefix = invoiceType === 'sale' ? 'SAT' : 'ALI'
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      
      const { data } = await supabase
        .from('invoices')
        .select('invoice_no')
        .eq('company_id', userData.company_id)
        .eq('invoice_type', invoiceType)
        .like('invoice_no', `${prefix}${year}${month}%`)
        .order('invoice_no', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNo = data[0].invoice_no
        const match = lastNo.match(/\d{6}$/)
        if (match) {
          nextNumber = parseInt(match[0]) + 1
        }
      }

      setFormData(prev => ({
        ...prev,
        invoice_no: `${prefix}${year}${month}${String(nextNumber).padStart(6, '0')}`
      }))
    } catch (error) {
      console.error('Fatura numarası oluşturulurken hata:', error)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({ ...prev, customer_id: customer.id }))
    setSearchCustomer('')
    
    if (customer.payment_term) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + customer.payment_term)
      setFormData(prev => ({ ...prev, due_date: dueDate.toISOString().split('T')[0] }))
    }
  }

  const addProduct = (product: Product) => {
    const newItem: InvoiceItemFormData = {
      product_id: product.id,
      product_code: product.code,
      product_name: product.name,
      quantity: 1,
      unit: product.unit,
      unit_price: invoiceType === 'sale' ? product.sale_price : product.purchase_price,
      discount_rate: 0,
      discount_type: 'percentage',
      tax_rate: product.tax_rate || 20,
      description: ''
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    setSearchProduct('')
  }

  const updateItem = (index: number, field: keyof InvoiceItemFormData, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const calculateTotals = () => {
    let subtotal = 0
    let totalDiscount = 0
    let totalTax = 0

    formData.items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price
      const discountAmount = item.discount_type === 'percentage' 
        ? lineTotal * (item.discount_rate / 100)
        : item.discount_rate
      const taxableAmount = lineTotal - discountAmount
      const taxAmount = taxableAmount * (item.tax_rate / 100)

      subtotal += lineTotal
      totalDiscount += discountAmount
      totalTax += taxAmount
    })

    const total = subtotal - totalDiscount + totalTax
    const withholdingAmount = formData.withholding_rate ? (total * formData.withholding_rate / 100) : 0
    const netTotal = total - withholdingAmount

    return { subtotal, totalDiscount, totalTax, total, withholdingAmount, netTotal }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer_id) {
      alert('Lütfen müşteri seçin')
      return
    }

    if (formData.items.length === 0) {
      alert('Lütfen en az bir ürün ekleyin')
      return
    }

    setLoading(true)
    const totals = calculateTotals()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) return

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: userData.company_id,
          invoice_no: formData.invoice_no,
          invoice_type: formData.invoice_type,
          customer_id: formData.customer_id,
          invoice_date: formData.invoice_date,
          invoice_time: formData.invoice_time,
          delivery_date: formData.invoice_date,
          due_date: formData.due_date || null,
          subtotal: totals.subtotal,
          discount_amount: totals.totalDiscount,
          tax_amount: totals.totalTax,
          withholding_amount: totals.withholdingAmount,
          total_amount: totals.netTotal,
          currency: formData.currency,
          exchange_rate: formData.exchange_rate,
          is_e_invoice: isEInvoice,
          is_e_archive: isEArchive,
          payment_status: 'unpaid',
          paid_amount: 0,
          description: formData.description,
          notes: formData.notes,
          created_by: user.id
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      const itemsToInsert = formData.items.map((item, index) => {
        const lineTotal = item.quantity * item.unit_price
        const discountAmount = item.discount_type === 'percentage'
          ? lineTotal * (item.discount_rate / 100)
          : item.discount_rate
        const taxableAmount = lineTotal - discountAmount
        const taxAmount = taxableAmount * (item.tax_rate / 100)
        const totalAmount = taxableAmount + taxAmount

        return {
          invoice_id: invoice.id,
          product_id: item.product_id,
          line_no: index + 1,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_rate: item.discount_rate,
          discount_amount: discountAmount,
          tax_rate: item.tax_rate,
          tax_amount: taxAmount,
          line_total: lineTotal,
          total_amount: totalAmount,
          description: item.description
        }
      })

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      router.push(`/fatura/${invoice.id}`)
    } catch (error: any) {
      console.error('Fatura kaydedilirken hata:', error)
      alert(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.code.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.tax_number?.includes(searchCustomer)
  )

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.code.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.barcode?.includes(searchProduct)
  )

  const { subtotal, totalDiscount, totalTax, total, withholdingAmount, netTotal } = calculateTotals()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: formData.currency || 'TRY'
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/fatura" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Yeni {invoiceType === 'sale' ? 'Satış' : 'Alış'} Faturası
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">Fatura bilgilerini doldurun ve kaydedin</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Önizle
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Taslak
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Kaydediliyor...' : 'Kaydet ve Gönder'}
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              Öncekinden Kopyala
            </button>
            <button
              type="button"
              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel'den Aktar
            </button>
            <button
              type="button"
              className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors flex items-center gap-1"
            >
              <Barcode className="w-3.5 h-3.5" />
              Barkod Okut
            </button>
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <Calculator className="w-3.5 h-3.5" />
              Hesap Makinesi
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={isEInvoice}
                onChange={(e) => setIsEInvoice(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>e-Fatura</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="checkbox"
                checked={isEArchive}
                onChange={(e) => setIsEArchive(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>e-Arşiv</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Sol Panel - Ana İçerik */}
        <div className="col-span-8 space-y-4">
          {/* Fatura Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Fatura Bilgileri
                </h2>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  Otomatik Numara
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fatura No
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_no}
                    onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fatura Tarihi
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Düzenleme Saati
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={formData.invoice_time}
                      onChange={(e) => setFormData({ ...formData, invoice_time: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vade Tarihi
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Gelişmiş Seçenekler */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                  Gelişmiş Seçenekler
                </button>
                
                {showAdvancedOptions && (
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Döviz Cinsi
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TRY">TRY - Türk Lirası</option>
                        <option value="USD">USD - Amerikan Doları</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - İngiliz Sterlini</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Döviz Kuru
                      </label>
                      <input
                        type="number"
                        value={formData.exchange_rate}
                        onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        step="0.0001"
                        disabled={formData.currency === 'TRY'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat Oranı
                      </label>
                      <select
                        value={formData.withholding_rate}
                        onChange={(e) => setFormData({ ...formData, withholding_rate: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {withholdingRates.map(rate => (
                          <option key={rate.value} value={rate.value}>{rate.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Müşteri Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  {invoiceType === 'sale' ? 'Müşteri' : 'Tedarikçi'} Bilgileri
                </h2>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Müşteri Defteri
                </button>
              </div>
              
              {selectedCustomer ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedCustomer.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">VKN/TCKN:</span> {selectedCustomer.tax_number}
                      </p>
                      {selectedCustomer.tax_office && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Vergi Dairesi:</span> {selectedCustomer.tax_office}
                        </p>
                      )}
                      {selectedCustomer.address && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Adres:</span> {selectedCustomer.address}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedCustomer.is_e_invoice && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          e-Fatura Mükellefi
                        </span>
                      )}
                      <p className="text-sm font-semibold text-blue-600 mt-2">
                        Bakiye: {formatCurrency(selectedCustomer.balance || 0)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null)
                          setFormData({ ...formData, customer_id: '' })
                        }}
                        className="text-red-600 hover:text-red-700 mt-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    placeholder="Müşteri adı, VKN veya telefon ile ara..."
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {searchCustomer && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleCustomerSelect(customer)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-600">
                              {customer.code} • {customer.tax_number}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">
                          Sonuç bulunamadı
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fatura Kalemleri */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'items'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Fatura Kalemleri
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'notes'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Notlar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'attachments'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileDown className="w-4 h-4 inline mr-2" />
                  Ekler
                </button>
              </div>
            </div>

            <div className="p-5">
              {activeTab === 'items' && (
                <>
                  {/* Ürün Arama */}
                  <div className="mb-4 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                        placeholder="Ürün adı, kodu veya barkod ile ara..."
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      
                      {/* Manuel ürün ekleme butonu */}
                      <button
                        type="button"
                        onClick={() => {
                          const newItem: InvoiceItemFormData = {
                            product_id: '',
                            product_code: '',
                            product_name: searchProduct || 'Manuel Ürün',
                            quantity: 1,
                            unit: 'Adet',
                            unit_price: 0,
                            discount_rate: 0,
                            discount_type: 'percentage',
                            tax_rate: 20,
                            description: ''
                          }
                          setFormData(prev => ({
                            ...prev,
                            items: [...prev.items, newItem]
                          }))
                          setSearchProduct('')
                        }}
                        className="absolute right-2 top-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Manuel Ekle
                      </button>
                    </div>
                    
                    {searchProduct && filteredProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b text-sm text-gray-600">
                          {filteredProducts.length} ürün bulundu
                        </div>
                        {filteredProducts.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-600">
                                  Kod: {product.code} • Stok: {product.current_stock} {product.unit}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-blue-600">
                                  {formatCurrency(invoiceType === 'sale' ? product.sale_price : product.purchase_price)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  KDV: %{product.tax_rate || 20}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {searchProduct && filteredProducts.length === 0 && products.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-4">
                        <div className="text-center text-gray-500">
                          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>Ürün bulunamadı</p>
                          <p className="text-sm mt-1">Manuel eklemek için yukarıdaki butonu kullanın</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kalem Listesi */}
                  {formData.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-3 text-left font-medium text-gray-600">Ürün</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-600">Miktar</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-600">Birim</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-600">B.Fiyat</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-600">İndirim</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-600">KDV %</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-600">Toplam</th>
                            <th className="px-3 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {formData.items.map((item, index) => {
                            const lineTotal = item.quantity * item.unit_price
                            const discountAmount = item.discount_type === 'percentage'
                              ? lineTotal * (item.discount_rate / 100)
                              : item.discount_rate
                            const taxableAmount = lineTotal - discountAmount
                            const taxAmount = taxableAmount * (item.tax_rate / 100)
                            const totalAmount = taxableAmount + taxAmount

                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={item.product_name}
                                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                    className="w-full px-2 py-1 text-sm font-medium text-gray-900 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                                    placeholder="Ürün adı"
                                  />
                                  <input
                                    type="text"
                                    value={item.product_code}
                                    onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                                    className="w-full px-2 py-0.5 text-xs text-gray-500 border-0 focus:ring-1 focus:ring-blue-500 rounded mt-1"
                                    placeholder="Ürün kodu"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 text-center border rounded"
                                    min="0.01"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-3 text-center text-sm">
                                  {item.unit}
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 text-right border rounded"
                                    min="0"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      value={item.discount_rate}
                                      onChange={(e) => updateItem(index, 'discount_rate', parseFloat(e.target.value) || 0)}
                                      className="w-14 px-1 py-1 text-center border rounded"
                                      min="0"
                                      max={item.discount_type === 'percentage' ? 100 : undefined}
                                    />
                                    <select
                                      value={item.discount_type}
                                      onChange={(e) => updateItem(index, 'discount_type', e.target.value)}
                                      className="w-12 px-1 py-1 border rounded text-xs"
                                    >
                                      <option value="percentage">%</option>
                                      <option value="amount">₺</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    value={item.tax_rate}
                                    onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                    className="w-14 px-1 py-1 text-center border rounded"
                                    min="0"
                                  />
                                </td>
                                <td className="px-3 py-3 text-right font-medium text-sm">
                                  {formatCurrency(totalAmount)}
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Henüz ürün eklenmedi</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Yukarıdaki arama kutusunu kullanarak ürün ekleyebilirsiniz
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'notes' && (
                <div>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={6}
                    placeholder="Fatura ile ilgili notlar..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="text-center py-8">
                  <FileDown className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Dosya eklemek için tıklayın veya sürükleyin</p>
                  <input type="file" className="hidden" multiple />
                  <button
                    type="button"
                    className="mt-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    Dosya Seç
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Panel - Özet ve Aksiyonlar */}
        <div className="col-span-4 space-y-4">
          {/* Fatura Özeti */}
          <div className="bg-white rounded-lg shadow-sm sticky top-4">
            <div className="p-5">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-orange-600" />
                Fatura Özeti
              </h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ara Toplam</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">İndirim</span>
                    <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">KDV Toplam</span>
                  <span className="font-medium">{formatCurrency(totalTax)}</span>
                </div>

                {withholdingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tevkifat ({(formData.withholding_rate || 0)/10}/10)</span>
                    <span className="font-medium text-orange-600">-{formatCurrency(withholdingAmount)}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Genel Toplam</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(netTotal)}</span>
                  </div>
                </div>
              </div>

              {/* İndirim Ekleme */}
              <div className="mt-4 pt-4 border-t">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm flex items-center justify-center gap-2"
                >
                  <Percent className="w-4 h-4" />
                  Toplu İndirim Ekle
                </button>
              </div>

              {/* Ödeme Bilgileri */}
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ödeme Yöntemi
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Seçiniz</option>
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* IBAN Bilgisi */}
              <div className="mt-4 pt-4 border-t">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  IBAN Bilgisi Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Hızlı İşlemler */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Hızlı İşlemler</h3>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Faturayı Kopyala
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Sipariş Fişine Dönüştür
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Tahsilat/Ödeme Ekle
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}