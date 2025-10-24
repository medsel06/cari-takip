'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Activity, ArrowUpRight, ArrowDownRight, Wallet, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addDays, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CashFlow {
  // İşletme Faaliyetlerinden Nakit Akışı
  cashFromSales: number; // Satışlardan tahsilatlar
  cashFromOtherOperating: number; // Diğer işletme gelirleri
  totalOperatingInflows: number;
  
  cashToSuppliers: number; // Tedarikçilere ödemeler
  cashToEmployees: number; // Personel ödemeleri
  cashForOperatingExpenses: number; // Faaliyet giderleri
  cashForTaxes: number; // Vergi ödemeleri
  totalOperatingOutflows: number;
  
  netOperatingCashFlow: number;
  
  // Yatırım Faaliyetlerinden Nakit Akışı
  cashFromAssetSales: number; // Varlık satışları
  cashForAssetPurchases: number; // Varlık alımları
  netInvestingCashFlow: number;
  
  // Finansman Faaliyetlerinden Nakit Akışı
  cashFromLoans: number; // Kredi girişleri
  cashForLoanPayments: number; // Kredi ödemeleri
  cashFromCapital: number; // Sermaye artışı
  cashForDividends: number; // Temettü ödemeleri
  netFinancingCashFlow: number;
  
  // Toplam Nakit Akışı
  totalCashFlow: number;
  beginningCash: number;
  endingCash: number;
  
  // Detaylı Analiz
  checkCollections: number; // Tahsil edilen çekler
  checkPayments: number; // Ödenen çekler
  creditCardCollections: number; // Kredi kartı tahsilatları
  averageDailyFlow: number;
  cashBurnRate: number; // Aylık nakit yakma oranı
  cashRunway: number; // Nakit bitme süresi (ay)
}

interface DailyCashFlow {
  date: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  balance: number;
}

interface CategoryFlow {
  category: string;
  amount: number;
  percentage: number;
  type: 'inflow' | 'outflow';
}

