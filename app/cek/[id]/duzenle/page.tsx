'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Check, Customer } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function CekDuzenlePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [formData, setFormData] = useState({
    check_number: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    drawer_name: '',
    amount: 0,
    due_date: '',
    customer_id: '',
    type: 'received' as Check['type'],
    status: 'portfolio' as Check['status'],
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .single();

      if (!userData?.company_id) return;

      // Çek bilgilerini getir
      const { data: checkData, error: checkError } = await supabase
        .from('checks')
        .select('*')
        .eq('id', params.id)
        .single();

      if (checkError) throw checkError;

      // Carileri getir
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', userData.company_id)
        .eq('is_active', true)
        .order('name');

      setCustomers(customersData || []);
      
      // Form verilerini doldur
      setFormData({
        check_number: checkData.check_number,
        bank_name: checkData.bank_name,
        branch_name: checkData.branch_name || '',
        account_number: checkData.account_number || '',
        drawer_name: checkData.drawer_name || '',
        amount: checkData.amount,
        due_date: checkData.due_date,
        customer_id: checkData.customer_id,
        type: checkData.type,
        status: checkData.status,
        description: checkData.description || ''
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.check_number || !formData.bank_name || !formData.customer_id) {
      alert('Lütfen zorunlu alanları doldurun');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('checks')
        .update({
          check_number: formData.check_number,
          bank_name: formData.bank_name,
          branch_name: formData.branch_name || null,
          account_number: formData.account_number || null,
          drawer_name: formData.drawer_name || null,
          amount: formData.amount,
          due_date: formData.due_date,
          customer_id: formData.customer_id,
          type: formData.type,
          description: formData.description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (error) throw error;

      router.push(`/cek/${params.id}`);
    } catch (error: any) {
      console.error('Error updating check:', error);
      alert(error.message || 'Çek güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/cek/${params.id}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Çek Detayına Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Çek Düzenle</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Çek Bilgileri */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-4 border-b">Çek Bilgileri</h2>
            </div>

            <div>
              <label htmlFor="check_number" className="block text-sm font-medium text-gray-700 mb-1">
                Çek No*
              </label>
              <input
                type="text"
                id="check_number"
                name="check_number"
                required
                value={formData.check_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Tutar*
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                required
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0.01"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                Banka*
              </label>
              <input
                type="text"
                id="bank_name"
                name="bank_name"
                required
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                Şube
              </label>
              <input
                type="text"
                id="branch_name"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-1">
                Hesap No
              </label>
              <input
                type="text"
                id="account_number"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="drawer_name" className="block text-sm font-medium text-gray-700 mb-1">
                Keşideci
              </label>
              <input
                type="text"
                id="drawer_name"
                name="drawer_name"
                value={formData.drawer_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                Vade Tarihi*
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                required
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Çek Tipi*
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled // Çek tipi değiştirilmemeli
              >
                <option value="received">Alınan Çek</option>
                <option value="issued">Verilen Çek</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-1">
                Cari*
              </label>
              <select
                id="customer_id"
                name="customer_id"
                required
                value={formData.customer_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Cari Seçin</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Not: Durum güncellemesi ayrı sayfada yapılıyor */}
            <div className="md:col-span-2 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p><strong>Not:</strong> Çek durumu güncellemesi için çek detay sayfasındaki "Durum Güncelle" butonunu kullanın.</p>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
            <Link
              href={`/cek/${params.id}`}
              className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Güncelle'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}