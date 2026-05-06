'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pacienteSlug } from '@/lib/utils'

const TEAL  = '#3EC9C9'
const AMBER = '#F5A623'

const estadoConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  realizada:    { label: 'Asistió',      color: 'var(--success)', bg: 'rgba(52,211,153,0.12)',   dot: 'var(--success)' },
  programada:   { label: 'Programada',   color: 'var(--primary)', bg: 'rgba(62,201,201,0.12)',   dot: 'var(--primary)' },
  cancelada:    { label: 'Cancelada',    color: 'var(--danger)',  bg: 'rgba(248,113,113,0.12)',  dot: 'var(--danger)' },
  inasistencia: { label: 'Inasistencia', color: 'var(--warning)', bg: 'rgba(251,191,36,0.12)',   dot: 'var(--warning)' },
}

const categoriaConfig: Record<string, { label: string; color: string; bg: string }> = {
  sesion:      { label: 'Sesión',      color: '#3EC9C9', bg: 'rgba(62,201,201,0.12)'  },
  evaluacion:  { label: 'Evaluación',  color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  devolucion:  { label: 'Devolución',  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  tratamiento: { label: 'Tratamiento', color: '#F5A623', bg: 'rgba(245,166,35,0.12)'  },
}

const ESTADO_OPCIONES: { label: string; value: string; color: string }[] = [
  { label: 'Asistió', value: 'realizada',    color: '#34D399' },
  { label: 'Faltó',   value: 'inasistencia', color: '#FBBF24' },
  { label: 'Canceló', value: 'cancelada',    color: '#F87171' },
]
const CATEGORIA_OPCIONES: { label: string; value: string; color: string }[] = [
  { label: 'Sesión',      value: 'sesion',      color: '#3EC9C9' },
  { label: 'Evaluación',  value: 'evaluacion',  color: '#60A5FA' },
  { label: 'Devolución',  value: 'devolucion',  color: '#A78BFA' },
  { label: 'Tratamiento', value: 'tratamiento', color: '#F5A623' },
]

const tipoConfig: Record<string, { label: string; color: string }> = {
  presencial: { label: 'Presencial', color: 'var(--primary)' },
  virtual:    { label: 'Virtual',    color: 'var(--virtual)' },
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

type ViewMode = 'dia' | 'semana' | 'mes'

interface SesionWithPaciente {
  id: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  tipo: string
  estado: string
  categoria: string | null
  observaciones: string | null
  monto: number | null
  pagado: boolean
  paciente_id: string
  consultorio_id: string | null
  pacientes: { nombre: string; apellido: string } | null
}

interface PacienteOpt   { id: string; nombre: string; apellido: string; telefono?: string | null }
interface ConsultorioOpt { id: string; nombre: string; color: string }

/* ── time-grid constants ─────────────────────────────────── */
const TIME_LABEL_W = 52  // px — left column for time labels
const HOUR_HEIGHT  = 64  // px per hour
const START_HOUR   = 6
const END_HOUR     = 24

/* ── helpers ─────────────────────────────────────────────── */
function avatarColors(id: string) {
  const palette = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24']
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return palette[n % palette.length]
}
function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}
function parseCategories(cat: string | null): string[] {
  if (!cat) return []
  return cat.split(',').filter(Boolean)
}
function stringifyCategories(cats: string[]): string | null {
  return cats.length ? cats.join(',') : null
}
function fmtTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function cleanPhone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.startsWith('0')) return '54' + digits.slice(1)
  if (digits.startsWith('54')) return digits
  return '54' + digits
}
function buildWaUrl(tel: string, mensaje: string): string {
  return `https://wa.me/${cleanPhone(tel)}?text=${encodeURIComponent(mensaje)}`
}
function buildMensaje(
  pacNombre: string, pacApellido: string,
  proName: string,
  fecha: string, horaInicio: string,
  consNombre?: string,
): string {
  const d  = new Date(fecha + 'T12:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const aa = String(d.getFullYear()).slice(-2)
  const hora = horaInicio ? horaInicio.slice(0, 5) : ''

  return [
    `Hola, ¿cómo estás?`,
    `Turno asignado para ${pacNombre} ${pacApellido}${proName ? ` con ${proName}` : ''}${consNombre ? ` en ${consNombre}` : ''}.`,
    ``,
    `Te escribo para confirmar nuestro turno del día ${dd}/${mm}/${aa}${hora ? ` a las ${hora}hs` : ''}.`,
    ``,
    `Te recuerdo las pautas de atención:`,
    ``,
    `✏️*Confirmación:* Debe realizarse con al menos 24 horas de antelación.`,
    `✏️*Inasistencias*: En caso de no asistir habiendo confirmado o de no cancelar con la anticipación requerida, el valor de la consulta deberá abonarse de todas formas.`,
    `✏️*Honorarios:* El valor de la sesión se abona en el momento de la consulta.`,
    ``,
    `¡Quedo a la espera de tu confirmación! 🙌`,
    `Saludos.`,
  ].join('\n')
}

interface LayedSession { sesion: SesionWithPaciente; col: number; numCols: number }

function layoutSessions(sessions: SesionWithPaciente[]): LayedSession[] {
  const filtered = sessions.filter(s => s.hora_inicio)
  if (!filtered.length) return []
  const sorted = [...filtered].sort((a, b) =>
    timeToMinutes(a.hora_inicio!) - timeToMinutes(b.hora_inicio!))

  const colEnds: number[] = []
  const assigned: Array<{ s: SesionWithPaciente; col: number }> = []

  for (const s of sorted) {
    const start = timeToMinutes(s.hora_inicio!)
    const end   = s.hora_fin ? timeToMinutes(s.hora_fin) : start + 50
    let col = colEnds.findIndex(e => e <= start)
    if (col === -1) { col = colEnds.length; colEnds.push(end) }
    else colEnds[col] = end
    assigned.push({ s, col })
  }

  return assigned.map(({ s, col }) => {
    const start = timeToMinutes(s.hora_inicio!)
    const end   = s.hora_fin ? timeToMinutes(s.hora_fin) : start + 50
    const concurrent = assigned.filter(({ s: o }) => {
      const os = timeToMinutes(o.hora_inicio!)
      const oe = o.hora_fin ? timeToMinutes(o.hora_fin) : os + 50
      return os < end && oe > start
    })
    return { sesion: s, col, numCols: Math.max(...concurrent.map(c => c.col)) + 1 }
  })
}

function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(d)
  monday.setDate(d.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return toDateStr(dd)
  })
}
function weekLabel(dateStr: string): string {
  const days = getWeekDays(dateStr)
  const first = new Date(days[0] + 'T12:00:00')
  const last  = new Date(days[6] + 'T12:00:00')
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${MONTHS[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${first.getDate()} ${MONTHS[first.getMonth()].slice(0,3)} – ${last.getDate()} ${MONTHS[last.getMonth()].slice(0,3)} ${last.getFullYear()}`
}

/* ── shared styles ───────────────────────────────────────── */
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

function MultiToggleGroup({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; color?: string }[]
}) {
  const actives = value.split(',').filter(Boolean)
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const isActive = actives.includes(opt.value)
        const color = opt.color ?? TEAL
        return (
          <button key={opt.value} type="button" onClick={() => {
            const next = isActive ? actives.filter(v => v !== opt.value) : [...actives, opt.value]
            onChange(next.join(','))
          }}
            className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: isActive ? `${color}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? color + '45' : 'rgba(255,255,255,0.07)'}`,
              color: isActive ? color : 'var(--text-dim)',
            }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

function getCategoriaSummary(categoria: string | null) {
  const activeCats = parseCategories(categoria)
  const firstCat = activeCats.length > 0 ? (categoriaConfig[activeCats[0]] ?? null) : null
  return { activeCats, firstCat }
}

/* ── SesionQuickMenu ─────────────────────────────────────── */
function SesionQuickMenu({
  sesion, open, onToggle, onClose, onAction, compact = false,
}: {
  sesion: SesionWithPaciente
  open: boolean
  onToggle: () => void
  onClose: () => void
  onAction: (changes: { estado?: string; categoria?: string | null }) => void
  compact?: boolean
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const MENU_HEIGHT = (ESTADO_OPCIONES.length + CATEGORIA_OPCIONES.length) * 40 + 20
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 })

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const { activeCats, firstCat } = getCategoriaSummary(sesion.categoria)
  const activeEstado = sesion.estado !== 'programada' ? ESTADO_OPCIONES.find(o => o.value === sesion.estado) ?? null : null
  const displayOp    = firstCat ?? activeEstado
  const extraCount   = Math.max(activeCats.length - (firstCat ? 1 : 0), 0)
  const displayLabel = displayOp ? `${displayOp.label}${extraCount > 0 ? ` +${extraCount}` : ''}` : 'Marcar'

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const right = window.innerWidth - rect.right
      if (spaceBelow < MENU_HEIGHT + 8) {
        setMenuPos({ bottom: window.innerHeight - rect.top + 6, right })
      } else {
        setMenuPos({ top: rect.bottom + 6, right })
      }
    }
    onToggle()
  }

  const dropdown = open && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        ...(menuPos.bottom != null ? { bottom: menuPos.bottom } : { top: menuPos.top }),
        right: menuPos.right,
        zIndex: 9999,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        minWidth: 172,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      {ESTADO_OPCIONES.map(op => {
        const isActive = sesion.estado === op.value
        return (
          <button
            key={op.value}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onAction({ estado: op.value }); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: isActive ? op.color : 'var(--foreground-muted)' }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: op.color }} />
            <span className="flex-1 text-left text-sm">{op.label}</span>
            {isActive && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )
      })}
      <div style={{ height: 1, margin: '4px 12px', background: 'rgba(255,255,255,0.07)' }} />
      {CATEGORIA_OPCIONES.map(op => {
        const isActive = activeCats.includes(op.value)
        return (
          <button
            key={op.value}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              const nextCats = isActive
                ? activeCats.filter(v => v !== op.value)
                : [...activeCats, op.value]
              onAction({ categoria: stringifyCategories(nextCats) })
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: isActive ? op.color : 'var(--foreground-muted)' }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: op.color }} />
            <span className="flex-1 text-left text-sm">{op.label}</span>
            {isActive && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 rounded-lg font-semibold transition-all whitespace-nowrap"
        style={{
          height: compact ? 26 : 28,
          padding: compact ? '0 6px' : '0 10px',
          fontSize: compact ? 10 : 11,
          background: displayOp ? `${displayOp.color}18` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${displayOp ? displayOp.color + '40' : 'rgba(255,255,255,0.1)'}`,
          color: displayOp ? displayOp.color : 'var(--text-dim)',
        }}
      >
        {displayOp
          ? <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: displayOp.color }} />
          : null}
        {!compact && displayLabel}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {dropdown}
    </div>
  )
}

