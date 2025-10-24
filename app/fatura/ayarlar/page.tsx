import EInvoiceSettings from '@/components/einvoice/settings';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function EInvoiceSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/fatura"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Faturalara Dön
        </Link>
      </div>

      <EInvoiceSettings />
    </div>
  );
}