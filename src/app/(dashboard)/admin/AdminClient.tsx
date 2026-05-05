'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, deleteUser, setAdminPermission, setUserAccessPlan } from './actions'
import { formatAccessDate, getAccessExpiresAt, isOptimizaPlan } from '@/lib/access'

type UserRow = {
  id: string
  email: string | null
  plan?: 'free' | 'pro' | 'optimiza' | null
  access_expires_at?: string | null
  is_admin: boolean
  created_at: string
}

type FeedbackRow = {
  id: string
  user_id: string
  email: string | null
  message: string
  created_at: string
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function username(email: string | null) {
  if (!email) return '—'
  return email.split('@')[0]
}

function displayName(email: string | null) {
  const u = username(email)
  return u.charAt(0).toUpperCase() + u.slice(1)
}

function planLabel(user: UserRow) {
  if (isOptimizaPlan(user.plan)) return 'PRO'
  return 'Free'
}

function freeUntil(user: UserRow) {
  return getAccessExpiresAt(user)
}

// ── Modal crear usuario ────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createUser(fd)
      if (res.error) { setError(res.error); return }
      onCreated()
    })
  }

  const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 anim-fade-up"
        style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)' }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            Nuevo usuario
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: 'var(--overlay-sm)', color: 'var(--muted-foreground)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
              Nombre para mostrar
            </p>
            <input name="nombre" type="text" placeholder="Ej: María García"
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
              Usuario <span style={{ color: '#3EC9C9' }}>*</span>
            </p>
            <div className="flex items-center gap-0">
              <input name="username" type="text" placeholder="usuario" required
                className="flex-1 h-10 px-3.5 rounded-l-xl text-sm outline-none"
                style={{ ...inputStyle, borderRight: 'none', borderRadius: '12px 0 0 12px' }} />
              <span className="h-10 px-3 flex items-center text-sm rounded-r-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderLeft: 'none', color: 'var(--text-subtle)', borderRadius: '0 12px 12px 0' }}>
                @bounaprax.com
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
              Contraseña temporal <span style={{ color: '#3EC9C9' }}>*</span>
            </p>
            <input name="password" type="text" placeholder="Mín. 6 caracteres" required
              className={inputCls} style={inputStyle} />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-subtle)' }}>
              El usuario deberá cambiarla al primer ingreso.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Plan</p>
            <div className="flex gap-2">
              {(['free', 'pro'] as const).map(p => (
                <label key={p} className="flex-1 cursor-pointer">
                  <input type="radio" name="plan" value={p} defaultChecked={p === 'free'} className="sr-only" />
                  <div className="h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all peer-checked:ring-2"
                    style={{
                      background: p === 'pro' ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${p === 'pro' ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
                      color: p === 'pro' ? '#F5A623' : 'var(--muted-foreground)',
                    }}>
                    {p === 'pro' ? 'PRO' : 'Free'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl p-3 cursor-pointer"
            style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.22)' }}>
            <input
              type="checkbox"
              name="is_admin"
              className="mt-0.5 h-4 w-4 rounded"
              style={{ accentColor: '#F5A623' }}
            />
            <span>
              <span className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Dar permisos de admin
              </span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Podrá acceder al panel de administración y gestionar usuarios.
              </span>
            </span>
          </label>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 h-10 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#fff' }}>
              {pending ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────
export function AdminClient({
  initialUsers,
  initialFeedback,
  currentUserId,
}: {
  initialUsers: UserRow[]
  initialFeedback?: FeedbackRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [users, setUsers]     = useState<UserRow[]>(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRow | null>(null)

  async function applyAccessPlan(user: UserRow, plan: 'free' | 'optimiza') {
    setLoadingId(`${user.id}_${plan}`)
    const res = await setUserAccessPlan(user.id, plan)
    if (!res.error) {
      setUsers(prev => prev.map(u => {
        if (u.id !== user.id) return u
        const profile = res.profile as Partial<UserRow> | undefined
        return {
          ...u,
          plan: profile?.plan ?? (plan === 'optimiza' ? 'pro' : 'free'),
          access_expires_at: plan === 'optimiza' ? null : profile?.access_expires_at ?? u.access_expires_at,
        }
      }))
      router.refresh()
    }
    setLoadingId(null)
  }

  async function handleDelete(user: UserRow) {
    setLoadingId(user.id + '_del')
    const res = await deleteUser(user.id)
    if (!res.error) setUsers(prev => prev.filter(u => u.id !== user.id))
    setConfirmDelete(null)
    setLoadingId(null)
  }

  async function handleSetAdmin(user: UserRow, isAdmin: boolean) {
    setLoadingId(user.id + '_admin')
    const res = await setAdminPermission(user.id, isAdmin)
    if (!res.error) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: isAdmin } : u))
    setLoadingId(null)
  }

  function handleCreated() {
    setShowCreate(false)
    router.refresh()
  }

  const total = users.length
  const optimiza = users.filter(u => isOptimizaPlan(u.plan)).length
  const free = total - optimiza
  const feedback = initialFeedback ?? []

  return (
    <>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-5 anim-fade-up"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-subtle)' }}>
                  Feedback
                </p>
                <h2 className="text-base font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                  {displayName(selectedFeedback.email)}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {fmtDate(selectedFeedback.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedback(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--overlay-sm)', color: 'var(--muted-foreground)' }}
                aria-label="Cerrar feedback"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="rounded-xl p-4 max-h-[55vh] overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
                {selectedFeedback.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-xs rounded-2xl p-6 anim-fade-up"
            style={{ background: 'var(--card)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
              ¿Eliminar usuario?
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--muted-foreground)' }}>
              Se eliminará <strong>{displayName(confirmDelete.email)}</strong> permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 h-9 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                disabled={loadingId === confirmDelete.id + '_del'}
                className="flex-1 h-9 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
                {loadingId === confirmDelete.id + '_del' ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 anim-fade-up">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#F5A623' }}>Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              Usuarios
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {optimiza} en PRO · {free} en Free
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#fff' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Nuevo usuario
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 stagger">
          {[
            { label: 'Total', value: total, color: '#3EC9C9' },
            { label: 'PRO', value: optimiza, color: '#F5A623' },
            { label: 'Free', value: free, color: 'var(--muted-foreground)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 anim-fade-up"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className="rounded-2xl p-4 mb-6 anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-subtle)' }}>
                Feedback
              </p>
              <h2 className="text-base font-bold mt-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                Recomendaciones de usuarios
              </h2>
            </div>
            <span className="h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center"
              style={{ background: 'rgba(62,201,201,0.1)', color: '#3EC9C9', border: '1px solid rgba(62,201,201,0.2)' }}>
              {feedback.length}
            </span>
          </div>

          {feedback.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Todavía no hay feedback recibido.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {feedback.map(item => (
                <div key={item.id} className="rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                      {displayName(item.email)}
                    </p>
                    <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-subtle)' }}>
                      {fmtDate(item.created_at)}
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap max-h-16 overflow-hidden" style={{ color: 'var(--muted-foreground)' }}>
                    {item.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFeedback(item)}
                    className="mt-2 text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ color: '#3EC9C9' }}
                  >
                    Ver completo
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabla desktop */}
        <div className="hidden sm:block rounded-2xl overflow-hidden anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Usuario', 'Email', 'Alta', 'Acceso', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--text-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}
                  style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(62,201,201,0.1)', color: '#3EC9C9' }}>
                        {displayName(u.email)[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {displayName(u.email)}
                        </p>
                        {u.is_admin && (
                          <p className="text-[10px] font-bold" style={{ color: '#F5A623' }}>ADMIN</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                    {username(u.email)}
                  </td>
                  <td className="px-4 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="inline-flex items-center h-7 px-3 rounded-lg text-xs font-semibold"
                          style={{
                            background: isOptimizaPlan(u.plan) ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isOptimizaPlan(u.plan) ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            color: isOptimizaPlan(u.plan) ? '#F5A623' : 'var(--muted-foreground)',
                          }}>
                          {planLabel(u)}
                        </span>
                        {!isOptimizaPlan(u.plan) && (
                          <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                            hasta {formatAccessDate(freeUntil(u))}
                          </span>
                        )}
                        <button
                          onClick={() => applyAccessPlan(u, 'free')}
                          disabled={loadingId === `${u.id}_free`}
                          className="h-7 px-2.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}>
                          {loadingId === `${u.id}_free` ? '...' : 'Free 15 días'}
                        </button>
                        <button
                          onClick={() => applyAccessPlan(u, 'optimiza')}
                          disabled={loadingId === `${u.id}_optimiza`}
                          className="h-7 px-2.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                          style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623' }}>
                          {loadingId === `${u.id}_optimiza` ? '...' : 'PRO'}
                        </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSetAdmin(u, !u.is_admin)}
                        disabled={loadingId === u.id + '_admin' || (u.is_admin && u.id === currentUserId)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-40"
                        style={{
                          background: u.is_admin ? 'rgba(248,113,113,0.08)' : 'rgba(245,166,35,0.1)',
                          color: u.is_admin ? '#F87171' : '#F5A623',
                        }}
                        title={u.is_admin ? 'Quitar permisos de admin' : 'Dar permisos de admin'}>
                        {loadingId === u.id + '_admin'
                          ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                            </svg>
                          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                              <path d="M12 3l7 3v5c0 4.6-2.8 8.7-7 10-4.2-1.3-7-5.4-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                              {u.is_admin
                                ? <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                : <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              }
                            </svg>
                        }
                      </button>
                      {!u.is_admin && (
                        <button onClick={() => setConfirmDelete(u)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                          style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171' }}
                          title="Eliminar usuario">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards mobile */}
        <div className="sm:hidden space-y-3 anim-fade-up">
          {users.map(u => (
            <div key={u.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(62,201,201,0.1)', color: '#3EC9C9' }}>
                    {displayName(u.email)[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                      {displayName(u.email)}
                      {u.is_admin && (
                        <span className="ml-1.5 text-[9px] font-bold" style={{ color: '#F5A623' }}>ADMIN</span>
                      )}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{username(u.email)}</p>
                    <p className="text-[10px] mt-1" style={{ color: isOptimizaPlan(u.plan) ? '#F5A623' : 'var(--text-subtle)' }}>
                      {planLabel(u)}{!isOptimizaPlan(u.plan) && freeUntil(u) ? ` · hasta ${formatAccessDate(freeUntil(u))}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => applyAccessPlan(u, 'free')}
                    disabled={loadingId === `${u.id}_free`}
                    className="h-7 px-2 rounded-lg text-[11px] font-semibold disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }}>
                    Free
                  </button>
                  <button
                    onClick={() => applyAccessPlan(u, 'optimiza')}
                    disabled={loadingId === `${u.id}_optimiza`}
                    className="h-7 px-2 rounded-lg text-[11px] font-semibold disabled:opacity-40"
                    style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623' }}>
                    PRO
                  </button>
                  <button onClick={() => handleSetAdmin(u, !u.is_admin)}
                    disabled={loadingId === u.id + '_admin' || (u.is_admin && u.id === currentUserId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40"
                    style={{
                      background: u.is_admin ? 'rgba(248,113,113,0.08)' : 'rgba(245,166,35,0.1)',
                      color: u.is_admin ? '#F87171' : '#F5A623',
                    }}
                    title={u.is_admin ? 'Quitar permisos de admin' : 'Dar permisos de admin'}>
                    {loadingId === u.id + '_admin'
                      ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                        </svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M12 3l7 3v5c0 4.6-2.8 8.7-7 10-4.2-1.3-7-5.4-7-10V6l7-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                          {u.is_admin
                            ? <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            : <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          }
                        </svg>
                    }
                  </button>
                  {!u.is_admin && (
                    <button onClick={() => setConfirmDelete(u)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="px-4 py-2">
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Alta: {fmtDate(u.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
