import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Paciente } from '@/types'

const estadoConfig = {
  activo:   { label: 'Activo',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  inactivo: { label: 'Inactivo', color: '#6B7A99', bg: 'rgba(107,122,153,0.1)' },
  alta:     { label: 'Alta',     color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  derivado: { label: 'Derivado', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}

const avatarColors = [
  '#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24',
]
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return avatarColors[n % avatarColors.length]
}

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*')
    .order('apellido', { ascending: true })

  const lista = (pacientes ?? []) as Paciente[]

  const stats = {
    total: lista.length,
    activos: lista.filter(p => p.estado === 'activo').length,
    inactivos: lista.filter(p => p.estado === 'inactivo').length,
    alta: lista.filter(p => p.estado === 'alta').length,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold mb-1"
            style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
            Pacientes
          </h1>
          <p className="text-sm" style={{ color: '#6B7A99' }}>
            {stats.total} pacientes en total
          </p>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3EC9C9, #2BA8A8)', color: '#0A0E1A' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Nuevo paciente
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label: 'Total', value: stats.total, color: '#3EC9C9', bg: 'rgba(62,201,201,0.08)' },
          { label: 'Activos', value: stats.activos, color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
          { label: 'Inactivos', value: stats.inactivos, color: '#6B7A99', bg: 'rgba(107,122,153,0.08)' },
          { label: 'Alta médica', value: stats.alta, color: '#FBBF24', bg: 'rgba(251,191,36,0.08)' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 anim-fade-up"
            style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: '#6B7A99' }}>{s.label}</p>
            <p className="text-3xl font-bold" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      {lista.length === 0 ? (
        <div className="rounded-2xl p-10 sm:p-16 text-center anim-fade-up"
          style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#3EC9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="#3EC9C9" strokeWidth="1.8"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#3EC9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-base font-medium mb-2" style={{ color: '#E8EDF5' }}>No hay pacientes aún</p>
          <p className="text-sm mb-6" style={{ color: '#6B7A99' }}>
            Agregá tu primer paciente para comenzar
          </p>
          <Link
            href="/pacientes/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Agregar paciente
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden anim-fade-up"
          style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Desktop table header */}
          <div className="hidden lg:grid grid-cols-12 px-6 py-3 text-xs font-semibold tracking-wide uppercase"
            style={{ color: '#3A4560', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="col-span-5">Paciente</span>
            <span className="col-span-3">Contacto</span>
            <span className="col-span-2">Obra Social</span>
            <span className="col-span-2 text-right">Estado</span>
          </div>

          {/* Rows */}
          <div className="stagger">
            {lista.map((p, i) => {
              const est = estadoConfig[p.estado] ?? estadoConfig.activo
              const color = avatarColor(p.id)
              return (
                <Link
                  key={p.id}
                  href={`/pacientes/${p.id}`}
                  className="anim-fade-up transition-all hover:bg-white/[0.02]"
                  style={{ borderBottom: i < lista.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'block' }}
                >
                  {/* Mobile layout */}
                  <div className="flex items-center gap-3 px-4 py-3.5 lg:hidden">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                      {initials(p.nombre, p.apellido)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#E8EDF5' }}>
                        {p.apellido}, {p.nombre}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#5A6A88' }}>
                        {p.telefono || p.email || (p.obra_social ? p.obra_social : '—')}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium flex-shrink-0"
                      style={{ background: est.bg, color: est.color }}>
                      {est.label}
                    </span>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden lg:grid grid-cols-12 px-6 py-4 items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                        {initials(p.nombre, p.apellido)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#E8EDF5' }}>
                          {p.apellido}, {p.nombre}
                        </p>
                        {p.fecha_nacimiento && (
                          <p className="text-xs" style={{ color: '#3A4560' }}>
                            {new Date().getFullYear() - new Date(p.fecha_nacimiento).getFullYear()} años
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 min-w-0">
                      {p.telefono && <p className="text-sm" style={{ color: '#6B7A99' }}>{p.telefono}</p>}
                      {p.email && <p className="text-xs truncate" style={{ color: '#3A4560' }}>{p.email}</p>}
                    </div>
                    <div className="col-span-2 min-w-0">
                      {p.obra_social
                        ? <p className="text-sm truncate" style={{ color: '#6B7A99' }}>{p.obra_social}</p>
                        : <span className="text-xs" style={{ color: '#3A4560' }}>—</span>}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
