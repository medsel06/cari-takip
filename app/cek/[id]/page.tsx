'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  FileText,
  Calendar,
  Building,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Check, Customer } from '@/lib/types';
import { formatCurrency, formatDate, checkStatusLabels, checkTypeLabels } from '@/lib/utils';

export default function CekDetayPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [check, setCheck] = useState<Check | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<Check['status']>('portfolio');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchCheckData();
    }
  }, [params.id]);

  const fetchCheckData = async () => {
    try {
      const { data: checkData, error } = await supabase
        .from('checks')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      
      setCheck(checkData);
      if (checkData.customer) {
        setCustomer(checkData.customer);
      }
    } catch (error) {
      console.error('Error fetching check:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCheckStatusLabel = (status: Check['status'], type: Check['type']) => {
    if (type === 'issued') {
      // Verilen çekler için özel etiketler
      switch (status) {
        case 'portfolio': return 'Verildi';
        case 'collected': return 'Ödendi';
        case 'returned': return 'İptal Edildi';
        default: return checkStatusLabels[status];
      }
    }
    // Alınan çekler için standart etiketler
    return checkStatusLabels[status];
  };

  const getStatusColor = (status: Check['status']) => {
    switch (status) {
      case 'collected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'returned':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_bank':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'endorsed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Check['status']) => {
    switch (status) {
      case 'collected':
        return <CheckCircle className="h-5 w-5" />;
      case 'returned':
        return <XCircle className="h-5 w-5" />;
      case 'in_bank':
        return <TrendingUp className="h-5 w-5" />;
      case 'endorsed':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const handleStatusUpdate = async () => {
    if (!check) return;

    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Duruma göre ek alanları güncelle
      switch (newStatus) {
        case 'collected':
          updateData.collection_date = statusDate;
          break;
        case 'returned':
          updateData.return_date = statusDate;
          updateData.return_reason = statusNote;
          break;
        case 'endorsed':
          updateData.endorsement_date = statusDate;
          updateData.endorsement_to = statusNote;
          break;
      }

      const { error } = await supabase
        .from('checks')
        .update(updateData)
        .eq('id', check.id);

      if (error) throw error;

      // Sayfayı yenile
      await fetchCheckData();
      setShowStatusModal(false);
      setStatusNote('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Durum güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isOverdue = check && new Date(check.due_date) < new Date() && check.status === 'portfolio';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Çek bulunamadı.</p>
        <Link href="/cek" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Çek listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cek"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Çek Listesine Dön
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Çek No: {check.check_number}
              </h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(check.status)}`}>
                {getStatusIcon(check.status)}
                {getCheckStatusLabel(check.status, check.type)}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  <AlertCircle className="h-4 w-4" />
                  Vadesi Geçmiş
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {checkTypeLabels[check.type]}
              </span>
              <span>Tutar: <strong className="text-gray-900">{formatCurrency(check.amount)}</strong></span>
              <span>Vade: <strong className="text-gray-900">{formatDate(check.due_date)}</strong></span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </button>
            <Link
              href={`/cek/${check.id}/duzenle`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Çek Detayları */}
        <div className="lg:col-span-2 space-y-6">
          {/* Çek Bilgileri */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Çek Bilgileri</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Çek No</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{check.check_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tutar</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(check.amount)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Banka</dt>
                  <dd className="mt-1 text-gray-900">
                    {check.bank_name}
                    {check.branch_name && <span className="text-gray-500"> - {check.branch_name}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hesap No</dt>
                  <dd className="mt-1 text-gray-900">{check.account_number || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Keşideci</dt>
                  <dd className="mt-1 text-gray-900">{check.drawer_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vade Tarihi</dt>
                  <dd className="mt-1 text-gray-900">
                    {formatDate(check.due_date)}
                    {isOverdue && <span className="text-red-600 text-sm ml-2">(Vadesi geçmiş)</span>}
                  </dd>
                </div>
              </dl>

              {check.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Açıklama</dt>
                  <dd className="text-gray-900">{check.description}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Cari Bilgileri */}
          {customer && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Cari Bilgileri</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.code}</p>
                    
                    <div className="mt-4 space-y-2 text-sm">
                      {customer.phone && (
                        <div className="flex items-center text-gray-600">
                          <FileText className="h-4 w-4 mr-2" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.authorized_person && (
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          {customer.authorized_person}
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center text-gray-600">
                          <Building className="h-4 w-4 mr-2" />
                          {customer.address}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Link
                    href={`/cari/${customer.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Cari Detayı →
                  </Link>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Cari Bakiye</span>
                    <span className={`text-lg font-semibold ${
                      customer.balance > 0 ? 'text-red-600' : customer.balance < 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon - Durum ve İşlemler */}
        <div className="space-y-6">
          {/* Durum Geçmişi */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Durum Bilgisi</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Mevcut Durum */}
                <div className="pb-4 border-b border-gray-200">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(check.status)}`}>
                    {getStatusIcon(check.status)}
                    {getCheckStatusLabel(check.status, check.type)}
                  </div>
                </div>

                {/* Durum Detayları */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Oluşturma Tarihi</span>
                    <span className="text-gray-900">{formatDate(check.created_at)}</span>
                  </div>

                  {check.endorsement_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ciro Tarihi</span>
                      <span className="text-gray-900">{formatDate(check.endorsement_date)}</span>
                    </div>
                  )}

                  {check.endorsement_to && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ciro Edildi</span>
                      <span className="text-gray-900">{check.endorsement_to}</span>
                    </div>
                  )}

                  {check.collection_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tahsil Tarihi</span>
                      <span className="text-gray-900">{formatDate(check.collection_date)}</span>
                    </div>
                  )}

                  {check.return_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">İade Tarihi</span>
                      <span className="text-gray-900">{formatDate(check.return_date)}</span>
                    </div>
                  )}

                  {check.return_reason && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-gray-500 block mb-1">İade Nedeni</span>
                      <span className="text-gray-900">{check.return_reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Durum Güncelle Butonu - Ciro edilmiş çeklerde gösterme */}
              {check.status !== 'collected' && check.status !== 'returned' && check.status !== 'endorsed' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Durum Güncelle
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hızlı İstatistikler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Vade Durumu</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Vadeye Kalan</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(() => {
                      const today = new Date();
                      const dueDate = new Date(check.due_date);
                      const diffTime = dueDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        return <span className="text-red-600">{Math.abs(diffDays)} gün geçti</span>;
                      } else if (diffDays === 0) {
                        return <span className="text-orange-600">Bugün</span>;
                      } else {
                        return <span className="text-green-600">{diffDays} gün</span>;
                      }
                    })()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverdue ? 'bg-red-600' : 'bg-green-600'
                    }`}
                    style={{
                      width: isOverdue ? '100%' : '50%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Durum Güncelleme Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Çek Durumunu Güncelle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Durum
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Check['status'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="portfolio">Portföyde</option>
                  {check.type === 'received' ? (
                    // Alınan çekler için seçenekler
                    <>
                      <option value="in_bank">Bankaya Verildi</option>
                      <option value="endorsed">Ciro Edildi</option>
                      <option value="collected">Tahsil Edildi</option>
                      <option value="returned">İade/Karşılıksız</option>
                    </>
                  ) : (
                    // Verilen çekler için seçenekler
                    <>
                      <option value="collected">Ödendi</option>
                      <option value="returned">İptal Edildi</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={statusDate}
                  onChange={(e) => setStatusDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {((newStatus === 'returned') || (newStatus === 'endorsed' && check.type === 'received')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newStatus === 'returned' ? 
                      (check.type === 'received' ? 'İade Nedeni' : 'İptal Nedeni') : 
                      'Kime Ciro Edildi'
                    }
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      newStatus === 'returned' ? 
                        (check.type === 'received' ? 'İade nedenini yazın...' : 'İptal nedenini yazın...') : 
                        'Ciro edilen kişi/firma...'
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusNote('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}