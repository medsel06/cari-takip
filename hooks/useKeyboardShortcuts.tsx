import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const router = useRouter();

  const shortcuts: ShortcutAction[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // Global search modal açılacak
        const event = new CustomEvent('openGlobalSearch');
        window.dispatchEvent(event);
      },
      description: 'Global arama'
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        // Yeni kayıt modalı
        const path = window.location.pathname;
        if (path.includes('/stok')) router.push('/stok/ekle');
        else if (path.includes('/cari')) router.push('/cari/yeni');
        else if (path.includes('/cek')) router.push('/cek/ekle');
        else toast.info('Bu sayfada yeni kayıt oluşturamazsınız');
      },
      description: 'Yeni kayıt'
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        // Save event
        const event = new CustomEvent('saveForm');
        window.dispatchEvent(event);
        toast.success('Kaydedildi');
      },
      description: 'Kaydet'
    },
    {
      key: 'p',
      ctrl: true,
      action: () => {
        window.print();
      },
      description: 'Yazdır'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modal
        const event = new CustomEvent('closeModal');
        window.dispatchEvent(event);
      },
      description: 'Kapat'
    },
    {
      key: '/',
      action: () => {
        // Focus search input
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Ara"]');
        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
        }
      },
      description: 'Arama odaklan'
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      action: () => {
        // Show help modal with shortcuts
        const event = new CustomEvent('showShortcuts');
        window.dispatchEvent(event);
      },
      description: 'Kısayolları göster'
    },
    // Navigation shortcuts
    {
      key: '1',
      alt: true,
      action: () => router.push('/'),
      description: 'Dashboard'
    },
    {
      key: '2',
      alt: true,
      action: () => router.push('/stok'),
      description: 'Stok'
    },
    {
      key: '3',
      alt: true,
      action: () => router.push('/cari'),
      description: 'Cari'
    },
    {
      key: '4',
      alt: true,
      action: () => router.push('/cek'),
      description: 'Çek'
    },
    {
      key: '5',
      alt: true,
      action: () => router.push('/nakit'),
      description: 'Nakit'
    }
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Input veya textarea içindeyken shortcuts çalışmasın
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Escape her zaman çalışsın
      if (e.key !== 'Escape') return;
    }

    shortcuts.forEach(shortcut => {
      const ctrlPressed = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftPressed = shortcut.shift ? e.shiftKey : true;
      const altPressed = shortcut.alt ? e.altKey : true;

      if (
        e.key === shortcut.key &&
        ctrlPressed &&
        shiftPressed &&
        altPressed
      ) {
        e.preventDefault();
        shortcut.action();
      }
    });
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Kısayol listesini göstermek için component
export const ShortcutsList = () => {
  const shortcuts = useKeyboardShortcuts();

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center justify-between p-2 rounded bg-secondary">
          <span className="text-sm">{shortcut.description}</span>
          <kbd className="px-2 py-1 text-xs font-semibold bg-background rounded border">
            {shortcut.ctrl && '⌘'}
            {shortcut.shift && '⇧'}
            {shortcut.alt && '⌥'}
            {shortcut.key}
          </kbd>
        </div>
      ))}
    </div>
  );
};