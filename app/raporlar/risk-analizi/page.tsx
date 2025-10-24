'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileSpreadsheet, AlertTriangle, Shield, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface RiskAnalysis {
  id: string;
  code: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  total_debt: number;
  total_credit: number;
  balance: number;
  credit_limit: number;
  overdue_amount: number;
  overdue_days: number;
  returned_check_count: number;
  returned_check_amount: number;
  average_payment_delay: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export default function RiskAnaliziRaporuPage() {
  const [customers, setCustomers] = useState<RiskAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    fetchRiskAnalysis();
  }, []);

  const fetchRiskAnalysis = async () => {
    const supabase = createClient();
    
    try {
      console.log('Risk analizi - Kullanıcı bilgileri alınıyor...');
      
      // Session kontrolü
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Oturum süresi dolmuş olabilir. Lütfen sayfayı yenileyin veya tekrar giriş yapın.');
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

      // Müşterileri getir
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userProfile.company_id);

      if (customersError) {
        setError(`Müşteriler yüklenemedi: ${customersError.message}`);
        setLoading(false);
        return;
      }

      // Risk analizi yap
      const today = new Date();
      const riskAnalysisData: RiskAnalysis[] = [];

      for (const customer of customersData || []) {
        // Hareket istatistikleri
        const { data: movements } = await supabase
          .from('account_movements')
          .select('*')
          .eq('customer_id', customer.id);

        let totalDebt = 0;
        let totalCredit = 0;
        let overdueAmount = 0;
        let maxOverdueDays = 0;
        let totalPaymentDelay = 0;
        let paymentCount = 0;

        movements?.forEach(movement => {
          if (movement.movement_type === 'DEBT') {
            totalDebt += movement.amount;
            
            // Vadesi geçmiş kontrol
            if (movement.due_date) {
              const dueDate = new Date(movement.due_date);
              const daysPastDue = differenceInDays(today, dueDate);
              if (daysPastDue > 0) {
                overdueAmount += movement.amount;
                maxOverdueDays = Math.max(maxOverdueDays, daysPastDue);
              }
            }
          } else {
            totalCredit += movement.amount;
            
            // Ödeme gecikmesi hesapla
            if (movement.due_date && movement.created_at) {
              const dueDate = new Date(movement.due_date);
              const paymentDate = new Date(movement.created_at);
              const delay = differenceInDays(paymentDate, dueDate);
              if (delay > 0) {
                totalPaymentDelay += delay;
                paymentCount++;
              }
            }
          }
        });

        // Karşılıksız çek kontrolü
        const { data: returnedChecks } = await supabase
          .from('checks')
          .select('*')
          .eq('customer_id', customer.id)
          .in('status', ['returned', 'protested']);

        const returnedCheckCount = returnedChecks?.length || 0;
        const returnedCheckAmount = returnedChecks?.reduce((sum, check) => sum + check.amount, 0) || 0;

        // Risk puanı hesaplama
        let riskScore = 0;
        const recommendations: string[] = [];

        // Bakiye durumu (20 puan)
        const balance = totalDebt - totalCredit;
        if (balance > 0) {
          const balanceRatio = customer.credit_limit > 0 ? balance / customer.credit_limit : 1;
          riskScore += Math.min(20, balanceRatio * 20);
          
          if (balanceRatio > 1) {
            recommendations.push('Kredi limitini aşmış durumda. Acil tahsilat yapılmalı.');
          } else if (balanceRatio > 0.8) {
            recommendations.push('Kredi limitine yaklaşıyor. Tahsilat takibi artırılmalı.');
          }
        }

        // Vadesi geçmiş tutar (30 puan)
        if (overdueAmount > 0) {
          const overdueRatio = balance > 0 ? overdueAmount / balance : 1;
          riskScore += Math.min(30, overdueRatio * 30);
          recommendations.push(`₺${overdueAmount.toFixed(2)} vadesi geçmiş borç var.`);
        }

        // Vade aşım süresi (20 puan)
        if (maxOverdueDays > 0) {
          if (maxOverdueDays > 120) {
            riskScore += 20;
            recommendations.push('120 günden fazla vadesi geçmiş borç var!');
          } else if (maxOverdueDays > 90) {
            riskScore += 15;
            recommendations.push('90 günden fazla vadesi geçmiş borç var.');
          } else if (maxOverdueDays > 60) {
            riskScore += 10;
          } else if (maxOverdueDays > 30) {
            riskScore += 5;
          }
        }

        // Karşılıksız çek (20 puan)
        if (returnedCheckCount > 0) {
          riskScore += Math.min(20, returnedCheckCount * 10);
          recommendations.push(`${returnedCheckCount} adet karşılıksız çek (₺${returnedCheckAmount.toFixed(2)})`);
        }

        // Ortalama ödeme gecikmesi (10 puan)
        const avgPaymentDelay = paymentCount > 0 ? totalPaymentDelay / paymentCount : 0;
        if (avgPaymentDelay > 30) {
          riskScore += 10;
          recommendations.push(`Ortalama ${avgPaymentDelay.toFixed(0)} gün gecikmeli ödeme yapıyor.`);
        } else if (avgPaymentDelay > 15) {
          riskScore += 5;
        }

        // Risk seviyesi belirleme
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (riskScore >= 70) {
          riskLevel = 'critical';
        } else if (riskScore >= 50) {
          riskLevel = 'high';
        } else if (riskScore >= 30) {
          riskLevel = 'medium';
        }

        // Öneriler
        if (riskLevel === 'critical') {
          recommendations.unshift('KRİTİK RİSK! Yeni işlem yapılmamalı, acil tahsilat gerekli.');
        } else if (riskLevel === 'high') {
          recommendations.unshift('Yüksek risk. Nakit satış veya teminat alınmalı.');
        } else if (riskLevel === 'medium') {
          recommendations.unshift('Orta risk. Yakın takip edilmeli.');
        } else {
          recommendations.unshift('Düşük risk. Normal işlem yapılabilir.');
        }

        riskAnalysisData.push({
          ...customer,
          total_debt: totalDebt,
          total_credit: totalCredit,
          balance,
          overdue_amount: overdueAmount,
          overdue_days: maxOverdueDays,
          returned_check_count: returnedCheckCount,
          returned_check_amount: returnedCheckAmount,
          average_payment_delay: avgPaymentDelay,
          risk_score: riskScore,
          risk_level: riskLevel,
          recommendations
        });
      }

      // Risk puanına göre sırala (yüksek risk önce)
      riskAnalysisData.sort((a, b) => b.risk_score - a.risk_score);
      setCustomers(riskAnalysisData);
    } catch (err: any) {
      console.error('Hata:', err);
      setError(`Beklenmeyen hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCustomers = () => {
    let filtered = [...customers];

    // Risk seviyesi filtresi
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(c => c.risk_level === filterRiskLevel);
    }

    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType || c.type === 'both');
    }

    return filtered;
  };

  const filteredCustomers = getFilteredCustomers();

  const exportToExcel = () => {
    const data = filteredCustomers.map(customer => ({
      'Cari Kodu': customer.code,
      'Cari Adı': customer.name,
      'Tip': customer.type === 'customer' ? 'Müşteri' : customer.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi',
      'Bakiye': customer.balance.toFixed(2),
      'Kredi Limiti': customer.credit_limit.toFixed(2),
      'Vadesi Geçmiş': customer.overdue_amount.toFixed(2),
      'Max Gecikme (Gün)': customer.overdue_days,
      'Karşılıksız Çek': customer.returned_check_count,
      'Karşılıksız Tutar': customer.returned_check_amount.toFixed(2),
      'Ort. Ödeme Gecikmesi': customer.average_payment_delay.toFixed(0),
      'Risk Puanı': customer.risk_score,
      'Risk Seviyesi': customer.risk_level === 'critical' ? 'Kritik' : customer.risk_level === 'high' ? 'Yüksek' : customer.risk_level === 'medium' ? 'Orta' : 'Düşük',
      'Öneriler': customer.recommendations.join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risk Analizi');

    // Sütun genişlikleri
    const colWidths = [
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 50 }
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `risk_analizi_${format(new Date(), 'dd-MM-yyyy', { locale: tr })}.xlsx`);
  };

  const getRiskStats = () => {
    const stats = {
      critical: filteredCustomers.filter(c => c.risk_level === 'critical').length,
      high: filteredCustomers.filter(c => c.risk_level === 'high').length,
      medium: filteredCustomers.filter(c => c.risk_level === 'medium').length,
      low: filteredCustomers.filter(c => c.risk_level === 'low').length,
      totalRisk: filteredCustomers.filter(c => c.risk_level !== 'low').reduce((sum, c) => sum + c.balance, 0)
    };
    return stats;
  };

  const stats = getRiskStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Risk analizi yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Risk Analizi Raporu</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">{error}</p>
          <div className="mt-3">
            <button 
              onClick={fetchRiskAnalysis}
              className="text-sm text-red-600 underline hover:text-red-800"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Risk Analizi Raporu</h1>
        <p className="text-gray-600">Müşteri risk değerlendirmesi ve öneriler</p>
      </div>

      {/* Risk Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-700 font-medium">Kritik Risk</div>
              <div className="text-2xl font-bold text-red-800">{stats.critical}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-orange-700 font-medium">Yüksek Risk</div>
              <div className="text-2xl font-bold text-orange-800">{stats.high}</div>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-yellow-700 font-medium">Orta Risk</div>
              <div className="text-2xl font-bold text-yellow-800">{stats.medium}</div>
            </div>
            <Shield className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-700 font-medium">Düşük Risk</div>
              <div className="text-2xl font-bold text-green-800">{stats.low}</div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-700 font-medium">Risk Altındaki Tutar</div>
              <div className="text-xl font-bold text-gray-800">₺{stats.totalRisk.toFixed(2)}</div>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4 mb-4">
        <select
          value={filterRiskLevel}
          onChange={(e) => setFilterRiskLevel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Risk Seviyeleri</option>
          <option value="critical">Kritik Risk</option>
          <option value="high">Yüksek Risk</option>
          <option value="medium">Orta Risk</option>
          <option value="low">Düşük Risk</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tümü</option>
          <option value="customer">Müşteriler</option>
          <option value="supplier">Tedarikçiler</option>
        </select>

        {filteredCustomers.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel'e Aktar
          </button>
        )}
      </div>

      {/* Risk Detay Kartları */}
      <div className="space-y-4">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className={`bg-white rounded-lg shadow border-l-4 ${
              customer.risk_level === 'critical' ? 'border-red-500' :
              customer.risk_level === 'high' ? 'border-orange-500' :
              customer.risk_level === 'medium' ? 'border-yellow-500' :
              'border-green-500'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.name} ({customer.code})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {customer.type === 'customer' ? 'Müşteri' : 
                     customer.type === 'supplier' ? 'Tedarikçi' : 'Her İkisi'}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                    customer.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                    customer.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                    customer.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {customer.risk_level === 'critical' ? <AlertTriangle className="h-4 w-4" /> :
                     customer.risk_level === 'high' ? <AlertCircle className="h-4 w-4" /> :
                     customer.risk_level === 'medium' ? <Shield className="h-4 w-4" /> :
                     <CheckCircle className="h-4 w-4" />}
                    <span className="font-semibold">Risk Puanı: {customer.risk_score}/100</span>
                  </div>
                </div>
              </div>

              {/* Risk Detayları */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Bakiye</p>
                  <p className="font-semibold">₺{customer.balance.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Kredi Limiti</p>
                  <p className="font-semibold">₺{customer.credit_limit.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Vadesi Geçmiş</p>
                  <p className="font-semibold text-red-600">₺{customer.overdue_amount.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Max Gecikme</p>
                  <p className="font-semibold">{customer.overdue_days} gün</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-600">Karşılıksız Çek</p>
                  <p className="font-semibold">{customer.returned_check_count} adet</p>
                </div>
              </div>

              {/* Öneriler */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Öneriler:</h4>
                <ul className="space-y-1">
                  {customer.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Seçilen kriterlere uygun müşteri bulunmuyor.</p>
        </div>
      )}
    </div>
  );
}