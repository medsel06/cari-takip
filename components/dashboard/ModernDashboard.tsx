'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, TrendingUp, AlertTriangle, ChevronRight, Wallet, 
  Receipt, ArrowUpRight, ArrowDownRight, Activity, DollarSign,
  Package, ShoppingCart, Eye, TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import UpcomingChecksWidget from './UpcomingChecksWidget';
import { 
  ResponsiveReceivableSummary, 
  ResponsiveDebtSummary, 
  MobileBalanceCard 
} from './ResponsiveBalanceCards';
import { 
  ResponsiveCashSummary, 
  ResponsiveIncomeExpenseSummary, 
  ComprehensiveMobileSummary 
} from './ResponsiveFinancialCards';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';

// Simple Number Display Component
const NumberDisplay = ({ value }: { value: number }) => {
  return <span>{value.toLocaleString('tr-TR')}</span>;
};





// Activity Feed Component
const ActivityFeed = ({ activities }: { activities: any[] }) => {
  return (
    <div className="dashboard-card">
      <h3 className="heading-responsive mb-4">Son İşlemler</h3>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="activity-item"
          >
            <div className={`activity-icon ${activity.color}`}>
              <activity.icon className="h-4 w-4 text-white" />
            </div>
            <div className="activity-content">
              <p className="activity-title">
                {activity.title}
              </p>
              <p className="activity-description">
                {activity.description}
              </p>
            </div>
            <span className="activity-time">
              {activity.time}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function ModernDashboard() {
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState({ income: 0, expense: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // 1. Müşteri borç/alacak durumu
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true);

      // Alacaklar (balance > 0 = bizden borçlu)
      const receivableCustomers = customers?.filter(c => c.balance > 0) || [];
      // Borçlar (balance < 0 = bize alacaklı)
      const debtCustomers = customers?.filter(c => c.balance < 0) || [];

      setReceivables(receivableCustomers);
      setDebts(debtCustomers);

      // 2. Nakit durumu
      const { data: cashData } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true);

      setCashAccounts(cashData || []);

      // 3. Gelir-Gider hesaplama (bu ayki)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Nakit hareketlerinden gelir-gider
      const { data: cashMovements } = await supabase
        .from('cash_movements')
        .select('movement_type, amount')
        .eq('company_id', userData.company_id)
        .gte('created_at', startOfMonth.toISOString());

      let income = 0;
      let expense = 0;

      cashMovements?.forEach(movement => {
        if (movement.movement_type === 'income') {
          income += movement.amount;
        } else if (movement.movement_type === 'expense') {
          expense += movement.amount;
        }
      });

      // Cari hareketlerden gelir-gider
      const { data: accountMovements } = await supabase
        .from('account_movements')
        .select('movement_type, amount, payment_method')
        .eq('company_id', userData.company_id)
        .eq('is_paid', true)
        .gte('created_at', startOfMonth.toISOString());

      accountMovements?.forEach(movement => {
        // Tahsilat = gelir, Ödeme = gider (sadece nakit olanlar)
        if (movement.payment_method === 'cash' || movement.payment_method === 'transfer') {
          if (movement.movement_type === 'CREDIT') {
            income += movement.amount;
          } else if (movement.movement_type === 'DEBT') {
            expense += movement.amount;
          }
        }
      });

      setIncomeExpenseData({ income, expense });

      // 4. Son aktiviteleri getir
      const activities: any[] = [];

      // Stok hareketleri
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('*, product:products(name), customer:customers(name)')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(3);

      stockMovements?.forEach(m => {
        activities.push({
          icon: m.movement_type === 'IN' ? Package : ShoppingCart,
          title: m.movement_type === 'IN' ? 'Mal Alışı' : 'Mal Satışı',
          description: `${m.product?.name} - ${m.quantity} adet`,
          time: new Date(m.created_at).getTime(),
          timeStr: formatDate(m.created_at),
          color: m.movement_type === 'IN' ? 'bg-green-500' : 'bg-blue-500',
          module: 'stock'
        });
      });

      // Cari hareketler
      const { data: latestAccountMovements } = await supabase
        .from('account_movements')
        .select('*, customer:customers(name)')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(3);

      latestAccountMovements?.forEach(m => {
        activities.push({
          icon: m.movement_type === 'DEBT' ? ArrowUpRight : ArrowDownRight,
          title: m.movement_type === 'DEBT' ? 'Ödeme' : 'Tahsilat',
          description: `${m.customer?.name} - ${formatCurrency(m.amount)}`,
          time: new Date(m.created_at).getTime(),
          timeStr: formatDate(m.created_at),
          color: m.movement_type === 'DEBT' ? 'bg-red-500' : 'bg-green-500',
          module: 'account'
        });
      });

      // Çek hareketleri
      const { data: checkMovements } = await supabase
        .from('checks')
        .select('*, customer:customers(name)')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })
        .limit(3);

      checkMovements?.forEach(c => {
        activities.push({
          icon: FileText,
          title: c.type === 'received' ? 'Çek Alındı' : 'Çek Verildi',
          description: `${c.check_number} - ${formatCurrency(c.amount)}`,
          time: new Date(c.created_at).getTime(),
          timeStr: formatDate(c.created_at),
          color: 'bg-orange-500',
          module: 'check'
        });
      });

      // Aktiviteleri tarihe göre sırala ve ilk 10'unu al
      const sortedActivities = activities
        .sort((a, b) => b.time - a.time)
        .slice(0, 10)
        .map(a => ({
          icon: a.icon,
          title: a.title,
          description: a.description,
          time: a.timeStr,
          color: a.color
        }));

      setActivities(sortedActivities);
      
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ana Sayfa</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            İşletmenizin anlık durumu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Son güncelleme: {formatDate(new Date())}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => fetchDashboardData()}
          >
            Yenile
          </motion.button>
        </div>
      </div>

      {/* Mobile Summary - Tek kart tüm bilgiler */}
      <ComprehensiveMobileSummary 
        receivables={receivables} 
        debts={debts} 
        cashAccounts={cashAccounts} 
        incomeExpenseData={incomeExpenseData} 
      />
      
      {/* Desktop Grid - Hidden on Mobile */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <ResponsiveReceivableSummary receivables={receivables} />
        <ResponsiveDebtSummary debts={debts} />
        <ResponsiveCashSummary cashAccounts={cashAccounts} />
        <ResponsiveIncomeExpenseSummary incomeExpenseData={incomeExpenseData} />
      </div>

      {/* Ana İçerik */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol taraf - Yaklaşan çekler */}
        <div className="lg:col-span-2">
          <UpcomingChecksWidget />
        </div>
        
        {/* Sağ taraf - Son işlemler */}
        <div>
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);