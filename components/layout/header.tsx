'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Bell, Settings, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { motion } from 'framer-motion';
import { NotificationCenter } from '@/components/NotificationCenter';

interface HeaderProps {
  user?: any;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({ user, sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      setUserEmail(user.email);
      setCompanyName(user.companies?.name);
    } else {
      const getUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email);
          
          // Get company name
          const { data: userData } = await supabase
            .from('users')
            .select('*, companies(*)')
            .eq('id', user.id)
            .single();

          if (userData?.companies) {
            setCompanyName(userData.companies.name);
          }
        }
      };

      getUser();
    }
  }, [supabase, user]);

  return (
    <header className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 shadow-lg border-b border-slate-700/50 h-16">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Sidebar Toggle */}
          {sidebarCollapsed && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleSidebar}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <Menu className="h-5 w-5" />
            </motion.button>
          )}
          
          <div>
            <h2 className="text-lg font-semibold text-white">
              {companyName || 'Yükleniyor...'}
            </h2>
            <p className="text-xs text-slate-400">Kurumsal Yönetim Sistemi</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Dark Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            aria-label="Toggle dark mode"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </motion.div>
          </motion.button>
          
          {/* Notifications */}
          <NotificationCenter />
          
          {/* Settings */}
          <button className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all">
            <Settings className="h-5 w-5" />
          </button>
          
          {/* User Profile */}
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-700/50">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="hidden md:block">
              <span className="text-sm font-medium text-white">{userEmail}</span>
              <p className="text-xs text-slate-400">Yönetici</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}