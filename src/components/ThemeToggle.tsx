'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div style={{ width: compact ? 28 : 32, height: compact ? 28 : 32 }} />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="flex items-center justify-center rounded-xl transition-opacity hover:opacity-70"
      style={{
        width: compact ? 28 : 32,
        height: compact ? 28 : 32,
        background: 'var(--sidebar-action-bg)',
        border: '1px solid var(--sidebar-action-border)',
        flexShrink: 0,
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width={compact ? 13 : 15} height={compact ? 13 : 15} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="var(--muted-foreground)" strokeWidth="2"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width={compact ? 13 : 15} height={compact ? 13 : 15} viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}
