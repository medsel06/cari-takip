'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Responsive Balance Card Component
interface BalanceItemProps {
  customer: {
    id: string;
    name: string;
    code: string;
    balance: number;
  };
  type: 'receivable' | 'debt';
}

const BalanceItem = ({ customer, type }: BalanceItemProps) => {
  const isReceivable = type === 'receivable';
  const balance = isReceivable ? customer.balance : Math.abs(customer.balance);
  
  return (
    <Link href={`/cari/${customer.id}`}>
      <div className="balance-item group">
        {/* Sol Taraf - Firma Bilgileri */}
        <div className="balance-item-content">
          <div className="flex flex-col">
            <p className="company-name">
              {customer.name}
            </p>
          </div>
        </div>
        
        {/* Sağ Taraf - Tutar */}
        <div className="balance-item-amount">
          <p className={`amount-display ${
            isReceivable ? 'amount-positive' : 'amount-negative'
          }`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </Link>
  );
};

// Alacak Özeti Component - Responsive
export const ResponsiveReceivableSummary = ({ receivables }: { receivables: any[] }) => {
  const totalReceivable = receivables.reduce((sum, item) => sum + item.balance, 0);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
          Alacaklarımız
        </h3>
        <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
      </div>
      
      {/* Total Amount */}
      <div className="mb-4">
        <p className="text-xl lg:text-2xl font-bold text-green-600 break-words">
          {totalReceivable.toLocaleString('tr-TR')} ₺
        </p>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">
          {receivables.length} müşteriden alacak
        </p>
      </div>

      {/* Customer List - Sadece son 2 kayıt */}
      <div className="space-y-1">
        {receivables.slice(0, 2).map((customer, idx) => (
          <BalanceItem 
            key={`receivable-${customer.id || idx}`} 
            customer={customer} 
            type="receivable" 
          />
        ))}
        
        {receivables.length > 2 && (
          <Link href="/cari?filter=receivable">
            <div className="text-center py-2">
              <p className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Tümünü Gör ({receivables.length} firma) →
              </p>
            </div>
          </Link>
        )}
        
        {receivables.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Henüz alacak bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Borç Özeti Component - Responsive
export const ResponsiveDebtSummary = ({ debts }: { debts: any[] }) => {
  const totalDebt = debts.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
          Borçlarımız
        </h3>
        <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
      </div>
      
      {/* Total Amount */}
      <div className="mb-4">
        <p className="text-xl lg:text-2xl font-bold text-red-600 break-words">
          {totalDebt.toLocaleString('tr-TR')} ₺
        </p>
        <p className="text-xs lg:text-sm text-gray-500 mt-1">
          {debts.length} tedarikçiye borç
        </p>
      </div>

      {/* Supplier List - Sadece son 2 kayıt */}
      <div className="space-y-1">
        {debts.slice(0, 2).map((supplier, idx) => (
          <BalanceItem 
            key={`debt-${supplier.id || idx}`} 
            customer={supplier} 
            type="debt" 
          />
        ))}
        
        {debts.length > 2 && (
          <Link href="/cari?filter=debt">
            <div className="text-center py-2">
              <p className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Tümünü Gör ({debts.length} firma) →
              </p>
            </div>
          </Link>
        )}
        
        {debts.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Henüz borç bulunmuyor</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile-Optimized Combined Balance Card
export const MobileBalanceCard = ({ 
  receivables, 
  debts 
}: { 
  receivables: any[]; 
  debts: any[]; 
}) => {
  const totalReceivable = receivables.reduce((sum, item) => sum + item.balance, 0);
  const totalDebt = debts.reduce((sum, item) => sum + Math.abs(item.balance), 0);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 md:hidden">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
        Borç & Alacak Durumu
      </h3>
      
      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Alacak</p>
          <p className="text-lg font-bold text-green-600">
            {totalReceivable.toLocaleString('tr-TR')} ₺
          </p>
        </div>
        
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Borç</p>
          <p className="text-lg font-bold text-red-600">
            {totalDebt.toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </div>
      
      {/* Quick Access */}
      <div className="flex gap-2">
        <Link href="/cari?filter=receivable" className="flex-1">
          <button className="w-full py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
            Alacaklar ({receivables.length})
          </button>
        </Link>
        
        <Link href="/cari?filter=debt" className="flex-1">
          <button className="w-full py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
            Borçlar ({debts.length})
          </button>
        </Link>
      </div>
    </div>
  );
};