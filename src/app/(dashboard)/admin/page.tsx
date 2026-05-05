import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/inicio')

  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, user_id, email, message, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: users, error } = await supabase.rpc('admin_get_users')

  if (error || !users) {
    const { data: fallbackUsers, error: fallbackError } = await supabase
      .from('profiles')
      .select('id, email, plan, access_expires_at, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (fallbackError || !fallbackUsers) redirect('/inicio')
    return <AdminClient initialUsers={fallbackUsers} initialFeedback={feedback ?? []} currentUserId={user.id} />
  }

  return <AdminClient initialUsers={users} initialFeedback={feedback ?? []} currentUserId={user.id} />
}
