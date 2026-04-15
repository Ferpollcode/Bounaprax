'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E8EDF5',
}
const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'
const TEAL = '#3EC9C9'
const AMBER = '#F5A623'

function focusTeal(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
  )
}

const tiposPago = [
  { value: 'efectivo',     label: 'Efectivo',     icon: '💵' },
  { value: 'transferencia',label: 'Transferencia',icon: '📲' },
  { value: 'tarjeta',      label: 'Tarjeta',      icon: '💳' },
  { value: 'obra_social',  label: 'Obra social',  icon: '🏥' },
  { value: 'otro',         label: 'Otro',         icon: '•'  },
]

const estadosPago = [
  { value: 'pagado',    label: 'Pagado',    color: '#34D399' },
  { value: 'pendiente', label: 'Pendiente', color: '#FBBF24' },
  { value: 'devuelto',  label: 'Devuelto',  color: '#F87171' },
]

export default function NuevoPagoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    fecha:    hoy,
    monto:    '',
    tipo:     'efectivo',
    concepto: '',
    estado:   'pagado',
  })

  function set(field: string) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('pagos').insert({
      paciente_id:     id,
      professional_id: user.id,
      fecha:           form.fecha,
      monto:           parseFloat(form.monto),
      tipo:            form.tipo,
      concepto:        form.concepto || null,
      estado:          form.estado,
    })

    if (error) { setError('Error al registrar el pago.'); setSaving(false) }
    else router.push(`/pacientes/${id}`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0E1A' }}>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="flex items-center gap-4 mb-8 anim-fade-up">
          <Link href={`/pacientes/${id}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>Registrar pago</h1>
            <p className="text-sm mt-0.5" style={{ color: '#5A6A88' }}>Asentá el cobro de la consulta</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl p-6 space-y-5"
            style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Monto destacado */}
            <div className="text-center pb-2">
              <Label text="Monto" required />
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-semibold" style={{ color: '#5A6A88' }}>$</span>
                <input
                  type="number" min="0" step="0.01" value={form.monto}
                  onChange={e => set('monto')(e.target.value)}
                  placeholder="0.00" required
                  className="text-4xl font-bold text-center bg-transparent outline-none w-48"
                  style={{ color: AMBER }}
                />
              </div>
            </div>

            <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

            {/* Fecha */}
            <div>
              <Label text="Fecha" />
              <input type="date" value={form.fecha} onChange={e => set('fecha')(e.target.value)}
                className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>

            {/* Tipo de pago */}
            <div>
              <Label text="Forma de pago" />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {tiposPago.map(t => (
                  <button key={t.value} type="button" onClick={() => set('tipo')(t.value)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: form.tipo === t.value ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.tipo === t.value ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: form.tipo === t.value ? AMBER : '#5A6A88',
                    }}>
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <Label text="Estado" />
              <div className="flex gap-2">
                {estadosPago.map(s => (
                  <button key={s.value} type="button" onClick={() => set('estado')(s.value)}
                    className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.estado === s.value ? `${s.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.estado === s.value ? s.color + '45' : 'rgba(255,255,255,0.07)'}`,
                      color: form.estado === s.value ? s.color : '#5A6A88',
                    }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Concepto */}
            <div>
              <Label text="Concepto / nota" />
              <textarea value={form.concepto} onChange={e => set('concepto')(e.target.value)}
                placeholder="Ej: Sesión individual, evaluación inicial…" rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1 pb-8">
            <Link href={`/pacientes/${id}`}
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(245,166,35,0.35)' : 'linear-gradient(135deg,#F5A623,#D4891A)', color: '#0A0E1A', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? (<><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>) : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>Registrar pago</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
