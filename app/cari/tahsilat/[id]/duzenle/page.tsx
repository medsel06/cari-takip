'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentMovement {
  id: string;
  customer_id: string;
  movement_type: 'DEBT' | 'CREDIT';
  amount: number;
  description: string;
  document_no: string;
  due_date: string;
  payment_method: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
}

export default function TahsilatDuzenlePage() {
  const router = useRouter();
  const params = useParams();
  const movementId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movement, setMovement] = useState<PaymentMovement | null>(null);

  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    document_no: '',
    due_date: '',
    payment_method: 'cash',
  });

  useEffect(() => {
    fetchMovement();
  }, [movementId]);

  const fetchMovement = async () => {
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select(`
          *,
          customer:customers(id, name, code)
        `)
        .eq('id', movementId)
        .single();

      if (error) throw error;

      setMovement(data);
      setFormData({
        amount: data.amount,
        description: data.description,
        document_no: data.document_no || '',
        due_date: data.due_date || '',
        payment_method: data.payment_method || 'cash',
      });
    } catch (error) {
      console.error('Error fetching movement:', error);
      toast.error('Kayıt yüklenirken hata oluştu');
      router.push('/cari/tahsilat');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      toast.error('Tutar 0\'dan büyük olmalıdır');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('account_movements')
        .update({
          amount: formData.amount,
          description: formData.description,
          document_no: formData.document_no,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
        })
        .eq('id', movementId);

      if (error) throw error;

      toast.success('Kayıt başarıyla güncellendi');
      router.push('/cari/tahsilat');
    } catch (error) {
      console.error('Error updating movement:', error);
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'Nakit',
      'transfer': 'Havale/EFT',
      'check': 'Çek',
      'credit_card': 'Kredi Kartı'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!movement) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kayıt bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cari/tahsilat"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tahsilat/Ödeme Listesine Dön
        </Link>
        <h1 className="text-2xl font-bold">
          {movement.movement_type === 'CREDIT' ? 'Tahsilat' : 'Ödeme'} Düzenle
        </h1>
        <p className="text-muted-foreground mt-2">
          <span className="font-medium">{movement.customer.name}</span>
          <span className="text-sm ml-2">({movement.customer.code})</span>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card rounded-lg p-6 space-y-6">
        {/* İşlem Tipi - Read Only */}
        <div>
          <label className="block text-sm font-medium mb-2">
            İşlem Tipi
          </label>
          <div className="p-3 bg-secondary rounded-md">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              movement.movement_type === 'CREDIT'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {movement.movement_type === 'CREDIT' ? 'Tahsilat' : 'Ödeme'}
            </span>
          </div>
        </div>

        {/* Tutar */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Tutar <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            step="0.01"
            min="0"
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Ödeme Yöntemi */}
        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium mb-2">
            Ödeme Yöntemi
          </label>
          <select
            id="payment_method"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="cash">Nakit</option>
            <option value="transfer">Havale/EFT</option>
            <option value="check">Çek</option>
            <option value="credit_card">Kredi Kartı</option>
          </select>
        </div>

        {/* Belge No */}
        <div>
          <label htmlFor="document_no" className="block text-sm font-medium mb-2">
            Belge No
          </label>
          <input
            type="text"
            id="document_no"
            value={formData.document_no}
            onChange={(e) => setFormData({ ...formData, document_no: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Belge numarası"
          />
        </div>

        {/* Tarih */}
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium mb-2">
            Tarih
          </label>
          <input
            type="date"
            id="due_date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Açıklama */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Açıklama <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="İşlem açıklaması"
          />
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>Not:</strong> Cari hesap ve işlem tipi değiştirilemez. Sadece tutar, ödeme yöntemi ve açıklama bilgileri güncellenebilir.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <Link
            href="/cari/tahsilat"
            className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            İptal
          </Link>
        </div>
      </form>

      {/* Metadata */}
      <div className="mt-6 text-sm text-muted-foreground">
        <p>Oluşturulma: {formatDate(movement.created_at)}</p>
      </div>
    </div>
  );
}
