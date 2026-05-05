export type AccessPlan = 'free' | 'pro' | 'optimiza'

export const FREE_TRIAL_DAYS = 15

export function isOptimizaPlan(plan?: string | null) {
  return plan === 'pro' || plan === 'optimiza'
}

export function getAccessExpiresAt(profile?: { access_expires_at?: string | null; created_at?: string | null; plan?: string | null } | null) {
  if (!profile || isOptimizaPlan(profile.plan)) return null
  if (profile.access_expires_at) return profile.access_expires_at
  if (!profile.created_at) return null

  const createdAt = new Date(profile.created_at)
  if (Number.isNaN(createdAt.getTime())) return null
  createdAt.setDate(createdAt.getDate() + FREE_TRIAL_DAYS)
  return createdAt.toISOString()
}

export function hasOptimizaAccess(profile?: { plan?: string | null; access_expires_at?: string | null; created_at?: string | null } | null) {
  if (isOptimizaPlan(profile?.plan)) return true

  const expiresAt = getAccessExpiresAt(profile)
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() >= Date.now()
}

export function formatAccessDate(iso?: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
