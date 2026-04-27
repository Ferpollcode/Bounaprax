'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BounapraxLogo } from '@/components/BounapraxLogo'

const INTERNAL_DOMAIN = '@bounaprax.com'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const email = username.trim().toLowerCase() + INTERNAL_DOMAIN
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Usuario o contraseña incorrectos.')
      setLoading(false)
    } else {
      const mustChange = data.user?.user_metadata?.must_change_password === true
      router.push(mustChange ? '/cambiar-contrasena' : '/inicio')
      router.refresh()
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = '1px solid rgba(62,201,201,0.5)'
    e.target.style.background = 'rgba(62,201,201,0.05)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = '1px solid rgba(255,255,255,0.08)'
    e.target.style.background = 'rgba(255,255,255,0.05)'
  }

  return (
    <div className="w-full max-w-sm anim-fade-up">
      {/* Mobile logo */}
      <div className="lg:hidden mb-8 flex justify-center">
        <BounapraxLogo variant="authMobile" />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          Bienvenido de vuelta
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Ingresá tus credenciales para continuar</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="none"
            placeholder="tu_usuario"
            className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none"
            style={{
              background: 'var(--overlay-sm)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-11 px-4 pr-11 rounded-xl text-sm transition-all outline-none"
              style={{
                background: 'var(--overlay-sm)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl text-sm font-semibold transition-all mt-2"
          style={{
            background: loading ? 'rgba(62,201,201,0.5)' : 'linear-gradient(135deg, #3EC9C9, #2BA8A8)',
            color: 'var(--primary-foreground)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
