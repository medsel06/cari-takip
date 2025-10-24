'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, Download, Mail, Phone, MapPin, Globe, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSearchParams, useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Customer {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  tax_office: string;
}

interface AccountMovement {
  id: string;
  movement_type: 'DEBT' | 'CREDIT';
  amount: number;
  description: string;
  due_date: string;
  created_at: string;
  invoice_no?: string;
  payment_type?: string;
  reference_no?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  tax_office: string;
  logo_url?: string;
}

// Varsayılan şirket bilgileri (Ayarlar sayfasından çekilecek)
const defaultCompanyInfo: CompanyInfo = {
  name: 'ALSE Ticaret A.Ş.',
  address: 'Ankara Caddesi No:123 Çankaya/Ankara',
  phone: '+90 312 123 45 67',
  email: 'info@alseticaret.com.tr',
  website: 'www.alseticaret.com.tr',
  tax_number: '1234567890',
  tax_office: 'Çankaya V.D.'
};

export default function CariEkstrePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('all');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const customerId = searchParams.get('customerId');

  useEffect(() => {
    if (!customerId) {
      router.push('/cari');
      return;
    }
    
    // Varsayılan tarih aralığı - Bu ay
    const now = new Date();
    setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    
    fetchCustomerAndMovements();
  }, [customerId]);

  useEffect(() => {
    if (customer) {
      fetchMovements();
    }
  }, [startDate, endDate, filterPaymentType]);

  const fetchCustomerAndMovements = async () => {
    const supabase = createClient();
    
    try {
      // Session kontrolü
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }

      // Company ID'yi al
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      if (!userProfile?.company_id) {
        setError('Şirket bilgisi bulunamadı.');
        setLoading(false);
        return;
      }

      // Müşteri bilgilerini getir
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', userProfile.company_id)
        .single();

      if (customerError || !customerData) {
        setError('Müşteri bilgileri bulunamadı.');
        setLoading(false);
        return;
      }

      setCustomer(customerData);
      await fetchMovements();
      
      // Şirket bilgilerini getir (varsa)
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
        .single();
        
      if (companyData) {
        setCompanyInfo({
          name: companyData.name || defaultCompanyInfo.name,
          address: companyData.address || defaultCompanyInfo.address,
          phone: companyData.phone || defaultCompanyInfo.phone,
          email: companyData.email || defaultCompanyInfo.email,
          website: companyData.website || defaultCompanyInfo.website,
          tax_number: companyData.tax_number || defaultCompanyInfo.tax_number,
          tax_office: companyData.tax_office || defaultCompanyInfo.tax_office,
          logo_url: companyData.logo_url
        });
      }
    } catch (err: any) {
      console.error('Hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    if (!customerId) return;
    
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('account_movements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      // Tarih filtresi
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      // Ödeme tipi filtresi
      if (filterPaymentType !== 'all') {
        query = query.eq('payment_type', filterPaymentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Hareketler yüklenemedi:', error);
      } else {
        setMovements(data || []);
      }
    } catch (err: any) {
      console.error('Hata:', err);
    }
  };

  const calculateTotals = () => {
    let runningBalance = 0;
    const movementsWithBalance = movements.map(movement => {
      if (movement.movement_type === 'DEBT') {
        runningBalance += movement.amount;
      } else {
        runningBalance -= movement.amount;
      }
      return { ...movement, balance: runningBalance };
    });

    const totalDebt = movements
      .filter(m => m.movement_type === 'DEBT')
      .reduce((sum, m) => sum + m.amount, 0);
    
    const totalCredit = movements
      .filter(m => m.movement_type === 'CREDIT')
      .reduce((sum, m) => sum + m.amount, 0);
    
    const finalBalance = totalDebt - totalCredit;

    return { movementsWithBalance, totalDebt, totalCredit, finalBalance };
  };

  const exportToExcel = () => {
    const { movementsWithBalance, totalDebt, totalCredit, finalBalance } = calculateTotals();
    
    // Header bilgileri
    const headerData = [
      [`${companyInfo.name} - CARİ HESAP EKSTRESİ`],
      [`Müşteri: ${customer?.name}`],
      [`Tarih Aralığı: ${format(new Date(startDate), 'dd.MM.yyyy')} - ${format(new Date(endDate), 'dd.MM.yyyy')}`],
      [`Ekstre Tarihi: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`],
      []
    ];

    // Hareket detayları
    const movementData = movementsWithBalance.map(movement => ({
      'Tarih': format(new Date(movement.created_at), 'dd.MM.yyyy'),
      'Belge No': movement.invoice_no || movement.reference_no || '-',
      'Açıklama': movement.description,
      'Vade': movement.due_date ? format(new Date(movement.due_date), 'dd.MM.yyyy') : '-',
      'Borç': movement.movement_type === 'DEBT' ? movement.amount.toFixed(2) : '',
      'Alacak': movement.movement_type === 'CREDIT' ? movement.amount.toFixed(2) : '',
      'Bakiye': movement.balance.toFixed(2) + (movement.balance > 0 ? ' (B)' : movement.balance < 0 ? ' (A)' : '')
    }));

    // Toplam satırı
    movementData.push({
      'Tarih': '',
      'Belge No': '',
      'Açıklama': 'TOPLAM',
      'Vade': '',
      'Borç': totalDebt.toFixed(2),
      'Alacak': totalCredit.toFixed(2),
      'Bakiye': Math.abs(finalBalance).toFixed(2) + (finalBalance > 0 ? ' (B)' : finalBalance < 0 ? ' (A)' : '')
    });

    // Excel oluştur
    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.sheet_add_json(ws, movementData, { origin: 'A6', skipHeader: false });

    // Sütun genişlikleri
    ws['!cols'] = [
      { wch: 12 }, // Tarih
      { wch: 15 }, // Belge No
      { wch: 40 }, // Açıklama
      { wch: 12 }, // Vade
      { wch: 15 }, // Borç
      { wch: 15 }, // Alacak
      { wch: 15 }  // Bakiye
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cari Ekstre');
    XLSX.writeFile(wb, `${customer?.code}_ekstre_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('statement-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${customer?.code}_ekstre_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const { movementsWithBalance, totalDebt, totalCredit, finalBalance } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => router.push('/cari')}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Cari Listesine Dön
          </button>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Kontrol Paneli */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tipi</label>
            <select
              value={filterPaymentType}
              onChange={(e) => setFilterPaymentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="cash">Nakit</option>
              <option value="transfer">Havale/EFT</option>
              <option value="credit_card">Kredi Kartı</option>
              <option value="check">Çek</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Ekstre İçeriği - PDF için */}
      <div id="statement-content" className="bg-white shadow-lg">
        {/* Antet */}
        <div className="border-b-4 border-gray-800 pb-6 mb-6 p-8">
          <div className="flex justify-between items-start">
            <div>
              {companyInfo.logo_url ? (
                <img src={companyInfo.logo_url} alt={companyInfo.name} className="h-16 mb-4" />
              ) : (
                <h1 className="text-3xl font-bold text-gray-800 mb-4">{companyInfo.name}</h1>
              )}
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{companyInfo.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{companyInfo.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{companyInfo.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{companyInfo.website}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">CARİ HESAP EKSTRESİ</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Vergi No: {companyInfo.tax_number}</p>
                <p>Vergi Dairesi: {companyInfo.tax_office}</p>
                <p>Tarih: {format(new Date(), 'dd.MM.yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Müşteri Bilgileri */}
        <div className="px-8 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Müşteri Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><span className="font-medium">Müşteri Kodu:</span> {customer.code}</p>
                <p><span className="font-medium">Ünvan:</span> {customer.name}</p>
                <p><span className="font-medium">Telefon:</span> {customer.phone || '-'}</p>
                <p><span className="font-medium">E-posta:</span> {customer.email || '-'}</p>
              </div>
              <div>
                <p><span className="font-medium">Adres:</span> {customer.address || '-'}</p>
                <p><span className="font-medium">Vergi No:</span> {customer.tax_number || '-'}</p>
                <p><span className="font-medium">Vergi Dairesi:</span> {customer.tax_office || '-'}</p>
                <p><span className="font-medium">Tarih Aralığı:</span> {format(new Date(startDate), 'dd.MM.yyyy')} - {format(new Date(endDate), 'dd.MM.yyyy')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hareket Tablosu */}
        <div className="px-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-1 text-sm font-semibold text-gray-700">Tarih</th>
                <th className="text-left py-2 px-1 text-sm font-semibold text-gray-700">Belge No</th>
                <th className="text-left py-2 px-1 text-sm font-semibold text-gray-700">Açıklama</th>
                <th className="text-center py-2 px-1 text-sm font-semibold text-gray-700">Vade</th>
                <th className="text-right py-2 px-1 text-sm font-semibold text-gray-700">Borç</th>
                <th className="text-right py-2 px-1 text-sm font-semibold text-gray-700">Alacak</th>
                <th className="text-right py-2 px-1 text-sm font-semibold text-gray-700">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {movementsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Bu tarih aralığında hareket bulunmuyor.
                  </td>
                </tr>
              ) : (
                <>
                  {movementsWithBalance.map((movement, index) => (
                    <tr key={movement.id} className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                      <td className="py-2 px-1 text-sm">{format(new Date(movement.created_at), 'dd.MM.yyyy')}</td>
                      <td className="py-2 px-1 text-sm">{movement.invoice_no || movement.reference_no || '-'}</td>
                      <td className="py-2 px-1 text-sm">{movement.description}</td>
                      <td className="py-2 px-1 text-sm text-center">
                        {movement.due_date ? format(new Date(movement.due_date), 'dd.MM.yyyy') : '-'}
                      </td>
                      <td className="py-2 px-1 text-sm text-right">
                        {movement.movement_type === 'DEBT' ? (
                          <span className="font-medium">₺{movement.amount.toFixed(2)}</span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-1 text-sm text-right">
                        {movement.movement_type === 'CREDIT' ? (
                          <span className="font-medium">₺{movement.amount.toFixed(2)}</span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-1 text-sm text-right font-medium">
                        ₺{Math.abs(movement.balance).toFixed(2)}
                        <span className="text-xs ml-1">
                          ({movement.balance > 0 ? 'B' : movement.balance < 0 ? 'A' : ''})
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Toplam Satırı */}
                  <tr className="border-t-2 border-gray-400 font-semibold bg-gray-100">
                    <td colSpan={4} className="py-3 px-1 text-right">TOPLAM:</td>
                    <td className="py-3 px-1 text-right">₺{totalDebt.toFixed(2)}</td>
                    <td className="py-3 px-1 text-right">₺{totalCredit.toFixed(2)}</td>
                    <td className="py-3 px-1 text-right">
                      ₺{Math.abs(finalBalance).toFixed(2)}
                      <span className="text-sm ml-1">
                        ({finalBalance > 0 ? 'B' : finalBalance < 0 ? 'A' : ''})
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 px-8 pb-8">
          <div className="border-t pt-4">
            <div className="flex justify-between items-start">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Not:</p>
                <p>• (B) Borçlu bakiye - (A) Alacaklı bakiye</p>
                <p>• Bu ekstre {format(new Date(), 'dd.MM.yyyy HH:mm')} tarihinde oluşturulmuştur.</p>
                <p>• Mutabakat için lütfen 5 iş günü içinde dönüş yapınız.</p>
              </div>
              
              <div className="text-right">
                <div className={`inline-block px-6 py-3 rounded-lg ${
                  finalBalance > 0 ? 'bg-red-100 text-red-800' : 
                  finalBalance < 0 ? 'bg-green-100 text-green-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm">Genel Bakiye</p>
                  <p className="text-2xl font-bold">
                    ₺{Math.abs(finalBalance).toFixed(2)}
                    {finalBalance !== 0 && (
                      <span className="text-lg ml-2">
                        ({finalBalance > 0 ? 'Borçlu' : 'Alacaklı'})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 text-white text-center py-4 text-sm">
          <p>{companyInfo.name} | {companyInfo.phone} | {companyInfo.email} | {companyInfo.website}</p>
        </div>
      </div>

      {/* Ekran Görüntüsü - Özet Bilgiler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Borç</p>
              <p className="text-xl font-bold text-gray-900">₺{totalDebt.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-500 opacity-20" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Alacak</p>
              <p className="text-xl font-bold text-gray-900">₺{totalCredit.toFixed(2)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">İşlem Sayısı</p>
              <p className="text-xl font-bold text-gray-900">{movements.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg shadow ${
          finalBalance > 0 ? 'bg-red-50' : 
          finalBalance < 0 ? 'bg-green-50' : 
          'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Bakiye</p>
              <p className={`text-xl font-bold ${
                finalBalance > 0 ? 'text-red-600' : 
                finalBalance < 0 ? 'text-green-600' : 
                'text-gray-900'
              }`}>
                ₺{Math.abs(finalBalance).toFixed(2)}
              </p>
              <p className="text-xs text-gray-600">
                {finalBalance > 0 ? 'Borçlu' : finalBalance < 0 ? 'Alacaklı' : 'Bakiyeli'}
              </p>
            </div>
            <AlertCircle className={`h-8 w-8 opacity-20 ${
              finalBalance > 0 ? 'text-red-500' : 
              finalBalance < 0 ? 'text-green-500' : 
              'text-gray-500'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}