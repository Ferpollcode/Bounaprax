'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const INTERNAL_DOMAIN = '@bounaprax.com'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function resolveLoginEmail(login: string) {
  const normalizedLogin = login.trim().toLowerCase()
  if (!normalizedLogin) return null
  if (normalizedLogin.includes('@')) return normalizedLogin

  const internalEmail = `${normalizedLogin}${INTERNAL_DOMAIN}`
  const admin = getAdminClient()

  const { data: profileMatches } = await admin
    .from('profiles')
    .select('email')
    .ilike('email', `${normalizedLogin}@%`)
    .limit(10)

  const profileEmails = (profileMatches ?? [])
    .map(profile => profile.email?.toLowerCase())
    .filter((email): email is string => Boolean(email))

  if (profileEmails.includes(internalEmail)) return internalEmail
  if (profileEmails.length === 1) return profileEmails[0]

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return internalEmail

  const matchingEmails = data.users
    .map(user => user.email?.toLowerCase())
    .filter((email): email is string => Boolean(email))
    .filter(email => email.split('@')[0] === normalizedLogin)

  if (matchingEmails.includes(internalEmail)) return internalEmail
  return matchingEmails[0] ?? internalEmail
}

export async function loginWithCredentials(login: string, password: string) {
  const email = await resolveLoginEmail(login)
  if (!email) return { error: 'Usuario o contraseña incorrectos.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Usuario o contraseña incorrectos.' }

  return {
    success: true,
    mustChangePassword: data.user?.user_metadata?.must_change_password === true,
  }
}
