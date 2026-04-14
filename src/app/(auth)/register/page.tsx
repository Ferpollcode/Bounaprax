'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center anim-fade-up space-y-4">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
          ¡Cuenta creada!
        </h2>
        <p className="text-sm" style={{ color: '#6B7A99' }}>
          Revisá tu email para confirmar tu cuenta. Serás redirigido al login en unos segundos.
        </p>
      </div>
    )
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#E8EDF5',
  }

  return (
    <div className="w-full max-w-sm anim-fade-up">
      <div className="lg:hidden flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3EC9C9, #2BA8A8)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v18M3 12h18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#E8EDF5' }}>HealthPro</span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
          Crear cuenta
        </h2>
        <p className="text-sm" style={{ color: '#6B7A99' }}>Empezá a gestionar tus pacientes hoy</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: '#6B7A99' }}>Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            placeholder="Dr. Juan García"
            className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none"
            style={inputStyle}
            onFocus={e => { e.target.style.border = '1px solid rgba(62,201,201,0.5)'; e.target.style.background = 'rgba(62,201,201,0.05)' }}
            onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: '#6B7A99' }}>Email profesional</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none"
            style={inputStyle}
            onFocus={e => { e.target.style.border = '1px solid rgba(62,201,201,0.5)'; e.target.style.background = 'rgba(62,201,201,0.05)' }}
            onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium tracking-wide uppercase" style={{ color: '#6B7A99' }}>Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full h-11 px-4 pr-11 rounded-xl text-sm transition-all outline-none"
              style={inputStyle}
              onFocus={e => { e.target.style.border = '1px solid rgba(62,201,201,0.5)'; e.target.style.background = 'rgba(62,201,201,0.05)' }}
              onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
              style={{ color: '#6B7A99' }}
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
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl text-sm font-semibold transition-all mt-2"
          style={{
            background: loading ? 'rgba(62,201,201,0.5)' : 'linear-gradient(135deg, #3EC9C9, #2BA8A8)',
            color: '#0A0E1A',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: '#6B7A99' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-medium hover:opacity-80" style={{ color: '#3EC9C9' }}>
          Ingresar
        </Link>
      </p>
    </div>
  )
}
