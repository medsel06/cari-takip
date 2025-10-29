'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight, Download, Filter } from 'lucide-react';
import type { CashAccount, CashMovement } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function CashAccountDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const accountId = params.id as string;

  const [account, setAccount] = useState<CashAccount | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netFlow: 0,
    movementCount: 0
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    movementType: 'all' as 'all' | 'income' | 'expense' | 'transfer_in' | 'transfer_out'
  });

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  useEffect(() => {
    applyFilters();
  }, [movements, filters]);

  const fetchAccountDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data: accountData, error: accountError } = await supabase
        .from('cash_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('company_id', userData.company_id)
        .single();

      if (accountError) throw accountError;
      setAccount(accountData);

      const { data: movementsData, error: movementsError } = await supabase
        .from('cash_movements')
        .select(`
          id,
          movement_type,
          amount,
          description,
          movement_no,
          movement_date,
          created_at,
          customers!customer_id(name)
        `)
        .eq('account_id', accountId)
        .eq('company_id', userData.company_id)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (movementsError) {
        logger.error('Hareketler yüklenirken hata:', movementsError);
      } else {
        setMovements(movementsData || []);
        calculateStats(movementsData || []);
      }

    } catch (error) {
      logger.error('Hesap detayları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const stats = data.reduce((acc, movement) => {
      if (movement.movement_type === 'income' || movement.movement_type === 'transfer_in') {
        acc.totalIncome += movement.amount;
      } else if (movement.movement_type === 'expense' || movement.movement_type === 'transfer_out') {
        acc.totalExpense += movement.amount;
      }
      return acc;
    }, { totalIncome: 0, totalExpense: 0, netFlow: 0, movementCount: data.length });

    stats.netFlow = stats.totalIncome - stats.totalExpense;
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...movements];

    if (filters.startDate) {
      filtered = filtered.filter(m => m.movement_date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(m => m.movement_date <= filters.endDate);
    }

    if (filters.movementType !== 'all') {
      filtered = filtered.filter(m => m.movement_type === filters.movementType);
    }

    setFilteredMovements(filtered);
    calculateStats(filtered);
  };

  const exportToExcel = () => {
    const headers = ['Tarih', 'Açıklama', 'Tip', 'Tutar'];
    const rows = filteredMovements.map(m => [
      formatDate(m.movement_date),
      m.description || m.movement_no,
      m.movement_type === 'income' ? 'Gelir' : 'Gider',
      m.amount
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.account_name}_hareketler.csv`;
    a.click();
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'transfer_in':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'expense':
      case 'transfer_out':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <ArrowLeftRight className="w-5 h-5 text-blue-600" />;
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels = {
      'income': 'Gelir',
      'expense': 'Gider',
      'transfer_in': 'Transfer (Gelen)',
      'transfer_out': 'Transfer (Giden)'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Hesap bulunamadı</p>
        <Link href="/nakit" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Nakit Yönetimine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link
            href="/nakit"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nakit Yönetimine Dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{account.account_name}</h1>
          <p className="text-gray-600 mt-1">
            {account.account_code} • {account.account_type}
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Excel'e Aktar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Güncel Bakiye</p>
          <p className={`text-2xl font-bold ${
            account.balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Toplam Gelir</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalIncome)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Toplam Gider</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.totalExpense)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Net Akış</p>
          <p className={`text-2xl font-bold ${
            stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(stats.netFlow)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filtrele</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hareket Tipi
            </label>
            <select
              value={filters.movementType}
              onChange={(e) => setFilters({ ...filters, movementType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
              <option value="transfer_in">Transfer (Gelen)</option>
              <option value="transfer_out">Transfer (Giden)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ startDate: '', endDate: '', movementType: 'all' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Hareketler ({filteredMovements.length})
          </h2>
        </div>
        <div className="p-6">
          {filteredMovements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Hareket bulunamadı</p>
          ) : (
            <div className="space-y-2">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getMovementIcon(movement.movement_type)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {movement.description || movement.movement_no}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{formatDate(movement.movement_date)}</span>
                        <span>•</span>
                        <span>{getMovementTypeLabel(movement.movement_type)}</span>
                        {movement.customers?.name && (
                          <>
                            <span>•</span>
                            <span>{movement.customers.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      movement.movement_type === 'income' || movement.movement_type === 'transfer_in'
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {movement.movement_type === 'income' || movement.movement_type === 'transfer_in' ? '+' : '-'}
                      {formatCurrency(movement.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}