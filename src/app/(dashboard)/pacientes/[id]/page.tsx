import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Paciente, Sesion, Pago, Documento } from '@/types'

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

function calcEdad(f?: string) {
  if (!f) return null
  const hoy = new Date(), nac = new Date(f)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}
function fmtDate(s: string) { return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) }
function fmtMoney(n: number) { return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(n) }

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: '#3A4560' }}>{label}</p>
      <p className="text-sm" style={{ color: '#C8D4E8' }}>{value}</p>
    </div>
  )
}

function SectionHeader({ title, count, href, linkLabel }: { title: string; count?: number; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: '#3A4560' }}>
        {title}
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#6B7A99' }}>{count}</span>
        )}
      </p>
      {href && <Link href={href} className="text-xs font-medium transition-opacity hover:opacity-80" style={{ color: '#3EC9C9' }}>{linkLabel}</Link>}
    </div>
  )
}

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: paciente }, { data: sesiones }, { data: pagos }, { data: documentos }] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase.from('sesiones').select('*').eq('paciente_id', id).order('fecha', { ascending: false }).limit(10),
    supabase.from('pagos').select('*').eq('paciente_id', id).order('fecha', { ascending: false }).limit(10),
    supabase.from('documentos').select('*').eq('paciente_id', id).order('created_at', { ascending: false }),
  ])

  if (!paciente) notFound()

  const p    = paciente as Paciente
  const sess = (sesiones   ?? []) as Sesion[]
  const pays = (pagos      ?? []) as Pago[]
  const docs = (documentos ?? []) as Documento[]
  const est  = estadoConfig[p.estado] ?? estadoConfig.activo
  const edad = calcEdad(p.fecha_nacimiento)

  const totalPagado  = pays.filter(pay => pay.estado === 'pagado').reduce((a, b) => a + (b.monto ?? 0), 0)
  const totalPendiente = pays.filter(pay => pay.estado === 'pendiente').reduce((a, b) => a + (b.monto ?? 0), 0)

  return (
    <div className="min-h-screen p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 anim-fade-up">
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
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
                {p.apellido}, {p.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium"
                  style={{ background: est.bg, color: est.color }}>{est.label}</span>
                {edad && <span className="text-sm" style={{ color: '#5A6A88' }}>{edad} años</span>}
                {p.obra_social && <span className="text-sm" style={{ color: '#5A6A88' }}>· {p.obra_social}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/pacientes/${p.id}/sesiones/nueva`}
            className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Sesión
          </Link>
          <Link href={`/pacientes/${p.id}/pagos/nuevo`}
            className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: '#F5A623' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Pago
          </Link>
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

      {/* ── Stats rápidas ── */}
      <div className="grid grid-cols-4 gap-3 mb-5 stagger">
        {[
          { label: 'Sesiones',  value: String(sess.length), color: '#3EC9C9' },
          { label: 'Cobrado',   value: fmtMoney(totalPagado), color: '#34D399' },
          { label: 'Pendiente', value: fmtMoney(totalPendiente), color: '#FBBF24' },
          { label: 'Documentos',value: String(docs.length), color: '#A78BFA' },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 anim-fade-up"
            style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-1" style={{ color: '#3A4560' }}>{s.label}</p>
            <p className="text-lg font-bold" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* ── Col izquierda ── */}
        <div className="col-span-1 space-y-4">
          <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
            <SectionHeader title="Datos personales" href={`/pacientes/${p.id}/editar`} linkLabel="Editar" />
            <InfoItem label="DNI" value={p.dni} />
            <InfoItem label="Fecha de nac." value={p.fecha_nacimiento ? fmtDate(p.fecha_nacimiento) : null} />
            <InfoItem label="Teléfono" value={p.telefono} />
            <InfoItem label="Email" value={p.email} />
            {!p.dni && !p.telefono && !p.email && !p.fecha_nacimiento && (
              <p className="text-xs" style={{ color: '#3A4560' }}>Sin datos adicionales</p>
            )}
          </div>

          {(p.obra_social || p.numero_afiliado) && (
            <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <SectionHeader title="Cobertura" />
              <InfoItem label="Obra social" value={p.obra_social} />
              <InfoItem label="Nº afiliado"  value={p.numero_afiliado} />
            </div>
          )}

          {(p.motivo_consulta || p.diagnostico) && (
            <div className="rounded-2xl p-5 space-y-3.5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
              <SectionHeader title="Info clínica" />
              <InfoItem label="Motivo" value={p.motivo_consulta} />
              <InfoItem label="Diagnóstico" value={p.diagnostico} />
            </div>
          )}
        </div>

        {/* ── Col derecha ── */}
        <div className="col-span-2 space-y-4">

          {/* Sesiones */}
          <div className="rounded-2xl p-5" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
            <SectionHeader title="Sesiones" count={sess.length} href={`/pacientes/${p.id}/sesiones/nueva`} linkLabel="+ Nueva sesión" />
            {sess.length === 0 ? (
              <p className="text-sm" style={{ color: '#3A4560' }}>Sin sesiones registradas.</p>
            ) : (
              <div className="space-y-2">
                {sess.map(s => {
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
                          {s.hora_inicio && <span className="text-xs" style={{ color: '#3A4560' }}>· {s.hora_inicio.slice(0,5)}</span>}
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
            <SectionHeader title="Pagos" count={pays.length} href={`/pacientes/${p.id}/pagos/nuevo`} linkLabel="+ Registrar pago" />
            {pays.length === 0 ? (
              <p className="text-sm" style={{ color: '#3A4560' }}>Sin pagos registrados.</p>
            ) : (
              <div className="space-y-2">
                {pays.map(pay => {
                  const estadoPago = pay.estado === 'pagado' ? { color: '#34D399', label: 'Pagado' }
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
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: `${estadoPago.color}15`, color: estadoPago.color }}>
                        {estadoPago.label}
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
            <SectionHeader title="Documentos" count={docs.length} />
            {docs.length === 0 ? (
              <p className="text-sm" style={{ color: '#3A4560' }}>Sin documentos adjuntos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {docs.map(doc => (
                  <a key={doc.id} href={doc.archivo_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl p-3 transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-lg flex-shrink-0">{tipoIcono[doc.tipo] ?? '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#C8D4E8' }}>{doc.nombre}</p>
                      <p className="text-xs" style={{ color: '#5A6A88' }}>{fmtDate(doc.created_at)}</p>
                    </div>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="#5A6A88" strokeWidth="2" strokeLinecap="round"/>
                      <polyline points="15,3 21,3 21,9" stroke="#5A6A88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="10" y1="14" x2="21" y2="3" stroke="#5A6A88" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
