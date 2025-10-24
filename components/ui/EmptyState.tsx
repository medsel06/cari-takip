import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="rounded-full bg-secondary p-3 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="btn btn-primary"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="btn btn-primary"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// Preset Empty States
import { Package, Users, FileText, Wallet, Search, AlertCircle } from 'lucide-react';

export const EmptyStates = {
  NoProducts: () => (
    <EmptyState
      icon={Package}
      title="Henüz ürün eklenmemiş"
      description="İlk ürününüzü ekleyerek stok takibine başlayın"
      action={{
        label: "İlk Ürünü Ekle",
        href: "/stok/ekle"
      }}
    />
  ),
  
  NoCustomers: () => (
    <EmptyState
      icon={Users}
      title="Cari hesap bulunamadı"
      description="Müşteri veya tedarikçilerinizi ekleyerek başlayın"
      action={{
        label: "Cari Ekle",
        href: "/cari/yeni"
      }}
    />
  ),
  
  NoChecks: () => (
    <EmptyState
      icon={FileText}
      title="Çek kaydı yok"
      description="Alınan veya verilen çekleri buradan takip edebilirsiniz"
      action={{
        label: "Çek Ekle",
        href: "/cek/ekle"
      }}
    />
  ),
  
  NoCash: () => (
    <EmptyState
      icon={Wallet}
      title="Nakit hesabı tanımlanmamış"
      description="Kasa veya banka hesaplarınızı tanımlayarak başlayın"
      action={{
        label: "Hesap Ekle",
        href: "/nakit/hesaplar/yeni"
      }}
    />
  ),
  
  NoSearchResults: () => (
    <EmptyState
      icon={Search}
      title="Sonuç bulunamadı"
      description="Arama kriterlerinizi değiştirmeyi deneyin"
    />
  ),
  
  Error: ({ retry }: { retry?: () => void }) => (
    <EmptyState
      icon={AlertCircle}
      title="Bir hata oluştu"
      description="Veriler yüklenirken hata oluştu. Lütfen tekrar deneyin."
      action={retry ? {
        label: "Tekrar Dene",
        onClick: retry
      } : undefined}
    />
  )
};