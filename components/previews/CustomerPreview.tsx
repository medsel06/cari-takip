'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface CustomerPreviewProps {
  customerId: string;
}

export const CustomerPreview = ({ customerId }: CustomerPreviewProps) => {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCustomer = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
        
      if (!error && data) {
        setCustomer(data);
      }
      setLoading(false);
    };
    
    fetchCustomer();
  }, [customerId]);
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }
  
  if (!customer) return null;
  
  const getRiskColor = (status: string) => {
    switch(status) {
      case 'normal': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'risky': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(customer.risk_status || 'normal')}`}>
          {customer.risk_status || 'Normal'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Bakiye</p>
          <p className={`font-medium ${customer.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(customer.balance)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Limit</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(customer.credit_limit)}
          </p>
        </div>
      </div>
      
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Hızlı İşlemler</p>
        <div className="flex gap-2">
          <button className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 
                           px-3 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
            Ekstre →
          </button>
          <button className="text-xs bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 
                           px-3 py-1 rounded hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors">
            Tahsilat →
          </button>
          {customer.balance < 0 && (
            <button className="text-xs bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 
                             px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors">
              Hatırlat
            </button>
          )}
        </div>
      </div>
      
      {customer.notes && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notlar</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 italic">{customer.notes}</p>
        </div>
      )}
    </div>
  );
};