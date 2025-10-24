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

  // Önce kullanıcıyı kontrol et
  let { data: userData } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', user.id)
    .maybeSingle()

  // Kullanıcı yoksa otomatik oluştur
  if (!userData) {
    // Önce bir şirket bul veya oluştur
    let { data: company } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (!company) {
      const { data: newCompany } = await supabase
        .from('companies')
        .insert({ name: 'Demo Şirketi' })
        .select('id')
        .single()
      
      company = newCompany
    }

    // Kullanıcı kaydını oluştur
    if (company?.id) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          company_id: company.id,
          full_name: user.email?.split('@')[0] || 'Kullanıcı',
          role: 'user'
        })
        .select('*, companies(*)')
        .single()
      
      userData = newUser
    }
  }

  if (!userData?.company_id) {
    redirect('/register')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={userData} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}