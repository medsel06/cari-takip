'use client';

import { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, TrendingDown, FileText, DollarSign, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// formatDate fonksiyonunu ekleyelim
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Notification {
  id: string;
  type: 'stock' | 'check' | 'payment' | 'system';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  link?: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Her dakika kontrol
    return () => clearInterval(interval);
  }, []);

  const checkNotifications = async () => {
    const newNotifications: Notification[] = [];
    
    try {
      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) return;

      // 1. Kritik stok kontrolü - Önce tüm ürünleri al, sonra filtreleme yap
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', userData.company_id);

      // JavaScript'te filtreleme yap
      const products = allProducts?.filter(p => p.current_stock < p.min_stock) || [];

      products?.forEach(product => {
        if (product.current_stock <= 0) {
          newNotifications.push({
            id: `stock-${product.id}`,
            type: 'stock',
            severity: 'error',
            title: 'Stok Tükendi!',
            message: `${product.name} ürünü tükendi`,
            link: `/stok/${product.id}`,
            timestamp: new Date(),
            read: false
          });
        } else if (product.current_stock < product.min_stock) {
          newNotifications.push({
            id: `stock-${product.id}`,
            type: 'stock',
            severity: 'warning',
            title: 'Kritik Stok',
            message: `${product.name} kritik seviyede (${product.current_stock} ${product.unit})`,
            link: `/stok/${product.id}`,
            timestamp: new Date(),
            read: false
          });
        }
      });

      // 2. Vade kontrolü (Çekler)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: checks } = await supabase
        .from('checks')
        .select('*, customer:customers(name)')
        .eq('company_id', userData.company_id)
        .eq('status', 'portfolio')
        .lte('due_date', tomorrow.toISOString());

      checks?.forEach(check => {
        const dueDate = new Date(check.due_date);
        const today = new Date();
        const isOverdue = dueDate < today;
        
        newNotifications.push({
          id: `check-${check.id}`,
          type: 'check',
          severity: isOverdue ? 'error' : 'warning',
          title: isOverdue ? 'Vadesi Geçmiş Çek!' : 'Vade Yaklaşıyor',
          message: `${check.customer?.name} - ${formatCurrency(check.amount)} - ${formatDate(check.due_date)}`,
          link: `/cek/${check.id}`,
          timestamp: new Date(),
          read: false
        });
      });

      // 3. Tahsilat hatırlatıcıları
      const { data: overduePayments } = await supabase
        .from('account_movements')
        .select('*, customer:customers(name)')
        .eq('company_id', userData.company_id)
        .eq('movement_type', 'CREDIT')
        .eq('is_paid', false)
        .lt('due_date', new Date().toISOString());

      overduePayments?.forEach(payment => {
        newNotifications.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          severity: 'warning',
          title: 'Tahsilat Bekliyor',
          message: `${payment.customer?.name} - ${formatCurrency(payment.amount)}`,
          link: `/cari/${payment.customer_id}`,
          timestamp: new Date(),
          read: false
        });
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Bildirim kontrolü hatası:', error);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock': return Package;
      case 'check': return FileText;
      case 'payment': return DollarSign;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-500 bg-red-50';
      case 'warning': return 'text-orange-500 bg-orange-50';
      case 'success': return 'text-green-500 bg-green-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-full md:w-96 bg-background border-l shadow-lg z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Bildirimler</h3>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <>
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Tümünü okundu işaretle
                      </button>
                      <button
                        onClick={clearAll}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Temizle
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto h-[calc(100vh-64px)]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-3 opacity-20" />
                    <p>Bildirim yok</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map(notification => {
                      const Icon = getIcon(notification.type);
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 hover:bg-secondary/50 transition-colors ${
                            !notification.read ? 'bg-secondary/20' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`p-2 rounded-lg ${getSeverityColor(notification.severity)}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(notification.timestamp)}
                                </span>
                                {notification.link && (
                                  <Link
                                    href={notification.link}
                                    onClick={() => {
                                      markAsRead(notification.id);
                                      setIsOpen(false);
                                    }}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    Görüntüle →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}