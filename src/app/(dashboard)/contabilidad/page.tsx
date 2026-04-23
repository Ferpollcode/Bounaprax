'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PagoRow = {
  id: string
  fecha: string
  monto: number
  tipo: string
  concepto: string | null
  estado: string
  created_at: string
  pacientes: { nombre: string; apellido: string } | null
  sesiones: { consultorios: { nombre: string; color: string } | null } | null
}

type Period = 'semana' | 'mes' | 'todo'

const TEAL = '#3EC9C9'
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

const tipoLabel: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  tarjeta:       'Tarjeta',
  obra_social:   'Obra social',
  otro:          'Otro',
}

const tipoColor: Record<string, string> = {
  efectivo:      'rgba(34,197,94,0.15)',
  transferencia: 'rgba(62,201,201,0.15)',
  tarjeta:       'rgba(167,139,250,0.15)',
  obra_social:   'rgba(251,191,36,0.15)',
  otro:          'rgba(148,163,184,0.15)',
}

const tipoTextColor: Record<string, string> = {
  efectivo:      '#22C55E',
  transferencia: TEAL,
  tarjeta:       '#B482FF',
  obra_social:   '#F59E0B',
  otro:          '#94A3B8',
}

const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  pagado:    { label: 'Pagado',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pendiente: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(251,191,36,0.12)' },
  devuelto:  { label: 'Devuelto',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWeekBounds() {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day   = today.getDay()
  const diff  = day === 0 ? -6 : 1 - day
  const monday = new Date(today); monday.setDate(today.getDate() + diff)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  return { start: toDateStr(monday), end: toDateStr(sunday) }
}

function getMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toDateStr(start), end: toDateStr(end) }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MESES[m - 1].slice(0, 3)}. ${y}`
}

export default function ContabilidadPage() {
  const [pagos, setPagos]       = useState<PagoRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState<Period>('mes')
  const [filterTipo, setFilterTipo] = useState<string>('todos')

  const fetchPagos = useCallback(async (p: Period) => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('pagos')
      .select('id, fecha, monto, tipo, concepto, estado, created_at, pacientes(nombre, apellido), sesiones(consultorios(nombre, color))')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (p === 'semana') {
      const { start, end } = getWeekBounds()
      query = query.gte('fecha', start).lte('fecha', end)
    } else if (p === 'mes') {
      const { start, end } = getMonthBounds()
      query = query.gte('fecha', start).lte('fecha', end)
    }

    const { data } = await query
    setPagos((data ?? []) as unknown as PagoRow[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPagos(period) }, [period, fetchPagos])

  const semana = (() => {
    const { start, end } = getWeekBounds()
    return pagos.filter(p => p.estado === 'pagado' && p.fecha >= start && p.fecha <= end)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })()

  const mes = (() => {
    const { start, end } = getMonthBounds()
    return pagos.filter(p => p.estado === 'pagado' && p.fecha >= start && p.fecha <= end)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })()

  const totalPeriodo = pagos
    .filter(p => p.estado === 'pagado')
    .reduce((acc, p) => acc + Number(p.monto), 0)

  const pagosFiltrados = filterTipo === 'todos'
    ? pagos
    : pagos.filter(p => p.tipo === filterTipo)

  const tiposPresentes = Array.from(new Set(pagos.map(p => p.tipo)))

  const now = new Date()
  const mesActualLabel = `${MESES[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-x-hidden">

      {/* ── Header ── */}
      <div className="mb-8 anim-fade-up">
        <p className="text-sm mb-1" style={{ color: 'var(--primary)' }}>Gestión</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          Contabilidad
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Resumen de ingresos y pagos
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 mb-8 stagger">
        <div className="rounded-2xl p-5 anim-fade-up"
          style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Esta semana</p>
          <p className="text-2xl sm:text-3xl font-bold leading-tight"
            style={{ color: TEAL, fontFamily: 'var(--font-display)', wordBreak: 'break-all' }}>
            {fmtMoney(semana)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>ingresos cobrados</p>
        </div>
        <div className="rounded-2xl p-5 anim-fade-up"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>{mesActualLabel}</p>
          <p className="text-2xl sm:text-3xl font-bold leading-tight"
            style={{ color: '#22C55E', fontFamily: 'var(--font-display)', wordBreak: 'break-all' }}>
            {fmtMoney(mes)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>ingresos cobrados</p>
        </div>
      </div>

      {/* ── Filtros de período ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 anim-fade-up">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
          {(['semana', 'mes', 'todo'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? TEAL : 'transparent',
                color: period === p ? '#0D1B1B' : 'var(--muted-foreground)',
              }}>
              {p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Todo'}
            </button>
          ))}
        </div>

        {/* Filtro por tipo */}
        {tiposPresentes.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button onClick={() => setFilterTipo('todos')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                background: filterTipo === 'todos' ? 'var(--overlay-md)' : 'transparent',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)',
              }}>
              Todos
            </button>
            {tiposPresentes.map(tipo => (
              <button key={tipo} onClick={() => setFilterTipo(tipo)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
                style={{
                  background: filterTipo === tipo ? tipoColor[tipo] : 'transparent',
                  color: filterTipo === tipo ? tipoTextColor[tipo] : 'var(--muted-foreground)',
                  border: `1px solid ${filterTipo === tipo ? tipoTextColor[tipo] + '40' : 'var(--border)'}`,
                }}>
                {tipoLabel[tipo] ?? tipo}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Resumen del período ── */}
      {!loading && pagosFiltrados.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 anim-fade-up"
          style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {pagosFiltrados.length} {pagosFiltrados.length === 1 ? 'pago' : 'pagos'}
            {filterTipo !== 'todos' && ` · ${tipoLabel[filterTipo] ?? filterTipo}`}
          </span>
          <span className="text-sm font-bold" style={{ color: TEAL }}>
            {fmtMoney(pagosFiltrados.filter(p => p.estado === 'pagado').reduce((a, p) => a + Number(p.monto), 0))}
          </span>
        </div>
      )}

      {/* ── Lista de pagos ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
          </svg>
        </div>
      ) : pagosFiltrados.length === 0 ? (
        <div className="rounded-2xl p-12 text-center anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(62,201,201,0.06)', border: '1px solid rgba(62,201,201,0.12)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke={TEAL} strokeWidth="1.8"/>
              <path d="M2 10h20" stroke={TEAL} strokeWidth="1.8"/>
              <path d="M6 15h4M14 15h2" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin pagos registrados</p>
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            No hay pagos para el período seleccionado.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden sm:block rounded-2xl overflow-hidden anim-fade-up"
            style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Fecha', 'Paciente', 'Consultorio', 'Tipo', 'Concepto', 'Estado', 'Monto'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase"
                      style={{ color: 'var(--text-subtle)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((p, i) => {
                  const cons = p.sesiones?.consultorios
                  const est  = estadoConfig[p.estado] ?? estadoConfig.pagado
                  return (
                    <tr key={p.id}
                      style={{ borderBottom: i < pagosFiltrados.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <td className="px-4 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>
                        {fmtDate(p.fecha)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {p.pacientes ? `${p.pacientes.apellido}, ${p.pacientes.nombre}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {cons ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cons.color }} />
                            <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{cons.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ background: tipoColor[p.tipo], color: tipoTextColor[p.tipo] }}>
                          {tipoLabel[p.tipo] ?? p.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm max-w-[180px] truncate" style={{ color: 'var(--text-subtle)' }}>
                        {p.concepto || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={{ background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-right whitespace-nowrap"
                        style={{ color: p.estado === 'devuelto' ? 'var(--danger)' : 'var(--foreground)' }}>
                        {p.estado === 'devuelto' ? '-' : ''}{fmtMoney(Number(p.monto))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="sm:hidden space-y-3 anim-fade-up">
            {pagosFiltrados.map(p => {
              const cons = p.sesiones?.consultorios
              const est  = estadoConfig[p.estado] ?? estadoConfig.pagado
              return (
                <div key={p.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Top row */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {p.pacientes ? `${p.pacientes.apellido}, ${p.pacientes.nombre}` : '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                        {fmtDate(p.fecha)}
                      </p>
                    </div>
                    <p className="text-base font-bold"
                      style={{ color: p.estado === 'devuelto' ? 'var(--danger)' : TEAL }}>
                      {p.estado === 'devuelto' ? '-' : ''}{fmtMoney(Number(p.monto))}
                    </p>
                  </div>
                  {/* Bottom row */}
                  <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
                    {cons && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cons.color }} />
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{cons.nombre}</span>
                      </div>
                    )}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                      style={{ background: tipoColor[p.tipo], color: tipoTextColor[p.tipo] }}>
                      {tipoLabel[p.tipo] ?? p.tipo}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                      style={{ background: est.bg, color: est.color }}>
                      {est.label}
                    </span>
                    {p.concepto && (
                      <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-subtle)' }}>
                        {p.concepto}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
