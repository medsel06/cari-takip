'use client';

import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
        className: 'sonner-toast',
        duration: 4000,
        actionButtonStyle: {
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        }
      }}
      richColors
      closeButton
      expand={false}
      visibleToasts={3}
    />
  );
}