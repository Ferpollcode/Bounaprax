'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FREE_TRIAL_DAYS } from '@/lib/access'

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

  if (data.user) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + FREE_TRIAL_DAYS)

    const normalizedPlan = plan === 'pro' ? 'pro' : 'free'
    const accessExpiresAt = normalizedPlan === 'pro' ? null : expiresAt.toISOString()

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        { id: data.user.id, email, plan: normalizedPlan, is_admin: isAdmin, access_expires_at: accessExpiresAt },
        { onConflict: 'id' },
      )

    if (profileError) {
      const fallback = await admin
        .from('profiles')
        .upsert(
          { id: data.user.id, email, plan: normalizedPlan, is_admin: isAdmin },
          { onConflict: 'id' },
        )

      if (fallback.error) return { error: fallback.error.message }
    }
  }
  return { success: true }
}

export async function setUserAccessPlan(userId: string, plan: 'free' | 'pro') {
  await assertAdmin()

  const admin = getAdminClient()
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + FREE_TRIAL_DAYS)

  const payload = plan === 'pro'
    ? { plan: 'pro', access_expires_at: null }
    : { plan: 'free', access_expires_at: expiresAt.toISOString() }

  const profilePayload = {
    id: userId,
    email: authUser.user?.email ?? null,
    ...payload,
  }

  const { data, error } = await admin
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select('plan, access_expires_at')
    .single()

  if (!error) return { success: true, profile: data }

  const fallback = await admin
    .from('profiles')
    .upsert(
      { id: userId, email: authUser.user?.email ?? null, plan: payload.plan },
      { onConflict: 'id' },
    )
    .select('plan')
    .single()

  if (fallback.error) return { error: fallback.error.message }
  return { success: true, profile: fallback.data }
}

export async function deleteUser(userId: string) {
  await assertAdmin()

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function resetUserPassword(userId: string, password: string) {
  await assertAdmin()

  const temporaryPassword = password.trim()
  if (!temporaryPassword || temporaryPassword.length < 8) {
    return { error: 'La contraseña temporal debe tener al menos 8 caracteres.' }
  }

  const admin = getAdminClient()
  const { data: currentUser, error: getUserError } = await admin.auth.admin.getUserById(userId)
  if (getUserError || !currentUser.user) {
    return { error: getUserError?.message ?? 'No se encontró el usuario.' }
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    user_metadata: {
      ...(currentUser.user.user_metadata ?? {}),
      must_change_password: true,
    },
  })

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
