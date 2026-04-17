'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Sesion } from '@/types'
import Link from 'next/link'

type ConsultorioOpt = { id: string; nombre: string; color: string }
type Period = 'hoy' | 'semana' | 'mes'

const TEAL = '#3EC9C9'

const sesionEstado: Record<string, { label: string; color: string }> = {
  realizada:    { label: 'Realizada',    color: 'var(--success)' },
  programada:   { label: 'Programada',   color: 'var(--primary)' },
  cancelada:    { label: 'Cancelada',    color: 'var(--danger)' },
  inasistencia: { label: 'Inasistencia', color: 'var(--warning)' },
}

function getPeriodBounds(period: Period): { start: Date; end: Date; label: string } {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'hoy') {
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)
    return { start: today, end, label: 'hoy' }
  }

  if (period === 'semana') {
    const day  = today.getDay()
    const diff = day === 0 ? -6 : 1 - day          // lunes como inicio de semana
    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { start: monday, end: sunday, label: 'esta semana' }
  }

  // mes
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end, label: 'este mes' }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
    </svg>
  )
}

export default function SesionesPage() {
  const [period,      setPeriod]      = useState<Period>('mes')
  const [sesiones,    setSesiones]    = useState<Sesion[]>([])
  const [consultorios,setConsultorios]= useState<ConsultorioOpt[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // Traemos los últimos 3 meses para cubrir hoy, semana y mes
    const desde = new Date()
    desde.setMonth(desde.getMonth() - 2)
    desde.setDate(1)
    const desdeStr = desde.toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('sesiones')
        .select('*')
        .gte('fecha', desdeStr)
        .order('fecha', { ascending: false }),
      supabase
        .from('consultorios')
        .select('id, nombre, color')
        .eq('activo', true)
        .order('nombre'),
    ]).then(([{ data: ses }, { data: cons }]) => {
      setSesiones((ses ?? []) as Sesion[])
      setConsultorios((cons ?? []) as ConsultorioOpt[])
      setLoading(false)
    })
  }, [])

  const { start, end, label: periodoLabel } = useMemo(() => getPeriodBounds(period), [period])

  const filtered = useMemo(() =>
    sesiones.filter(s => {
      const d = new Date(s.fecha + 'T00:00:00')
      return d >= start && d <= end
    }),
    [sesiones, start, end]
  )

  // Stats generales
  const total       = filtered.length
  const realizadas  = filtered.filter(s => s.estado === 'realizada').length
  const programadas = filtered.filter(s => s.estado === 'programada').length
  const canceladas  = filtered.filter(s => s.estado === 'cancelada' || s.estado === 'inasistencia').length
  const totalCobrado = filtered
    .filter(s => s.pagado && s.monto != null)
    .reduce((acc, s) => acc + (s.monto ?? 0), 0)

  // Agrupado por consultorio
  const byConsultorio = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of filtered) {
      const key = s.consultorio_id ?? '__sin__'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [filtered])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold mb-1"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            Sesiones
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Estadísticas de atención · {periodoLabel}
          </p>
        </div>
      </div>

      {/* ── Selector de período ── */}
      <div className="flex gap-2 mb-6 anim-fade-up">
        {([
          { value: 'hoy',    label: 'Hoy'          },
          { value: 'semana', label: 'Esta semana'  },
          { value: 'mes',    label: 'Este mes'     },
        ] as const).map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className="h-9 px-4 rounded-xl text-sm font-medium transition-all"
            style={{
              background: period === p.value ? 'rgba(62,201,201,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${period === p.value ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: period === p.value ? TEAL : 'var(--muted-foreground)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <SpinnerIcon />
        </div>
      ) : (
        <>
          {/* ── Stats generales ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
            {[
              { label: 'Total',       value: total,       color: 'var(--primary)', bg: 'rgba(62,201,201,0.08)'  },
              { label: 'Realizadas',  value: realizadas,  color: 'var(--success)', bg: 'rgba(52,211,153,0.08)'  },
              { label: 'Programadas', value: programadas, color: 'var(--virtual)', bg: 'rgba(167,139,250,0.08)' },
              { label: 'Canceladas',  value: canceladas,  color: 'var(--danger)', bg: 'rgba(248,113,113,0.08)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-5 anim-fade-up"
                style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
                <p className="text-3xl font-bold"
                  style={{ color: s.color, fontFamily: 'var(--font-display)' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Cobrado del período ── */}
          {totalCobrado > 0 && (
            <div className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-4 anim-fade-up"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.12)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="1" x2="12" y2="23" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                    stroke="var(--success)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#34D39980' }}>Cobrado en el período</p>
                <p className="text-xl font-bold" style={{ color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                  {fmtMoney(totalCobrado)}
                </p>
              </div>
            </div>
          )}

          {/* ── Por consultorio ── */}
          {(consultorios.length > 0 || byConsultorio.has('__sin__')) && (
            <div className="rounded-2xl p-5 mb-6 anim-fade-up"
              style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-5"
                style={{ color: 'var(--text-subtle)' }}>
                Por consultorio
              </p>
              {total === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Sin sesiones en este período.</p>
              ) : (
                <div className="space-y-4">
                  {consultorios.map(c => {
                    const count = byConsultorio.get(c.id) ?? 0
                    const pct   = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={c.id}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: c.color }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                              {c.nombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                              {pct.toFixed(0)}%
                            </span>
                            <span className="text-base font-bold w-6 text-right"
                              style={{ color: c.color }}>
                              {count}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden"
                          style={{ background: 'var(--overlay-sm)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: c.color }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {/* Sin consultorio asignado */}
                  {(byConsultorio.get('__sin__') ?? 0) > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: 'var(--text-subtle)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                            Sin consultorio
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            {total > 0 ? (((byConsultorio.get('__sin__') ?? 0) / total) * 100).toFixed(0) : 0}%
                          </span>
                          <span className="text-base font-bold w-6 text-right" style={{ color: 'var(--muted-foreground)' }}>
                            {byConsultorio.get('__sin__') ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--overlay-sm)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${total > 0 ? (((byConsultorio.get('__sin__') ?? 0) / total) * 100) : 0}%`,
                            background: 'var(--text-subtle)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Lista de sesiones ── */}
          <div className="rounded-2xl overflow-hidden anim-fade-up"
            style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2"
                style={{ color: 'var(--text-subtle)' }}>
                Detalle del período
                <span className="px-1.5 py-0.5 rounded-md text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}>
                  {filtered.length}
                </span>
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(62,201,201,0.06)', border: '1px solid rgba(62,201,201,0.12)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="4" height="18" rx="1" stroke={TEAL} strokeWidth="1.8"/>
                    <rect x="9" y="8" width="4" height="13" rx="1" stroke={TEAL} strokeWidth="1.8"/>
                    <rect x="16" y="12" width="4" height="9" rx="1" stroke={TEAL} strokeWidth="1.8"/>
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                  Sin sesiones
                </p>
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                  No hay sesiones registradas en este período.
                </p>
              </div>
            ) : (
              <div>
                {filtered.map((s, i) => {
                  const se   = sesionEstado[s.estado] ?? sesionEstado.realizada
                  const cons = s.consultorio_id
                    ? consultorios.find(c => c.id === s.consultorio_id)
                    : null
                  return (
                    <Link
                      key={s.id}
                      href={`/pacientes/${s.paciente_id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        display: 'flex',
                      }}
                    >
                      {/* Fecha pill */}
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: `${se.color}15` }}>
                        <span className="text-xs font-bold leading-none" style={{ color: se.color }}>
                          {new Date(s.fecha + 'T00:00:00').getDate()}
                        </span>
                        <span className="text-[10px] leading-none mt-0.5" style={{ color: se.color }}>
                          {new Date(s.fecha + 'T00:00:00').toLocaleString('es-AR', { month: 'short' })}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: se.color }}>
                            {se.label}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>·</span>
                          <span className="text-xs capitalize" style={{ color: 'var(--text-dim)' }}>
                            {s.tipo}
                          </span>
                          {s.hora_inicio && (
                            <>
                              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>·</span>
                              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {s.hora_inicio.slice(0, 5)}
                              </span>
                            </>
                          )}
                        </div>
                        {cons && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: cons.color }} />
                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                              {cons.nombre}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Monto */}
                      {s.monto != null && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold"
                            style={{ color: s.pagado ? 'var(--success)' : 'var(--warning)' }}>
                            {fmtMoney(s.monto)}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                            {s.pagado ? 'cobrado' : 'pendiente'}
                          </p>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
