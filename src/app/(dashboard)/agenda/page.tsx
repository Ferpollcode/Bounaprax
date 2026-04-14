'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TEAL = '#3EC9C9'

const estadoConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  realizada:    { label: 'Realizada',    color: '#34D399', bg: 'rgba(52,211,153,0.12)',   dot: '#34D399' },
  programada:   { label: 'Programada',   color: '#3EC9C9', bg: 'rgba(62,201,201,0.12)',   dot: '#3EC9C9' },
  cancelada:    { label: 'Cancelada',    color: '#F87171', bg: 'rgba(248,113,113,0.12)',  dot: '#F87171' },
  inasistencia: { label: 'Inasistencia', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',   dot: '#FBBF24' },
}

const tipoConfig: Record<string, { label: string; color: string }> = {
  presencial: { label: 'Presencial', color: '#3EC9C9' },
  virtual:    { label: 'Virtual',    color: '#A78BFA' },
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
  pacientes: {
    nombre: string
    apellido: string
  } | null
}

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

export default function AgendaPage() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-based
  const [selectedDay, setSelectedDay] = useState<string | null>(
    today.toISOString().split('T')[0]
  )
  const [sesiones, setSesiones] = useState<SesionWithPaciente[]>([])
  const [loading,  setLoading]  = useState(true)

  const fetchSesiones = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay  = new Date(year, month + 1, 0)
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

  useEffect(() => { fetchSesiones() }, [fetchSesiones])

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth     = new Date(year, month + 1, 0).getDate()
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  // Group sessions by date
  const byDate: Record<string, SesionWithPaciente[]> = {}
  for (const s of sesiones) {
    if (!byDate[s.fecha]) byDate[s.fecha] = []
    byDate[s.fecha].push(s)
  }

  // Selected day sessions
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
    <div className="p-6 max-w-7xl" style={{ minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
            Agenda
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#5A6A88' }}>
            Sesiones programadas y realizadas
          </p>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={goToday}
            className="h-9 px-4 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.2)', color: TEAL }}>
            Hoy
          </button>
          <div className="flex items-center gap-1 rounded-xl overflow-hidden"
            style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="px-3 text-sm font-semibold min-w-[140px] text-center" style={{ color: '#C8D4E8' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-5 anim-fade-up">

        {/* Calendar */}
        <div className="flex-1 rounded-2xl overflow-hidden"
          style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold tracking-widest uppercase"
                style={{ color: '#3A4560', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                    onClick={() => dateStr && setSelectedDay(dateStr)}
                    disabled={!inMonth}
                    className="relative text-left transition-colors"
                    style={{
                      minHeight: 88,
                      padding: '8px',
                      borderRight:  (i + 1) % 7 !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      borderBottom: !isLastRow ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isSelected ? 'rgba(62,201,201,0.06)' : 'transparent',
                      cursor: inMonth ? 'pointer' : 'default',
                    }}>

                    {inMonth && (
                      <>
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold"
                            style={{
                              background: isToday ? TEAL : isSelected ? 'rgba(62,201,201,0.15)' : 'transparent',
                              color: isToday ? '#0A0E1A' : isSelected ? TEAL : '#6B7A99',
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

                        {/* Session pills — show up to 3 */}
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
                            <p className="text-center" style={{ color: '#3A4560', fontSize: '10px' }}>
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
        <div className="w-72 flex-shrink-0 rounded-2xl overflow-hidden"
          style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)', alignSelf: 'flex-start' }}>

          {/* Panel header */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {selectedDay ? (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: '#3A4560' }}>
                  {DAYS_OF_WEEK[new Date(selectedDay + 'T12:00:00').getDay()]}
                </p>
                <p className="text-lg font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
                  {new Date(selectedDay + 'T12:00:00').getDate()} de {MONTHS[new Date(selectedDay + 'T12:00:00').getMonth()]}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#5A6A88' }}>
                  {daySesiones.length === 0
                    ? 'Sin sesiones'
                    : `${daySesiones.length} sesión${daySesiones.length > 1 ? 'es' : ''}`}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#5A6A88' }}>Seleccioná un día</p>
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
                <p className="text-xs" style={{ color: '#3A4560' }}>No hay sesiones este día</p>
              </div>
            ) : (
              daySesiones.map(s => {
                const cfg    = estadoConfig[s.estado] ?? estadoConfig.programada
                const tipCfg = tipoConfig[s.tipo] ?? tipoConfig.presencial
                const pac    = s.pacientes
                const color  = avatarColors(s.paciente_id)

                return (
                  <Link
                    key={s.id}
                    href={`/pacientes/${s.paciente_id}`}
                    className="block rounded-xl p-3 transition-colors hover:bg-white/[0.02]"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>

                    {/* Patient + time */}
                    <div className="flex items-start gap-2.5 mb-2">
                      {pac && (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                          {initials(pac.nombre, pac.apellido)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#D8E4F0' }}>
                          {pac ? `${pac.apellido}, ${pac.nombre}` : '—'}
                        </p>
                        {s.hora_inicio && (
                          <p className="text-xs" style={{ color: '#5A6A88' }}>
                            {fmtTime(s.hora_inicio)}{s.hora_fin ? ` – ${fmtTime(s.hora_fin)}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
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
                            color: s.pagado ? '#34D399' : '#FBBF24',
                          }}>
                          ${s.monto.toLocaleString('es-AR')}
                        </span>
                      )}
                    </div>

                    {/* Observaciones preview */}
                    {s.observaciones && (
                      <p className="text-xs mt-2 leading-relaxed line-clamp-2"
                        style={{ color: '#4A5A78' }}>
                        {s.observaciones}
                      </p>
                    )}
                  </Link>
                )
              })
            )}
          </div>

          {/* Quick stats */}
          {sesiones.length > 0 && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#3A4560' }}>
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
                        <span className="text-xs" style={{ color: '#5A6A88' }}>{cfg.label}</span>
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
    </div>
  )
}
