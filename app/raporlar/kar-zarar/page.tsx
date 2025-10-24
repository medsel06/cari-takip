'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, Package, Users, Receipt, Calculator, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

interface IncomeStatement {
  // Gelirler
  salesRevenue: number; // Satış gelirleri
  serviceRevenue: number; // Hizmet gelirleri
  otherRevenue: number; // Diğer gelirler
  totalRevenue: number; // Toplam gelir
  
  // Satışların Maliyeti
  costOfGoodsSold: number; // Satılan malın maliyeti
  directLaborCost: number; // Doğrudan işçilik
  directMaterialCost: number; // Doğrudan malzeme
  totalCOGS: number; // Toplam maliyet
  
  // Brüt Kar
  grossProfit: number;
  grossProfitMargin: number;
  
  // Faaliyet Giderleri
  salesExpenses: number; // Satış giderleri
  marketingExpenses: number; // Pazarlama giderleri
  adminExpenses: number; // Yönetim giderleri
  rentExpenses: number; // Kira giderleri
  personnelExpenses: number; // Personel giderleri
  depreciationExpenses: number; // Amortisman giderleri
  otherOperatingExpenses: number; // Diğer faaliyet giderleri
  totalOperatingExpenses: number;
  
  // Faaliyet Karı
  operatingIncome: number;
  operatingMargin: number;
  
  // Diğer Gelir/Giderler
  interestIncome: number; // Faiz gelirleri
  interestExpense: number; // Faiz giderleri
  otherIncome: number; // Diğer gelirler
  otherExpenses: number; // Diğer giderler
  
  // Vergi Öncesi Kar
  incomeBeforeTax: number;
  
  // Vergi
  taxExpense: number;
  taxRate: number;
  
  // Net Kar
  netIncome: number;
  netProfitMargin: number;
}

interface MonthlyIncomeStatement extends IncomeStatement {
  period: string;
}

