'use client';

import Link from 'next/link';
import { FileText, Package, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';

export default function RaporlarPage() {
  const reports = [
    {
      title: 'Stok Raporları',
      description: 'Stok durumu, hareketler ve kritik stok raporları',
      icon: Package,
      color: 'bg-blue-500',
      links: [
        { href: '/raporlar/stok-durumu', label: 'Stok Durumu' },
        { href: '/raporlar/stok-hareketleri', label: 'Stok Hareketleri' },
        { href: '/raporlar/kritik-stok', label: 'Kritik Stok' },
      ],
    },
    {
      title: 'Cari Raporları',
      description: 'Cari bakiyeler, ekstre ve yaşlandırma raporları',
      icon: Users,
      color: 'bg-green-500',
      links: [
        { href: '/raporlar/cari-bakiye', label: 'Cari Bakiyeler' },
        { href: '/raporlar/cari-ekstre', label: 'Cari Ekstre' },
        { href: '/raporlar/yaslandirma', label: 'Yaşlandırma' },
      ],
    },
    {
      title: 'Çek Raporları',
      description: 'Çek portföyü, vadeler ve risk analizi',
      icon: FileText,
      color: 'bg-orange-500',
      links: [
        { href: '/raporlar/cek-portfoy', label: 'Çek Portföyü' },
        { href: '/raporlar/vade-raporu', label: 'Vade Raporu' },
        { href: '/raporlar/risk-analizi', label: 'Risk Analizi' },
      ],
    },
    {
      title: 'Finansal Raporlar',
      description: 'Genel finansal durum ve performans raporları',
      icon: DollarSign,
      color: 'bg-purple-500',
      links: [
        { href: '/raporlar/finansal-ozet', label: 'Finansal Özet' },
        { href: '/raporlar/kar-zarar', label: 'Kar-Zarar' },
        { href: '/raporlar/nakit-akis', label: 'Nakit Akış' },
      ],
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Raporlar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className={`${report.color} p-3 rounded-lg mr-4`}>
                <report.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
            </div>
            <div className="space-y-2">
              {report.links.map((link, linkIndex) => (
                <Link
                  key={linkIndex}
                  href={link.href}
                  className="block px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}