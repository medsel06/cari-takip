'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/Toaster';
import { CommandPalette } from '@/components/ui/CommandPalette';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Keyboard shortcuts'ı aktifleştir
  useKeyboardShortcuts();
  
  // Auth sayfaları ve public sayfalar
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
  const isPublicPage = pathname === '/landing';
  
  useEffect(() => {
    const supabase = createClient();
    
    // Kullanıcı durumunu kontrol et
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Kullanıcı bilgilerini al
          const { data: userData } = await supabase
            .from('users')
            .select('*, companies(*)')
            .eq('id', user.id)
            .single();
            
          setUser(userData);
        } else if (!isAuthPage && !isPublicPage) {
          // Giriş yapmamış ve auth/public sayfasında değilse login'e yönlendir
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isAuthPage) {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && isAuthPage) {
        router.push('/');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [pathname, router, isAuthPage, isPublicPage]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block"
          >
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </motion.div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="flex h-screen bg-background">
          {/* Sidebar - Auth sayfalarında ve public sayfalarda gizle */}
          {!isAuthPage && !isPublicPage && (
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed md:relative z-40 h-full"
                >
                  <Sidebar />
                </motion.aside>
              )}
            </AnimatePresence>
          )}
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!isAuthPage && !isPublicPage && (
              <Header 
                user={user} 
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            )}
            
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
              <AnimatePresence>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className={isAuthPage || isPublicPage ? "h-full" : "container mx-auto px-6 py-8"}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          
          {/* Mobile Sidebar Overlay */}
          {!isAuthPage && !isPublicPage && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarCollapsed(true)}
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            />
          )}
        </div>
        
        {/* Global Components */}
        <CommandPalette />
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}