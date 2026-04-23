'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BounapraxLogo } from '@/components/BounapraxLogo'

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
    href: '/contabilidad',
    label: 'Contabilidad',
    color: '#22C55E',
    colorLight: '#15803D',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M6 15h4M14 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function Sidebar({ userEmail, userName }: { userEmail?: string; userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const displayName = userName || userEmail?.split('@')[0] || 'Profesional'

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
        style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-border)' }}
      >
        {/* Logo clickeable */}
        <Link href="/inicio" className="flex items-center">
          <BounapraxLogo variant="sidebarMobile" />
        </Link>

        {/* Toggle + usuario + logout */}
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <span className="text-xs max-w-[100px] truncate" style={{ color: 'var(--muted-foreground)' }}>
            {displayName}
          </span>
          <button
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{ background: 'var(--sidebar-action-bg)', border: '1px solid var(--sidebar-action-border)' }}
            aria-label="Cerrar sesión"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
              <span style={{ color: active ? activeColor : 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.cloneElement(item.icon, { width: 18, height: 18 })}
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
        <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: activeColor }} />
                )}
              </Link>
            )
          })}
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
