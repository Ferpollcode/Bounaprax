'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Paciente, Sesion, Pago, Documento } from '@/types'

/* ── extended type ──────────────────────────────────────── */
export type DocWithPath = Documento & { storagePath: string }

/* ── constants ──────────────────────────────────────────── */
const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  activo:   { label: 'Activo',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  inactivo: { label: 'Inactivo', color: '#6B7A99', bg: 'rgba(107,122,153,0.1)' },
  alta:     { label: 'Alta',     color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  derivado: { label: 'Derivado', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}
const sesionEstado: Record<string, { label: string; color: string }> = {
  realizada:    { label: 'Realizada',    color: '#34D399' },
  programada:   { label: 'Programada',   color: '#3EC9C9' },
  cancelada:    { label: 'Cancelada',    color: '#F87171' },
  inasistencia: { label: 'Inasistencia', color: '#FBBF24' },
}
const tipoIcono: Record<string, string> = {
  foto: '🖼️', informe: '📄', analisis: '🔬', test: '📋', historia_clinica: '📚', otro: '📎',
}

const TEAL  = '#3EC9C9'
const AMBER = '#F5A623'

const TIPO_OPTS = [
  { value: 'informe',         label: 'Informe'       },
  { value: 'foto',            label: 'Foto'          },
  { value: 'analisis',        label: 'Análisis'      },
  { value: 'test',            label: 'Test'          },
  { value: 'historia_clinica',label: 'Hist. clínica' },
  { value: 'otro',            label: 'Otro'          },
] as const

const tiposPago = [
  { value: 'efectivo',      label: 'Efectivo',      icon: '💵' },
  { value: 'transferencia', label: 'Transferencia', icon: '📲' },
  { value: 'tarjeta',       label: 'Tarjeta',       icon: '💳' },
  { value: 'obra_social',   label: 'Obra social',   icon: '🏥' },
  { value: 'otro',          label: 'Otro',          icon: '•'  },
]
const estadosPago = [
  { value: 'pagado',    label: 'Pagado',    color: '#34D399' },
  { value: 'pendiente', label: 'Pendiente', color: '#FBBF24' },
  { value: 'devuelto',  label: 'Devuelto',  color: '#F87171' },
]

/* ── helpers ────────────────────────────────────────────── */
function calcEdad(f?: string) {
  if (!f) return null
  const hoy = new Date(), nac = new Date(f)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}
function fmtDate(s: string) {
  return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/* ── shared form styles ─────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E8EDF5',
}
const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'

function focusTeal(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

/* ── small shared components ────────────────────────────── */
function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: '#3A4560' }}>{label}</p>
      <p className="text-sm" style={{ color: '#C8D4E8' }}>{value}</p>
    </div>
  )
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
  )
}

function FormCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: TEAL }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: '#C8D4E8' }}>{title}</span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function ToggleGroup({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; color?: string }[]
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const active = value === opt.value
        const color  = opt.color ?? TEAL
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? color + '45' : 'rgba(255,255,255,0.07)'}`,
              color: active ? color : '#5A6A88',
            }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

function FTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
      style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
  )
}

/* ── Modal ──────────────────────────────────────────────── */
function Modal({ open, onClose, title, subtitle, wide, children }: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  wide?: boolean
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[90dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl`}
        style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Drag pill indicator (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="flex items-start justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0F1524' }}>
          <div>
            <h2 className="text-base font-bold sm:text-lg" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#5A6A88' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

/* ── SesionForm ─────────────────────────────────────────── */
function SesionForm({ pacienteId, consultorios, defaultConsultorioId, onSuccess, onCancel }: {
  pacienteId: string
  consultorios: { id: string; nombre: string; color: string }[]
  defaultConsultorioId?: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    fecha: hoy, hora_inicio: '', hora_fin: '',
    tipo: 'presencial', estado: 'realizada',
    observaciones: '', tratamiento: '', objetivo: '',
    evolucion: '', proximos_pasos: '', monto: '', pagado: false,
    consultorio_id: defaultConsultorioId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }
  function setBool(field: string) { return (v: boolean) => setForm(f => ({ ...f, [field]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('sesiones').insert({
      paciente_id:     pacienteId,
      professional_id: user.id,
      consultorio_id:  form.consultorio_id || null,
      fecha:           form.fecha,
      hora_inicio:     form.hora_inicio  || null,
      hora_fin:        form.hora_fin     || null,
      tipo:            form.tipo,
      estado:          form.estado,
      observaciones:   form.observaciones || null,
      tratamiento:     form.tratamiento   || null,
      objetivo:        form.objetivo      || null,
      evolucion:       form.evolucion     || null,
      proximos_pasos:  form.proximos_pasos || null,
      monto:           form.monto ? parseFloat(form.monto) : null,
      pagado:          form.pagado,
    })

    if (err) { setError('Error al guardar la sesión.'); setSaving(false) }
    else onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard title="Fecha y modalidad" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label text="Fecha" required />
            <input type="date" value={form.fecha} onChange={e => setStr('fecha')(e.target.value)} required
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div>
            <Label text="Hora inicio" />
            <input type="time" value={form.hora_inicio} onChange={e => setStr('hora_inicio')(e.target.value)}
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div>
            <Label text="Hora fin" />
            <input type="time" value={form.hora_fin} onChange={e => setStr('hora_fin')(e.target.value)}
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
        </div>
        <div>
          <Label text="Modalidad" />
          <ToggleGroup value={form.tipo} onChange={setStr('tipo')} options={[
            { value: 'presencial', label: 'Presencial', color: TEAL },
            { value: 'virtual',    label: 'Virtual',    color: '#A78BFA' },
          ]} />
        </div>
        <div>
          <Label text="Estado" />
          <ToggleGroup value={form.estado} onChange={setStr('estado')} options={[
            { value: 'realizada',    label: 'Realizada',    color: '#34D399' },
            { value: 'programada',   label: 'Programada',   color: TEAL },
            { value: 'cancelada',    label: 'Cancelada',    color: '#F87171' },
            { value: 'inasistencia', label: 'Inasistencia', color: '#FBBF24' },
          ]} />
        </div>
      </FormCard>

      {consultorios.length > 0 && (
        <FormCard title="Consultorio" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }>
          <div className="flex flex-wrap gap-2">
            {consultorios.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, consultorio_id: f.consultorio_id === c.id ? '' : c.id }))}
                className="flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: form.consultorio_id === c.id ? `${c.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.consultorio_id === c.id ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                  color: form.consultorio_id === c.id ? c.color : '#5A6A88',
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                {c.nombre}
              </button>
            ))}
          </div>
        </FormCard>
      )}

      <FormCard title="Notas clínicas" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div>
          <Label text="Observaciones de la sesión" />
          <FTextarea value={form.observaciones} onChange={setStr('observaciones')}
            placeholder="¿Qué sucedió en la sesión? Resumen del encuentro…" rows={4} />
        </div>
        <div>
          <Label text="Tratamiento aplicado" />
          <FTextarea value={form.tratamiento} onChange={setStr('tratamiento')}
            placeholder="Técnicas o intervenciones utilizadas…" rows={2} />
        </div>
        <div>
          <Label text="Objetivo de la sesión" />
          <FTextarea value={form.objetivo} onChange={setStr('objetivo')}
            placeholder="Objetivos planteados para este encuentro…" rows={2} />
        </div>
      </FormCard>

      <FormCard title="Evolución y seguimiento" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      }>
        <div>
          <Label text="Evolución del paciente" />
          <FTextarea value={form.evolucion} onChange={setStr('evolucion')}
            placeholder="¿Cómo evolucionó el paciente? Cambios observados…" rows={3} />
        </div>
        <div>
          <Label text="Próximos pasos" />
          <FTextarea value={form.proximos_pasos} onChange={setStr('proximos_pasos')}
            placeholder="Tareas, indicaciones o puntos para la próxima sesión…" rows={2} />
        </div>
      </FormCard>

      <FormCard title="Honorarios" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label text="Monto ($)" />
            <input type="number" min="0" step="0.01" value={form.monto}
              onChange={e => setStr('monto')(e.target.value)}
              placeholder="0.00" className={inputCls} style={inputStyle}
              onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div className="flex flex-col justify-end">
            <button type="button" onClick={() => setBool('pagado')(!form.pagado)}
              className="h-10 rounded-xl text-sm font-medium flex items-center gap-2.5 px-4 transition-all"
              style={{
                background: form.pagado ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.pagado ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: form.pagado ? '#34D399' : '#5A6A88',
              }}>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                style={{ borderColor: form.pagado ? '#34D399' : '#3A4560', background: form.pagado ? '#34D399' : 'transparent' }}>
                {form.pagado && <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>}
              </div>
              {form.pagado ? 'Sesión pagada' : 'Marcar como pagada'}
            </button>
          </div>
        </div>
      </FormCard>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 sm:flex-none h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving
            ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>
            : 'Guardar sesión'}
        </button>
      </div>
    </form>
  )
}

