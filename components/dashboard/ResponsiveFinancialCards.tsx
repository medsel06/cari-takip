'use client';

import Link from 'next/link';
import { Wallet, Receipt, Activity, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Responsive Cash Summary Component
export const ResponsiveCashSummary = ({ cashAccounts }: { cashAccounts: any[] }) => {
  const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const cashBalance = cashAccounts.filter(a => a.account_type === 'cash').reduce((sum, a) => sum + a.balance, 0);
  const bankBalance = cashAccounts.filter(a => a.account_type === 'bank').reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-responsive">
          Nakit Durumu
        </h3>
        <Wallet className="icon-responsive amount-neutral" />
      </div>

      {/* Total Amount */}
      <div className="mb-4">
        <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white break-words">
          {totalCash.toLocaleString('tr-TR')} ₺
        </p>
        <p className="subheading-responsive mt-1">Toplam nakit varlık</p>
      </div>

      {/* Cash Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 lg:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">Kasa</span>
          </div>
          <span className="font-semibold text-xs lg:text-sm text-green-600 ml-2 whitespace-nowrap">
            {formatCurrency(cashBalance)}
          </span>
        </div>

        <div className="flex justify-between items-center p-2 lg:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">Banka</span>
          </div>
          <span className="font-semibold text-xs lg:text-sm text-blue-600 ml-2 whitespace-nowrap">
            {formatCurrency(bankBalance)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <Link href="/nakit">
        <button className="w-full mt-3 lg:mt-4 py-2 text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
          Nakit Detayları →
        </button>
      </Link>
    </div>
  );
};

// Responsive Income Expense Summary Component
export const ResponsiveIncomeExpenseSummary = ({ incomeExpenseData }: { incomeExpenseData: any }) => {
  const { income, expense } = incomeExpenseData;
  const net = income - expense;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
          Gelir-Gider
        </h3>
        <Activity className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
      </div>

      {/* Net Amount */}
      <div className="mb-4">
        <p className={`text-xl lg:text-2xl font-bold break-words ${
          net >= 0 ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
        }`}>
          {net >= 0 ? '+' : ''}{Math.abs(net).toLocaleString('tr-TR')} ₺
        </p>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">Bu ayki net durum</p>
      </div>

      {/* Income/Expense Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2 lg:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowDownRight className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium text-green-700 dark:text-green-400">Gelir</span>
          </div>
          <span className="font-semibold text-xs lg:text-sm text-green-600 ml-2 whitespace-nowrap">
            +{formatCurrency(income)}
          </span>
        </div>

        <div className="flex justify-between items-center p-2 lg:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowUpRight className="h-3 w-3 lg:h-4 lg:w-4 text-red-600 flex-shrink-0" />
            <span className="text-xs lg:text-sm font-medium text-red-700 dark:text-red-400">Gider</span>
          </div>
          <span className="font-semibold text-xs lg:text-sm text-red-600 ml-2 whitespace-nowrap">
            -{formatCurrency(expense)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <Link href="/gelir-gider">
        <button className="w-full mt-3 lg:mt-4 py-2 text-xs lg:text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">
          Gelir-Gider Detayları →
        </button>
      </Link>
    </div>
  );
};

// Mobile-Only Financial Summary Card
export const MobileFinancialSummary = ({ 
  cashAccounts, 
  incomeExpenseData 
}: { 
  cashAccounts: any[]; 
  incomeExpenseData: any;
}) => {
  const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const { income, expense } = incomeExpenseData;
  const net = income - expense;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 md:hidden">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
        Mali Durum
      </h3>
      
      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Cash Summary */}
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Wallet className="h-5 w-5 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Nakit</p>
          <p className="text-sm font-bold text-blue-600 break-words">
            {totalCash.toLocaleString('tr-TR')} ₺
          </p>
        </div>
        
        {/* Net Income Summary */}
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Activity className="h-5 w-5 text-purple-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net</p>
          <p className={`text-sm font-bold break-words ${
            net >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {net >= 0 ? '+' : ''}{Math.abs(net).toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </div>
      
      {/* Quick Access */}
      <div className="flex gap-2 mt-4">
        <Link href="/nakit" className="flex-1">
          <button className="w-full py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
            Nakit
          </button>
        </Link>
        
        <Link href="/gelir-gider" className="flex-1">
          <button className="w-full py-2 px-3 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
            Gelir/Gider
          </button>
        </Link>
      </div>
    </div>
  );
};

// Comprehensive Mobile Dashboard Summary
export const ComprehensiveMobileSummary = ({ 
  receivables, 
  debts, 
  cashAccounts, 
  incomeExpenseData 
}: {
  receivables: any[];
  debts: any[];
  cashAccounts: any[];
  incomeExpenseData: any;
}) => {
  const totalReceivable = receivables.reduce((sum, item) => sum + item.balance, 0);
  const totalDebt = debts.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const { income, expense } = incomeExpenseData;
  const net = income - expense;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 md:hidden">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
        İşletme Özeti
      </h3>
      
      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Alacaklar */}
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-green-600 text-xs font-medium mb-1">Alacak</div>
          <div className="text-sm font-bold text-green-600 break-words">
            {totalReceivable.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-xs text-gray-500 mt-1">{receivables.length} müşteri</div>
        </div>
        
        {/* Borçlar */}
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-red-600 text-xs font-medium mb-1">Borç</div>
          <div className="text-sm font-bold text-red-600 break-words">
            {totalDebt.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-xs text-gray-500 mt-1">{debts.length} tedarikçi</div>
        </div>
        
        {/* Nakit */}
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-blue-600 text-xs font-medium mb-1">Nakit</div>
          <div className="text-sm font-bold text-blue-600 break-words">
            {totalCash.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-xs text-gray-500 mt-1">Kasa+Banka</div>
        </div>
        
        {/* Net Gelir */}
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-purple-600 text-xs font-medium mb-1">Bu Ay Net</div>
          <div className={`text-sm font-bold break-words ${
            net >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {net >= 0 ? '+' : ''}{Math.abs(net).toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-xs text-gray-500 mt-1">Gelir-Gider</div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/cari">
          <button className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cari İşlemler
          </button>
        </Link>
        
        <Link href="/stok">
          <button className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Stok Takip
          </button>
        </Link>
      </div>
    </div>
  );
};