export default function NakitAkisRaporuPage() {
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [dailyFlows, setDailyFlows] = useState<DailyCashFlow[]>([]);
  const [categoryFlows, setCategoryFlows] = useState<CategoryFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('current_month'); // current_month, last_month, current_week
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchCashFlow();
  }, [period]);

  const fetchCashFlow = async () => {
    const supabase = createClient();
    
    try {
      console.log('Nakit akış raporu - Veriler yükleniyor...');
      
      // Session kontrolü
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        setLoading(false);
        return;
      }

      setUserInfo(session.user);

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

      const companyId = userProfile.company_id;
      const now = new Date();
      
      // Dönem belirleme
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case 'current_month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'current_week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      // Başlangıç nakit pozisyonu (örnek)
      const beginningCash = 250000;

      // 1. İşletme Faaliyetlerinden Nakit Akışı
      
      // Tahsilatlar
      let cashFromSales = 0;
      let cashFromOtherOperating = 0;
      let checkCollections = 0;
      let creditCardCollections = 0;
      
      const { data: collections } = await supabase
        .from('account_movements')
        .select('*, customer:customers(*)')
        .eq('company_id', companyId)
        .eq('movement_type', 'CREDIT')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      collections?.forEach(movement => {
        const amount = parseFloat(movement.amount || 0);
        
        if (movement.payment_type === 'check') {
          checkCollections += amount;
        } else if (movement.payment_type === 'credit_card') {
          creditCardCollections += amount;
        } else if (movement.description?.toLowerCase().includes('diğer')) {
          cashFromOtherOperating += amount;
        } else {
          cashFromSales += amount;
        }
      });

      const totalOperatingInflows = cashFromSales + cashFromOtherOperating;

      // Ödemeler
      let cashToSuppliers = 0;
      let cashToEmployees = 0;
      let cashForOperatingExpenses = 0;
      let cashForTaxes = 0;
      let checkPayments = 0;

      // Tedarikçi ödemeleri
      const { data: supplierPayments } = await supabase
        .from('account_movements')
        .select('*, customer:customers(*)')
        .eq('company_id', companyId)
        .eq('movement_type', 'DEBT')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      supplierPayments?.forEach(movement => {
        const amount = parseFloat(movement.amount || 0);
        const customer = movement.customer;
        
        if (movement.payment_type === 'check') {
          checkPayments += amount;
        }
        
        if (customer?.type === 'supplier' || customer?.type === 'both') {
          cashToSuppliers += amount;
        } else if (movement.description?.toLowerCase().includes('personel') || 
                   movement.description?.toLowerCase().includes('maaş')) {
          cashToEmployees += amount;
        } else if (movement.description?.toLowerCase().includes('vergi')) {
          cashForTaxes += amount;
        } else {
          cashForOperatingExpenses += amount;
        }
      });

      // Varsayılan personel ve gider ödemeleri (gerçek uygulamada detaylı olmalı)
      if (cashToEmployees === 0) {
        cashToEmployees = totalOperatingInflows * 0.25; // Varsayılan
      }
      if (cashForOperatingExpenses === 0) {
        cashForOperatingExpenses = totalOperatingInflows * 0.15;
      }
      if (cashForTaxes === 0) {
        cashForTaxes = totalOperatingInflows * 0.05;
      }

      const totalOperatingOutflows = cashToSuppliers + cashToEmployees + cashForOperatingExpenses + cashForTaxes;
      const netOperatingCashFlow = totalOperatingInflows - totalOperatingOutflows;

      // 2. Yatırım Faaliyetlerinden Nakit Akışı (örnek değerler)
      const cashFromAssetSales = 0;
      const cashForAssetPurchases = 10000; // Örnek demirbaş alımı
      const netInvestingCashFlow = cashFromAssetSales - cashForAssetPurchases;

      // 3. Finansman Faaliyetlerinden Nakit Akışı (örnek değerler)
      const cashFromLoans = 0;
      const cashForLoanPayments = 5000; // Örnek kredi ödemesi
      const cashFromCapital = 0;
      const cashForDividends = 0;
      const netFinancingCashFlow = cashFromLoans - cashForLoanPayments + cashFromCapital - cashForDividends;

      // 4. Toplam Nakit Akışı
      const totalCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
      const endingCash = beginningCash + totalCashFlow;

      // 5. Performans Metrikleri
      const daysInPeriod = differenceInDays(endDate, startDate) + 1;
      const averageDailyFlow = totalCashFlow / daysInPeriod;
      const cashBurnRate = totalOperatingOutflows / (daysInPeriod / 30); // Aylık
      const cashRunway = endingCash > 0 && cashBurnRate > 0 ? endingCash / cashBurnRate : 0;

      setCashFlow({
        cashFromSales,
        cashFromOtherOperating,
        totalOperatingInflows,
        cashToSuppliers,
        cashToEmployees,
        cashForOperatingExpenses,
        cashForTaxes,
        totalOperatingOutflows,
        netOperatingCashFlow,
        cashFromAssetSales,
        cashForAssetPurchases,
        netInvestingCashFlow,
        cashFromLoans,
        cashForLoanPayments,
        cashFromCapital,
        cashForDividends,
        netFinancingCashFlow,
        totalCashFlow,
        beginningCash,
        endingCash,
        checkCollections,
        checkPayments,
        creditCardCollections,
        averageDailyFlow,
        cashBurnRate,
        cashRunway
      });

      // 6. Günlük Nakit Akışı (basitleştirilmiş)
      const dailyData: DailyCashFlow[] = [];
      let runningBalance = beginningCash;
      
      for (let d = new Date(startDate); d <= endDate; d = addDays(d, 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);
        
        // O güne ait tahsilatlar
        const dayCollections = collections?.filter(c => {
          const date = new Date(c.created_at);
          return date >= dayStart && date <= dayEnd;
        }).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) || 0;
        
        // O güne ait ödemeler
        const dayPayments = supplierPayments?.filter(p => {
          const date = new Date(p.created_at);
          return date >= dayStart && date <= dayEnd;
        }).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        
        const netFlow = dayCollections - dayPayments;
        runningBalance += netFlow;
        
        dailyData.push({
          date: format(d, 'dd.MM', { locale: tr }),
          inflows: dayCollections,
          outflows: dayPayments,
          netFlow,
          balance: runningBalance
        });
      }
      
      setDailyFlows(dailyData);

      // 7. Kategori Bazlı Akış
      const categories: CategoryFlow[] = [
        { category: 'Satış Tahsilatları', amount: cashFromSales, percentage: 0, type: 'inflow' },
        { category: 'Çek Tahsilatları', amount: checkCollections, percentage: 0, type: 'inflow' },
        { category: 'Kredi Kartı', amount: creditCardCollections, percentage: 0, type: 'inflow' },
        { category: 'Diğer Gelirler', amount: cashFromOtherOperating, percentage: 0, type: 'inflow' },
        { category: 'Tedarikçi Ödemeleri', amount: cashToSuppliers, percentage: 0, type: 'outflow' },
        { category: 'Personel Ödemeleri', amount: cashToEmployees, percentage: 0, type: 'outflow' },
        { category: 'Faaliyet Giderleri', amount: cashForOperatingExpenses, percentage: 0, type: 'outflow' },
        { category: 'Vergi Ödemeleri', amount: cashForTaxes, percentage: 0, type: 'outflow' },
        { category: 'Yatırım Harcamaları', amount: cashForAssetPurchases, percentage: 0, type: 'outflow' },
        { category: 'Kredi Ödemeleri', amount: cashForLoanPayments, percentage: 0, type: 'outflow' }
      ];

      // Yüzdeleri hesapla
      const totalInflows = categories.filter(c => c.type === 'inflow').reduce((sum, c) => sum + c.amount, 0);
      const totalOutflows = categories.filter(c => c.type === 'outflow').reduce((sum, c) => sum + c.amount, 0);
      
      categories.forEach(cat => {
        const total = cat.type === 'inflow' ? totalInflows : totalOutflows;
        cat.percentage = total > 0 ? (cat.amount / total) * 100 : 0;
      });

      setCategoryFlows(categories.filter(c => c.amount > 0));

    } catch (err: any) {
      console.error('Hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!cashFlow) return;

    // Nakit Akış Tablosu
    const cashFlowData = [
      ['NAKİT AKIŞ TABLOSU'],
      [`Dönem: ${period === 'current_month' ? 'Bu Ay' : period === 'last_month' ? 'Geçen Ay' : 'Bu Hafta'}`],
      [`Tarih: ${format(new Date(), 'dd.MM.yyyy', { locale: tr })}`],
      [],
      ['İŞLETME FAALİYETLERİNDEN NAKİT AKIŞLARI', ''],
      ['Nakit Girişleri:', ''],
      ['  Satışlardan Tahsilatlar', cashFlow.cashFromSales.toFixed(2)],
      ['  Çek Tahsilatları', cashFlow.checkCollections.toFixed(2)],
      ['  Kredi Kartı Tahsilatları', cashFlow.creditCardCollections.toFixed(2)],
      ['  Diğer İşletme Gelirleri', cashFlow.cashFromOtherOperating.toFixed(2)],
      ['Toplam Nakit Girişleri', cashFlow.totalOperatingInflows.toFixed(2)],
      [],
      ['Nakit Çıkışları:', ''],
      ['  Tedarikçilere Ödemeler', `(${cashFlow.cashToSuppliers.toFixed(2)})`],
      ['  Personel Ödemeleri', `(${cashFlow.cashToEmployees.toFixed(2)})`],
      ['  Faaliyet Giderleri', `(${cashFlow.cashForOperatingExpenses.toFixed(2)})`],
      ['  Vergi Ödemeleri', `(${cashFlow.cashForTaxes.toFixed(2)})`],
      ['Toplam Nakit Çıkışları', `(${cashFlow.totalOperatingOutflows.toFixed(2)})`],
      [],
      ['İşletme Faaliyetlerinden Net Nakit Akışı', cashFlow.netOperatingCashFlow.toFixed(2)],
      [],
      ['YATIRIM FAALİYETLERİNDEN NAKİT AKIŞLARI', ''],
      ['  Duran Varlık Satışları', cashFlow.cashFromAssetSales.toFixed(2)],
      ['  Duran Varlık Alımları', `(${cashFlow.cashForAssetPurchases.toFixed(2)})`],
      ['Yatırım Faaliyetlerinden Net Nakit Akışı', cashFlow.netInvestingCashFlow.toFixed(2)],
      [],
      ['FİNANSMAN FAALİYETLERİNDEN NAKİT AKIŞLARI', ''],
      ['  Kredi Kullanımı', cashFlow.cashFromLoans.toFixed(2)],
      ['  Kredi Ödemeleri', `(${cashFlow.cashForLoanPayments.toFixed(2)})`],
      ['  Sermaye Artışı', cashFlow.cashFromCapital.toFixed(2)],
      ['  Temettü Ödemeleri', `(${cashFlow.cashForDividends.toFixed(2)})`],
      ['Finansman Faaliyetlerinden Net Nakit Akışı', cashFlow.netFinancingCashFlow.toFixed(2)],
      [],
      ['DÖNEM İÇİ NAKİT DEĞİŞİMİ', cashFlow.totalCashFlow.toFixed(2)],
      ['Dönem Başı Nakit', cashFlow.beginningCash.toFixed(2)],
      ['DÖNEM SONU NAKİT', cashFlow.endingCash.toFixed(2)],
      [],
      ['PERFORMANS GÖSTERGELERİ', ''],
      ['Ortalama Günlük Nakit Akışı', cashFlow.averageDailyFlow.toFixed(2)],
      ['Aylık Nakit Yakma Oranı', cashFlow.cashBurnRate.toFixed(2)],
      ['Nakit Bitme Süresi', `${cashFlow.cashRunway.toFixed(1)} ay`]
    ];

    // Günlük akış
    const dailyData = dailyFlows.map(day => ({
      'Tarih': day.date,
      'Nakit Girişi': day.inflows.toFixed(2),
      'Nakit Çıkışı': day.outflows.toFixed(2),
      'Net Akış': day.netFlow.toFixed(2),
      'Bakiye': day.balance.toFixed(2)
    }));

    // Kategori analizi
    const categoryData = categoryFlows.map(cat => ({
      'Kategori': cat.category,
      'Tip': cat.type === 'inflow' ? 'Giriş' : 'Çıkış',
      'Tutar': cat.amount.toFixed(2),
      'Yüzde (%)': cat.percentage.toFixed(1)
    }));

    // Excel workbook
    const wb = XLSX.utils.book_new();
    
    // Nakit akış sayfası
    const ws1 = XLSX.utils.aoa_to_sheet(cashFlowData);
    ws1['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Nakit Akış Tablosu');
    
    // Günlük akış sayfası
    const ws2 = XLSX.utils.json_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Günlük Akış');
    
    // Kategori analizi sayfası
    const ws3 = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Kategori Analizi');

    XLSX.writeFile(wb, `nakit_akis_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Nakit akış analizi yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Nakit Akış Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!cashFlow) return null;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nakit Akış Raporu</h1>
          <p className="text-gray-600">Nakit giriş ve çıkış analizi</p>
        </div>
        <div className="flex gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current_month">Bu Ay</option>
            <option value="last_month">Geçen Ay</option>
            <option value="current_week">Bu Hafta</option>
          </select>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowDownRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Toplam Nakit Girişi</p>
          <p className="text-2xl font-bold text-gray-900">₺{cashFlow.totalOperatingInflows.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowUpRight className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Toplam Nakit Çıkışı</p>
          <p className="text-2xl font-bold text-gray-900">₺{cashFlow.totalOperatingOutflows.toFixed(2)}</p>
        </div>

        <div className={`p-6 rounded-lg shadow ${
          cashFlow.totalCashFlow >= 0 ? 'bg-blue-50' : 'bg-orange-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${
              cashFlow.totalCashFlow >= 0 ? 'bg-blue-100' : 'bg-orange-100'
            }`}>
              <Activity className={`h-6 w-6 ${
                cashFlow.totalCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`} />
            </div>
          </div>
          <p className="text-sm text-gray-600">Net Nakit Akışı</p>
          <p className={`text-2xl font-bold ${
            cashFlow.totalCashFlow >= 0 ? 'text-blue-700' : 'text-orange-700'
          }`}>
            ₺{cashFlow.totalCashFlow.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Wallet className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Dönem Sonu Nakit</p>
          <p className="text-2xl font-bold text-gray-900">₺{cashFlow.endingCash.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Runway: {cashFlow.cashRunway.toFixed(1)} ay</p>
        </div>
      </div>

      {/* Nakit Akış Detayları */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Taraf - Akış Tablosu */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nakit Akış Özeti</h3>
          
          <div className="space-y-4">
            {/* İşletme Faaliyetleri */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">İŞLETME FAALİYETLERİ</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Satış Tahsilatları</span>
                  <span className="text-green-600">+₺{cashFlow.cashFromSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diğer Gelirler</span>
                  <span className="text-green-600">+₺{cashFlow.cashFromOtherOperating.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tedarikçi Ödemeleri</span>
                  <span className="text-red-600">-₺{cashFlow.cashToSuppliers.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Personel Ödemeleri</span>
                  <span className="text-red-600">-₺{cashFlow.cashToEmployees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Faaliyet Giderleri</span>
                  <span className="text-red-600">-₺{cashFlow.cashForOperatingExpenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t font-semibold">
                  <span>İşletme Faaliyetlerinden Net Nakit</span>
                  <span className={cashFlow.netOperatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlow.netOperatingCashFlow >= 0 ? '+' : ''}₺{cashFlow.netOperatingCashFlow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Yatırım Faaliyetleri */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">YATIRIM FAALİYETLERİ</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duran Varlık Alımları</span>
                  <span className="text-red-600">-₺{cashFlow.cashForAssetPurchases.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t font-semibold">
                  <span>Yatırım Faaliyetlerinden Net Nakit</span>
                  <span className={cashFlow.netInvestingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlow.netInvestingCashFlow >= 0 ? '+' : ''}₺{cashFlow.netInvestingCashFlow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Finansman Faaliyetleri */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">FİNANSMAN FAALİYETLERİ</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Kredi Ödemeleri</span>
                  <span className="text-red-600">-₺{cashFlow.cashForLoanPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t font-semibold">
                  <span>Finansman Faaliyetlerinden Net Nakit</span>
                  <span className={cashFlow.netFinancingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlow.netFinancingCashFlow >= 0 ? '+' : ''}₺{cashFlow.netFinancingCashFlow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Toplam */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Dönem Başı Nakit</p>
                  <p className="text-lg font-semibold">₺{cashFlow.beginningCash.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Net Değişim</p>
                  <p className={`text-lg font-bold ${
                    cashFlow.totalCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {cashFlow.totalCashFlow >= 0 ? '+' : ''}₺{cashFlow.totalCashFlow.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Dönem Sonu</p>
                  <p className="text-lg font-bold text-blue-600">₺{cashFlow.endingCash.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Taraf - Kategori Dağılımı */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kategori Bazlı Dağılım</h3>
          
          <div className="space-y-6">
            {/* Nakit Girişleri */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Nakit Girişleri</h4>
              <div className="space-y-2">
                {categoryFlows.filter(c => c.type === 'inflow').map((cat, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cat.category}</span>
                      <span className="font-medium">₺{cat.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nakit Çıkışları */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Nakit Çıkışları</h4>
              <div className="space-y-2">
                {categoryFlows.filter(c => c.type === 'outflow').map((cat, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{cat.category}</span>
                      <span className="font-medium">₺{cat.amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performans Göstergeleri */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Performans Göstergeleri</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Günlük Ortalama Akış</span>
                  <span className={`font-medium ${
                    cashFlow.averageDailyFlow >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ₺{cashFlow.averageDailyFlow.toFixed(2)}/gün
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Aylık Nakit Yakma</span>
                  <span className="font-medium text-red-600">₺{cashFlow.cashBurnRate.toFixed(2)}/ay</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Nakit Runway</span>
                  <span className="font-medium text-blue-900">{cashFlow.cashRunway.toFixed(1)} ay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Günlük Akış Grafiği */}
      {dailyFlows.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Günlük Nakit Akışı</h3>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Grafik benzeri görünüm */}
              <div className="flex items-end gap-1 h-48 mb-4">
                {dailyFlows.map((day, index) => {
                  const maxFlow = Math.max(...dailyFlows.map(d => Math.abs(d.netFlow)));
                  const heightPercentage = maxFlow > 0 ? (Math.abs(day.netFlow) / maxFlow) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        {day.netFlow !== 0 && (
                          <div
                            className={`w-full rounded-t ${
                              day.netFlow >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ height: `${heightPercentage}%` }}
                            title={`₺${day.netFlow.toFixed(2)}`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{day.date}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Özet bilgiler */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-gray-600">En Yüksek Giriş</p>
                  <p className="font-semibold text-green-600">
                    ₺{Math.max(...dailyFlows.map(d => d.inflows)).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">En Yüksek Çıkış</p>
                  <p className="font-semibold text-red-600">
                    ₺{Math.max(...dailyFlows.map(d => d.outflows)).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Ortalama Bakiye</p>
                  <p className="font-semibold text-blue-600">
                    ₺{(dailyFlows.reduce((sum, d) => sum + d.balance, 0) / dailyFlows.length).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">En Düşük Bakiye</p>
                  <p className="font-semibold text-orange-600">
                    ₺{Math.min(...dailyFlows.map(d => d.balance)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}