/* ── PagoForm ───────────────────────────────────────────── */
function PagoForm({ pacienteId, onSuccess, onCancel }: {
  pacienteId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    fecha: hoy, monto: '', tipo: 'efectivo', concepto: '', estado: 'pagado',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('pagos').insert({
      paciente_id:     pacienteId,
      professional_id: user.id,
      fecha:           form.fecha,
      monto:           parseFloat(form.monto),
      tipo:            form.tipo,
      concepto:        form.concepto || null,
      estado:          form.estado,
    })

    if (err) { setError('Error al registrar el pago.'); setSaving(false) }
    else onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center py-2">
        <Label text="Monto" required />
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-semibold" style={{ color: '#5A6A88' }}>$</span>
          <input
            type="number" min="0" step="0.01" value={form.monto}
            onChange={e => setStr('monto')(e.target.value)}
            placeholder="0.00" required autoFocus
            className="text-4xl font-bold text-center bg-transparent outline-none w-48"
            style={{ color: AMBER }}
          />
        </div>
      </div>

      <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div>
        <Label text="Fecha" />
        <input type="date" value={form.fecha} onChange={e => setStr('fecha')(e.target.value)}
          className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
      </div>

      <div>
        <Label text="Forma de pago" />
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {tiposPago.map(t => (
            <button key={t.value} type="button" onClick={() => setStr('tipo')(t.value)}
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

      <div>
        <Label text="Estado" />
        <div className="flex gap-2 flex-wrap">
          {estadosPago.map(s => (
            <button key={s.value} type="button" onClick={() => setStr('estado')(s.value)}
              className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: form.estado === s.value ? `${s.color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.estado === s.value ? s.color + '45' : 'rgba(255,255,255,0.07)'}`,
                color: form.estado === s.value ? s.color : '#5A6A88',
              }}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label text="Concepto / nota" />
        <FTextarea value={form.concepto} onChange={setStr('concepto')}
          placeholder="Ej: Sesión individual, evaluación inicial…" rows={2} />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 sm:flex-none h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: saving ? 'rgba(245,166,35,0.35)' : 'linear-gradient(135deg,#F5A623,#D4891A)', color: '#0A0E1A', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving
            ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>
            : 'Registrar pago'}
        </button>
      </div>
    </form>
  )
}

/* ── DocumentsSection ───────────────────────────────────── */
type FileItemNew = {
  id: string
  file: File
  tipo: Documento['tipo']
  nombre: string
}

function DocumentsSection({ pacienteId, initialDocs }: {
  pacienteId: string
  initialDocs: DocWithPath[]
}) {
  const [docs, setDocs] = useState<DocWithPath[]>(initialDocs)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFiles, setNewFiles] = useState<FileItemNew[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<{ id: string; nombre: string; tipo: Documento['tipo'] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownload(doc: DocWithPath) {
    const supabase = createClient()
    if (doc.storagePath) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storagePath, 120)
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
    }
    window.open(doc.archivo_url, '_blank')
  }

  async function handleDelete(doc: DocWithPath) {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"?`)) return
    setDeletingId(doc.id)
    const supabase = createClient()
    if (doc.storagePath) {
      await supabase.storage.from('documentos').remove([doc.storagePath])
    }
    await supabase.from('documentos').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(incoming: File[]) {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const valid = incoming.filter(f => ALLOWED.includes(f.type) && f.size <= 20 * 1024 * 1024)
    setNewFiles(prev => [
      ...prev,
      ...valid.map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        tipo: (f.type.startsWith('image/') ? 'foto' : 'otro') as Documento['tipo'],
        nombre: f.name.replace(/\.[^.]+$/, ''),
      }))
    ])
  }

  async function handleUpload() {
    if (newFiles.length === 0) return
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const uploaded: DocWithPath[] = []
    for (const item of newFiles) {
      const ext  = item.file.name.split('.').pop()
      const path = `${user.id}/${pacienteId}/${item.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, item.file)
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path)
      const { data: docData } = await supabase.from('documentos').insert({
        paciente_id:     pacienteId,
        professional_id: user.id,
        nombre:          item.nombre || item.file.name,
        tipo:            item.tipo,
        archivo_url:     publicUrl,
        archivo_nombre:  item.file.name,
        archivo_tipo:    item.file.type,
        archivo_tamanio: item.file.size,
      }).select().single()
      if (docData) uploaded.push({ ...(docData as Documento), storagePath: path })
    }

    setDocs(prev => [...uploaded.reverse(), ...prev])
    setNewFiles([])
    setUploadOpen(false)
    setUploading(false)
  }

  async function handleEditSave() {
    if (!editingDoc) return
    const supabase = createClient()
    await supabase.from('documentos').update({ nombre: editingDoc.nombre, tipo: editingDoc.tipo }).eq('id', editingDoc.id)
    setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, nombre: editingDoc.nombre, tipo: editingDoc.tipo } : d))
    setEditingDoc(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#3A4560' }}>
          Documentos
          <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}>{docs.length}</span>
        </p>
        <button
          onClick={() => { setUploadOpen(o => !o); setNewFiles([]) }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Upload area */}
      {uploadOpen && (
        <div className="mb-4">
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl p-5 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? TEAL : 'rgba(62,201,201,0.3)'}`,
              background: dragging ? 'rgba(62,201,201,0.04)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file" multiple className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="17,8 12,3 7,8" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: TEAL }}>Arrastrá archivos o hacé clic</p>
            <p className="text-xs mt-1" style={{ color: '#5A6A88' }}>Imágenes, PDF, DOC · Máx 20 MB c/u</p>
          </div>

          {newFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {newFiles.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-base flex-shrink-0">{item.tipo === 'foto' ? '🖼️' : '📎'}</span>
                  <input
                    className="flex-1 bg-transparent text-xs outline-none min-w-0"
                    style={{ color: '#C8D4E8' }}
                    value={item.nombre}
                    onChange={e => setNewFiles(prev => prev.map(f => f.id === item.id ? { ...f, nombre: e.target.value } : f))}
                  />
                  <select
                    value={item.tipo}
                    onChange={e => setNewFiles(prev => prev.map(f => f.id === item.id ? { ...f, tipo: e.target.value as Documento['tipo'] } : f))}
                    className="text-xs rounded-lg px-2 py-1 outline-none flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8A9AB8' }}
                  >
                    {TIPO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewFiles(prev => prev.filter(f => f.id !== item.id))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setUploadOpen(false); setNewFiles([]) }}
                  className="h-8 px-4 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleUpload} disabled={uploading}
                  className="h-8 px-4 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ background: uploading ? 'rgba(62,201,201,0.3)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A' }}>
                  {uploading ? 'Subiendo…' : `Subir ${newFiles.length} archivo${newFiles.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {newFiles.length === 0 && (
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => setUploadOpen(false)}
                className="text-xs transition-opacity hover:opacity-70" style={{ color: '#5A6A88' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents list */}
      {docs.length === 0 ? (
        <p className="text-sm" style={{ color: '#3A4560' }}>Sin documentos adjuntos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2.5 rounded-xl p-3 group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg flex-shrink-0">{tipoIcono[doc.tipo] ?? '📎'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#C8D4E8' }}>{doc.nombre}</p>
                <p className="text-xs" style={{ color: '#5A6A88' }}>
                  {fmtDate(doc.created_at)}{doc.archivo_tamanio ? ` · ${formatBytes(doc.archivo_tamanio)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  title="Descargar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                  style={{ background: 'rgba(62,201,201,0.12)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="7,10 12,15 17,10" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDoc({ id: doc.id, nombre: doc.nombre, tipo: doc.tipo })}
                  title="Editar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  title="Eliminar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'rgba(248,113,113,0.12)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <polyline points="3,6 5,6 21,6" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-1 14H6L5 6" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit document modal */}
      <Modal open={!!editingDoc} onClose={() => setEditingDoc(null)} title="Editar documento">
        {editingDoc && (
          <div className="space-y-4">
            <div>
              <Label text="Nombre" />
              <input
                type="text"
                value={editingDoc.nombre}
                onChange={e => setEditingDoc(d => d ? { ...d, nombre: e.target.value } : d)}
                className={inputCls} style={inputStyle}
                onFocus={focusTeal} onBlur={blurReset}
              />
            </div>
            <div>
              <Label text="Tipo de documento" />
              <div className="flex flex-wrap gap-2">
                {TIPO_OPTS.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setEditingDoc(d => d ? { ...d, tipo: t.value as Documento['tipo'] } : d)}
                    className="h-8 px-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: editingDoc.tipo === t.value ? 'rgba(62,201,201,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${editingDoc.tipo === t.value ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: editingDoc.tipo === t.value ? TEAL : '#5A6A88',
                    }}>
                    {tipoIcono[t.value] ?? '📎'} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingDoc(null)}
                className="h-9 px-4 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleEditSave}
                className="h-9 px-5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A' }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────── */
type ConsultorioOpt = { id: string; nombre: string; color: string }

export function PatientDetailClient({
  paciente,
  sesiones,
  pagos,
  docs,
  consultorios = [],
}: {
  paciente: Paciente
  sesiones: Sesion[]
  pagos: Pago[]
  docs: DocWithPath[]
  consultorios?: ConsultorioOpt[]
}) {
  const router = useRouter()
  const [sesionOpen, setSesionOpen] = useState(false)
  const [pagoOpen,   setPagoOpen]   = useState(false)

  const p   = paciente
  const est = estadoConfig[p.estado] ?? estadoConfig.activo
  const edad = calcEdad(p.fecha_nacimiento)
  const consultorioActivo = consultorios.find(c => c.id === p.consultorio_id)

  const totalPagado    = pagos.filter(pay => pay.estado === 'pagado').reduce((a, b) => a + (b.monto ?? 0), 0)
  const totalPendiente = pagos.filter(pay => pay.estado === 'pendiente').reduce((a, b) => a + (b.monto ?? 0), 0)

  return (
    <>
      <div className="min-h-screen max-w-5xl">

        {/* ══════════════════════════════════════════════
            MOBILE HEADER — compacto, una sola fila
        ══════════════════════════════════════════════ */}
        <div className="px-4 pt-4 pb-3 lg:hidden anim-fade-up">
          {/* Fila 1: back + avatar + nombre + editar */}
          <div className="flex items-center gap-3 mb-3">
            <Link href="/pacientes"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}>
              {p.nombre[0]}{p.apellido[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-tight truncate"
                style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
                {p.apellido}, {p.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: est.bg, color: est.color }}>{est.label}</span>
                {edad && <span className="text-xs" style={{ color: '#5A6A88' }}>{edad} a.</span>}
                {consultorioActivo && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#5A6A88' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: consultorioActivo.color }} />
                    {consultorioActivo.nombre}
                  </span>
                )}
              </div>
            </div>
            <Link href={`/pacientes/${p.id}/editar`}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Fila 2: CTA buttons — ancho completo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSesionOpen(true)}
              className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.25)', color: '#3EC9C9' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Nueva sesión
            </button>
            <button
              onClick={() => setPagoOpen(true)}
              className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Registrar pago
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            DESKTOP HEADER — igual que antes
        ══════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-8 pb-0 mb-6 anim-fade-up">
          <div className="flex items-center gap-4">
            <Link href="/pacientes"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}>
                {p.nombre[0]}{p.apellido[0]}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
                  {p.apellido}, {p.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium"
                    style={{ background: est.bg, color: est.color }}>{est.label}</span>
                  {edad && <span className="text-sm" style={{ color: '#5A6A88' }}>{edad} años</span>}
                  {p.obra_social && <span className="text-sm" style={{ color: '#5A6A88' }}>· {p.obra_social}</span>}
                  {consultorioActivo && (
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: '#5A6A88' }}>
                      · <span className="w-2 h-2 rounded-full inline-block" style={{ background: consultorioActivo.color }} />
                      {consultorioActivo.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={() => setSesionOpen(true)}
              className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Sesión
            </button>
            <button onClick={() => setPagoOpen(true)}
              className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Pago
            </button>
            <Link href={`/pacientes/${p.id}/editar`}
              className="h-9 px-3 rounded-xl flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8A9AB8' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-medium">Editar</span>
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            CONTENIDO (compartido mobile + desktop)
        ══════════════════════════════════════════════ */}
        <div className="px-4 lg:px-8 lg:pt-0">

        {/* ── Stats rápidas ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4 lg:gap-3 lg:mb-5">
          {[
            { label: 'Sesiones',   value: String(sesiones.length), color: '#3EC9C9' },
            { label: 'Cobrado',    value: fmtMoney(totalPagado),    color: '#34D399' },
            { label: 'Pendiente',  value: fmtMoney(totalPendiente), color: '#FBBF24' },
            { label: 'Docs',       value: String(docs.length),      color: '#A78BFA' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 lg:px-4 lg:py-3 min-w-0"
              style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] lg:text-xs mb-0.5 lg:mb-1 truncate" style={{ color: '#3A4560' }}>{s.label}</p>
              <p className="text-sm lg:text-base font-bold truncate" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Columna izquierda ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3A4560' }}>Datos personales</p>
                <Link href={`/pacientes/${p.id}/editar`}
                  className="text-xs font-medium transition-opacity hover:opacity-80 px-2 py-1.5 -mr-2 -my-1 rounded-lg"
                  style={{ color: TEAL }}>Editar</Link>
              </div>
              {consultorioActivo && (
                <div className="flex items-center gap-2 pb-1 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: consultorioActivo.color }} />
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-0" style={{ color: '#3A4560' }}>Consultorio</p>
                    <p className="text-sm font-medium" style={{ color: consultorioActivo.color }}>{consultorioActivo.nombre}</p>
                  </div>
                </div>
              )}
              <InfoItem label="DNI" value={p.dni} />
              <InfoItem label="Fecha de nac." value={p.fecha_nacimiento ? fmtDate(p.fecha_nacimiento) : null} />
              <InfoItem label="Teléfono" value={p.telefono} />
              <InfoItem label="Email" value={p.email} />
              {!p.dni && !p.telefono && !p.email && !p.fecha_nacimiento && !consultorioActivo && (
                <p className="text-xs" style={{ color: '#3A4560' }}>Sin datos adicionales</p>
              )}
            </div>

            {(p.obra_social || p.numero_afiliado) && (
              <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#3A4560' }}>Cobertura</p>
                <InfoItem label="Obra social" value={p.obra_social} />
                <InfoItem label="Nº afiliado"  value={p.numero_afiliado} />
              </div>
            )}

            {(p.motivo_consulta || p.diagnostico) && (
              <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#3A4560' }}>Info clínica</p>
                <InfoItem label="Motivo" value={p.motivo_consulta} />
                <InfoItem label="Diagnóstico" value={p.diagnostico} />
              </div>
            )}
          </div>

          {/* ── Columna derecha ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Sesiones */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#3A4560' }}>
                  Sesiones
                  <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}>{sesiones.length}</span>
                </p>
                <button onClick={() => setSesionOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {sesiones.length === 0 ? (
                <p className="text-sm" style={{ color: '#3A4560' }}>Sin sesiones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {sesiones.map(s => {
                    const se = sesionEstado[s.estado] ?? sesionEstado.realizada
                    return (
                      <div key={s.id} className="rounded-xl p-3.5 flex items-start gap-3"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                          style={{ background: `${se.color}15` }}>
                          <span className="text-xs font-bold leading-none" style={{ color: se.color }}>
                            {new Date(s.fecha + 'T00:00:00').getDate()}
                          </span>
                          <span className="text-[10px] leading-none mt-0.5" style={{ color: se.color }}>
                            {new Date(s.fecha + 'T00:00:00').toLocaleString('es-AR', { month: 'short' })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: se.color }}>{se.label}</span>
                            <span className="text-xs" style={{ color: '#3A4560' }}>·</span>
                            <span className="text-xs capitalize" style={{ color: '#5A6A88' }}>{s.tipo}</span>
                            {s.hora_inicio && <span className="text-xs" style={{ color: '#3A4560' }}>· {s.hora_inicio.slice(0, 5)}</span>}
                          </div>
                          {s.observaciones && (
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#6B7A99' }}>{s.observaciones}</p>
                          )}
                        </div>
                        {s.monto != null && (
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold" style={{ color: s.pagado ? '#34D399' : '#FBBF24' }}>
                              {fmtMoney(s.monto)}
                            </p>
                            <p className="text-xs" style={{ color: '#3A4560' }}>{s.pagado ? 'pagado' : 'pendiente'}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagos */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#3A4560' }}>
                  Pagos
                  <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}>{pagos.length}</span>
                </p>
                <button onClick={() => setPagoOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {pagos.length === 0 ? (
                <p className="text-sm" style={{ color: '#3A4560' }}>Sin pagos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {pagos.map(pay => {
                    const ep = pay.estado === 'pagado' ? { color: '#34D399', label: 'Pagado' }
                      : pay.estado === 'pendiente' ? { color: '#FBBF24', label: 'Pendiente' }
                      : { color: '#F87171', label: 'Devuelto' }
                    return (
                      <div key={pay.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#C8D4E8' }}>
                            {pay.concepto || 'Consulta'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: '#5A6A88' }}>
                            {fmtDate(pay.fecha)} · {pay.tipo.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
                          style={{ background: `${ep.color}15`, color: ep.color }}>
                          {ep.label}
                        </span>
                        <p className="text-base font-bold flex-shrink-0" style={{ color: '#E8EDF5' }}>
                          {fmtMoney(pay.monto)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Documentos */}
            <div className="rounded-2xl p-5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <DocumentsSection pacienteId={p.id} initialDocs={docs} />
            </div>

          </div>
        </div>
        </div>{/* /px-4 wrapper */}
      </div>{/* /max-w-5xl */}

      {/* ── Modales ── */}
      <Modal
        open={sesionOpen}
        onClose={() => setSesionOpen(false)}
        title="Nueva sesión"
        subtitle="Registrá el encuentro con el paciente"
        wide
      >
        <SesionForm
          pacienteId={p.id}
          consultorios={consultorios}
          defaultConsultorioId={p.consultorio_id}
          onSuccess={() => { setSesionOpen(false); router.refresh() }}
          onCancel={() => setSesionOpen(false)}
        />
      </Modal>

      <Modal
        open={pagoOpen}
        onClose={() => setPagoOpen(false)}
        title="Registrar pago"
        subtitle="Asentá el cobro de la consulta"
      >
        <PagoForm
          pacienteId={p.id}
          onSuccess={() => { setPagoOpen(false); router.refresh() }}
          onCancel={() => setPagoOpen(false)}
        />
      </Modal>
    </>
  )
}
