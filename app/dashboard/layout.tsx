import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Varsayılan kullanıcı objesi
  const defaultUser = {
    id: user.id,
    email: user.email!,
    full_name: user.email?.split('@')[0] || 'Kullanıcı',
    role: 'user',
    company_id: 'f7a0f03d-81b8-4f60-bd7d-8842530ecb6b',
    companies: {
      id: 'f7a0f03d-81b8-4f60-bd7d-8842530ecb6b',
      name: 'ALSE PLASTİK'
    }
  }

  // Kullanıcı bilgisini almayı dene
  const { data: userData } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', user.id)
    .maybeSingle()

  // Kullanıcı verisi yoksa varsayılanı kullan
  const currentUser = userData || defaultUser

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}