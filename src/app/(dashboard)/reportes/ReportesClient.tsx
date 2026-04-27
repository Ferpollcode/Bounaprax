'use client'

import { useRouter } from 'next/navigation'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Sesion   = { id: string; fecha: string; estado: string; monto: number | null }
type Pago     = { id: string; fecha: string; monto: number; tipo: string; estado: string }
type Paciente = { id: string; estado: string; created_at: string }

interface Props {
  sesiones:  Sesion[]
  pagos:     Pago[]
  pacientes: Paciente[]
  mes:    string
  desde:  string
  hasta:  string
}

const TIPO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia',
  tarjeta: 'Tarjeta', obra_social: 'Obra social', otro: 'Otro',
}
const ESTADO_COLOR: Record<string, string> = {
  realizada: '#34D399', cancelada: '#F87171', inasistencia: '#FBBF24', programada: '#3EC9C9',
}
const TIPO_COLOR: Record<string, string> = {
  efectivo: '#34D399', transferencia: '#3EC9C9', tarjeta: '#818CF8', obra_social: '#F59E0B', otro: '#94A3B8',
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{sub}</p>}
    </div>
  )
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--foreground)' }}>{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function ReportesClient({ sesiones, pagos, pacientes, mes, desde, hasta }: Props) {
  const router = useRouter()
  const [year, month] = mes.split('-').map(Number)

  function navMes(delta: number) {
    const d = new Date(year, month - 1 + delta)
    router.push(`/reportes?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // ── Stats ──────────────────────────────────────────────────
  const pagosPagados    = pagos.filter(p => p.estado === 'pagado')
  const totalIngresos   = pagosPagados.reduce((s, p) => s + (p.monto ?? 0), 0)
  const pendientes      = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.monto ?? 0), 0)

  const realizadas      = sesiones.filter(s => s.estado === 'realizada').length
  const canceladas      = sesiones.filter(s => s.estado === 'cancelada').length
  const inasistencias   = sesiones.filter(s => s.estado === 'inasistencia').length
  const programadas     = sesiones.filter(s => s.estado === 'programada').length
  const totalPasadas    = realizadas + canceladas + inasistencias
  const tasaAsistencia  = totalPasadas > 0 ? Math.round((realizadas / totalPasadas) * 100) : 0

  const pacientesActivos = pacientes.filter(p => p.estado === 'activo').length
  const pacientesNuevos  = pacientes.filter(p => {
    const d = p.created_at.split('T')[0]
    return d >= desde && d <= hasta
  }).length

  // Payment by tipo
  const pagosPorTipo = pagosPagados.reduce<Record<string, number>>((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + (p.monto ?? 0)
    return acc
  }, {})
  const maxTipo = Math.max(...Object.values(pagosPorTipo), 1)

  // Sessions per day (for sparkline)
  const diasMes = new Date(year, month, 0).getDate()
  const sesionesPorDia = Array.from({ length: diasMes }, (_, i) => {
    const dia = String(i + 1).padStart(2, '0')
    const fecha = `${year}-${String(month).padStart(2, '0')}-${dia}`
    return sesiones.filter(s => s.fecha === fecha && s.estado === 'realizada').length
  })
  const maxDia = Math.max(...sesionesPorDia, 1)

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { padding: 0 !important; }
        }
      `}</style>

      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl print-page">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8 anim-fade-up">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FF9F43' }}>Reportes</p>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              {MESES[month - 1]} {year}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Estadísticas del período {desde} al {hasta}
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button onClick={() => navMes(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="text-sm font-semibold px-2" style={{ color: 'var(--foreground)', minWidth: 120, textAlign: 'center' }}>
              {MESES[month - 1]} {year}
            </span>
            <button onClick={() => navMes(1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={() => window.print()}
              className="h-9 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-80 ml-2"
              style={{ background: 'linear-gradient(135deg,#FF9F43,#E07A30)', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
              Exportar PDF
            </button>
          </div>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
          <StatCard label="Ingresos del mes" value={fmt(totalIngresos)} sub={pendientes > 0 ? `${fmt(pendientes)} pendiente` : 'Todo cobrado'} color="#34D399" />
          <StatCard label="Sesiones realizadas" value={String(realizadas)} sub={`de ${totalPasadas + programadas} totales`} color="#3EC9C9" />
          <StatCard label="Tasa de asistencia" value={`${tasaAsistencia}%`} sub={`${inasistencias} inasistencias`} color={tasaAsistencia >= 80 ? '#34D399' : tasaAsistencia >= 60 ? '#FBBF24' : '#F87171'} />
          <StatCard label="Pacientes activos" value={String(pacientesActivos)} sub={pacientesNuevos > 0 ? `+${pacientesNuevos} nuevos este mes` : 'Sin altas nuevas'} color="#818CF8" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Sesiones por estado */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Sesiones por estado</p>
            <div className="space-y-4">
              <Bar label="Realizadas" value={realizadas} max={sesiones.length || 1} color={ESTADO_COLOR.realizada} />
              <Bar label="Canceladas" value={canceladas} max={sesiones.length || 1} color={ESTADO_COLOR.cancelada} />
              <Bar label="Inasistencias" value={inasistencias} max={sesiones.length || 1} color={ESTADO_COLOR.inasistencia} />
              <Bar label="Programadas" value={programadas} max={sesiones.length || 1} color={ESTADO_COLOR.programada} />
            </div>
            {sesiones.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Sin sesiones este mes</p>
            )}
          </div>

          {/* Ingresos por tipo */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Ingresos por tipo de pago</p>
            <div className="space-y-4">
              {Object.entries(pagosPorTipo).length > 0
                ? Object.entries(pagosPorTipo).map(([tipo, total]) => (
                  <div key={tipo} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--foreground)' }}>{TIPO_LABEL[tipo] ?? tipo}</span>
                      <span className="text-sm font-semibold" style={{ color: TIPO_COLOR[tipo] ?? '#94A3B8' }}>{fmt(total)}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.round((total / maxTipo) * 100)}%`, background: TIPO_COLOR[tipo] ?? '#94A3B8' }} />
                    </div>
                  </div>
                ))
                : <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Sin cobros registrados este mes</p>
              }
            </div>
          </div>
        </div>

        {/* Actividad diaria (sparkline) */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Sesiones realizadas por día</p>
          <div className="flex items-end gap-1 h-16">
            {sesionesPorDia.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full rounded-sm transition-all"
                  style={{ height: `${n > 0 ? Math.max(8, Math.round((n / maxDia) * 56)) : 3}px`, background: n > 0 ? '#3EC9C9' : 'var(--border)' }} />
                {diasMes <= 15 && (
                  <span className="text-[8px]" style={{ color: 'var(--text-subtle)' }}>{i + 1}</span>
                )}
              </div>
            ))}
          </div>
          {diasMes > 15 && (
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>1</span>
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>{Math.round(diasMes / 2)}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>{diasMes}</span>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
