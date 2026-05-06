'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Types ──────────────────────────────────────────────────────────────
type Sesion   = { id: string; fecha: string; estado: string; monto: number | null; pagado: boolean }
type Pago     = { id: string; fecha: string; monto: number; tipo: string; estado: string; sesion_id?: string | null }
type Paciente = { id: string; estado: string; created_at: string }

interface Props {
  sesiones:  Sesion[]
  pagos:     Pago[]
  pacientes: Paciente[]
  mes:    string
  desde:  string
  hasta:  string
  isPro:  boolean
}

type PagoRow = {
  kind?: 'pago'
  id: string
  sesion_id?: string | null
  fecha: string
  monto: number
  tipo: string
  concepto: string | null
  estado: string
  created_at: string
  pacientes: { nombre: string; apellido: string } | null
  sesiones: { consultorios: { nombre: string; color: string } | null } | null
}

type SesionMoneyRow = {
  kind: 'sesion'
  id: string
  fecha: string
  monto: number
  tipo: 'sesion'
  concepto: string | null
  estado: 'pagado' | 'pendiente'
  created_at: string
  pacientes: { nombre: string; apellido: string } | null
  sesiones: { consultorios: { nombre: string; color: string } | null } | null
}

type MoneyRow = PagoRow | SesionMoneyRow

type Period = 'semana' | 'mes' | 'todo'

