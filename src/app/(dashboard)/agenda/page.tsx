'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { pacienteSlug } from '@/lib/utils'

const TEAL  = '#3EC9C9'
const AMBER = '#F5A623'

const estadoConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  realizada:    { label: 'Realizada',    color: 'var(--success)', bg: 'rgba(52,211,153,0.12)',   dot: 'var(--success)' },
  programada:   { label: 'Programada',   color: 'var(--primary)', bg: 'rgba(62,201,201,0.12)',   dot: 'var(--primary)' },
  cancelada:    { label: 'Cancelada',    color: 'var(--danger)', bg: 'rgba(248,113,113,0.12)',  dot: 'var(--danger)' },
  inasistencia: { label: 'Inasistencia', color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)',   dot: 'var(--warning)' },
}

const tipoConfig: Record<string, { label: string; color: string }> = {
  presencial: { label: 'Presencial', color: 'var(--primary)' },
  virtual:    { label: 'Virtual',    color: 'var(--virtual)' },
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

interface SesionWithPaciente {
  id: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  tipo: string
  estado: string
  observaciones: string | null
  monto: number | null
  pagado: boolean
  paciente_id: string
  pacientes: { nombre: string; apellido: string } | null
}

interface PacienteOpt {
  id: string
  nombre: string
  apellido: string
}

interface ConsultorioOpt {
  id: string
  nombre: string
  color: string
}

/* ── helpers ─────────────────────────────────────────────── */
function avatarColors(id: string) {
  const palette = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24']
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return palette[n % palette.length]
}
function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}
function fmtTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

