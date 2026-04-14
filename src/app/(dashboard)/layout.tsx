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
      <main className="ml-[220px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