// ── Constants ──────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia',
  tarjeta: 'Tarjeta', obra_social: 'Obra social', otro: 'Otro',
  sesion: 'Sesión',
}
const ESTADO_COLOR: Record<string, string> = {
  realizada: '#34D399', cancelada: '#F87171', inasistencia: '#FBBF24', programada: '#3EC9C9',
}
const TIPO_COLOR_BAR: Record<string, string> = {
  efectivo: '#34D399', transferencia: '#3EC9C9', tarjeta: '#818CF8', obra_social: '#F59E0B', otro: '#94A3B8',
  sesion: '#22C55E',
}
const tipoColor: Record<string, string> = {
  efectivo:      'rgba(34,197,94,0.15)',
  transferencia: 'rgba(62,201,201,0.15)',
  tarjeta:       'rgba(167,139,250,0.15)',
  obra_social:   'rgba(251,191,36,0.15)',
  otro:          'rgba(148,163,184,0.15)',
  sesion:        'rgba(34,197,94,0.15)',
}
const tipoTextColor: Record<string, string> = {
  efectivo:      '#22C55E',
  transferencia: '#3EC9C9',
  tarjeta:       '#B482FF',
  obra_social:   '#F59E0B',
  otro:          '#94A3B8',
  sesion:        '#22C55E',
}
const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  pagado:    { label: 'Pagado',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pendiente: { label: 'Pendiente', color: '#F59E0B', bg: 'rgba(251,191,36,0.12)' },
  devuelto:  { label: 'Devuelto',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

// ── Helpers ────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

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

// ── Sub-components ─────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────

function OptimizaWall() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-2xl">
      <div className="mb-6 anim-fade-up">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FF9F43' }}>Reportes</p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          Estadísticas y contabilidad
        </h1>
      </div>

      <div className="rounded-2xl overflow-hidden anim-fade-up" style={{ border: '1px solid rgba(245,166,35,0.25)' }}>
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(255,159,67,0.06))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 20V10M12 20V4M6 20v-6" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Requiere plan PRO</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Activá PRO o renová el acceso Free desde Administración.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportesClient({ sesiones, pagos, pacientes, mes, desde, hasta, isPro }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'estadisticas' | 'contabilidad'>('estadisticas')
  if (!isPro) return <OptimizaWall />

  // ── Estadísticas ───────────────────────────────────────────────────
  const [year, month] = mes.split('-').map(Number)

  function navMes(delta: number) {
    const d = new Date(year, month - 1 + delta)
    router.push(`/reportes?mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const pagosPagados   = pagos.filter(p => p.estado === 'pagado')
  const sesionesConPagoIds = new Set(pagos.map(p => p.sesion_id).filter(Boolean))
  const sesionesConMonto = sesiones.filter(s => s.monto != null && !sesionesConPagoIds.has(s.id))
  const totalIngresos  = pagosPagados.reduce((s, p) => s + (p.monto ?? 0), 0)
    + sesionesConMonto.filter(s => s.pagado).reduce((s, p) => s + (p.monto ?? 0), 0)
  const pendientes     = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.monto ?? 0), 0)
    + sesionesConMonto.filter(s => !s.pagado).reduce((s, p) => s + (p.monto ?? 0), 0)

  const realizadas     = sesiones.filter(s => s.estado === 'realizada').length
  const canceladas     = sesiones.filter(s => s.estado === 'cancelada').length
  const inasistencias  = sesiones.filter(s => s.estado === 'inasistencia').length
  const programadas    = sesiones.filter(s => s.estado === 'programada').length
  const totalPasadas   = realizadas + canceladas + inasistencias
  const tasaAsistencia = totalPasadas > 0 ? Math.round((realizadas / totalPasadas) * 100) : 0

  const pacientesActivos = pacientes.filter(p => p.estado === 'activo').length
  const pacientesNuevos  = pacientes.filter(p => {
    const d = p.created_at.split('T')[0]
    return d >= desde && d <= hasta
  }).length

  const pagosPorTipo = pagosPagados.reduce<Record<string, number>>((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + (p.monto ?? 0)
    return acc
  }, {})
  sesionesConMonto.filter(s => s.pagado).forEach(s => {
    pagosPorTipo.sesion = (pagosPorTipo.sesion || 0) + (s.monto ?? 0)
  })
  const maxTipo = Math.max(...Object.values(pagosPorTipo), 1)

  const diasMes = new Date(year, month, 0).getDate()
  const sesionesPorDia = Array.from({ length: diasMes }, (_, i) => {
    const dia   = String(i + 1).padStart(2, '0')
    const fecha = `${year}-${String(month).padStart(2, '0')}-${dia}`
    return sesiones.filter(s => s.fecha === fecha && s.estado === 'realizada').length
  })
  const maxDia = Math.max(...sesionesPorDia, 1)

  const fmt = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

  // ── Contabilidad ───────────────────────────────────────────────────
  const [pagosRows, setPagosRows] = useState<MoneyRow[]>([])
  const [loadingCont, setLoadingCont] = useState(false)
  const [period, setPeriod] = useState<Period>('mes')
  const [filterTipo, setFilterTipo] = useState<string>('todos')

  const fetchPagos = useCallback(async (p: Period) => {
    setLoadingCont(true)
    const supabase = createClient()
    let pagosQuery = supabase
      .from('pagos')
      .select('id, sesion_id, fecha, monto, tipo, concepto, estado, created_at, pacientes(nombre, apellido), sesiones(consultorios(nombre, color))')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    let sesionesQuery = supabase
      .from('sesiones')
      .select('id, fecha, monto, pagado, estado, created_at, pacientes(nombre, apellido), consultorios(nombre, color)')
      .not('monto', 'is', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (p === 'semana') {
      const { start, end } = getWeekBounds()
      pagosQuery = pagosQuery.gte('fecha', start).lte('fecha', end)
      sesionesQuery = sesionesQuery.gte('fecha', start).lte('fecha', end)
    } else if (p === 'mes') {
      const { start, end } = getMonthBounds()
      pagosQuery = pagosQuery.gte('fecha', start).lte('fecha', end)
      sesionesQuery = sesionesQuery.gte('fecha', start).lte('fecha', end)
    }

    const [{ data: pagosData }, { data: sesionesData }] = await Promise.all([pagosQuery, sesionesQuery])
    const linkedSessionIds = new Set(((pagosData ?? []) as unknown as PagoRow[]).map(pago => pago.sesion_id).filter(Boolean))
    const sessionRows = ((sesionesData ?? []) as unknown as Array<{
      id: string
      fecha: string
      monto: number | null
      pagado: boolean
      estado: string
      created_at: string
      pacientes: { nombre: string; apellido: string } | null
      consultorios: { nombre: string; color: string } | null
    }>)
      .filter(s => !linkedSessionIds.has(s.id))
      .map((s): SesionMoneyRow => ({
      kind: 'sesion',
      id: s.id,
      fecha: s.fecha,
      monto: Number(s.monto ?? 0),
      tipo: 'sesion',
      concepto: `Sesión ${s.estado}`,
      estado: s.pagado ? 'pagado' : 'pendiente',
      created_at: s.created_at,
      pacientes: s.pacientes,
      sesiones: { consultorios: s.consultorios },
    }))
    const rows = [
      ...((pagosData ?? []) as unknown as PagoRow[]).map(pago => ({ ...pago, kind: 'pago' as const })),
      ...sessionRows,
    ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
    setPagosRows(rows)
    setLoadingCont(false)
  }, [])

  useEffect(() => {
    if (tab === 'contabilidad') fetchPagos(period)
  }, [tab, period, fetchPagos])

  const semanaIngresos = (() => {
    const { start, end } = getWeekBounds()
    return pagosRows
      .filter(p => p.estado === 'pagado' && p.fecha >= start && p.fecha <= end)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })()

  const mesIngresos = (() => {
    const { start, end } = getMonthBounds()
    return pagosRows
      .filter(p => p.estado === 'pagado' && p.fecha >= start && p.fecha <= end)
      .reduce((acc, p) => acc + Number(p.monto), 0)
  })()

  const pagosFiltrados = filterTipo === 'todos'
    ? pagosRows
    : pagosRows.filter(p => p.tipo === filterTipo)

  const tiposPresentes = Array.from(new Set(pagosRows.map(p => p.tipo)))

  const now = new Date()
  const mesActualLabel = `${MESES[now.getMonth()].toLowerCase()} ${now.getFullYear()}`

  function xml(value: string | number) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function dataUrlToBytes(dataUrl: string) {
    const binary = atob(dataUrl.split(',')[1])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function svgToJpegBytes(svg: string) {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    try {
      const img = new Image()
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
      })
      img.src = url
      await loaded
      const canvas = document.createElement('canvas')
      canvas.width = 1240
      canvas.height = 1754
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas context')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      return dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.95))
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  function statSvgCard(x: number, y: number, w: number, label: string, value: string, sub: string, color: string) {
    return `<rect x="${x}" y="${y}" width="${w}" height="142" rx="20" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
      <text x="${x + 24}" y="${y + 42}" font-size="18" font-weight="800" letter-spacing="2" fill="#64748B">${xml(label.toUpperCase())}</text>
      <text x="${x + 24}" y="${y + 92}" font-size="34" font-weight="900" fill="${color}">${xml(value)}</text>
      <text x="${x + 24}" y="${y + 120}" font-size="17" fill="#64748B">${xml(sub)}</text>`
  }

  function barSvg(x: number, y: number, w: number, label: string, value: string, pct: number, color: string) {
    const barWidth = Math.max(4, Math.round(w * Math.max(0, Math.min(1, pct))))
    return `<text x="${x}" y="${y}" font-size="20" fill="#0F172A">${xml(label)}</text>
      <text x="${x + w}" y="${y}" font-size="20" font-weight="800" fill="${color}" text-anchor="end">${xml(value)}</text>
      <rect x="${x}" y="${y + 14}" width="${w}" height="14" rx="7" fill="#E2E8F0"/>
      <rect x="${x}" y="${y + 14}" width="${barWidth}" height="14" rx="7" fill="${color}"/>`
  }

  function buildStatsReportSvg() {
    const estadoBars = [
      ['Realizadas', realizadas, ESTADO_COLOR.realizada],
      ['Canceladas', canceladas, ESTADO_COLOR.cancelada],
      ['Inasistencias', inasistencias, ESTADO_COLOR.inasistencia],
      ['Programadas', programadas, ESTADO_COLOR.programada],
    ] as const
    const maxEstado = Math.max(sesiones.length, 1)
    const tipoEntries = Object.entries(pagosPorTipo)
    const tipoBars = tipoEntries.length > 0 ? tipoEntries : [['Sin cobros', 0] as [string, number]]
    const dailyBars = sesionesPorDia.map((n, index) => {
      const x = 74 + index * (1092 / diasMes)
      const width = Math.max(8, 1092 / diasMes - 3)
      const height = n > 0 ? Math.max(8, Math.round((n / maxDia) * 150)) : 3
      return `<rect x="${x.toFixed(1)}" y="${(1360 - height).toFixed(1)}" width="${width.toFixed(1)}" height="${height}" rx="3" fill="${n > 0 ? '#3EC9C9' : '#CBD5E1'}"/>`
    }).join('')

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
      <rect width="1240" height="1754" fill="#FFFFFF"/>
      <rect width="1240" height="190" fill="#0F172A"/>
      <g font-family="Arial, Helvetica, sans-serif">
        <text x="74" y="74" font-size="20" font-weight="900" letter-spacing="4" fill="#FF9F43">BOUNAPRAX - REPORTES</text>
        <text x="74" y="130" font-size="44" font-weight="900" fill="#FFFFFF">${xml(MESES[month - 1])} ${year}</text>
        <text x="74" y="166" font-size="20" fill="#CBD5E1">Periodo ${xml(desde)} al ${xml(hasta)} - Generado ${xml(new Date().toLocaleDateString('es-AR'))}</text>
        ${statSvgCard(74, 240, 250, 'Ingresos', fmt(totalIngresos), pendientes > 0 ? `${fmt(pendientes)} pendiente` : 'Todo cobrado', '#16A34A')}
        ${statSvgCard(350, 240, 250, 'Sesiones', String(realizadas), `de ${totalPasadas + programadas} totales`, '#0891B2')}
        ${statSvgCard(626, 240, 250, 'Asistencia', `${tasaAsistencia}%`, `${inasistencias} inasistencias`, tasaAsistencia >= 80 ? '#16A34A' : tasaAsistencia >= 60 ? '#D97706' : '#DC2626')}
        ${statSvgCard(902, 240, 264, 'Pacientes', String(pacientesActivos), pacientesNuevos > 0 ? `+${pacientesNuevos} nuevos` : 'Sin altas nuevas', '#6366F1')}
        <text x="74" y="470" font-size="28" font-weight="900" fill="#0F172A">Sesiones por estado</text>
        <rect x="74" y="498" width="500" height="350" rx="22" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
        ${estadoBars.map(([label, value, color], i) => barSvg(110, 560 + i * 68, 428, label, String(value), value / maxEstado, color)).join('')}
        <text x="666" y="470" font-size="28" font-weight="900" fill="#0F172A">Ingresos por tipo</text>
        <rect x="666" y="498" width="500" height="350" rx="22" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
        ${tipoBars.slice(0, 5).map(([tipo, total], i) => barSvg(702, 560 + i * 58, 428, TIPO_LABEL[tipo] ?? tipo, fmt(Number(total)), Number(total) / maxTipo, TIPO_COLOR_BAR[tipo] ?? '#64748B')).join('')}
        <text x="74" y="940" font-size="28" font-weight="900" fill="#0F172A">Sesiones realizadas por dia</text>
        <rect x="74" y="970" width="1092" height="430" rx="22" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
        <line x1="74" y1="1360" x2="1166" y2="1360" stroke="#CBD5E1" stroke-width="2"/>
        ${dailyBars}
        <text x="74" y="1436" font-size="18" fill="#64748B">1</text>
        <text x="602" y="1436" font-size="18" fill="#64748B" text-anchor="middle">${Math.round(diasMes / 2)}</text>
        <text x="1166" y="1436" font-size="18" fill="#64748B" text-anchor="end">${diasMes}</text>
        <rect x="74" y="1510" width="1092" height="116" rx="18" fill="#FFF7ED" stroke="#FED7AA" stroke-width="2"/>
        <text x="110" y="1558" font-size="22" font-weight="900" fill="#9A3412">Resumen</text>
        <text x="110" y="1596" font-size="20" fill="#9A3412">Ingresos cobrados: ${xml(fmt(totalIngresos))} - Pendiente: ${xml(fmt(pendientes))} - Total de sesiones: ${sesiones.length}</text>
        <text x="74" y="1682" font-size="17" fill="#94A3B8">PDF generado por Reportes con datos del periodo seleccionado.</text>
      </g>
    </svg>`
  }

  async function handleExportPdf() {
    const jpegBytes = await svgToJpegBytes(buildStatsReportSvg())
    const widthPt = 595.28
    const heightPt = 841.89
    const chunks: BlobPart[] = []
    const offsets: number[] = []
    let size = 0
    const encode = (value: string) => new TextEncoder().encode(value)
    const add = (value: string | Uint8Array) => {
      const bytes = value instanceof Uint8Array ? value : encode(value)
      chunks.push(bytes.slice().buffer)
      size += bytes.length
    }
    const obj = (id: number, body: string) => {
      offsets[id] = size
      add(`${id} 0 obj\n${body}\nendobj\n`)
    }
    add('%PDF-1.4\n%binary\n')
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)
    offsets[4] = size
    add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
    add(jpegBytes)
    add('\nendstream\nendobj\n')
    const content = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im0 Do\nQ\n`
    obj(5, `<< /Length ${encode(content).length} >>\nstream\n${content}endstream`)
    const xref = size
    add('xref\n0 6\n0000000000 65535 f \n')
    for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
    downloadBlob(new Blob(chunks, { type: 'application/pdf' }), `reporte-${mes}.pdf`)
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { padding: 0 !important; }
        }
      `}</style>

      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-5xl print-page">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="mb-6 anim-fade-up">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FF9F43' }}>Reportes</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            {tab === 'estadisticas' ? `${MESES[month - 1]} ${year}` : 'Contabilidad'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {tab === 'estadisticas'
              ? `Estadísticas del período ${desde} al ${hasta}`
              : 'Resumen de ingresos y pagos'}
          </p>
        </div>

        {/* ── Tab switcher + controles ─────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
            {(['estadisticas', 'contabilidad'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? '#FF9F43' : 'transparent',
                  color: tab === t ? '#1a0a00' : 'var(--muted-foreground)',
                }}
              >
                {t === 'estadisticas' ? 'Estadísticas' : 'Contabilidad'}
              </button>
            ))}
          </div>

          {tab === 'estadisticas' && (
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => navMes(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)', minWidth: 120, textAlign: 'center' }}>
                {MESES[month - 1]} {year}
              </span>
              <button onClick={() => navMes(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button onClick={handleExportPdf}
                className="h-9 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: 'linear-gradient(135deg,#FF9F43,#E07A30)', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                PDF
              </button>
            </div>
          )}
        </div>

        {/* ══ TAB: Estadísticas ══════════════════════════════════════ */}
        {tab === 'estadisticas' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
              <StatCard label="Ingresos del mes" value={fmt(totalIngresos)} sub={pendientes > 0 ? `${fmt(pendientes)} pendiente` : 'Todo cobrado'} color="#34D399" />
              <StatCard label="Sesiones realizadas" value={String(realizadas)} sub={`de ${totalPasadas + programadas} totales`} color="#3EC9C9" />
              <StatCard label="Tasa de asistencia" value={`${tasaAsistencia}%`} sub={`${inasistencias} inasistencias`} color={tasaAsistencia >= 80 ? '#34D399' : tasaAsistencia >= 60 ? '#FBBF24' : '#F87171'} />
              <StatCard label="Pacientes activos" value={String(pacientesActivos)} sub={pacientesNuevos > 0 ? `+${pacientesNuevos} nuevos este mes` : 'Sin altas nuevas'} color="#818CF8" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Sesiones por estado</p>
                <div className="space-y-4">
                  <Bar label="Realizadas"   value={realizadas}   max={sesiones.length || 1} color={ESTADO_COLOR.realizada} />
                  <Bar label="Canceladas"   value={canceladas}   max={sesiones.length || 1} color={ESTADO_COLOR.cancelada} />
                  <Bar label="Inasistencias" value={inasistencias} max={sesiones.length || 1} color={ESTADO_COLOR.inasistencia} />
                  <Bar label="Programadas"  value={programadas}  max={sesiones.length || 1} color={ESTADO_COLOR.programada} />
                </div>
                {sesiones.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Sin sesiones este mes</p>
                )}
              </div>

              <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Ingresos por tipo de pago</p>
                <div className="space-y-4">
                  {Object.entries(pagosPorTipo).length > 0
                    ? Object.entries(pagosPorTipo).map(([tipo, total]) => (
                      <div key={tipo} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: 'var(--foreground)' }}>{TIPO_LABEL[tipo] ?? tipo}</span>
                          <span className="text-sm font-semibold" style={{ color: TIPO_COLOR_BAR[tipo] ?? '#94A3B8' }}>{fmt(total)}</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${Math.round((total / maxTipo) * 100)}%`, background: TIPO_COLOR_BAR[tipo] ?? '#94A3B8' }} />
                        </div>
                      </div>
                    ))
                    : <p className="text-sm text-center py-4" style={{ color: 'var(--muted-foreground)' }}>Sin cobros registrados este mes</p>
                  }
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Sesiones realizadas por día</p>
              <div className="flex items-end gap-1 h-16">
                {sesionesPorDia.map((n, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
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
          </>
        )}

        {/* ══ TAB: Contabilidad ══════════════════════════════════════ */}
        {tab === 'contabilidad' && (
          <>
            {/* Stats semana / mes */}
            <div className="grid grid-cols-2 gap-3 mb-8 stagger">
              <div className="rounded-2xl p-5 anim-fade-up"
                style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Esta semana</p>
                <p className="text-2xl sm:text-3xl font-bold leading-tight"
                  style={{ color: '#3EC9C9', fontFamily: 'var(--font-display)', wordBreak: 'break-all' }}>
                  {fmtMoney(semanaIngresos)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>ingresos cobrados</p>
              </div>
              <div className="rounded-2xl p-5 anim-fade-up"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>{mesActualLabel}</p>
                <p className="text-2xl sm:text-3xl font-bold leading-tight"
                  style={{ color: '#22C55E', fontFamily: 'var(--font-display)', wordBreak: 'break-all' }}>
                  {fmtMoney(mesIngresos)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>ingresos cobrados</p>
              </div>
            </div>

            {/* Filtros de período */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 anim-fade-up">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
                {(['semana', 'mes', 'todo'] as Period[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: period === p ? '#3EC9C9' : 'transparent',
                      color: period === p ? '#0D1B1B' : 'var(--muted-foreground)',
                    }}>
                    {p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Todo'}
                  </button>
                ))}
              </div>

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
                      {TIPO_LABEL[tipo] ?? tipo}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen del período */}
            {!loadingCont && pagosFiltrados.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4 anim-fade-up"
                style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {pagosFiltrados.length} {pagosFiltrados.length === 1 ? 'pago' : 'pagos'}
                  {filterTipo !== 'todos' && ` · ${TIPO_LABEL[filterTipo] ?? filterTipo}`}
                </span>
                <span className="text-sm font-bold" style={{ color: '#3EC9C9' }}>
                  {fmtMoney(pagosFiltrados.filter(p => p.estado === 'pagado').reduce((a, p) => a + Number(p.monto), 0))}
                </span>
              </div>
            )}

            {/* Lista de pagos */}
            {loadingCont ? (
              <div className="flex justify-center py-16">
                <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#3EC9C9" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                </svg>
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="rounded-2xl p-12 text-center anim-fade-up"
                style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'rgba(62,201,201,0.06)', border: '1px solid rgba(62,201,201,0.12)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#3EC9C9" strokeWidth="1.8"/>
                    <path d="M2 10h20" stroke="#3EC9C9" strokeWidth="1.8"/>
                    <path d="M6 15h4M14 15h2" stroke="#3EC9C9" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Sin pagos registrados</p>
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>No hay pagos para el período seleccionado.</p>
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
                                {TIPO_LABEL[p.tipo] ?? p.tipo}
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
                            style={{ color: p.estado === 'devuelto' ? 'var(--danger)' : '#3EC9C9' }}>
                            {p.estado === 'devuelto' ? '-' : ''}{fmtMoney(Number(p.monto))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
                          {cons && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cons.color }} />
                              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{cons.nombre}</span>
                            </div>
                          )}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                            style={{ background: tipoColor[p.tipo], color: tipoTextColor[p.tipo] }}>
                            {TIPO_LABEL[p.tipo] ?? p.tipo}
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
          </>
        )}

      </div>
    </>
  )
}
