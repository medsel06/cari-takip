'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { 
  Search, Package, Users, FileText, Wallet, 
  TrendingUp, Settings, Plus, Home, LogOut,
  Calculator, Calendar, DollarSign, Receipt
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const commands = {
    navigation: [
      { 
        icon: Home, 
        label: 'Ana Sayfa', 
        shortcut: 'G H',
        action: () => router.push('/') 
      },
      { 
        icon: Package, 
        label: 'Stok Yönetimi', 
        shortcut: 'G S',
        action: () => router.push('/stok') 
      },
      { 
        icon: Users, 
        label: 'Cari Hesaplar', 
        shortcut: 'G C',
        action: () => router.push('/cari') 
      },
      { 
        icon: FileText, 
        label: 'Çek Yönetimi', 
        shortcut: 'G K',
        action: () => router.push('/cek') 
      },
      { 
        icon: Wallet, 
        label: 'Nakit Yönetimi', 
        shortcut: 'G N',
        action: () => router.push('/nakit') 
      },
      { 
        icon: Receipt, 
        label: 'Faturalar', 
        shortcut: 'G F',
        action: () => router.push('/fatura') 
      },
      { 
        icon: TrendingUp, 
        label: 'Raporlar', 
        shortcut: 'G R',
        action: () => router.push('/raporlar') 
      },
    ],
    actions: [
      { 
        icon: Plus, 
        label: 'Yeni Ürün Ekle', 
        action: () => router.push('/stok/ekle') 
      },
      { 
        icon: Plus, 
        label: 'Yeni Cari Ekle', 
        action: () => router.push('/cari/ekle') 
      },
      { 
        icon: Plus, 
        label: 'Çek Girişi', 
        action: () => router.push('/cek?new=true') 
      },
      { 
        icon: Plus, 
        label: 'Nakit İşlem', 
        action: () => router.push('/nakit/hareketler/yeni') 
      },
      { 
        icon: Plus, 
        label: 'Yeni Fatura', 
        action: () => router.push('/fatura/yeni') 
      },
    ],
    tools: [
      { 
        icon: Calculator, 
        label: 'Hesap Makinesi', 
        action: () => console.log('Calculator') 
      },
      { 
        icon: Calendar, 
        label: 'Takvim', 
        action: () => console.log('Calendar') 
      },
      { 
        icon: DollarSign, 
        label: 'Kur Çevirici', 
        action: () => console.log('Currency Converter') 
      },
    ],
    system: [
      { 
        icon: Settings, 
        label: 'Ayarlar', 
        action: () => router.push('/ayarlar') 
      },
      { 
        icon: LogOut, 
        label: 'Çıkış Yap', 
        action: () => console.log('Logout') 
      },
    ]
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50"
    >
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Command.Input 
            placeholder="Ara veya komut gir..." 
            className="w-full px-6 py-4 text-lg bg-transparent outline-none border-b border-gray-200 dark:border-gray-700"
          />
          
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              Sonuç bulunamadı.
            </Command.Empty>
            
            <Command.Group heading="Navigasyon" className="px-2 py-2">
              {commands.navigation.map((cmd) => (
                <Command.Item
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.action)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <cmd.icon className="h-4 w-4 text-gray-500" />
                    <span>{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-xs text-gray-400">{cmd.shortcut}</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
            
            <Command.Group heading="Hızlı İşlemler" className="px-2 py-2">
              {commands.actions.map((cmd) => (
                <Command.Item
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.action)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <cmd.icon className="h-4 w-4 text-gray-500" />
                  <span>{cmd.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
            
            <Command.Group heading="Araçlar" className="px-2 py-2">
              {commands.tools.map((cmd) => (
                <Command.Item
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.action)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <cmd.icon className="h-4 w-4 text-gray-500" />
                  <span>{cmd.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
            
            <Command.Group heading="Sistem" className="px-2 py-2">
              {commands.system.map((cmd) => (
                <Command.Item
                  key={cmd.label}
                  value={cmd.label}
                  onSelect={() => runCommand(cmd.action)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <cmd.icon className="h-4 w-4 text-gray-500" />
                  <span>{cmd.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
                  Gezin
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">⏎</kbd>
                  Seç
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">ESC</kbd>
                  Kapat
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}