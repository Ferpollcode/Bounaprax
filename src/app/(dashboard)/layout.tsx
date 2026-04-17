import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const userName = (user.user_metadata?.nombre as string | undefined) || undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={user.email} userName={userName} />
      <main className="lg:ml-[220px] min-h-screen pt-14 lg:pt-0 mobile-safe-bottom overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
