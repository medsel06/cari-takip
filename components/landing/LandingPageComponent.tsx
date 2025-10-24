'use client';

import { useRouter } from 'next/navigation';

export default function LandingPageComponent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Kâtip
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            İşletme Yönetim Sistemi
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}