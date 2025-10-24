'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Database, Table, Key, Link, Info, AlertCircle, ChevronDown, ChevronRight,
  Search, Download, RefreshCw, Package, Users, FileText, DollarSign, 
  Wallet, CreditCard, Hash, Layers, GitBranch, Shield, Terminal,
  HardDrive, Eye, Code, Zap, Lock, ShoppingCart, Building2
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Foreign key ilişkileri (sizin verdiğiniz listeden)
const FOREIGN_KEYS = {
  users: [{ column: 'company_id', references: 'companies', refColumn: 'id' }],
  products: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  stock_movements: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'product_id', references: 'products', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' },
    { column: 'customer_id', references: 'customers', refColumn: 'id' },
    { column: 'invoice_id', references: 'invoices', refColumn: 'id' }
  ],
  customers: [
    { column: 'company_id', references: 'companies', refColumn: 'id' }
  ],
  account_movements: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'customer_id', references: 'customers', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  checks: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'customer_id', references: 'customers', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  cash_accounts: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  cash_movements: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'account_id', references: 'cash_accounts', refColumn: 'id' },
    { column: 'customer_id', references: 'customers', refColumn: 'id' },
    { column: 'target_account_id', references: 'cash_accounts', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  expense_categories: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'parent_id', references: 'expense_categories', refColumn: 'id' }
  ],
  expense_invoices: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'category_id', references: 'expense_categories', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  invoices: [
    { column: 'company_id', references: 'companies', refColumn: 'id' },
    { column: 'customer_id', references: 'customers', refColumn: 'id' },
    { column: 'created_by', references: 'users', refColumn: 'id' }
  ],
  invoice_items: [
    { column: 'invoice_id', references: 'invoices', refColumn: 'id' },
    { column: 'product_id', references: 'products', refColumn: 'id' }
  ],
  user_permissions: [
    { column: 'user_id', references: 'users', refColumn: 'id' }
  ],
  company_settings: [
    { column: 'company_id', references: 'companies', refColumn: 'id' }
  ]
};

// Tablo bilgileri
const TABLE_INFO = {
  companies: { icon: Building2, color: 'blue', description: 'Firma bilgileri - Çoklu firma desteği' },
  users: { icon: Users, color: 'green', description: 'Kullanıcı tanımları ve yetkileri' },
  products: { icon: Package, color: 'orange', description: 'Ürün/Stok kartları' },
  customers: { icon: Users, color: 'purple', description: 'Müşteri ve tedarikçi kartları' },
  stock_movements: { icon: Package, color: 'teal', description: 'Stok hareketleri' },
  account_movements: { icon: DollarSign, color: 'indigo', description: 'Cari hesap hareketleri' },
  checks: { icon: FileText, color: 'red', description: 'Çek takip sistemi' },
  invoices: { icon: FileText, color: 'cyan', description: 'Faturalar' },
  invoice_items: { icon: ShoppingCart, color: 'pink', description: 'Fatura kalemleri' },
  cash_accounts: { icon: Wallet, color: 'yellow', description: 'Kasa/Banka hesapları' },
  cash_movements: { icon: CreditCard, color: 'lime', description: 'Nakit hareketleri' },
  expense_categories: { icon: Layers, color: 'amber', description: 'Gider kategorileri' },
  expense_invoices: { icon: FileText, color: 'rose', description: 'Gider faturaları' },
  user_permissions: { icon: Lock, color: 'slate', description: 'Kullanıcı yetkileri' },
  company_settings: { icon: Shield, color: 'emerald', description: 'Firma ayarları' }
};

