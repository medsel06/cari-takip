import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Customer, AccountMovement } from '@/lib/types';

export function useCustomer(customerId: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (error) throw error;
        setCustomer(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, supabase]);

  return { customer, loading, error };
}

export function useCustomerMovements(customerId: string) {
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  const fetchMovements = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [customerId]);

  return { movements, loading, error, refetch: fetchMovements };
}

export function useCustomerStats(movements: AccountMovement[]) {
  const [stats, setStats] = useState({
    totalDebt: 0,
    totalCredit: 0,
    balance: 0,
    overdueAmount: 0,
    overdueCount: 0,
    averagePaymentDays: 0,
  });

  useEffect(() => {
    if (!movements.length) return;

    const totalDebt = movements
      .filter(m => m.movement_type === 'DEBT')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalCredit = movements
      .filter(m => m.movement_type === 'CREDIT')
      .reduce((sum, m) => sum + m.amount, 0);

    const today = new Date();
    const overdueMovements = movements.filter(m => 
      m.movement_type === 'DEBT' && 
      !m.is_paid && 
      m.due_date && 
      new Date(m.due_date) < today
    );

    const overdueAmount = overdueMovements.reduce((sum, m) => sum + (m.amount - m.paid_amount), 0);

    setStats({
      totalDebt,
      totalCredit,
      balance: totalDebt - totalCredit,
      overdueAmount,
      overdueCount: overdueMovements.length,
      averagePaymentDays: 0, // TODO: Calculate average payment days
    });
  }, [movements]);

  return stats;
}

export function useCompanyCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClientComponentClient();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .single();

      if (!userData?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return { customers, loading, error, refetch: fetchCustomers };
}