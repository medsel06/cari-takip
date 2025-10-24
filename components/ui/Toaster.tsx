'use client';

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/providers/ThemeProvider';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as 'light' | 'dark' | 'system'}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-gray-950 dark:group-[.toaster]:text-gray-50 dark:group-[.toaster]:border-gray-800',
          description: 'group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400',
          actionButton:
            'group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50 dark:group-[.toast]:bg-gray-50 dark:group-[.toast]:text-gray-900',
          cancelButton:
            'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-400',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 dark:group-[.toaster]:bg-green-900/20 dark:group-[.toaster]:text-green-100',
          error: 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 dark:group-[.toaster]:bg-red-900/20 dark:group-[.toaster]:text-red-100',
          warning: 'group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 dark:group-[.toaster]:bg-yellow-900/20 dark:group-[.toaster]:text-yellow-100',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 dark:group-[.toaster]:bg-blue-900/20 dark:group-[.toaster]:text-blue-100',
        },
      }}
    />
  );
}