/* ── SesionCard ──────────────────────────────────────────── */
function SesionCard({
  sesion, openMenuId, setOpenMenuId, onEdit, onQuickAction, compact = false,
}: {
  sesion: SesionWithPaciente
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onEdit: (s: SesionWithPaciente) => void
  onQuickAction: (sesionId: string, changes: { estado?: string; categoria?: string | null }) => void
  compact?: boolean
}) {
  const cfg     = estadoConfig[sesion.estado] ?? estadoConfig.programada
  const { activeCats, firstCat: catCfg } = getCategoriaSummary(sesion.categoria)
  const pac     = sesion.pacientes
  const color   = avatarColors(sesion.paciente_id)
  const display = catCfg ?? cfg
  const metaLabel = activeCats.length > 1 && catCfg ? `${catCfg.label} +${activeCats.length - 1}` : catCfg?.label

  const menuEl = (
    <div onClick={e => e.stopPropagation()}>
      <SesionQuickMenu
        sesion={sesion}
        open={openMenuId === sesion.id}
        onToggle={() => setOpenMenuId(openMenuId === sesion.id ? null : sesion.id)}
        onClose={() => setOpenMenuId(null)}
        onAction={changes => onQuickAction(sesion.id, changes)}
        compact={compact}
      />
    </div>
  )

  /* ── compact (week view) ── */
  if (compact) {
    return (
      <div
        className="rounded-lg p-2 cursor-pointer transition-all hover:brightness-110"
        onClick={() => onEdit(sesion)}
        style={{ background: `${display.color}10`, border: `1px solid ${display.color}28` }}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className="text-xs font-semibold leading-tight line-clamp-2 min-w-0" style={{ color: display.color }}>
            {pac ? `${pac.apellido}, ${pac.nombre}` : '—'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(sesion) }}
              title="Editar sesión"
              style={{
                width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${display.color}20`, border: `1px solid ${display.color}35`, cursor: 'pointer',
              }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={display.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={display.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {menuEl}
          </div>
        </div>
        {sesion.hora_inicio && (
          <p style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{fmtTime(sesion.hora_inicio)}</p>
        )}
        {metaLabel && (
          <p style={{ color: display.color, fontSize: 10, opacity: 0.8, marginTop: 2 }}>{metaLabel}</p>
        )}
      </div>
    )
  }

  /* ── full (day / month side-panel) ── */
  return (
    <div className="rounded-xl p-3.5 transition-colors"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>

      <div className="flex items-start gap-2.5 mb-2.5">
        {pac && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
            {initials(pac.nombre, pac.apellido)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground-muted)' }}>
            {pac ? `${pac.apellido}, ${pac.nombre}` : '—'}
          </p>
          {sesion.hora_inicio && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {fmtTime(sesion.hora_inicio)}{sesion.hora_fin ? ` – ${fmtTime(sesion.hora_fin)}` : ''}
            </p>
          )}
        </div>
        {menuEl}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
          style={{ background: display.bg, color: display.color }}>
          <div className="w-1 h-1 rounded-full" style={{ background: display.color }} />
          {metaLabel ?? cfg.label}
        </span>
        <span className="px-2 py-0.5 rounded-md text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', color: tipoConfig[sesion.tipo]?.color ?? 'var(--text-dim)' }}>
          {tipoConfig[sesion.tipo]?.label ?? sesion.tipo}
        </span>
        {sesion.monto != null && (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium ml-auto"
            style={{
              background: sesion.pagado ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
              color: sesion.pagado ? 'var(--success)' : 'var(--warning)',
            }}>
            ${sesion.monto.toLocaleString('es-AR')}
          </span>
        )}
      </div>

      {sesion.observaciones && (
        <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: 'var(--text-subtle)' }}>
          {sesion.observaciones}
        </p>
      )}

      <button type="button" onClick={() => onEdit(sesion)}
        className="mt-2 text-xs transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-dim)' }}>
        Editar sesión →
      </button>
    </div>
  )
}

/* ── DayView — time-grid calendar ────────────────────────── */
function DayView({ date, sesiones, openMenuId, setOpenMenuId, onEdit, onNewSesion, onQuickAction }: {
  date: string
  sesiones: SesionWithPaciente[]
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onEdit: (s: SesionWithPaciente) => void
  onNewSesion: () => void
  onQuickAction: (sesionId: string, changes: { estado?: string; categoria?: string | null }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  const daySes      = sesiones.filter(s => s.fecha === date)
  const scheduled   = daySes.filter(s => s.hora_inicio)
  const unscheduled = daySes.filter(s => !s.hora_inicio)
  const laid        = layoutSessions(scheduled)

  const now        = new Date()
  const isToday    = date === toDateStr(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowTop     = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT

  // Scroll to current time (or first session) on mount / date change
  useEffect(() => {
    if (!containerRef.current) return
    const firstSched = [...scheduled].sort((a, b) =>
      timeToMinutes(a.hora_inicio!) - timeToMinutes(b.hora_inicio!))[0]
    const scrollTo = isToday
      ? Math.max(0, nowTop - 120)
      : firstSched
        ? Math.max(0, ((timeToMinutes(firstSched.hora_inicio!) - START_HOUR * 60) / 60) * HOUR_HEIGHT - 80)
        : (8 - START_HOUR) * HOUR_HEIGHT // default: scroll to 8am
    containerRef.current.scrollTop = scrollTo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const d = new Date(date + 'T12:00:00')

  return (
    <div className="flex-1 rounded-2xl flex flex-col overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

      {/* ── Header ── */}
      <div className="px-5 py-4 flex items-start justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-subtle)' }}>
            {DAYS_OF_WEEK[d.getDay()]}
          </p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            {d.getDate()} de {MONTHS[d.getMonth()]} {d.getFullYear()}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
            {daySes.length === 0 ? 'Sin sesiones' : `${daySes.length} sesión${daySes.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        <button onClick={onNewSesion}
          className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.25)', color: TEAL }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Nueva sesión
        </button>
      </div>

      {/* ── Unscheduled sessions ── */}
      {unscheduled.length > 0 && (
        <div className="px-4 py-2.5 flex-shrink-0 flex gap-2 flex-wrap items-center"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <span className="text-xs mr-1" style={{ color: 'var(--text-subtle)' }}>Sin hora:</span>
          {unscheduled.map(s => {
            const catCfg = s.categoria ? (categoriaConfig[s.categoria] ?? null) : null
            const cfg    = estadoConfig[s.estado] ?? estadoConfig.programada
            const color  = catCfg?.color ?? cfg.color
            const bg     = catCfg?.bg    ?? cfg.bg
            return (
              <button key={s.id} onClick={() => onEdit(s)}
                className="flex items-center gap-2 h-7 px-3 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: bg, border: `1px solid ${color}35`, color }}>
                {s.pacientes ? `${s.pacientes.apellido}, ${s.pacientes.nombre}` : '—'}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Time grid ── */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div style={{ position: 'relative', height: totalHeight }}>

          {/* Hour lines & labels */}
          {hours.map(hour => (
            <div key={hour} style={{ pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute',
                top: (hour - START_HOUR) * HOUR_HEIGHT,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
              }}>
                <span style={{
                  width: TIME_LABEL_W,
                  flexShrink: 0,
                  textAlign: 'right',
                  paddingRight: 10,
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-subtle)',
                  userSelect: 'none',
                  transform: 'translateY(-7px)',
                  letterSpacing: '0.02em',
                }}>
                  {String(hour).padStart(2, '0')}:00
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              {/* 30-min line */}
              <div style={{
                position: 'absolute',
                top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                left: TIME_LABEL_W,
                right: 0,
                height: 1,
                background: 'rgba(255,255,255,0.03)',
              }} />
            </div>
          ))}

          {/* Current-time indicator */}
          {isToday && nowTop >= 0 && nowTop <= totalHeight && (
            <div style={{
              position: 'absolute',
              top: nowTop,
              left: TIME_LABEL_W - 5,
              right: 0,
              height: 2,
              background: TEAL,
              zIndex: 8,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', left: -3, top: -3,
                width: 8, height: 8, borderRadius: '50%', background: TEAL,
              }} />
            </div>
          )}

          {/* Session blocks */}
          {laid.map(({ sesion: s, col, numCols }) => {
            const start     = timeToMinutes(s.hora_inicio!)
            const rawEnd    = s.hora_fin ? timeToMinutes(s.hora_fin) : start + 50
            const clampedStart = Math.max(start, START_HOUR * 60)
            const clampedEnd   = Math.min(rawEnd, END_HOUR * 60)
            if (clampedStart >= clampedEnd) return null

            const top    = ((clampedStart - START_HOUR * 60) / 60) * HOUR_HEIGHT
            const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 28)

            const { activeCats, firstCat: catCfg } = getCategoriaSummary(s.categoria)
            const cfg     = estadoConfig[s.estado] ?? estadoConfig.programada
            const color   = catCfg?.color ?? cfg.color
            const bg      = catCfg?.bg    ?? cfg.bg
            const pac     = s.pacientes
            const tall    = height >= 50
            const label   = catCfg
              ? `${catCfg.label}${activeCats.length > 1 ? ` +${activeCats.length - 1}` : ''}`
              : cfg.label

            // CSS calc for column layout within content area
            const leftExpr  = `calc(${TIME_LABEL_W}px + (100% - ${TIME_LABEL_W}px) * ${col / numCols} + 3px)`
            const rightExpr = `calc((100% - ${TIME_LABEL_W}px) * ${(numCols - col - 1) / numCols} + 3px)`

            return (
              <div
                key={s.id}
                onClick={() => onEdit(s)}
                style={{
                  position: 'absolute',
                  top: top + 1,
                  left: leftExpr,
                  right: rightExpr,
                  height: height - 2,
                  borderRadius: 8,
                  background: bg,
                  borderLeft: `3px solid ${color}`,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  zIndex: 5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: tall ? '4px 8px' : '0 8px',
                  transition: 'filter 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.12)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {fmtTime(s.hora_inicio)}{pac ? ` · ${pac.apellido}, ${pac.nombre}` : ''}
                  </span>
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(s) }}
                      title="Editar sesión"
                      style={{
                        width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${color}20`, border: `1px solid ${color}35`, cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <SesionQuickMenu
                      sesion={s}
                      open={openMenuId === s.id}
                      onToggle={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                      onClose={() => setOpenMenuId(null)}
                      onAction={changes => onQuickAction(s.id, changes)}
                      compact
                    />
                  </div>
                </div>
                {tall && (
                  <span style={{ fontSize: 11, color, opacity: 0.75, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}{s.hora_fin ? ` · hasta ${fmtTime(s.hora_fin)}` : ''}
                  </span>
                )}
              </div>
            )
          })}

          {/* Empty state (centered in visible area) */}
          {daySes.length === 0 && (
            <div style={{
              position: 'sticky', top: '30%',
              textAlign: 'center', pointerEvents: 'none', padding: '0 20px',
            }}>
              <p style={{ color: 'var(--text-subtle)', fontSize: 14 }}>Sin sesiones este día</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>Clic en «+ Nueva sesión» para agregar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── WeekView ────────────────────────────────────────────── */
function WeekView({ selectedDay, sesiones, openMenuId, setOpenMenuId, onSelectDay, onEdit, onNewSesion, onQuickAction, todayStr }: {
  selectedDay: string
  sesiones: SesionWithPaciente[]
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  onSelectDay: (day: string) => void
  onEdit: (s: SesionWithPaciente) => void
  onNewSesion: () => void
  onQuickAction: (sesionId: string, changes: { estado?: string; categoria?: string | null }) => void
  todayStr: string
}) {
  const weekDays = getWeekDays(selectedDay)

  return (
    <div className="flex-1 rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {weekDays.map((day, idx) => {
        const daySes = sesiones
          .filter(s => s.fecha === day)
          .sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''))
        const d         = new Date(day + 'T12:00:00')
        const isToday   = day === todayStr
        const isSelected = day === selectedDay
        const isLast    = idx === weekDays.length - 1

        return (
          <div key={day}
            className="flex gap-3 sm:gap-4 px-3 sm:px-4 py-3"
            style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>

            {/* Day label — clickable, fixed width */}
            <button
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-0.5 flex-shrink-0 w-10 pt-0.5 transition-opacity hover:opacity-80 active:opacity-60"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: isSelected ? TEAL : 'var(--text-subtle)' }}>
                {DAYS_OF_WEEK[d.getDay()]}
              </span>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  background: isToday ? TEAL : isSelected ? 'rgba(62,201,201,0.15)' : 'transparent',
                  color: isToday ? 'white' : isSelected ? TEAL : 'var(--muted-foreground)',
                }}>
                {d.getDate()}
              </span>
            </button>

            {/* Sessions column */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {daySes.length === 0 ? (
                <button
                  onClick={() => { onSelectDay(day); onNewSesion() }}
                  className="h-9 w-full rounded-lg flex items-center justify-center gap-1.5 transition-opacity opacity-30 hover:opacity-70 active:opacity-50"
                  style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="var(--text-subtle)" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Agregar</span>
                </button>
              ) : (
                <>
                  {daySes.map(s => (
                    <SesionCard key={s.id} sesion={s} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}
                      onEdit={onEdit} onQuickAction={onQuickAction} compact />
                  ))}
                  <button
                    onClick={() => { onSelectDay(day); onNewSesion() }}
                    className="h-6 w-full rounded-md flex items-center justify-center gap-1 opacity-0 hover:opacity-70 active:opacity-50 transition-opacity"
                    style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="var(--text-subtle)" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Nueva Sesión Modal ───────────────────────────────────── */
function NuevaSesionModal({
  open, onClose, defaultDate, pacientes, consultorios, onCreated, proName,
}: {
  open: boolean
  onClose: () => void
  defaultDate: string
  pacientes: PacienteOpt[]
  consultorios: ConsultorioOpt[]
  onCreated: () => void
  proName: string
}) {
  const [search, setSearch] = useState('')
  const [pacienteId, setPacienteId] = useState('')
  const [selectedPac, setSelectedPac] = useState<PacienteOpt | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    fecha: defaultDate,
    hora_inicio: '', hora_fin: '',
    tipo: 'presencial', estado: 'programada',
    categoria: '',
    consultorio_id: '',
    observaciones: '',
    monto: '', pagado: false,
  })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [waData,   setWaData]   = useState<{ telefono: string | null; mensaje: string; cantidad: number } | null>(null)
  const [repetir,  setRepetir]  = useState(false)
  const [semanas,  setSemanas]  = useState(4)

  useEffect(() => {
    if (open) setForm(f => ({ ...f, fecha: defaultDate }))
  }, [open, defaultDate])

  useEffect(() => {
    if (!open) {
      setSearch(''); setPacienteId(''); setSelectedPac(null); setShowDropdown(false); setError(''); setWaData(null)
      setRepetir(false); setSemanas(4)
      setForm({ fecha: defaultDate, hora_inicio: '', hora_fin: '', tipo: 'presencial', estado: 'programada', categoria: '', consultorio_id: '', observaciones: '', monto: '', pagado: false })
    }
  }, [open, defaultDate])

  const filtered = search.length > 0
    ? pacientes.filter(p => `${p.apellido} ${p.nombre}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  function selectPac(p: PacienteOpt) {
    setPacienteId(p.id)
    setSelectedPac(p)
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

    const base = {
      paciente_id:     pacienteId,
      professional_id: user.id,
      consultorio_id:  form.consultorio_id || null,
      hora_inicio:     form.hora_inicio  || null,
      hora_fin:        form.hora_fin     || null,
      tipo:            form.tipo,
      estado:          form.estado,
      categoria:       form.categoria   || null,
      observaciones:   form.observaciones || null,
      monto:           form.monto ? parseFloat(form.monto) : null,
      pagado:          form.pagado,
    }

    // Armar array de fechas
    const fechas: string[] = [form.fecha]
    if (repetir && semanas > 1) {
      const baseDate = new Date(form.fecha + 'T12:00:00')
      for (let i = 1; i < semanas; i++) {
        const d = new Date(baseDate)
        d.setDate(d.getDate() + 7 * i)
        fechas.push(toDateStr(d))
      }
    }

    const rows = fechas.map(f => ({ ...base, fecha: f }))
    const { error: err } = await supabase.from('sesiones').insert(rows)

    if (err) { setError('Error al guardar la sesión.'); setSaving(false); return }

    onCreated()

    const cons = consultorios.find(c => c.id === form.consultorio_id)
    const msg  = buildMensaje(
      selectedPac?.nombre ?? '', selectedPac?.apellido ?? '',
      proName, form.fecha, form.hora_inicio, cons?.nombre,
    )
    setWaData({ telefono: selectedPac?.telefono ?? null, mensaje: msg, cantidad: fechas.length })
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="modal-backdrop absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="modal-content relative z-10 w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {waData ? (
          /* ── Paso WhatsApp ─────────────────────────────── */
          <div className="p-5 space-y-5">
            {/* Éxito */}
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-base font-bold mb-1" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                {waData.cantidad > 1 ? `${waData.cantidad} turnos creados` : 'Sesión guardada'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                {waData.cantidad > 1
                  ? `Turnos semanales agendados. ¿Enviás la confirmación del primero?`
                  : '¿Querés enviarle la confirmación al paciente por WhatsApp?'}
              </p>
            </div>

            {/* Mensaje editable */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(37,211,102,0.25)' }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'rgba(37,211,102,0.08)', borderBottom: '1px solid rgba(37,211,102,0.15)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#25D366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xs font-semibold" style={{ color: '#25D366' }}>Mensaje — podés editarlo antes de enviar</span>
              </div>
              <textarea
                value={waData.mensaje}
                onChange={e => setWaData(d => d ? { ...d, mensaje: e.target.value } : null)}
                rows={10}
                className="w-full px-4 py-3 text-sm outline-none resize-none"
                style={{ background: 'rgba(37,211,102,0.03)', color: 'var(--foreground-muted)', lineHeight: 1.6 }}
              />
            </div>

            {/* Teléfono */}
            {waData.telefono ? (
              <p className="text-xs text-center" style={{ color: 'var(--text-subtle)' }}>
                Enviando a: <span style={{ color: 'var(--foreground-muted)' }}>{waData.telefono}</span>
              </p>
            ) : (
              <div className="rounded-xl px-4 py-3 text-xs text-center"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--warning)' }}>
                El paciente no tiene teléfono registrado.
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-11 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                No enviar
              </button>
              {waData.telefono ? (
                <a href={buildWaUrl(waData.telefono, waData.mensaje)} target="_blank" rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#25D366,#1DA851)', color: '#fff', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Enviar por WhatsApp
                </a>
              ) : (
                <button type="button" onClick={onClose}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)' }}>
                  Cerrar
                </button>
              )}
            </div>
          </div>
        ) : (
        <>
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
              style={{ ...inputStyle, borderColor: pacienteId ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.08)' }}
              onBlurCapture={e => { if (!e.relatedTarget?.closest?.('[data-dropdown]')) setShowDropdown(false) }}
            />
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

          {/* Categoría */}
          <div>
            <Label text="Categoría" />
            <MultiToggleGroup value={form.categoria} onChange={setStr('categoria')} options={[
              { value: 'sesion',      label: 'Sesión',      color: '#3EC9C9' },
              { value: 'evaluacion',  label: 'Evaluación',  color: '#60A5FA' },
              { value: 'devolucion',  label: 'Devolución',  color: '#A78BFA' },
              { value: 'tratamiento', label: 'Tratamiento', color: '#F5A623' },
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

          {/* Repetir semanalmente */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Toggle row */}
            <button type="button" onClick={() => setRepetir(r => !r)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors"
              style={{ background: repetir ? 'rgba(62,201,201,0.06)' : 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: repetir ? 'rgba(62,201,201,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${repetir ? 'rgba(62,201,201,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M17 2l4 4-4 4" stroke={repetir ? TEAL : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 11V9a4 4 0 014-4h14" stroke={repetir ? TEAL : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 22l-4-4 4-4" stroke={repetir ? TEAL : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 13v2a4 4 0 01-4 4H3" stroke={repetir ? TEAL : 'var(--text-dim)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: repetir ? TEAL : 'var(--foreground-muted)' }}>
                    Repetir semanalmente
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    {repetir ? `Se crearán ${semanas} turnos cada 7 días` : 'Crear el turno una sola vez'}
                  </p>
                </div>
              </div>
              {/* Switch */}
              <div className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all flex-shrink-0"
                style={{ background: repetir ? TEAL : 'rgba(255,255,255,0.12)', minWidth: 40, height: 22 }}>
                <div className="w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ transform: repetir ? 'translateX(18px)' : 'translateX(0px)' }} />
              </div>
            </button>

            {/* Selector de semanas */}
            {repetir && (
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(62,201,201,0.12)', background: 'rgba(62,201,201,0.03)' }}>
                <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-subtle)' }}>
                  ¿Cuántas semanas?
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[2, 4, 6, 8, 12].map(n => (
                    <button key={n} type="button" onClick={() => setSemanas(n)}
                      className="h-8 px-3.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: semanas === n ? 'rgba(62,201,201,0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${semanas === n ? 'rgba(62,201,201,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: semanas === n ? TEAL : 'var(--text-dim)',
                      }}>
                      {n} sem.
                    </button>
                  ))}
                  {/* Input libre */}
                  <div className="flex items-center gap-1.5 h-8 px-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input
                      type="number" min={2} max={52}
                      value={![2,4,6,8,12].includes(semanas) ? semanas : ''}
                      onChange={e => { const v = parseInt(e.target.value); if (v >= 2 && v <= 52) setSemanas(v) }}
                      placeholder="otro"
                      className="w-12 bg-transparent text-xs outline-none text-center"
                      style={{ color: 'var(--foreground-muted)' }}
                    />
                  </div>
                </div>
                {/* Preview de fechas */}
                <div className="mt-3 space-y-1">
                  {Array.from({ length: Math.min(semanas, 5) }).map((_, i) => {
                    const d = new Date(form.fecha + 'T12:00:00')
                    d.setDate(d.getDate() + 7 * i)
                    const label = `${DAYS_OF_WEEK[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TEAL, opacity: 0.6 }} />
                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {label}
                          {i === 0 && <span className="ml-1.5 text-[10px] font-semibold" style={{ color: TEAL }}>hoy</span>}
                        </span>
                      </div>
                    )
                  })}
                  {semanas > 5 && (
                    <p className="text-xs pl-3.5" style={{ color: 'var(--text-subtle)' }}>
                      + {semanas - 5} más…
                    </p>
                  )}
                </div>
              </div>
            )}
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
                : repetir ? `Crear ${semanas} turnos` : 'Guardar sesión'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  )
}

/* ── Editar Sesión Modal ─────────────────────────────────── */
function EditarSesionModal({
  open, onClose, sesion, pacientes, consultorios, onSaved, onDeleted, proName,
}: {
  open: boolean
  onClose: () => void
  sesion: SesionWithPaciente | null
  pacientes: PacienteOpt[]
  consultorios: ConsultorioOpt[]
  onSaved: () => void
  onDeleted: () => void
  proName: string
}) {
  const [form, setForm] = useState({
    fecha: '', hora_inicio: '', hora_fin: '',
    tipo: 'presencial', estado: 'programada',
    categoria: '',
    consultorio_id: '', observaciones: '',
    monto: '', pagado: false,
  })
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [error,          setError]          = useState('')
  const [roadmapStatus,  setRoadmapStatus]  = useState('')
  const [addingRoadmap,  setAddingRoadmap]  = useState(false)
  const [showWa,         setShowWa]         = useState(false)
  const [waMensaje,      setWaMensaje]      = useState('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sesion && open) {
      setForm({
        fecha:          sesion.fecha,
        hora_inicio:    sesion.hora_inicio ?? '',
        hora_fin:       sesion.hora_fin ?? '',
        tipo:           sesion.tipo,
        estado:         sesion.estado,
        categoria:      sesion.categoria ?? '',
        consultorio_id: sesion.consultorio_id ?? '',
        observaciones:  sesion.observaciones ?? '',
        monto:          sesion.monto != null ? String(sesion.monto) : '',
        pagado:         sesion.pagado,
      })
      setError(''); setRoadmapStatus(''); setAddingRoadmap(false); setConfirmDelete(false); setSaving(false); setDeleting(false); setShowWa(false)
    }
  }, [sesion, open])

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sesion) return
    setSaving(true); setError('')

    saveTimeoutRef.current = setTimeout(() => {
      setSaving(false)
      setError('La operación tardó demasiado. Revisá tu conexión e intentá de nuevo.')
    }, 12000)

    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('sesiones').update({
        fecha:          form.fecha,
        hora_inicio:    form.hora_inicio  || null,
        hora_fin:       form.hora_fin     || null,
        tipo:           form.tipo,
        estado:         form.estado,
        categoria:      form.categoria   || null,
        consultorio_id: form.consultorio_id || null,
        observaciones:  form.observaciones || null,
        monto:          form.monto ? parseFloat(form.monto) : null,
        pagado:         form.pagado,
      }).eq('id', sesion.id)

      clearTimeout(saveTimeoutRef.current)
      if (err) { setError('Error al guardar los cambios.'); setSaving(false) }
      else { setSaving(false); onSaved(); onClose() }
    } catch {
      clearTimeout(saveTimeoutRef.current!)
      setError('Error inesperado. Intentá de nuevo.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!sesion) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const supabase = createClient()
      await supabase.from('sesiones').delete().eq('id', sesion.id)
      onDeleted(); onClose()
    } catch { setDeleting(false) }
  }

  async function handleAddToRoadmap() {
    if (!sesion) return
    setAddingRoadmap(true)
    setError('')
    setRoadmapStatus('')

    const fecha = new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const estado = estadoConfig[form.estado]?.label ?? form.estado
    const tipo = tipoConfig[form.tipo]?.label ?? form.tipo
    const categoria = form.categoria ? CATEGORIA_OPCIONES.find(c => c.value === form.categoria)?.label : null
    const horario = form.hora_inicio
      ? `${form.hora_inicio.slice(0, 5)}${form.hora_fin ? `-${form.hora_fin.slice(0, 5)}` : ''}`
      : null
    const observaciones = form.observaciones.trim()

    const entry = [
      `## ${fecha} - ${estado}`,
      `- Modalidad: ${tipo}`,
      horario ? `- Horario: ${horario}` : null,
      categoria ? `- Categoria: ${categoria}` : null,
      observaciones ? `- Observaciones:\n${observaciones.split('\n').map(line => `  ${line}`).join('\n')}` : '- Observaciones: Sin observaciones cargadas.',
    ].filter(Boolean).join('\n')

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('pacientes')
        .select('hoja_ruta')
        .eq('id', sesion.paciente_id)
        .single()

      if (fetchError) {
        setError('No se pudo leer la hoja de ruta del paciente.')
        setAddingRoadmap(false)
        return
      }

      const current = typeof data?.hoja_ruta === 'string' ? data.hoja_ruta.trimEnd() : ''
      const next = current ? `${current}\n\n${entry}` : entry
      const { error: updateError } = await supabase
        .from('pacientes')
        .update({ hoja_ruta: next })
        .eq('id', sesion.paciente_id)

      if (updateError) {
        setError('No se pudo agregar la sesión a la hoja de ruta.')
        setAddingRoadmap(false)
        return
      }

      setRoadmapStatus('Sesión agregada a la hoja de ruta.')
      setAddingRoadmap(false)
    } catch {
      setError('Error inesperado al actualizar la hoja de ruta.')
      setAddingRoadmap(false)
    }
  }

  if (!open || !sesion) return null

  const pac   = sesion.pacientes
  const color = avatarColors(sesion.paciente_id)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="modal-backdrop absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div className="modal-content relative z-10 w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="flex items-start justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              Editar sesión
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
          {/* Paciente (read-only) */}
          <div>
            <Label text="Paciente" />
            <div className="flex items-center gap-3 h-10 px-3.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {pac && (
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${color}1A`, color }}>
                  {initials(pac.nombre, pac.apellido)}
                </div>
              )}
              <span className="text-sm flex-1" style={{ color: 'var(--foreground-muted)' }}>
                {pac ? `${pac.apellido}, ${pac.nombre}` : '—'}
              </span>
              {pac && (
                <Link
                  href={`/pacientes/${pacienteSlug(pac.apellido, pac.nombre, sesion.paciente_id)}`}
                  className="text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ color: TEAL }}>
                  Ver paciente →
                </Link>
              )}
            </div>
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

          {/* Categoría */}
          <div>
            <Label text="Categoría" />
            <MultiToggleGroup value={form.categoria} onChange={setStr('categoria')} options={[
              { value: 'sesion',      label: 'Sesión',      color: '#3EC9C9' },
              { value: 'evaluacion',  label: 'Evaluación',  color: '#60A5FA' },
              { value: 'devolucion',  label: 'Devolución',  color: '#A78BFA' },
              { value: 'tratamiento', label: 'Tratamiento', color: '#F5A623' },
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

          <div className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ background: 'rgba(62,201,201,0.04)', border: '1px solid rgba(62,201,201,0.12)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: TEAL }}>
                Hoja de ruta
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                Anexa esta sesión al seguimiento general del paciente.
              </p>
              {roadmapStatus && (
                <p className="text-xs font-medium mt-2" style={{ color: 'var(--success)' }}>
                  {roadmapStatus}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddToRoadmap}
              disabled={addingRoadmap}
              className="h-10 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 sm:flex-shrink-0"
              style={{ background: addingRoadmap ? 'rgba(62,201,201,0.25)' : 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.25)', color: TEAL, cursor: addingRoadmap ? 'not-allowed' : 'pointer' }}
            >
              {addingRoadmap ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                  Agregando...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
                  </svg>
                  Agregar a hoja
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="h-11 px-4 rounded-xl text-sm font-medium flex items-center justify-center transition-all"
              style={{
                background: confirmDelete ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${confirmDelete ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: confirmDelete ? 'var(--danger)' : 'var(--text-dim)',
                minWidth: confirmDelete ? '110px' : '44px',
              }}>
              {deleting
                ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                : confirmDelete
                  ? '¿Confirmar?'
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
              }
            </button>
            <button type="button" onClick={onClose}
              className="h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </button>
            {/* WhatsApp */}
            <button type="button"
              onClick={() => {
                const cons = consultorios.find(c => c.id === form.consultorio_id)
                setWaMensaje(buildMensaje(
                  sesion.pacientes?.nombre ?? '', sesion.pacientes?.apellido ?? '',
                  proName, form.fecha, form.hora_inicio, cons?.nombre,
                ))
                setShowWa(true)
              }}
              className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#25D366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>Guardando…</>
                : 'Guardar cambios'}
            </button>
          </div>
        </form>

        {/* ── Panel WhatsApp ── */}
        {showWa && (() => {
          const pac = pacientes.find(p => p.id === sesion.paciente_id)
          const tel = pac?.telefono ?? null
          return (
            <div className="absolute inset-0 z-20 rounded-t-3xl sm:rounded-2xl flex flex-col"
              style={{ background: 'var(--card)' }}>
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#25D366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Enviar por WhatsApp</h3>
                </div>
                <button onClick={() => setShowWa(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {!tel && (
                  <div className="rounded-xl px-4 py-3 text-xs"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--warning)' }}>
                    El paciente no tiene teléfono registrado.
                  </div>
                )}
                {tel && (
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    Enviando a: <span style={{ color: 'var(--foreground-muted)' }}>{tel}</span>
                  </p>
                )}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(37,211,102,0.25)' }}>
                  <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: 'rgba(37,211,102,0.08)', borderBottom: '1px solid rgba(37,211,102,0.15)', color: '#25D366' }}>
                    Mensaje — podés editarlo antes de enviar
                  </div>
                  <textarea
                    value={waMensaje}
                    onChange={e => setWaMensaje(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 text-sm outline-none resize-none"
                    style={{ background: 'rgba(37,211,102,0.03)', color: 'var(--foreground-muted)', lineHeight: 1.6 }}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowWa(false)}
                    className="flex-1 h-11 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    Cancelar
                  </button>
                  {tel ? (
                    <a href={buildWaUrl(tel, waMensaje)} target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowWa(false)}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#25D366,#1DA851)', color: '#fff', textDecoration: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Abrir WhatsApp
                    </a>
                  ) : (
                    <button type="button" onClick={() => setShowWa(false)}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)' }}>
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function AgendaPage() {
  const today    = new Date()
  const todayStr = toDateStr(today)

  const searchParams  = useSearchParams()
  const diaParam      = searchParams.get('dia')
  const sesionParam   = searchParams.get('sesion')
  const initialDay    = diaParam ?? todayStr
  const initialDate   = diaParam ? new Date(diaParam + 'T12:00:00') : today

  const [view,           setView]           = useState<ViewMode>(diaParam ? 'dia' : 'mes')
  const [year,           setYear]           = useState(initialDate.getFullYear())
  const [month,          setMonth]          = useState(initialDate.getMonth())
  const [selectedDay,    setSelectedDay]    = useState<string>(initialDay)
  const [sesiones,       setSesiones]       = useState<SesionWithPaciente[]>([])
  const [pacientes,      setPacientes]      = useState<PacienteOpt[]>([])
  const [consultorios,   setConsultorios]   = useState<ConsultorioOpt[]>([])
  const [loading,        setLoading]        = useState(true)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [sesionEditando, setSesionEditando] = useState<SesionWithPaciente | null>(null)
  const [openMenuId,     setOpenMenuId]     = useState<string | null>(null)
  const [proName,        setProName]        = useState('')
  const openedParamSessionId = useRef<string | null>(null)

  // Sync year/month when navigating days/weeks past month boundary
  useEffect(() => {
    if (view === 'mes') return
    const d = new Date(selectedDay + 'T12:00:00')
    const y = d.getFullYear()
    const m = d.getMonth()
    if (y !== year || m !== month) { setYear(y); setMonth(m) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, view])

  const fetchSesiones = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch month ± 7 days to handle week-view straddling month boundaries
    const monthStart = new Date(year, month, 1)
    const monthEnd   = new Date(year, month + 1, 0)
    const fetchStart = new Date(monthStart); fetchStart.setDate(fetchStart.getDate() - 7)
    const fetchEnd   = new Date(monthEnd);   fetchEnd.setDate(fetchEnd.getDate() + 7)

    const { data } = await supabase
      .from('sesiones')
      .select('id, fecha, hora_inicio, hora_fin, tipo, estado, categoria, observaciones, monto, pagado, paciente_id, consultorio_id, pacientes(nombre, apellido)')
      .gte('fecha', toDateStr(fetchStart))
      .lte('fecha', toDateStr(fetchEnd))
      .order('hora_inicio', { ascending: true })

    setSesiones((data ?? []) as unknown as SesionWithPaciente[])
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('pacientes').select('id, nombre, apellido, telefono').eq('estado', 'activo').order('apellido')
      .then(({ data }) => setPacientes((data ?? []) as PacienteOpt[]))
    supabase.from('consultorios').select('id, nombre, color').eq('activo', true).order('nombre')
      .then(({ data }) => setConsultorios((data ?? []) as ConsultorioOpt[]))
    supabase.auth.getUser().then(({ data: { user } }) => {
      setProName((user?.user_metadata?.nombre as string | undefined) ?? '')
    })
  }, [])

  useEffect(() => { fetchSesiones() }, [fetchSesiones])

  useEffect(() => {
    if (!sesionParam || loading || openedParamSessionId.current === sesionParam) return

    const selectedSession = sesiones.find(s => s.id === sesionParam)
    if (!selectedSession) return

    queueMicrotask(() => {
      setSelectedDay(selectedSession.fecha)
      setView('dia')
      setSesionEditando(selectedSession)
      openedParamSessionId.current = sesionParam
    })
  }, [sesionParam, loading, sesiones])

  async function handleQuickAction(sesionId: string, changes: { estado?: string; categoria?: string | null }) {
    const supabase = createClient()
    await supabase.from('sesiones').update(changes).eq('id', sesionId)
    setOpenMenuId(null)
    fetchSesiones()
  }

  /* ── navigation ── */
  function prevPeriod() {
    if (view === 'mes') {
      if (month === 0) { setMonth(11); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else if (view === 'semana') {
      const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() - 7)
      setSelectedDay(toDateStr(d))
    } else {
      const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() - 1)
      setSelectedDay(toDateStr(d))
    }
  }
  function nextPeriod() {
    if (view === 'mes') {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else if (view === 'semana') {
      const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() + 7)
      setSelectedDay(toDateStr(d))
    } else {
      const d = new Date(selectedDay + 'T12:00:00'); d.setDate(d.getDate() + 1)
      setSelectedDay(toDateStr(d))
    }
  }
  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(todayStr)
  }

  function periodLabel() {
    if (view === 'mes') return `${MONTHS[month]} ${year}`
    if (view === 'semana') return weekLabel(selectedDay)
    const d = new Date(selectedDay + 'T12:00:00')
    return `${DAYS_OF_WEEK[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }

  /* ── calendar grid data ── */
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth     = new Date(year, month + 1, 0).getDate()
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  const byDate: Record<string, SesionWithPaciente[]> = {}
  for (const s of sesiones) {
    if (!byDate[s.fecha]) byDate[s.fecha] = []
    byDate[s.fecha].push(s)
  }

  const daySesiones = byDate[selectedDay] ?? []

  return (
    <div className="p-4 sm:p-6 w-full" style={{ minHeight: '100vh' }}>

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

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            {(['dia', 'semana', 'mes'] as ViewMode[]).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className="h-9 px-3.5 text-xs font-semibold transition-all"
                style={{
                  background: view === v ? 'rgba(62,201,201,0.12)' : 'transparent',
                  color: view === v ? TEAL : 'var(--text-dim)',
                  borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                }}>
                {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          <button onClick={goToday}
            className="h-9 px-3 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.2)', color: TEAL }}>
            Hoy
          </button>

          <div className="flex items-center gap-1 rounded-xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <button onClick={prevPeriod}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="px-2 text-sm font-semibold text-center" style={{ color: 'var(--foreground-muted)', minWidth: 160 }}>
              {periodLabel()}
            </span>
            <button onClick={nextPeriod}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Day view ── */}
      {view === 'dia' && (
        <div className="anim-fade-up">
          <DayView
            date={selectedDay}
            sesiones={sesiones}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onEdit={setSesionEditando}
            onNewSesion={() => setModalOpen(true)}
            onQuickAction={handleQuickAction}
          />
        </div>
      )}

      {/* ── Week view ── */}
      {view === 'semana' && (
        <div className="anim-fade-up">
          <WeekView
            selectedDay={selectedDay}
            sesiones={sesiones}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onSelectDay={setSelectedDay}
            onEdit={setSesionEditando}
            onNewSesion={() => setModalOpen(true)}
            onQuickAction={handleQuickAction}
            todayStr={todayStr}
          />
        </div>
      )}

      {/* ── Month view ── */}
      {view === 'mes' && (
        <div className="flex flex-col lg:flex-row gap-4 anim-fade-up">

          {/* Calendar grid */}
          <div className="flex-1 rounded-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

            <div className="grid grid-cols-7">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="py-3 text-center text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--text-subtle)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {d}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                </svg>
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum  = i - firstDayOfMonth + 1
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
                        if (dateStr === selectedDay) setModalOpen(true)
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
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold"
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
                          <div className="space-y-0.5">
                            {daySess.slice(0, 3).map(s => {
                              const catCfg   = s.categoria ? (categoriaConfig[s.categoria] ?? null) : null
                              const cfg      = estadoConfig[s.estado] ?? estadoConfig.programada
                              const dispColor = catCfg?.color ?? cfg.color
                              const dispBg    = catCfg?.bg    ?? cfg.bg
                              return (
                                <div key={s.id}
                                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
                                  style={{ background: dispBg, cursor: 'pointer' }}
                                  onClick={e => { e.stopPropagation(); setSesionEditando(s) }}>
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dispColor }} />
                                  <span className="truncate leading-tight"
                                    style={{ color: dispColor, fontSize: '10px' }}>
                                    {s.hora_inicio ? fmtTime(s.hora_inicio) + ' · ' : ''}
                                    {s.pacientes ? s.pacientes.apellido : '—'}
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

            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                <button onClick={() => setModalOpen(true)} title="Nueva sesión"
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.25)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

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
                  <button onClick={() => setModalOpen(true)}
                    className="h-8 px-4 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: TEAL }}>
                    + Agregar sesión
                  </button>
                </div>
              ) : (
                <>
                  {daySesiones.map(s => (
                    <SesionCard key={s.id} sesion={s} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}
                      onEdit={setSesionEditando} onQuickAction={handleQuickAction} />
                  ))}
                  <button onClick={() => setModalOpen(true)}
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
      )}

      <NuevaSesionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDay}
        pacientes={pacientes}
        consultorios={consultorios}
        onCreated={fetchSesiones}
        proName={proName}
      />

      <EditarSesionModal
        open={sesionEditando !== null}
        onClose={() => setSesionEditando(null)}
        sesion={sesionEditando}
        pacientes={pacientes}
        consultorios={consultorios}
        onSaved={fetchSesiones}
        onDeleted={fetchSesiones}
        proName={proName}
      />
    </div>
  )
}
