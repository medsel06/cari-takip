'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Email adresiniz doğrulanıyor...');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // URL'den code parametresini al
        const code = new URLSearchParams(window.location.search).get('code');
        
        if (!code) {
          throw new Error('Doğrulama kodu bulunamadı');
        }

        // Code'u session'a çevir
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          throw sessionError;
        }

        // Kullanıcı bilgilerini al
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Kullanıcı bilgileri alınamadı');
        }

        setMessage('Email doğrulandı! Firma bilgileriniz oluşturuluyor...');

        // Metadata'dan firma bilgilerini al
        const companyName = user.user_metadata?.company_name;
        const taxNumber = user.user_metadata?.tax_number;
        const fullName = user.user_metadata?.full_name;

        if (!companyName) {
          throw new Error('Firma bilgileri bulunamadı');
        }

        // Önce users tablosuna kaydet
        const { error: userInsertError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: 'admin'
          }]);

        if (userInsertError && userInsertError.code !== '23505') { // Duplicate key hatası değilse
          console.error('User insert error:', userInsertError);
        }

        // RPC ile firma oluştur
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'create_company_and_link_user',
          {
            p_company_name: companyName,
            p_tax_number: taxNumber || null
          }
        );

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          throw new Error('Firma oluşturulurken hata oluştu: ' + rpcError.message);
        }

        if (rpcData && !rpcData.success) {
          throw new Error(rpcData.error || 'Firma oluşturulamadı');
        }

        // Başarılı
        setIsSuccess(true);
        setMessage('Hesabınız başarıyla oluşturuldu! Ana sayfaya yönlendiriliyorsunuz...');
        
        // 2 saniye sonra dashboard'a yönlendir
        setTimeout(() => {
          router.push('/');
        }, 2000);

      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'Doğrulama sırasında bir hata oluştu');
        setIsLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          {isLoading && !error && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{message}</h2>
            </>
          )}
          
          {isSuccess && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">{message}</h2>
            </>
          )}
          
          {error && (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Hata Oluştu</h2>
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => router.push('/register')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tekrar Dene
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Giriş Yap
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}