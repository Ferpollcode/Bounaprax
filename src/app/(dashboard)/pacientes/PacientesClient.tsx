'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Paciente } from '@/types'
import { pacienteSlug } from '@/lib/utils'

const estadoConfig = {
  activo:   { label: 'Activo',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  inactivo: { label: 'Inactivo', color: '#6B7A99', bg: 'rgba(107,122,153,0.1)' },
  alta:     { label: 'Alta',     color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  derivado: { label: 'Derivado', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
}

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}

const avatarColors = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24']
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return avatarColors[n % avatarColors.length]
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function PacientesClient({ initialPacientes }: { initialPacientes: Paciente[] }) {
  const [lista, setLista] = useState<Paciente[]>(initialPacientes)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const stats = {
    total: lista.length,
    activos: lista.filter(p => p.estado === 'activo').length,
    inactivos: lista.filter(p => p.estado === 'inactivo').length,
    alta: lista.filter(p => p.estado === 'alta').length,
  }

  const pacienteAEliminar = lista.find(p => p.id === deleteConfirm)

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('pacientes').delete().eq('id', deleteConfirm)
    if (!error) {
      setLista(prev => prev.filter(p => p.id !== deleteConfirm))
    }
    setDeleteConfirm(null)
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {[
          { label: 'Total',      value: stats.total,    color: '#3EC9C9', bg: 'rgba(62,201,201,0.08)'  },
          { label: 'Activos',    value: stats.activos,  color: '#34D399', bg: 'rgba(52,211,153,0.08)'  },
          { label: 'Inactivos',  value: stats.inactivos,color: '#6B7A99', bg: 'rgba(107,122,153,0.08)' },
          { label: 'Alta médica',value: stats.alta,     color: '#FBBF24', bg: 'rgba(251,191,36,0.08)'  },
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
          <p className="text-sm mb-6" style={{ color: '#6B7A99' }}>Agregá tu primer paciente para comenzar</p>
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
            <span className="col-span-4">Paciente</span>
            <span className="col-span-3">Contacto</span>
            <span className="col-span-2">Obra Social</span>
            <span className="col-span-2">Estado</span>
            <span className="col-span-1"></span>
          </div>

          {/* Rows */}
          <div className="stagger">
            {lista.map((p, i) => {
              const est = estadoConfig[p.estado] ?? estadoConfig.activo
              const color = avatarColor(p.id)
              const isLast = i === lista.length - 1
              return (
                <div
                  key={p.id}
                  className="anim-fade-up group"
                  style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                >
                  {/* Mobile layout */}
                  <div className="relative lg:hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 pr-14 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => router.push(`/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}`)}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                        {initials(p.nombre, p.apellido)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#E8EDF5' }}>
                          {p.apellido}, {p.nombre}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: '#5A6A88' }}>
                          {p.telefono || p.email || p.obra_social || '—'}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium flex-shrink-0"
                        style={{ background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: '#F87171' }}
                      onClick={() => setDeleteConfirm(p.id)}
                      aria-label="Eliminar paciente"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden lg:flex items-stretch">
                    <div
                      className="flex-1 grid grid-cols-11 px-6 py-4 items-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => router.push(`/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}`)}
                    >
                      <div className="col-span-4 flex items-center gap-3">
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
                      <div className="col-span-2 flex">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                      </div>
                    </div>
                    {/* Delete column */}
                    <div className="flex items-center px-4">
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: '#F87171' }}
                        onClick={() => setDeleteConfirm(p.id)}
                        aria-label="Eliminar paciente"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal confirmación de eliminación */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full anim-fade-up"
            style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <TrashIcon />
            </div>
            <h3 className="text-base font-semibold text-center mb-1"
              style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
              ¿Eliminar paciente?
            </h3>
            {pacienteAEliminar && (
              <p className="text-sm text-center mb-1" style={{ color: '#6B7A99' }}>
                {pacienteAEliminar.apellido}, {pacienteAEliminar.nombre}
              </p>
            )}
            <p className="text-xs text-center mb-6" style={{ color: '#3A4560' }}>
              Esta acción eliminará el paciente y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 h-10 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="flex-1 h-10 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
