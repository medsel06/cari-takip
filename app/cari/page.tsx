'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Plus, Edit, Eye, FileText } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Customer } from '@/lib/types';
import { formatCurrency, customerTypeLabels } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

export default function CariPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      const { data, error } = await supabase
        .from('customers')
        .select('id, code, name, type, phone, email, city, balance')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(200);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'name',
      header: 'Cari Adı',
    },
    {
      accessorKey: 'type',
      header: 'Tip',
      cell: ({ row }) => customerTypeLabels[row.original.type],
    },
    {
      accessorKey: 'phone',
      header: 'Telefon',
    },
    {
      accessorKey: 'balance',
      header: 'Bakiye',
      cell: ({ row }) => (
        <div className={row.original.balance > 0 ? 'text-red-600 font-semibold' : row.original.balance < 0 ? 'text-green-600 font-semibold' : ''}>
          {formatCurrency(row.original.balance)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/cari/${row.original.id}`}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Görüntüle"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/cari/${row.original.id}/duzenle`}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Düzenle"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={() => router.push(`/raporlar/cari-ekstre?customerId=${row.original.id}`)}
            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
            title="Ekstre"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Hesaplar</h1>
        <Link
          href="/cari/ekle"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Yeni Cari
        </Link>
      </div>

      <div className="card rounded-lg">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            exportFilename="cari-listesi"
          />
        </div>
      </div>
    </div>
  );
}