'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  Users,
  FileText,
  BarChart,
  Home,
  LogOut,
  Menu,
  X,
  DollarSign,
  TrendingUp,
  Wallet,
  Receipt,
  CreditCard,
  Settings,
  TrendingDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KatipLogo from '@/components/icons/KatipLogo';
import { KatipLogoSimple } from '@/components/icons/KatipLogoSimple';

const navigationGroups = [
  {
    title: '',
    items: [
      { name: 'Ana Sayfa', href: '/', icon: Home },
    ]
  },
  {
    title: 'İşlemler',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    titleColor: 'text-blue-700 dark:text-blue-400',
    items: [
      { name: 'Mal Alış/Satış', href: '/stok/hareketler', icon: TrendingUp },
      { name: 'Stok Yönetimi', href: '/stok', icon: Package },
      { name: 'Cari Hesaplar', href: '/cari', icon: Users },
      { name: 'Firma Detay', href: '/firma-detay', icon: FileText },
      { name: 'Faturalar', href: '/fatura', icon: Receipt },
      { name: 'Gelir-Gider', href: '/gelir-gider', icon: TrendingDown },
    ]
  },
  {
    title: 'Finans',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    titleColor: 'text-green-700 dark:text-green-400',
    items: [
      { name: 'Tahsilat/Ödeme', href: '/cari/tahsilat', icon: DollarSign },
      { name: 'Çek Yönetimi', href: '/cek', icon: CreditCard },
      { name: 'Nakit Yönetimi', href: '/nakit', icon: Wallet },
    ]
  },
  {
    title: '',
    items: [
      { name: 'Raporlar', href: '/raporlar', icon: BarChart },
      { name: 'Ayarlar', href: '/ayarlar', icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Listen for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Menü öğesinin aktif olup olmadığını kontrol et
  const isItemActive = (href: string) => {
    // Ana sayfa kontrolü
    if (href === '/') {
      return pathname === '/';
    }
    
    // Tam eşleşme kontrolü
    if (pathname === href) {
      return true;
    }
    
    // Özel durumlar için manuel kontrol
    // Sadece belirli alt sayfalar için üst menüyü aktif göster
    const activeSubpages: { [key: string]: string[] } = {
      '/stok': ['/stok/ekle', '/stok/duzenle'],
      '/cari': ['/cari/ekle', '/cari/yeni', '/cari/duzenle'],
      '/gelir-gider': ['/gelir-gider/yeni'],
      '/fatura': ['/fatura/yeni', '/fatura/ayarlar'],
      '/nakit': ['/nakit/hesaplar', '/nakit/transfer'],
      '/cek': [],
      // Not: /stok/hareketler kendi başına bir menü öğesi olduğu için /stok'u aktif yapmıyoruz
      // Not: /cari/tahsilat kendi başına bir menü öğesi olduğu için /cari'yi aktif yapmıyoruz
    };
    
    // Eğer bu menü için tanımlı alt sayfalar varsa kontrol et
    if (activeSubpages[href]) {
      return activeSubpages[href].some(subpage => pathname.startsWith(subpage));
    }
    
    // ID'li sayfalar için kontrol (örn: /stok/123, /cari/456)
    // Sadece doğrudan ID'li alt sayfalar için aktif yap
    if (pathname.startsWith(href + '/')) {
      const remainingPath = pathname.slice(href.length + 1);
      // Eğer kalan kısım UUID veya sayı ise (ve başka / yoksa)
      if (!remainingPath.includes('/') && /^[0-9a-f-]+$/i.test(remainingPath)) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-white shadow-md border border-slate-200 dark:border-slate-700"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-start h-16 px-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900">
            <Link href="/" className="transition-transform hover:scale-105 duration-200 w-full">
              {/* SVG Logo Versiyonu */}
              {/* <KatipLogo width={120} height={40} isDarkMode={isDarkMode} className="drop-shadow-sm" /> */}
              
              {/* CSS Logo Versiyonu (Daha basit) */}
              <KatipLogoSimple className="" />
            </Link>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {navigationGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {group.title && (
                    <h3 className={`px-3 mb-2 text-xs font-semibold uppercase tracking-wider ${
                      group.titleColor || 'text-slate-500'
                    }`}>
                      {group.title}
                    </h3>
                  )}
                  <div className={`space-y-1 ${
                    group.title 
                      ? `p-2 rounded-lg border ${group.bgColor || 'bg-white dark:bg-slate-800'} ${group.borderColor || 'border-slate-200 dark:border-slate-700'}` 
                      : ''
                  }`}>
                    {group.items.map((item) => {
                      const isActive = isItemActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          prefetch={false}
                          className="block"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-md'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {/* Aktif menü için sol çizgi */}
                            {isActive && (
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1 bg-white/40 rounded-r-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}
                            
                            <item.icon className={`mr-3 h-4 w-4 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                            }`} />
                            
                            <span className={isActive ? 'font-semibold' : ''}>
                              {item.name}
                            </span>
                            
                            {/* Aktif menü için sağ ok */}
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="ml-auto"
                              >
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </motion.div>
                            )}
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </nav>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <LogOut className="mr-3 h-5 w-5 text-slate-500 dark:text-slate-400" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}