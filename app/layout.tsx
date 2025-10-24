import { ReactNode } from 'react';
import { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kâtip - İşletme Yönetim Sistemi',
  description: 'Stok takibi, cari hesap, çek yönetimi ve nakit akışı kontrolü. Tüm işlemlerinizi tek platformda yönetin.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}