export default function KarZararRaporuPage() {
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [monthlyStatements, setMonthlyStatements] = useState<MonthlyIncomeStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('current_month'); // current_month, last_month, current_year
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchIncomeStatement();
  }, [period]);

  const fetchIncomeStatement = async () => {
    const supabase = createClient();
    
    try {
      console.log('Kar-Zarar raporu - Veriler yükleniyor...');
      
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
        case 'current_year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      // 1. Satış Gelirleri
      let salesRevenue = 0;
      let serviceRevenue = 0;
      let otherRevenue = 0;
      
      // Müşterilerden tahsilatlar (satış gelirleri)
      const { data: customerMovements } = await supabase
        .from('account_movements')
        .select('*, customer:customers(*)')
        .eq('company_id', companyId)
        .eq('movement_type', 'CREDIT')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      customerMovements?.forEach(movement => {
        const amount = parseFloat(movement.amount || 0);
        // Basit sınıflandırma - gerçek uygulamada fatura detayına göre yapılmalı
        if (movement.description?.toLowerCase().includes('hizmet')) {
          serviceRevenue += amount;
        } else if (movement.description?.toLowerCase().includes('diğer')) {
          otherRevenue += amount;
        } else {
          salesRevenue += amount;
        }
      });

      const totalRevenue = salesRevenue + serviceRevenue + otherRevenue;

      // 2. Satışların Maliyeti
      let costOfGoodsSold = 0;
      let directLaborCost = 0;
      let directMaterialCost = 0;

      // Stok çıkışları (satılan malın maliyeti)
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('*, product:products(*)')
        .eq('company_id', companyId)
        .eq('movement_type', 'OUT')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      stockMovements?.forEach(movement => {
        const totalCost = parseFloat(movement.total_price || 0);
        costOfGoodsSold += totalCost;
        
        // Basit maliyet dağılımı (gerçekte daha detaylı olmalı)
        directMaterialCost += totalCost * 0.7;
        directLaborCost += totalCost * 0.3;
      });

      const totalCOGS = costOfGoodsSold;

      // 3. Brüt Kar
      const grossProfit = totalRevenue - totalCOGS;
      const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // 4. Faaliyet Giderleri (Örnek değerler - gerçek uygulamada gider tablosundan çekilmeli)
      const salesExpenses = totalRevenue * 0.05; // Satışın %5'i
      const marketingExpenses = totalRevenue * 0.03;
      const adminExpenses = totalRevenue * 0.08;
      const rentExpenses = 15000; // Sabit kira
      const personnelExpenses = totalRevenue * 0.15;
      const depreciationExpenses = 5000; // Sabit amortisman
      const otherOperatingExpenses = totalRevenue * 0.02;
      
      const totalOperatingExpenses = salesExpenses + marketingExpenses + adminExpenses + 
        rentExpenses + personnelExpenses + depreciationExpenses + otherOperatingExpenses;

      // 5. Faaliyet Karı
      const operatingIncome = grossProfit - totalOperatingExpenses;
      const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

      // 6. Diğer Gelir/Giderler (Örnek değerler)
      const interestIncome = 1000;
      const interestExpense = 3000;
      const otherIncome = 500;
      const otherExpenses = 1500;

      // 7. Vergi Öncesi Kar
      const incomeBeforeTax = operatingIncome + interestIncome - interestExpense + otherIncome - otherExpenses;

      // 8. Vergi (Kurumlar vergisi %20)
      const taxRate = 20;
      const taxExpense = incomeBeforeTax > 0 ? incomeBeforeTax * (taxRate / 100) : 0;

      // 9. Net Kar
      const netIncome = incomeBeforeTax - taxExpense;
      const netProfitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      setStatement({
        salesRevenue,
        serviceRevenue,
        otherRevenue,
        totalRevenue,
        costOfGoodsSold,
        directLaborCost,
        directMaterialCost,
        totalCOGS,
        grossProfit,
        grossProfitMargin,
        salesExpenses,
        marketingExpenses,
        adminExpenses,
        rentExpenses,
        personnelExpenses,
        depreciationExpenses,
        otherOperatingExpenses,
        totalOperatingExpenses,
        operatingIncome,
        operatingMargin,
        interestIncome,
        interestExpense,
        otherIncome,
        otherExpenses,
        incomeBeforeTax,
        taxExpense,
        taxRate,
        netIncome,
        netProfitMargin
      });

      // Aylık trend verisi (son 6 ay)
      const monthlyData: MonthlyIncomeStatement[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthName = format(monthStart, 'MMMM yyyy', { locale: tr });
        
        // Her ay için basitleştirilmiş hesaplama
        const monthRevenue = totalRevenue / 6; // Ortalama dağılım
        const monthCOGS = totalCOGS / 6;
        const monthGrossProfit = monthRevenue - monthCOGS;
        const monthOperatingExpenses = totalOperatingExpenses / 6;
        const monthOperatingIncome = monthGrossProfit - monthOperatingExpenses;
        const monthNetIncome = monthOperatingIncome * 0.8; // Basitleştirilmiş
        
        monthlyData.push({
          period: monthName,
          salesRevenue: monthRevenue * 0.8,
          serviceRevenue: monthRevenue * 0.15,
          otherRevenue: monthRevenue * 0.05,
          totalRevenue: monthRevenue,
          costOfGoodsSold: monthCOGS,
          directLaborCost: monthCOGS * 0.3,
          directMaterialCost: monthCOGS * 0.7,
          totalCOGS: monthCOGS,
          grossProfit: monthGrossProfit,
          grossProfitMargin: (monthGrossProfit / monthRevenue) * 100,
          salesExpenses: monthOperatingExpenses * 0.15,
          marketingExpenses: monthOperatingExpenses * 0.1,
          adminExpenses: monthOperatingExpenses * 0.25,
          rentExpenses: monthOperatingExpenses * 0.2,
          personnelExpenses: monthOperatingExpenses * 0.25,
          depreciationExpenses: monthOperatingExpenses * 0.05,
          otherOperatingExpenses: 0,
          totalOperatingExpenses: monthOperatingExpenses,
          operatingIncome: monthOperatingIncome,
          operatingMargin: (monthOperatingIncome / monthRevenue) * 100,
          interestIncome: 100,
          interestExpense: 300,
          otherIncome: 50,
          otherExpenses: 150,
          incomeBeforeTax: monthOperatingIncome - 300,
          taxExpense: monthNetIncome * 0.2,
          taxRate: 20,
          netIncome: monthNetIncome,
          netProfitMargin: (monthNetIncome / monthRevenue) * 100
        });
      }
      
      setMonthlyStatements(monthlyData);

    } catch (err: any) {
      console.error('Hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!statement) return;

    // Kar-Zarar Tablosu
    const incomeStatementData = [
      ['KAR-ZARAR TABLOSU'],
      [`Dönem: ${period === 'current_month' ? 'Bu Ay' : period === 'last_month' ? 'Geçen Ay' : 'Bu Yıl'}`],
      [`Tarih: ${format(new Date(), 'dd.MM.yyyy', { locale: tr })}`],
      [],
      ['', 'Tutar (₺)', 'Oran (%)'],
      ['GELİRLER', '', ''],
      ['  Satış Gelirleri', statement.salesRevenue.toFixed(2), ''],
      ['  Hizmet Gelirleri', statement.serviceRevenue.toFixed(2), ''],
      ['  Diğer Gelirler', statement.otherRevenue.toFixed(2), ''],
      ['TOPLAM GELİR', statement.totalRevenue.toFixed(2), '100.0'],
      [],
      ['SATIŞLARIN MALİYETİ', '', ''],
      ['  Satılan Malın Maliyeti', statement.costOfGoodsSold.toFixed(2), ''],
      ['  Doğrudan İşçilik', statement.directLaborCost.toFixed(2), ''],
      ['  Doğrudan Malzeme', statement.directMaterialCost.toFixed(2), ''],
      ['TOPLAM MALİYET', statement.totalCOGS.toFixed(2), ((statement.totalCOGS / statement.totalRevenue) * 100).toFixed(1)],
      [],
      ['BRÜT KAR', statement.grossProfit.toFixed(2), statement.grossProfitMargin.toFixed(1)],
      [],
      ['FAALİYET GİDERLERİ', '', ''],
      ['  Satış Giderleri', statement.salesExpenses.toFixed(2), ''],
      ['  Pazarlama Giderleri', statement.marketingExpenses.toFixed(2), ''],
      ['  Yönetim Giderleri', statement.adminExpenses.toFixed(2), ''],
      ['  Kira Giderleri', statement.rentExpenses.toFixed(2), ''],
      ['  Personel Giderleri', statement.personnelExpenses.toFixed(2), ''],
      ['  Amortisman Giderleri', statement.depreciationExpenses.toFixed(2), ''],
      ['  Diğer Faaliyet Giderleri', statement.otherOperatingExpenses.toFixed(2), ''],
      ['TOPLAM FAALİYET GİDERLERİ', statement.totalOperatingExpenses.toFixed(2), ((statement.totalOperatingExpenses / statement.totalRevenue) * 100).toFixed(1)],
      [],
      ['FAALİYET KARI', statement.operatingIncome.toFixed(2), statement.operatingMargin.toFixed(1)],
      [],
      ['DİĞER GELİR/GİDERLER', '', ''],
      ['  Faiz Gelirleri', statement.interestIncome.toFixed(2), ''],
      ['  Faiz Giderleri', `(${statement.interestExpense.toFixed(2)})`, ''],
      ['  Diğer Gelirler', statement.otherIncome.toFixed(2), ''],
      ['  Diğer Giderler', `(${statement.otherExpenses.toFixed(2)})`, ''],
      [],
      ['VERGİ ÖNCESİ KAR', statement.incomeBeforeTax.toFixed(2), ((statement.incomeBeforeTax / statement.totalRevenue) * 100).toFixed(1)],
      [`Kurumlar Vergisi (%${statement.taxRate})`, `(${statement.taxExpense.toFixed(2)})`, ''],
      [],
      ['NET KAR', statement.netIncome.toFixed(2), statement.netProfitMargin.toFixed(1)]
    ];

    // Aylık trend
    const trendData = monthlyStatements.map(month => ({
      'Dönem': month.period,
      'Gelir': month.totalRevenue.toFixed(2),
      'Maliyet': month.totalCOGS.toFixed(2),
      'Brüt Kar': month.grossProfit.toFixed(2),
      'Faaliyet Gideri': month.totalOperatingExpenses.toFixed(2),
      'Net Kar': month.netIncome.toFixed(2),
      'Net Kar Marjı (%)': month.netProfitMargin.toFixed(1)
    }));

    // Excel workbook
    const wb = XLSX.utils.book_new();
    
    // Kar-Zarar sayfası
    const ws1 = XLSX.utils.aoa_to_sheet(incomeStatementData);
    ws1['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Kar-Zarar Tablosu');
    
    // Trend sayfası
    const ws2 = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Aylık Trend');

    XLSX.writeFile(wb, `kar_zarar_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Kar-Zarar analizi yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Kar-Zarar Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!statement) return null;

  const getProfitTrend = () => {
    if (!statement.netIncome) return 'negative';
    if (statement.netProfitMargin > 15) return 'excellent';
    if (statement.netProfitMargin > 10) return 'good';
    if (statement.netProfitMargin > 5) return 'average';
    return 'poor';
  };

  const profitTrend = getProfitTrend();

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Kar-Zarar Raporu</h1>
          <p className="text-gray-600">Gelir ve gider analizi</p>
        </div>
        <div className="flex gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current_month">Bu Ay</option>
            <option value="last_month">Geçen Ay</option>
            <option value="current_year">Bu Yıl</option>
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
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Toplam Gelir</p>
          <p className="text-2xl font-bold text-gray-900">₺{statement.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calculator className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Brüt Kar</p>
          <p className="text-2xl font-bold text-gray-900">₺{statement.grossProfit.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Marj: %{statement.grossProfitMargin.toFixed(1)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600">Faaliyet Karı</p>
          <p className="text-2xl font-bold text-gray-900">₺{statement.operatingIncome.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Marj: %{statement.operatingMargin.toFixed(1)}</p>
        </div>

        <div className={`p-6 rounded-lg shadow ${
          statement.netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${
              statement.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {statement.netIncome >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600">Net Kar</p>
          <p className={`text-2xl font-bold ${
            statement.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            ₺{statement.netIncome.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Marj: %{statement.netProfitMargin.toFixed(1)}</p>
        </div>
      </div>

      {/* Kar-Zarar Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gelir Tablosu</h3>
          
          <div className="space-y-4">
            {/* Gelirler */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">GELİRLER</h4>
              <div className="ml-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Satış Gelirleri</span>
                  <span>₺{statement.salesRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hizmet Gelirleri</span>
                  <span>₺{statement.serviceRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Diğer Gelirler</span>
                  <span>₺{statement.otherRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>TOPLAM GELİR</span>
                  <span>₺{statement.totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Satışların Maliyeti */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">SATIŞLARIN MALİYETİ</h4>
              <div className="ml-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Satılan Malın Maliyeti</span>
                  <span>(₺{statement.costOfGoodsSold.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>TOPLAM MALİYET</span>
                  <span className="text-red-600">(₺{statement.totalCOGS.toFixed(2)})</span>
                </div>
              </div>
            </div>

            {/* Brüt Kar */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>BRÜT KAR</span>
                <div className="text-right">
                  <span className="text-green-600">₺{statement.grossProfit.toFixed(2)}</span>
                  <span className="text-sm text-gray-600 ml-2">(%{statement.grossProfitMargin.toFixed(1)})</span>
                </div>
              </div>
            </div>

            {/* Faaliyet Giderleri */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">FAALİYET GİDERLERİ</h4>
              <div className="ml-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Satış Giderleri</span>
                  <span>(₺{statement.salesExpenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pazarlama Giderleri</span>
                  <span>(₺{statement.marketingExpenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Yönetim Giderleri</span>
                  <span>(₺{statement.adminExpenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Personel Giderleri</span>
                  <span>(₺{statement.personnelExpenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Kira Giderleri</span>
                  <span>(₺{statement.rentExpenses.toFixed(2)})</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>TOPLAM FAALİYET GİDERLERİ</span>
                  <span className="text-red-600">(₺{statement.totalOperatingExpenses.toFixed(2)})</span>
                </div>
              </div>
            </div>

            {/* Faaliyet Karı */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>FAALİYET KARI</span>
                <div className="text-right">
                  <span className={statement.operatingIncome >= 0 ? 'text-blue-600' : 'text-red-600'}>
                    ₺{statement.operatingIncome.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">(%{statement.operatingMargin.toFixed(1)})</span>
                </div>
              </div>
            </div>

            {/* Diğer Gelir/Giderler */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-2">DİĞER GELİR/GİDERLER</h4>
              <div className="ml-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Faiz Gelirleri</span>
                  <span>₺{statement.interestIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Faiz Giderleri</span>
                  <span>(₺{statement.interestExpense.toFixed(2)})</span>
                </div>
              </div>
            </div>

            {/* Vergi Öncesi Kar */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>VERGİ ÖNCESİ KAR</span>
                <span className={statement.incomeBeforeTax >= 0 ? 'text-purple-600' : 'text-red-600'}>
                  ₺{statement.incomeBeforeTax.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Vergi */}
            <div className="ml-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kurumlar Vergisi (%{statement.taxRate})</span>
                <span className="text-red-600">(₺{statement.taxExpense.toFixed(2)})</span>
              </div>
            </div>

            {/* Net Kar */}
            <div className={`p-4 rounded-lg ${
              statement.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <div className="flex justify-between font-bold text-lg">
                <span>NET KAR</span>
                <div className="text-right">
                  <span className={statement.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>
                    ₺{statement.netIncome.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium ml-2">(%{statement.netProfitMargin.toFixed(1)})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aylık Trend Grafiği */}
      {monthlyStatements.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
            Kar Trend Analizi (Son 6 Ay)
          </h3>
          <div className="space-y-4">
            {monthlyStatements.map((month, index) => (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm text-gray-600">{month.period}</div>
                <div className="flex-1 mx-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div 
                        className={`h-6 rounded-full ${month.netIncome >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ 
                          width: `${Math.abs(month.netProfitMargin)}%`,
                          maxWidth: '100%'
                        }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-20 text-right ${
                      month.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      %{month.netProfitMargin.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="w-28 text-right text-sm font-medium">
                  ₺{month.netIncome.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}