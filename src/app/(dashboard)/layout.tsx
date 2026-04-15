import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: '#0A0E1A' }}>
      <Sidebar userEmail={user.email} />
      <main className="lg:ml-[220px] min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