/* ── shared input styles ─────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
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

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
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
              color: active ? color : 'var(--text-dim)',
            }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

/* ── Nueva Sesión Modal ───────────────────────────────────── */
function NuevaSesionModal({
  open, onClose, defaultDate, pacientes, consultorios, onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultDate: string
  pacientes: PacienteOpt[]
  consultorios: ConsultorioOpt[]
  onCreated: () => void
}) {
  const [search, setSearch] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    fecha: defaultDate,
    hora_inicio: '', hora_fin: '',
    tipo: 'presencial', estado: 'programada',
    consultorio_id: '',
    observaciones: '', monto: '', pagado: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Sync date when defaultDate changes (user picks another day while modal closed)
  useEffect(() => {
    if (open) setForm(f => ({ ...f, fecha: defaultDate }))
  }, [open, defaultDate])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch(''); setPacienteId(''); setShowDropdown(false); setError('')
      setForm({ fecha: defaultDate, hora_inicio: '', hora_fin: '', tipo: 'presencial', estado: 'programada', consultorio_id: '', observaciones: '', monto: '', pagado: false })
    }
  }, [open, defaultDate])

  const filtered = search.length > 0
    ? pacientes.filter(p => `${p.apellido} ${p.nombre}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  const selectedPac = pacientes.find(p => p.id === pacienteId)

  function selectPac(p: PacienteOpt) {
    setPacienteId(p.id)
    setSearch(`${p.apellido}, ${p.nombre}`)
    setShowDropdown(false)
  }

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pacienteId) { setError('Seleccioná un paciente.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

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
      monto:           form.monto ? parseFloat(form.monto) : null,
      pagado:          form.pagado,
    })

    if (err) { setError('Error al guardar la sesión.'); setSaving(false) }
    else { onCreated(); onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

        {/* Drag pill */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              Nueva sesión
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {DAYS_OF_WEEK[new Date(form.fecha + 'T12:00:00').getDay()]}{' '}
              {new Date(form.fecha + 'T12:00:00').getDate()} de{' '}
              {MONTHS[new Date(form.fecha + 'T12:00:00').getMonth()]}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 transition-opacity hover:opacity-70"
            style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Paciente */}
          <div className="relative">
            <Label text="Paciente" required />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar paciente por nombre…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPacienteId(''); setShowDropdown(true) }}
              onFocus={() => search.length > 0 && setShowDropdown(true)}
              className={inputCls}
              style={{
                ...inputStyle,
                borderColor: pacienteId ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.08)',
              }}
              onBlurCapture={e => { if (!e.relatedTarget?.closest?.('[data-dropdown]')) setShowDropdown(false) }}
            />
            {pacienteId && (
              <div className="absolute right-3 top-[34px] flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
              </div>
            )}
            {showDropdown && filtered.length > 0 && (
              <div data-dropdown className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {filtered.map(p => (
                  <button key={p.id} type="button" onMouseDown={() => selectPac(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${avatarColors(p.id)}1A`, color: avatarColors(p.id) }}>
                      {initials(p.nombre, p.apellido)}
                    </div>
                    <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                      {p.apellido}, {p.nombre}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && search.length > 0 && filtered.length === 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl px-4 py-3 text-sm"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                Sin resultados
              </div>
            )}
          </div>

          {/* Fecha + horarios */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
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

          {/* Modalidad + Estado */}
          <div>
            <Label text="Modalidad" />
            <ToggleGroup value={form.tipo} onChange={setStr('tipo')} options={[
              { value: 'presencial', label: 'Presencial', color: TEAL },
              { value: 'virtual',    label: 'Virtual',    color: 'var(--virtual)' },
            ]} />
          </div>

          <div>
            <Label text="Estado" />
            <ToggleGroup value={form.estado} onChange={setStr('estado')} options={[
              { value: 'programada',   label: 'Programada',   color: TEAL },
              { value: 'realizada',    label: 'Realizada',    color: 'var(--success)' },
              { value: 'cancelada',    label: 'Cancelada',    color: 'var(--danger)' },
              { value: 'inasistencia', label: 'Inasistencia', color: 'var(--warning)' },
            ]} />
          </div>

          {/* Consultorio */}
          {consultorios.length > 0 && (
            <div>
              <Label text="Consultorio" />
              <div className="flex flex-wrap gap-2">
                {consultorios.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => setForm(f => ({ ...f, consultorio_id: f.consultorio_id === c.id ? '' : c.id }))}
                    className="flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: form.consultorio_id === c.id ? `${c.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.consultorio_id === c.id ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                      color: form.consultorio_id === c.id ? c.color : 'var(--text-dim)',
                    }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monto */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label text="Monto ($)" />
              <input type="number" min="0" step="0.01" value={form.monto}
                onChange={e => setStr('monto')(e.target.value)}
                placeholder="0.00" className={inputCls} style={inputStyle}
                onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, pagado: !f.pagado }))}
              className="h-10 rounded-xl text-sm font-medium flex items-center gap-2.5 px-4 transition-all"
              style={{
                background: form.pagado ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.pagado ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: form.pagado ? 'var(--success)' : 'var(--text-dim)',
              }}>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                style={{ borderColor: form.pagado ? 'var(--success)' : 'var(--text-subtle)', background: form.pagado ? 'var(--success)' : 'transparent' }}>
                {form.pagado && <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>}
              </div>
              {form.pagado ? 'Pagada' : 'Sin pagar'}
            </button>
          </div>

          {/* Observaciones */}
          <div>
            <Label text="Observaciones" />
            <textarea value={form.observaciones} onChange={e => setStr('observaciones')(e.target.value)}
              placeholder="Notas breves de la sesión…" rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
              style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>Guardando…</>
                : 'Guardar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function AgendaPage() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(
    today.toISOString().split('T')[0]
  )
  const [sesiones,     setSesiones]     = useState<SesionWithPaciente[]>([])
  const [pacientes,    setPacientes]    = useState<PacienteOpt[]>([])
  const [consultorios, setConsultorios] = useState<ConsultorioOpt[]>([])
  const [loading,      setLoading]      = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)

  const fetchSesiones = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const firstDay  = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay   = new Date(year, month + 1, 0)
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('sesiones')
      .select('*, pacientes(nombre, apellido)')
      .gte('fecha', firstDay)
      .lte('fecha', lastDayStr)
      .order('hora_inicio', { ascending: true })

    setSesiones((data ?? []) as SesionWithPaciente[])
    setLoading(false)
  }, [year, month])

  // Fetch pacientes + consultorios once
  useEffect(() => {
    const supabase = createClient()
    supabase.from('pacientes').select('id, nombre, apellido').eq('estado', 'activo').order('apellido')
      .then(({ data }) => setPacientes((data ?? []) as PacienteOpt[]))
    supabase.from('consultorios').select('id, nombre, color').eq('activo', true).order('nombre')
      .then(({ data }) => setConsultorios((data ?? []) as ConsultorioOpt[]))
  }, [])

  useEffect(() => { fetchSesiones() }, [fetchSesiones])

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth     = new Date(year, month + 1, 0).getDate()
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  // Group sessions by date
  const byDate: Record<string, SesionWithPaciente[]> = {}
  for (const s of sesiones) {
    if (!byDate[s.fecha]) byDate[s.fecha] = []
    byDate[s.fecha].push(s)
  }

  const daySesiones = selectedDay ? (byDate[selectedDay] ?? []) : []

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today.toISOString().split('T')[0])
  }

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 max-w-7xl" style={{ minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            Agenda
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>
            Sesiones programadas y realizadas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={goToday}
            className="h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.2)', color: TEAL }}>
            Hoy
          </button>
          <div className="flex items-center gap-1 rounded-xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <button onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="px-2 text-sm font-semibold w-[130px] text-center" style={{ color: 'var(--foreground-muted)' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 anim-fade-up">

        {/* Calendar */}
        <div className="flex-1 rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold tracking-widest uppercase"
                style={{ color: 'var(--text-subtle)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDayOfMonth + 1
                const inMonth = dayNum >= 1 && dayNum <= daysInMonth
                const dateStr = inMonth
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  : null
                const isToday    = dateStr === todayStr
                const isSelected = dateStr === selectedDay
                const daySess    = dateStr ? (byDate[dateStr] ?? []) : []
                const isLastRow  = i >= totalCells - 7

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!dateStr) return
                      if (dateStr === selectedDay) { setModalOpen(true) }
                      else setSelectedDay(dateStr)
                    }}
                    disabled={!inMonth}
                    className="relative text-left transition-colors group"
                    style={{
                      minHeight: 72,
                      padding: '6px',
                      borderRight:  (i + 1) % 7 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      borderBottom: !isLastRow ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isSelected ? 'rgba(62,201,201,0.06)' : 'transparent',
                      cursor: inMonth ? 'pointer' : 'default',
                    }}>

                    {inMonth && (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold"
                            style={{
                              background: isToday ? TEAL : isSelected ? 'rgba(62,201,201,0.15)' : 'transparent',
                              color: isToday ? 'var(--primary-foreground)' : isSelected ? TEAL : 'var(--muted-foreground)',
                            }}>
                            {dayNum}
                          </span>
                          {daySess.length > 0 && (
                            <span className="text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center"
                              style={{ background: 'rgba(62,201,201,0.12)', color: TEAL, fontSize: '10px' }}>
                              {daySess.length}
                            </span>
                          )}
                        </div>

                        {/* Session pills */}
                        <div className="space-y-0.5">
                          {daySess.slice(0, 3).map(s => {
                            const cfg = estadoConfig[s.estado] ?? estadoConfig.programada
                            const pac = s.pacientes
                            return (
                              <div key={s.id}
                                className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
                                style={{ background: cfg.bg }}>
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: cfg.dot }} />
                                <span className="text-xs truncate leading-tight"
                                  style={{ color: cfg.color, fontSize: '10px' }}>
                                  {s.hora_inicio ? fmtTime(s.hora_inicio) + ' · ' : ''}
                                  {pac ? `${pac.apellido}` : '—'}
                                </span>
                              </div>
                            )
                          })}
                          {daySess.length > 3 && (
                            <p className="text-center" style={{ color: 'var(--text-subtle)', fontSize: '10px' }}>
                              +{daySess.length - 3} más
                            </p>
                          )}
                        </div>

                        {/* "+" hover hint — visible on all days */}
                        {isSelected && (
                          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center"
                              style={{ background: 'rgba(62,201,201,0.2)' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 flex-shrink-0 rounded-2xl overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>

          {/* Panel header */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {selectedDay ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-subtle)' }}>
                      {DAYS_OF_WEEK[new Date(selectedDay + 'T12:00:00').getDay()]}
                    </p>
                    <p className="text-lg font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                      {new Date(selectedDay + 'T12:00:00').getDate()} de {MONTHS[new Date(selectedDay + 'T12:00:00').getMonth()]}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {daySesiones.length === 0
                        ? 'Sin sesiones'
                        : `${daySesiones.length} sesión${daySesiones.length > 1 ? 'es' : ''}`}
                    </p>
                  </div>
                  {/* Nueva sesión button */}
                  <button
                    onClick={() => setModalOpen(true)}
                    title="Nueva sesión"
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                    style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.25)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Seleccioná un día</p>
            )}
          </div>

          {/* Sessions list */}
          <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
            {daySesiones.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(62,201,201,0.06)', border: '1px solid rgba(62,201,201,0.1)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke={TEAL} strokeWidth="1.8"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>No hay sesiones este día</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="h-8 px-4 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: TEAL }}>
                  + Agregar sesión
                </button>
              </div>
            ) : (
              <>
              {daySesiones.map(s => {
                const cfg    = estadoConfig[s.estado] ?? estadoConfig.programada
                const tipCfg = tipoConfig[s.tipo] ?? tipoConfig.presencial
                const pac    = s.pacientes
                const color  = avatarColors(s.paciente_id)

                return (
                  <Link
                    key={s.id}
                    href={`/pacientes/${pac ? pacienteSlug(pac.apellido, pac.nombre, s.paciente_id) : s.paciente_id}`}
                    className="block rounded-xl p-3 transition-colors hover:bg-white/[0.02]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>

                    <div className="flex items-start gap-2.5 mb-2">
                      {pac && (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                          {initials(pac.nombre, pac.apellido)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground-muted)' }}>
                          {pac ? `${pac.apellido}, ${pac.nombre}` : '—'}
                        </p>
                        {s.hora_inicio && (
                          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            {fmtTime(s.hora_inicio)}{s.hora_fin ? ` – ${fmtTime(s.hora_fin)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        <div className="w-1 h-1 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: tipCfg.color }}>
                        {tipCfg.label}
                      </span>
                      {s.monto != null && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium ml-auto"
                          style={{
                            background: s.pagado ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                            color: s.pagado ? 'var(--success)' : 'var(--warning)',
                          }}>
                          ${s.monto.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>

                    {s.observaciones && (
                      <p className="text-xs mt-2 leading-relaxed line-clamp-2"
                        style={{ color: 'var(--text-subtle)' }}>
                        {s.observaciones}
                      </p>
                    )}
                  </Link>
                )
              })}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80 mt-1"
                style={{ background: 'rgba(62,201,201,0.07)', border: '1px dashed rgba(62,201,201,0.25)', color: TEAL }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Agregar sesión
              </button>
              </>
            )}
          </div>

          {/* Quick stats */}
          {sesiones.length > 0 && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-subtle)' }}>
                Este mes
              </p>
              <div className="space-y-2">
                {Object.entries(estadoConfig).map(([key, cfg]) => {
                  const count = sesiones.filter(s => s.estado === key).length
                  if (count === 0) return null
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{cfg.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <NuevaSesionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDay ?? todayStr}
        pacientes={pacientes}
        consultorios={consultorios}
        onCreated={fetchSesiones}
      />
    </div>
  )
}
