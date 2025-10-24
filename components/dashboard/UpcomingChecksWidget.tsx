'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, AlertTriangle, Calendar, Eye, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const UpcomingChecksWidget = () => {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchUpcomingChecks();
  }, []);

  const fetchUpcomingChecks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // Önümüzdeki 5 gün içindeki vadesi gelen çekleri getir
      const today = new Date().toISOString().split('T')[0];
      const fiveDaysLater = new Date();
      fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
      const fiveDaysLaterStr = fiveDaysLater.toISOString().split('T')[0];

      const { data: checksData } = await supabase
        .from('checks')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .eq('company_id', userData.company_id)
        .in('status', ['portfolio', 'in_bank']) // Portföyde veya bankada olan çekler
        .gte('due_date', today)
        .lte('due_date', fiveDaysLaterStr)
        .order('due_date', { ascending: true })
        .limit(5);

      setChecks(checksData || []);
    } catch (error) {
      console.error('Çek verileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-600 bg-red-50';
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const handleCheckClick = (check: any) => {
    setSelectedCheck(check);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yaklaşan Çek Vadeleri</h3>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-gray-500">Önümüzdeki 5 gün</span>
          </div>
        </div>

        {checks.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {checks.map((check, idx) => {
                const daysRemaining = getDaysRemaining(check.due_date);
                const urgencyColor = getUrgencyColor(daysRemaining);
                
                return (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleCheckClick(check)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      check.type === 'received' 
                        ? 'border-green-200 bg-green-50/50 hover:border-green-300' 
                        : 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          check.type === 'received' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {check.type === 'received' ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{check.check_number}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              check.type === 'received' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {check.type === 'received' ? 'Alınan' : 'Verilen'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {check.customer?.name || 'Belirtilmemiş'} • {check.bank_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(check.amount)}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${urgencyColor}`}>
                          <AlertTriangle className="h-3 w-3" />
                          <span>
                            {daysRemaining === 0 ? 'Bugün' : 
                             daysRemaining === 1 ? 'Yarın' : 
                             `${daysRemaining} gün`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Önümüzdeki 5 gün içinde vadesi gelen çek yok
            </p>
          </div>
        )}

        <Link href="/cek">
          <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2">
            Tüm Çekleri Gör
            <Eye className="h-4 w-4" />
          </button>
        </Link>
      </div>

      {/* Çek Detay Modal */}
      {showDetailModal && selectedCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-lg font-semibold mb-4">Çek Detayları</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Çek No:</span>
                <span className="font-medium">{selectedCheck.check_number}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Tip:</span>
                <span className={`font-medium ${
                  selectedCheck.type === 'received' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {selectedCheck.type === 'received' ? 'Alınan Çek' : 'Verilen Çek'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Cari:</span>
                <span className="font-medium">{selectedCheck.customer?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Banka:</span>
                <span className="font-medium">{selectedCheck.bank_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Tutar:</span>
                <span className="font-semibold text-lg">{formatCurrency(selectedCheck.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Vade Tarihi:</span>
                <span className="font-medium">{formatDate(selectedCheck.due_date)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Durum:</span>
                <span className={`font-medium ${
                  selectedCheck.status === 'portfolio' ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {selectedCheck.status === 'portfolio' ? 'Portföyde' : 'Bankada'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Link href={`/cek/${selectedCheck.id}`} className="flex-1">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Detaya Git
                </button>
              </Link>
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default UpcomingChecksWidget;