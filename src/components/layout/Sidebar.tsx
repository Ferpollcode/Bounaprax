'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BounapraxLogo } from '@/components/BounapraxLogo'
import { submitFeedback } from '@/lib/actions/feedback'

const navItems = [
  {
    href: '/inicio',
    label: 'Inicio',
    color: '#00E5E5',
    colorLight: '#0099A8',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    href: '/pacientes',
    label: 'Pacientes',
    color: '#B482FF',
    colorLight: '#7C3AED',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/agenda',
    label: 'Agenda',
    color: '#5BA4FF',
    colorLight: '#1D60D4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/sesiones',
    label: 'Sesiones',
    color: '#00E096',
    colorLight: '#027A48',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="9" y="8" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="16" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    href: '/consultorios',
    label: 'Consultorios',
    color: '#FFB020',
    colorLight: '#B45309',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/reportes',
    label: 'Reportes',
    color: '#FF9F43',
    colorLight: '#D97706',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ userEmail, userName, isPro = false, isAdmin = false }: { userEmail?: string; userName?: string; isPro?: boolean; isAdmin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [feedbackMessage, setFeedbackMessage] = React.useState('')
  const [feedbackError, setFeedbackError] = React.useState('')
  const [feedbackSent, setFeedbackSent] = React.useState(false)
  const [feedbackPending, startFeedbackTransition] = React.useTransition()

  const rawName = userName || userEmail?.split('@')[0] || 'Profesional'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleFeedbackSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedbackError('')
    setFeedbackSent(false)

    const formData = new FormData(e.currentTarget)
    startFeedbackTransition(async () => {
      const res = await submitFeedback(formData)
      if (res.error) {
        setFeedbackError(res.error)
        return
      }
      setFeedbackMessage('')
      setFeedbackSent(true)
      setTimeout(() => {
        setShowFeedback(false)
        setFeedbackSent(false)
      }, 1200)
    })
  }

  return (
    <>
      {showFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                  Enviar feedback
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  Ideas, mejoras o algo que te gustaría simplificar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--overlay-sm)', color: 'var(--muted-foreground)' }}
                aria-label="Cerrar feedback"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <textarea
                name="message"
                value={feedbackMessage}
                onChange={e => setFeedbackMessage(e.target.value)}
                rows={5}
                placeholder="Escribí tu recomendación..."
                className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              />
              {feedbackError && (
                <p className="text-xs" style={{ color: '#F87171' }}>{feedbackError}</p>
              )}
              {feedbackSent && (
                <p className="text-xs" style={{ color: '#3EC9C9' }}>Gracias, feedback enviado.</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="h-9 px-3 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={feedbackPending}
                  className="h-9 px-4 rounded-xl text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#fff' }}
                >
                  {feedbackPending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MOBILE: barra superior ══════════════════════════ */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4"
        style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        {/* Logo compacto */}
        <Link href="/inicio" className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3EC9C9, #1AA8A8)' }}
          >
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <rect x="9" y="8" width="3.5" height="16" rx="1" fill="white"/>
              <path d="M12 8 L17.5 8 Q22.5 8 22.5 11.5 Q22.5 15 17.5 15 L12 15Z" fill="white"/>
              <path d="M12 10.5 L16 10.5 Q19.5 10.5 19.5 11.5 Q19.5 12.5 16 12.5 L12 12.5Z" fill="#1FBFBF"/>
              <path d="M12 15.5 L18 15.5 Q23.5 15.5 23.5 19.5 Q23.5 23.5 18 23.5 L12 23.5Z" fill="white"/>
              <path d="M12 18 L17 18 Q21 18 21 19.5 Q21 21 17 21 L12 21Z" fill="#1AAEAE"/>
            </svg>
          </div>
          <span
            className="text-sm font-bold truncate"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}
          >
            Bounaprax
          </span>
        </Link>

        {/* Toggle + admin + logout */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => setShowFeedback(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-60"
            style={{ background: 'var(--sidebar-action-bg)', border: '1px solid var(--sidebar-action-border)', color: 'var(--muted-foreground)' }}
            aria-label="Enviar feedback"
            title="Enviar feedback"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {isAdmin && (
            <Link
              href="/admin"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-60"
              style={{
                background: pathname.startsWith('/admin') ? 'rgba(245,166,35,0.15)' : 'var(--sidebar-action-bg)',
                border: `1px solid ${pathname.startsWith('/admin') ? 'rgba(245,166,35,0.4)' : 'var(--sidebar-action-border)'}`,
                color: pathname.startsWith('/admin') ? '#F5A623' : 'var(--muted-foreground)',
              }}
              aria-label="Administración"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-60"
            style={{ background: 'var(--sidebar-action-bg)', border: '1px solid var(--sidebar-action-border)' }}
            aria-label="Cerrar sesión"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16,17 21,12 16,7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ══ MOBILE: barra de navegación inferior ════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          background: 'var(--sidebar)',
          borderTop: '1px solid var(--sidebar-border)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          height: 'calc(60px + max(env(safe-area-inset-bottom), 0px))',
        }}
      >
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href))
          const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
          const activeColor = isDark ? item.color : item.colorLight
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-0.5"
              style={{
                color: active ? activeColor : 'var(--muted-foreground)',
                flex: '1 1 0',
                minWidth: 0,
              }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                  style={{ width: 24, height: 2, background: activeColor, borderRadius: '0 0 3px 3px' }}
                />
              )}
              <span className="relative" style={{ color: active ? activeColor : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(item.icon, { width: 18, height: 18 })}
                {item.href === '/reportes' && !isPro && (
                  <span className="absolute -top-1 -right-2 text-[7px] font-bold px-1 rounded-full"
                    style={{ background: '#F5A623', color: '#0a0600', lineHeight: '14px' }}>
                    PRO
                  </span>
                )}
              </span>
              <span style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.02em', color: active ? activeColor : 'var(--text-subtle)', lineHeight: 1, textAlign: 'center', width: '100%', paddingInline: 2 }}
                className="truncate">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ══ DESKTOP: sidebar fijo lateral ═══════════════════ */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[220px] flex-col z-40"
        style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Logo clickeable */}
        <Link href="/inicio" className="px-3 py-3 flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ borderBottom: '1px solid var(--sidebar-border)', borderRadius: '0' }}>
          <BounapraxLogo variant="sidebarDesktop" />
        </Link>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase px-3 mb-3"
            style={{ color: 'var(--text-subtle)' }}>
            Principal
          </p>
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href))
            const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
            const activeColor = isDark ? item.color : item.colorLight
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: active ? activeColor : 'var(--muted-foreground)',
                  background: active ? `${activeColor}20` : 'transparent',
                }}
              >
                <span style={{ color: active ? activeColor : 'var(--muted-foreground)' }}>{item.icon}</span>
                {item.label}
                {item.href === '/reportes' && !isPro && (
                  <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#F5A623', color: '#0a0600', lineHeight: 1 }}>
                    PRO
                  </span>
                )}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: activeColor }} />
                )}
              </Link>
            )
          })}

          {/* Sección admin */}
          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-[10px] font-semibold tracking-widest uppercase px-3"
                  style={{ color: 'var(--text-subtle)' }}>
                  Admin
                </p>
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  color: pathname.startsWith('/admin') ? '#F5A623' : 'var(--muted-foreground)',
                  background: pathname.startsWith('/admin') ? 'rgba(245,166,35,0.12)' : 'transparent',
                }}
              >
                <span style={{ color: pathname.startsWith('/admin') ? '#F5A623' : 'var(--muted-foreground)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Usuarios
                {pathname.startsWith('/admin') && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#F5A623' }} />
                )}
              </Link>
            </>
          )}
        </nav>

        {/* Usuario */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <div className="px-3 py-3 mt-3 rounded-xl" style={{ background: 'var(--sidebar-user-bg)' }}>
            <p className="text-xs font-medium truncate mb-0.5" style={{ color: 'var(--foreground)' }}>
              {displayName}
            </p>
            <p className="text-xs truncate mb-3" style={{ color: 'var(--text-subtle)' }}>
              {userEmail ?? ''}
            </p>
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="mb-3 flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-subtle)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Enviar feedback
            </button>
            <div className="flex items-center justify-between">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Cerrar sesión
              </button>
              <ThemeToggle compact />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
