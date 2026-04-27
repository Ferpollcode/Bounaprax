import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { pacienteSlug } from '@/lib/utils'
import { Greeting } from '@/components/Greeting'

type SesionRow = {
  id: string
  fecha: string
  hora_inicio?: string | null
  hora_fin?: string | null
  tipo: string
  consultorio_id?: string | null
  paciente_id: string
  pacientes: { nombre: string; apellido: string } | null
}

type ConsultorioRow = { id: string; nombre: string; color: string }

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function getWeekBounds() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday, today }
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function fmtWeekRange(monday: Date, sunday: Date) {
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} de ${MESES[monday.getMonth()]} de ${monday.getFullYear()}`
  }
  return `${monday.getDate()} de ${MESES[monday.getMonth()]} – ${sunday.getDate()} de ${MESES[sunday.getMonth()]} de ${sunday.getFullYear()}`
}


export default async function InicioPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const rawName = (user?.user_metadata?.nombre as string | undefined) || user?.email?.split('@')[0] || 'Profesional'
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  const { monday, sunday, today } = getWeekBounds()
  const mondayStr = toDateStr(monday)
  const sundayStr = toDateStr(sunday)
  const todayStr = toDateStr(today)

  const { data: sesionesRaw } = await supabase
    .from('sesiones')
    .select('id, fecha, hora_inicio, hora_fin, tipo, consultorio_id, paciente_id, pacientes(nombre, apellido)')
    .gte('fecha', mondayStr)
    .lte('fecha', sundayStr)
    .eq('estado', 'programada')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  const { data: consultorios } = await supabase
    .from('consultorios')
    .select('id, nombre, color')
    .eq('activo', true)
    .order('nombre')

  const sesiones = (sesionesRaw ?? []) as unknown as SesionRow[]
  const cons = (consultorios ?? []) as ConsultorioRow[]

  // Group sessions by consultorio_id
  const grouped = new Map<string, SesionRow[]>()
  for (const s of sesiones) {
    const key = s.consultorio_id ?? '__sin__'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  // Build ordered list: known consultorios first, then __sin__
  const consOrder: Array<{ id: string; nombre: string; color: string; sesiones: SesionRow[] }> = []
  for (const c of cons) {
    const ss = grouped.get(c.id)
    if (ss && ss.length > 0) {
      consOrder.push({ ...c, sesiones: ss })
    }
  }
  const sinCons = grouped.get('__sin__')
  if (sinCons && sinCons.length > 0) {
    consOrder.push({ id: '__sin__', nombre: 'Sin consultorio', color: 'var(--text-subtle)', sesiones: sinCons })
  }

  const totalSemana = sesiones.length
  const sesionesHoy = sesiones.filter(s => s.fecha === todayStr).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full overflow-x-hidden">

      {/* ── Header bienvenida ── */}
      <div className="mb-8 anim-fade-up">
        <Greeting />
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 truncate"
          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
          {userName}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Semana del {fmtWeekRange(monday, sunday)}
        </p>
      </div>

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-2 gap-3 mb-8 stagger">
        <div className="rounded-2xl p-5 anim-fade-up"
          style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.1)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Esta semana</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
            {totalSemana}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
            {totalSemana === 1 ? 'sesión programada' : 'sesiones programadas'}
          </p>
        </div>
        <div className="rounded-2xl p-5 anim-fade-up"
          style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.1)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted-foreground)' }}>Hoy</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--virtual)', fontFamily: 'var(--font-display)' }}>
            {sesionesHoy}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
            {DIAS[today.getDay()]} {today.getDate()} de {MESES[today.getMonth()]}
          </p>
        </div>
      </div>

      {/* ── Sesiones de la semana ── */}
      <div className="anim-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: 'var(--text-subtle)' }}>
            Agenda semanal
          </h2>
          <Link
            href="/agenda"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)' }}
          >
            Ver agenda →
          </Link>
        </div>

        {sesiones.length === 0 ? (
          <div className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(62,201,201,0.06)', border: '1px solid rgba(62,201,201,0.12)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="var(--primary)" strokeWidth="1.8"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
              Sin sesiones esta semana
            </p>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              No hay sesiones programadas para esta semana.
            </p>
          </div>
        ) : (
          <div className="space-y-4 stagger">
            {consOrder.map(c => (
              <div key={c.id} className="rounded-2xl overflow-hidden anim-fade-up"
                style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>

                {/* Consultorio header */}
                <div className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--foreground-muted)' }}>
                    {c.nombre}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-lg"
                    style={{ background: `${c.color}20`, color: c.color }}>
                    {c.sesiones.length} {c.sesiones.length === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </div>

                {/* Sessions list */}
                <div>
                  {c.sesiones.map((s, i) => {
                    const fechaD = new Date(s.fecha + 'T00:00:00')
                    const isToday = s.fecha === todayStr
                    const pacNombre = s.pacientes
                      ? `${s.pacientes.apellido}, ${s.pacientes.nombre}`
                      : 'Paciente'
                    return (
                      <Link
                        key={s.id}
                        href={`/pacientes/${s.pacientes ? pacienteSlug(s.pacientes.apellido, s.pacientes.nombre, s.paciente_id) : s.paciente_id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                        style={{ borderBottom: i < c.sesiones.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      >
                        {/* Día pill */}
                        <div className="flex-shrink-0 text-center"
                          style={{ minWidth: 48 }}>
                          <p className="text-xs font-bold leading-none"
                            style={{ color: isToday ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                            {DIAS_SHORT[fechaD.getDay()]}
                          </p>
                          <p className="text-xl font-bold leading-tight"
                            style={{ color: isToday ? 'var(--primary)' : 'var(--foreground-muted)', fontFamily: 'var(--font-display)' }}>
                            {fechaD.getDate()}
                          </p>
                          {isToday && (
                            <p className="text-[9px] font-bold tracking-wide uppercase"
                              style={{ color: 'var(--primary)' }}>
                              Hoy
                            </p>
                          )}
                        </div>

                        {/* Separador */}
                        <div className="w-px h-10 flex-shrink-0"
                          style={{ background: isToday ? 'rgba(62,201,201,0.3)' : 'rgba(255,255,255,0.07)' }} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {pacNombre}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {s.hora_inicio && (
                              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {s.hora_inicio.slice(0, 5)}
                                {s.hora_fin && ` – ${s.hora_fin.slice(0, 5)}`}
                              </span>
                            )}
                            <span className="text-xs capitalize" style={{ color: 'var(--text-subtle)' }}>
                              · {s.tipo}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