interface TableDetail {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  sampleData: any[];
  foreignKeys: ForeignKey[];
  referencedBy: ReferencedBy[];
  indexes?: any[];
  constraints?: any[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  isPrimary?: boolean;
  isForeign?: boolean;
  isUnique?: boolean;
}

interface ForeignKey {
  column: string;
  references: string;
  refColumn: string;
}

interface ReferencedBy {
  table: string;
  column: string;
}

export default function DetailedDatasetPage() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<Record<string, TableDetail>>({});
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTables: 0,
    totalColumns: 0,
    totalRows: 0,
    totalRelations: 0
  });

  // Tablo bilgilerini çek
  const fetchTableDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tableDetails: Record<string, TableDetail> = {};
      let totalColumns = 0;
      let totalRows = 0;
      let totalRelations = 0;

      for (const tableName of Object.keys(TABLE_INFO)) {
        try {
          // Satır sayısını al
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          // Örnek veriyi al - İlişkili verileri de çek
          let query = supabase.from(tableName).select('*');
          
          // Foreign key'lere göre ilişkili verileri ekle
          const fks = FOREIGN_KEYS[tableName as keyof typeof FOREIGN_KEYS] || [];
          if (fks.length > 0) {
            const relations = fks.map(fk => {
              if (fk.references === 'companies') return 'company:companies(name)';
              if (fk.references === 'users') return 'user:users(full_name, email)';
              if (fk.references === 'products') return 'product:products(name, code)';
              if (fk.references === 'customers') return 'customer:customers(name, code)';
              if (fk.references === 'invoices') return 'invoice:invoices(invoice_no)';
              if (fk.references === 'cash_accounts') return 'account:cash_accounts(account_name)';
              if (fk.references === 'expense_categories') return 'category:expense_categories(category_name)';
              return null;
            }).filter(Boolean);
            
            if (relations.length > 0) {
              const selectStr = `*, ${relations.join(', ')}`;
              query = supabase.from(tableName).select(selectStr);
            }
          }
          
          const { data: sampleData } = await query.limit(5);

          // Kolon bilgilerini çıkar
          const columns: ColumnInfo[] = [];
          if (sampleData && sampleData.length > 0) {
            const firstRow = sampleData[0];
            for (const [key, value] of Object.entries(firstRow)) {
              // İlişkili nesneleri atla
              if (typeof value !== 'object' || value === null) {
                columns.push({
                  name: key,
                  type: getColumnType(value),
                  nullable: true,
                  isPrimary: key === 'id',
                  isForeign: key.endsWith('_id') && key !== 'id',
                  default: null
                });
              }
            }
          }

          // Foreign key'leri al
          const foreignKeys = FOREIGN_KEYS[tableName as keyof typeof FOREIGN_KEYS] || [];
          
          // Bu tabloya referans verenleri bul
          const referencedBy: ReferencedBy[] = [];
          Object.entries(FOREIGN_KEYS).forEach(([refTable, fks]) => {
            fks.forEach(fk => {
              if (fk.references === tableName) {
                referencedBy.push({ table: refTable, column: fk.column });
              }
            });
          });

          tableDetails[tableName] = {
            name: tableName,
            columns,
            rowCount: count || 0,
            sampleData: sampleData || [],
            foreignKeys,
            referencedBy
          };

          totalColumns += columns.length;
          totalRows += count || 0;
          totalRelations += foreignKeys.length + referencedBy.length;

        } catch (err) {
          console.error(`Error fetching ${tableName}:`, err);
          tableDetails[tableName] = {
            name: tableName,
            columns: [],
            rowCount: 0,
            sampleData: [],
            foreignKeys: FOREIGN_KEYS[tableName as keyof typeof FOREIGN_KEYS] || [],
            referencedBy: []
          };
        }
      }

      setTables(tableDetails);
      setStats({
        totalTables: Object.keys(tableDetails).length,
        totalColumns,
        totalRows,
        totalRelations
      });

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kolon tipi tahmini
  const getColumnType = (value: any): string => {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'timestamp';
      if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return 'uuid';
      return 'text';
    }
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'jsonb';
    return typeof value;
  };

  useEffect(() => {
    fetchTableDetails();
  }, []);

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const setTableTab = (tableName: string, tab: string) => {
    setActiveTab(prev => ({ ...prev, [tableName]: tab }));
  };

  // Export fonksiyonları
  const exportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      stats,
      tables,
      foreignKeys: FOREIGN_KEYS
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alse-database-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSQL = () => {
    let sql = `-- ALSE Database Schema Export\n-- Date: ${new Date().toISOString()}\n\n`;
    
    Object.entries(tables).forEach(([tableName, table]) => {
      sql += `-- Table: ${tableName}\n`;
      sql += `-- ${TABLE_INFO[tableName as keyof typeof TABLE_INFO]?.description}\n`;
      sql += `CREATE TABLE ${tableName} (\n`;
      
      table.columns.forEach((col, idx) => {
        sql += `  ${col.name} ${col.type}`;
        if (col.isPrimary) sql += ' PRIMARY KEY';
        if (!col.nullable) sql += ' NOT NULL';
        if (idx < table.columns.length - 1) sql += ',';
        sql += '\n';
      });
      
      sql += ');\n\n';
      
      // Foreign keys
      table.foreignKeys.forEach(fk => {
        sql += `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${fk.column}\n`;
        sql += `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}(${fk.refColumn});\n`;
      });
      
      sql += '\n';
    });
    
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alse-schema-${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTables = Object.entries(tables).filter(([name]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Değer formatlama
  const formatValue = (value: any): string => {
    if (value === null) return 'NULL';
    if (value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };

 // PART 2 STARTS HERE
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-3">
            <Database className="h-10 w-10 text-blue-600" />
            ALSE Veritabanı Detaylı Analiz
          </h1>
          <p className="text-lg text-gray-600">
            Tüm tablolar, kolonlar, ilişkiler ve veriler
          </p>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Table className="h-8 w-8 text-blue-600" />
              <span className="text-sm text-gray-500">Tablolar</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalTables}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Layers className="h-8 w-8 text-green-600" />
              <span className="text-sm text-gray-500">Kolonlar</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalColumns}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Hash className="h-8 w-8 text-purple-600" />
              <span className="text-sm text-gray-500">Toplam Kayıt</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalRows.toLocaleString('tr-TR')}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Link className="h-8 w-8 text-orange-600" />
              <span className="text-sm text-gray-500">İlişkiler</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalRelations}</p>
          </div>
        </div>

        {/* Kontrol Paneli */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tablo ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={fetchTableDetails}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
              
              <button
                onClick={exportSQL}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Code className="h-4 w-4" />
                SQL
              </button>
            </div>
          </div>
        </div>

        {/* Hata */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <AlertCircle className="inline h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-lg text-gray-600">Veritabanı analiz ediliyor...</p>
          </div>
        ) : (
          /* Tablo Listesi */
          <div className="space-y-6">
            {filteredTables.map(([tableName, table]) => {
              const info = TABLE_INFO[tableName as keyof typeof TABLE_INFO];
              const Icon = info?.icon || Table;
              
              return (
                <div key={tableName} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  {/* Tablo Başlığı */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => toggleTable(tableName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="p-2 hover:bg-gray-200 rounded-lg">
                          {expandedTables.has(tableName) ? (
                            <ChevronDown className="h-6 w-6" />
                          ) : (
                            <ChevronRight className="h-6 w-6" />
                          )}
                        </button>
                        
                        <Icon className={`h-6 w-6 text-${info?.color}-600`} />
                        
                        <div>
                          <h3 className="text-xl font-bold">{tableName}</h3>
                          <p className="text-sm text-gray-600">{info?.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>{table.columns.length} kolon</span>
                        <span>{table.rowCount.toLocaleString('tr-TR')} kayıt</span>
                        <span>{table.foreignKeys.length} FK</span>
                        <span>{table.referencedBy.length} referans</span>
                      </div>
                    </div>
                  </div>

                  {/* Genişletilmiş İçerik */}
                  {expandedTables.has(tableName) && (
                    <div className="border-t">
                      {/* Tab Menü */}
                      <div className="flex border-b">
                        {['Kolonlar', 'İlişkiler', 'Veriler', 'SQL'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setTableTab(tableName, tab)}
                            className={`px-6 py-3 font-medium ${
                              (activeTab[tableName] || 'Kolonlar') === tab
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Tab İçeriği */}
                      <div className="p-6">
                        {/* Kolonlar */}
                        {(activeTab[tableName] || 'Kolonlar') === 'Kolonlar' && (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-3 px-4">Kolon</th>
                                  <th className="text-left py-3 px-4">Tip</th>
                                  <th className="text-left py-3 px-4">Null?</th>
                                  <th className="text-left py-3 px-4">Özellikler</th>
                                </tr>
                              </thead>
                              <tbody>
                                {table.columns.map((col) => (
                                  <tr key={col.name} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4 font-mono text-sm">
                                      <div className="flex items-center gap-2">
                                        {col.isPrimary && <Key className="h-4 w-4 text-purple-500" />}
                                        {col.isForeign && <Link className="h-4 w-4 text-blue-500" />}
                                        {col.name}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">{col.type}</td>
                                    <td className="py-3 px-4">
                                      <span className={`px-2 py-1 text-xs rounded ${
                                        col.nullable 
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {col.nullable ? 'YES' : 'NO'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex gap-1">
                                        {col.isPrimary && (
                                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">PK</span>
                                        )}
                                        {col.isForeign && (
                                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">FK</span>
                                        )}
                                        {col.isUnique && !col.isPrimary && (
                                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">UQ</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* İlişkiler */}
                        {activeTab[tableName] === 'İlişkiler' && (
                          <div className="space-y-6">
                            {/* Foreign Keys */}
                            {table.foreignKeys.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <Link className="h-5 w-5 text-blue-500" />
                                  Foreign Keys ({table.foreignKeys.length})
                                </h4>
                                <div className="space-y-2">
                                  {table.foreignKeys.map((fk, idx) => (
                                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                                      <span className="font-mono text-sm">
                                        {tableName}.{fk.column} → {fk.references}.{fk.refColumn}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Referenced By */}
                            {table.referencedBy.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <GitBranch className="h-5 w-5 text-green-500" />
                                  Bu Tabloya Referans Verenler ({table.referencedBy.length})
                                </h4>
                                <div className="space-y-2">
                                  {table.referencedBy.map((ref, idx) => (
                                    <div key={idx} className="p-3 bg-green-50 rounded-lg">
                                      <span className="font-mono text-sm">
                                        {ref.table}.{ref.column} → {tableName}.id
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Veriler */}
                        {activeTab[tableName] === 'Veriler' && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Eye className="h-5 w-5" />
                              Örnek Veriler (İlk {table.sampleData.length} kayıt)
                            </h4>
                            {table.sampleData.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-gray-50">
                                      {table.columns.slice(0, 7).map(col => (
                                        <th key={col.name} className="text-left py-2 px-3">
                                          {col.name}
                                        </th>
                                      ))}
                                      {table.columns.length > 7 && <th>...</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.sampleData.map((row, idx) => (
                                      <tr key={idx} className="border-b hover:bg-gray-50">
                                        {table.columns.slice(0, 7).map(col => (
                                          <td key={col.name} className="py-2 px-3 font-mono text-xs">
                                            {formatValue(row[col.name])}
                                          </td>
                                        ))}
                                        {table.columns.length > 7 && <td>...</td>}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500">Bu tabloda veri bulunmuyor.</p>
                            )}
                          </div>
                        )}

                        {/* SQL */}
                        {activeTab[tableName] === 'SQL' && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Code className="h-5 w-5" />
                              SQL Komutları
                            </h4>
                            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                              <code className="text-sm">
{`-- Create Table
CREATE TABLE ${tableName} (
${table.columns.map(col => `  ${col.name} ${col.type}${col.isPrimary ? ' PRIMARY KEY' : ''}${!col.nullable ? ' NOT NULL' : ''}`).join(',\n')}
);

-- Foreign Keys
${table.foreignKeys.length > 0 ? table.foreignKeys.map(fk => `ALTER TABLE ${tableName}
  ADD CONSTRAINT fk_${tableName}_${fk.column}
  FOREIGN KEY (${fk.column}) 
  REFERENCES ${fk.references}(${fk.refColumn});`).join('\n\n') : '-- No foreign keys'}

-- Sample Select
SELECT * FROM ${tableName} LIMIT 10;

-- Join Example
${table.foreignKeys.length > 0 ? `SELECT 
  ${tableName}.*,
${table.foreignKeys.map(fk => `  ${fk.references}.name AS ${fk.references}_name`).join(',\n')}
FROM ${tableName}
${table.foreignKeys.map(fk => `LEFT JOIN ${fk.references} ON ${tableName}.${fk.column} = ${fk.references}.${fk.refColumn}`).join('\n')}
LIMIT 10;` : '-- No foreign keys'}
`}
                              </code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer - İlişki Diyagramı */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-purple-600" />
            Veritabanı İlişki Özeti
          </h2>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              ALSE veritabanınızda toplam <strong>{stats.totalTables} tablo</strong>, 
              <strong> {stats.totalColumns} kolon</strong> ve 
              <strong> {stats.totalRelations} ilişki</strong> bulunmaktadır.
            </p>
            
            <h3 className="text-lg font-semibold mb-2">Ana İlişkiler:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>companies</strong> → Tüm tablolar (multi-tenant yapı)</li>
              <li><strong>products</strong> ← stock_movements, invoice_items</li>
              <li><strong>customers</strong> ← account_movements, checks, invoices, cash_movements</li>
              <li><strong>invoices</strong> ← invoice_items, stock_movements</li>
              <li><strong>users</strong> ← Çoğu tablo (created_by ilişkisi)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}