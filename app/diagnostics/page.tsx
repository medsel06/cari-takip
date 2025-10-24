'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Database,
  Key,
  Users,
  Package,
  FileText,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Download
} from 'lucide-react';

interface TestResult {
  category: string;
  test: string;
  status: 'success' | 'error' | 'warning' | 'running';
  message: string;
  details?: any;
  solution?: string;
}

export default function DiagnosticsPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const supabase = createClientComponentClient();

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setTestResults([]);
    setIsRunning(true);

    try {
      // 1. AUTH TESTLERİ
      await testAuth();
      
      // 2. DATABASE BAĞLANTI TESTLERİ
      await testDatabaseConnection();
      
      // 3. RLS POLICY TESTLERİ
      await testRLSPolicies();
      
      // 4. TABLO İZİN TESTLERİ
      await testTablePermissions();
      
      // 5. VERİ TESTLERİ
      await testDataAccess();
      
      // 6. COMPANY ID TESTLERİ
      await testCompanyConfiguration();
      
      // 7. PERFORMANS TESTLERİ
      await testPerformance();
      
    } catch (error) {
      console.error('Diagnostik hatası:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // TEST FONKSİYONLARI
  const testAuth = async () => {
    addResult({
      category: 'Authentication',
      test: 'Kullanıcı Oturumu',
      status: 'running',
      message: 'Kontrol ediliyor...'
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      addResult({
        category: 'Authentication',
        test: 'Kullanıcı Oturumu',
        status: 'error',
        message: 'Kullanıcı girişi yapılmamış',
        details: error,
        solution: 'Lütfen çıkış yapıp tekrar giriş yapın'
      });
      throw new Error('Auth failed');
    }

    addResult({
      category: 'Authentication',
      test: 'Kullanıcı Oturumu',
      status: 'success',
      message: `Giriş yapıldı: ${user.email}`,
      details: { userId: user.id, email: user.email }
    });

    // Session kontrolü
    const { data: { session } } = await supabase.auth.getSession();
    
    addResult({
      category: 'Authentication',
      test: 'Session Durumu',
      status: session ? 'success' : 'error',
      message: session ? 'Session aktif' : 'Session bulunamadı',
      details: session ? { expiresAt: new Date(session.expires_at! * 1000).toLocaleString() } : null
    });
  };

  const testDatabaseConnection = async () => {
    addResult({
      category: 'Database',
      test: 'Veritabanı Bağlantısı',
      status: 'running',
      message: 'Test ediliyor...'
    });

    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      addResult({
        category: 'Database',
        test: 'Veritabanı Bağlantısı',
        status: error ? 'error' : 'success',
        message: error ? 'Veritabanı bağlantısı başarısız' : 'Veritabanı bağlantısı başarılı',
        details: error || data
      });
    } catch (err) {
      addResult({
        category: 'Database',
        test: 'Veritabanı Bağlantısı',
        status: 'error',
        message: 'Veritabanına erişilemedi',
        details: err
      });
    }
  };

  const testRLSPolicies = async () => {
    const tables = ['products', 'customers', 'stock_movements', 'account_movements', 'checks'];
    
    for (const table of tables) {
      addResult({
        category: 'RLS Policies',
        test: `${table} tablosu RLS`,
        status: 'running',
        message: 'Kontrol ediliyor...'
      });

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        addResult({
          category: 'RLS Policies',
          test: `${table} tablosu RLS`,
          status: 'error',
          message: 'RLS policy hatası - Veri erişimi engellenmiş',
          details: error,
          solution: 'RLS policy\'lerini kontrol edin. auth.company_id() fonksiyonu düzgün çalışıyor mu?'
        });
      } else {
        addResult({
          category: 'RLS Policies',
          test: `${table} tablosu RLS`,
          status: 'success',
          message: `RLS aktif ve çalışıyor (${data?.length || 0} kayıt)`,
          details: { recordCount: data?.length || 0 }
        });
      }
    }
  };

  const testTablePermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Users tablosunda company_id kontrolü
    addResult({
      category: 'Permissions',
      test: 'Company ID Kontrolü',
      status: 'running',
      message: 'Kontrol ediliyor...'
    });

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      addResult({
        category: 'Permissions',
        test: 'Company ID Kontrolü',
        status: 'error',
        message: 'Kullanıcının company_id\'si bulunamadı',
        details: { userData, userError },
        solution: 'Users tablosunda company_id alanını kontrol edin'
      });
    } else {
      addResult({
        category: 'Permissions',
        test: 'Company ID Kontrolü',
        status: 'success',
        message: 'Company ID mevcut',
        details: { companyId: userData.company_id }
      });

      // Company function kontrolü
      try {
        const { data: funcTest, error: funcError } = await supabase.rpc('get_auth_company_id');
        
        addResult({
          category: 'Permissions',
          test: 'auth.company_id() Fonksiyonu',
          status: funcError ? 'error' : 'success',
          message: funcError ? 'Fonksiyon çalışmıyor' : 'Fonksiyon çalışıyor',
          details: { result: funcTest, error: funcError },
          solution: funcError ? 'public.get_auth_company_id() fonksiyonunu kontrol edin' : undefined
        });
      } catch (err) {
        addResult({
          category: 'Permissions',
          test: 'auth.company_id() Fonksiyonu',
          status: 'warning',
          message: 'Fonksiyon bulunamadı',
          details: err,
          solution: 'public.get_auth_company_id() fonksiyonunun oluşturulması gerekiyor'
        });
      }
    }
  };

  const testDataAccess = async () => {
    const tests = [
      { table: 'products', name: 'Ürünler' },
      { table: 'customers', name: 'Müşteriler' },
      { table: 'stock_movements', name: 'Stok Hareketleri' },
      { table: 'account_movements', name: 'Cari Hareketler' },
      { table: 'checks', name: 'Çekler' }
    ];

    for (const { table, name } of tests) {
      addResult({
        category: 'Data Access',
        test: `${name} Verisi`,
        status: 'running',
        message: 'Sorgulanıyor...'
      });

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);

      if (error) {
        addResult({
          category: 'Data Access',
          test: `${name} Verisi`,
          status: 'error',
          message: `Veri erişim hatası: ${error.message}`,
          details: error,
          solution: 'RLS policy ve tablo izinlerini kontrol edin'
        });
      } else {
        addResult({
          category: 'Data Access',
          test: `${name} Verisi`,
          status: data && data.length > 0 ? 'success' : 'warning',
          message: data && data.length > 0 
            ? `${data.length} kayıt bulundu` 
            : 'Kayıt bulunamadı',
          details: { 
            count: data?.length || 0, 
            sample: data?.[0] 
          }
        });
      }
    }
  };

  const testCompanyConfiguration = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    addResult({
      category: 'Configuration',
      test: 'Multi-tenant Yapılandırma',
      status: 'running',
      message: 'Kontrol ediliyor...'
    });

    // Farklı company_id'lere sahip kayıt var mı kontrol et
    const { data: products } = await supabase
      .from('products')
      .select('company_id')
      .limit(10);

    const uniqueCompanyIds = new Set(products?.map(p => p.company_id) || []);
    
    if (uniqueCompanyIds.size > 1) {
      addResult({
        category: 'Configuration',
        test: 'Multi-tenant Yapılandırma',
        status: 'error',
        message: 'Birden fazla company_id tespit edildi!',
        details: { companyIds: Array.from(uniqueCompanyIds) },
        solution: 'RLS policy\'leri düzgün çalışmıyor olabilir'
      });
    } else {
      addResult({
        category: 'Configuration',
        test: 'Multi-tenant Yapılandırma',
        status: 'success',
        message: 'Sadece tek company verisi görünüyor',
        details: { companyId: Array.from(uniqueCompanyIds)[0] }
      });
    }
  };

  const testPerformance = async () => {
    addResult({
      category: 'Performance',
      test: 'Sorgu Performansı',
      status: 'running',
      message: 'Test ediliyor...'
    });

    const startTime = Date.now();
    
    await supabase
      .from('products')
      .select('*')
      .limit(100);

    const endTime = Date.now();
    const duration = endTime - startTime;

    addResult({
      category: 'Performance',
      test: 'Sorgu Performansı',
      status: duration < 500 ? 'success' : duration < 1000 ? 'warning' : 'error',
      message: `Sorgu süresi: ${duration}ms`,
      details: { duration },
      solution: duration > 1000 ? 'RLS policy\'leri optimize edilmeli veya index eklenmeli' : undefined
    });
  };

  // YARDIMCI FONKSİYONLAR
  const toggleExpanded = (testKey: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testKey)) {
        newSet.delete(testKey);
      } else {
        newSet.add(testKey);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Authentication':
        return <Key className="h-5 w-5" />;
      case 'Database':
        return <Database className="h-5 w-5" />;
      case 'RLS Policies':
        return <Shield className="h-5 w-5" />;
      case 'Permissions':
        return <Users className="h-5 w-5" />;
      case 'Data Access':
        return <Package className="h-5 w-5" />;
      case 'Configuration':
        return <FileText className="h-5 w-5" />;
      case 'Performance':
        return <Zap className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const copyResults = () => {
    const text = testResults.map(r => 
      `${r.category} - ${r.test}: ${r.status.toUpperCase()}\n${r.message}\n${r.solution || ''}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    alert('Sonuçlar kopyalandı!');
  };

  const downloadResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      results: testResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
  };

  // GRUPLANDIRMA
  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const getSummary = () => {
    const total = testResults.length;
    const success = testResults.filter(r => r.status === 'success').length;
    const errors = testResults.filter(r => r.status === 'error').length;
    const warnings = testResults.filter(r => r.status === 'warning').length;
    
    return { total, success, errors, warnings };
  };

  const summary = getSummary();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistem Tanılama Aracı</h1>
        <p className="text-gray-600">
          RLS, veritabanı bağlantısı ve yetkilendirme sorunlarını tespit eder
        </p>
      </div>

      {/* Kontrol Paneli */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test Ediliyor...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tanılamayı Başlat
                </>
              )}
            </button>
            
            {testResults.length > 0 && (
              <>
                <button
                  onClick={copyResults}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Kopyala
                </button>
                <button
                  onClick={downloadResults}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  İndir
                </button>
              </>
            )}
          </div>
          
          {testResults.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {summary.success} Başarılı
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                {summary.warnings} Uyarı
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                {summary.errors} Hata
              </span>
            </div>
          )}
        </div>

        {/* Progress */}
        {testResults.length > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(summary.success / summary.total) * 100}%`,
                background: summary.errors > 0 ? '#ef4444' : summary.warnings > 0 ? '#eab308' : '#10b981'
              }}
            />
          </div>
        )}
      </div>

      {/* Sonuçlar */}
      {Object.entries(groupedResults).map(([category, results]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            {getCategoryIcon(category)}
            {category}
          </h2>
          
          <div className="space-y-2">
            {results.map((result, idx) => {
              const key = `${category}-${idx}`;
              const isExpanded = expandedTests.has(key);
              
              return (
                <div
                  key={key}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div
                    className="p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpanded(key)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{result.test}</div>
                        <div className="text-sm text-gray-600 mt-1">{result.message}</div>
                        {result.solution && (
                          <div className="text-sm text-blue-600 mt-2">
                            💡 Çözüm: {result.solution}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {result.details && (
                      <button className="p-1">
                        {isExpanded ? 
                          <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                    )}
                  </div>
                  
                  {isExpanded && result.details && (
                    <div className="px-4 pb-4 pt-0">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Boş durum */}
      {testResults.length === 0 && !isRunning && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Database className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">
            Tanılamayı başlatmak için yukarıdaki butona tıklayın
          </p>
        </div>
      )}
    </div>
  );
}
