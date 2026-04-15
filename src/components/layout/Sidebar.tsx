'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  {
    href: '/pacientes',
    label: 'Pacientes',
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
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/consultorios',
    label: 'Consultorios',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ══ MOBILE: barra superior ══════════════════════════ */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4"
        style={{ background: '#0D1220', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3EC9C9, #2BA8A8)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold"
            style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
            HealthPro
          </span>
        </div>

        {/* Usuario + logout */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs max-w-[120px] truncate" style={{ color: '#5A6A88' }}>
            {userEmail?.split('@')[0] ?? ''}
          </span>
          <button
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Cerrar sesión"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="16,17 21,12 16,7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ══ MOBILE: barra de navegación inferior ════════════ */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{
          height: '64px',
          background: '#0D1220',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-opacity"
              style={{ color: active ? '#3EC9C9' : '#5A6A88' }}
            >
              <span style={{ color: active ? '#3EC9C9' : '#5A6A88' }}>{item.icon}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: active ? '#3EC9C9' : '#5A6A88',
              }}>
                {item.label}
              </span>
              {active && (
                <span
                  className="absolute bottom-1 rounded-full"
                  style={{ width: 20, height: 2, background: '#3EC9C9' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ══ DESKTOP: sidebar fijo lateral ═══════════════════ */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[220px] flex-col z-40"
        style={{
          background: '#0D1220',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3EC9C9, #2BA8A8)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v18M3 12h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight"
            style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
            HealthPro
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold tracking-widest uppercase px-3 mb-3"
            style={{ color: '#3A4560' }}>
            Principal
          </p>
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: active ? '#3EC9C9' : '#6B7A99',
                  background: active ? 'rgba(62,201,201,0.1)' : 'transparent',
                }}
              >
                <span style={{ color: active ? '#3EC9C9' : '#6B7A99' }}>{item.icon}</span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#3EC9C9' }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Usuario */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-3 py-3 mt-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-medium truncate mb-0.5" style={{ color: '#E8EDF5' }}>
              {userEmail?.split('@')[0] ?? 'Profesional'}
            </p>
            <p className="text-xs truncate mb-3" style={{ color: '#3A4560' }}>
              {userEmail ?? ''}
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: '#6B7A99' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
