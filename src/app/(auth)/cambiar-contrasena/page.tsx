'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BounapraxLogo } from '@/components/BounapraxLogo'

export default function CambiarContrasenaPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/inicio')
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
      <div className="lg:hidden mb-8 flex justify-center">
        <BounapraxLogo variant="authMobile" />
      </div>

      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
          style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--primary)" strokeWidth="1.8"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          Configurá tu contraseña
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Es tu primer acceso. Elegí una contraseña segura para continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="w-full h-11 px-4 pr-11 rounded-xl text-sm transition-all outline-none"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}>
              {showNew ? (
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

        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repetí la contraseña"
              className="w-full h-11 px-4 pr-11 rounded-xl text-sm transition-all outline-none"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
              style={{ color: 'var(--muted-foreground)' }}>
              {showConfirm ? (
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

        {/* Strength hint */}
        {newPassword && (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all"
                style={{
                  background: newPassword.length >= i * 2
                    ? newPassword.length >= 12 ? 'var(--success)' : newPassword.length >= 8 ? 'var(--primary)' : 'var(--warning)'
                    : 'var(--border)'
                }} />
            ))}
            <span className="text-xs ml-1" style={{ color: 'var(--muted-foreground)' }}>
              {newPassword.length < 8 ? 'Débil' : newPassword.length < 12 ? 'Media' : 'Fuerte'}
            </span>
          </div>
        )}

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
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
