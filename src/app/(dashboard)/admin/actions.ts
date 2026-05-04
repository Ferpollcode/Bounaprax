'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Sin permisos')
  return user.id
}

export async function createUser(formData: FormData) {
  await assertAdmin()

  const username  = (formData.get('username') as string).trim().toLowerCase()
  const password  = formData.get('password') as string
  const nombre    = (formData.get('nombre') as string).trim()
  const plan      = formData.get('plan') as 'free' | 'pro'
  const isAdmin   = formData.get('is_admin') === 'on'

  if (!username || !password || password.length < 6) {
    return { error: 'Usuario y contraseña (mín. 6 caracteres) son obligatorios.' }
  }

  const email = `${username}@bounaprax.com`
  const admin = getAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre || username, must_change_password: true },
  })

  if (error) {
    if (error.message.includes('already')) return { error: 'Ese nombre de usuario ya existe.' }
    return { error: error.message }
  }

  // El trigger crea el perfil en 'free'; desde admin definimos los permisos iniciales.
  if (data.user) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({ plan: plan === 'pro' ? 'pro' : 'free', is_admin: isAdmin, email })
      .eq('id', data.user.id)

    if (profileError) return { error: profileError.message }
  }

  return { success: true }
}

export async function deleteUser(userId: string) {
  await assertAdmin()

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function setAdminPermission(userId: string, isAdmin: boolean) {
  const currentUserId = await assertAdmin()

  if (!isAdmin && userId === currentUserId) {
    return { error: 'No podés quitarte tus propios permisos de admin.' }
  }

  const admin = getAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_admin: isAdmin })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}
