'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Paciente } from '@/types'
import { pacienteSlug } from '@/lib/utils'

function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const estadoConfig = {
  activo:   { label: 'Activo',   color: 'var(--success)', bg: 'rgba(52,211,153,0.1)'  },
  inactivo: { label: 'Inactivo', color: 'var(--muted-foreground)', bg: 'rgba(107,122,153,0.1)' },
  alta:     { label: 'Alta',     color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)'  },
  derivado: { label: 'Derivado', color: 'var(--danger)', bg: 'rgba(248,113,113,0.1)' },
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
      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger">
        {[
          { label: 'Notas',         href: '/pacientes/notas',         desc: 'Notas clínicas por paciente', color: 'var(--primary)', bg: 'rgba(62,201,201,0.08)',   border: 'rgba(62,201,201,0.15)',   icon: <NoteIcon /> },
          { label: 'Tareas',        href: '/pacientes/tareas',        desc: 'Tareas y pendientes',          color: 'var(--success)', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.15)',   icon: <TaskIcon /> },
          { label: 'Recordatorios', href: '/pacientes/recordatorios', desc: 'Alertas y recordatorios',     color: 'var(--warning)', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.15)',   icon: <BellIcon /> },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl p-5 anim-fade-up flex items-center gap-4 transition-all hover:scale-[1.02] cursor-pointer"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: card.bg, border: `1px solid ${card.border}`, color: card.color }}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                {card.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {card.desc}
              </p>
            </div>
            <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ))}
      </div>

      {/* List */}
      {lista.length === 0 ? (
        <div className="rounded-2xl p-10 sm:p-16 text-center anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="var(--primary)" strokeWidth="1.8"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-base font-medium mb-2" style={{ color: 'var(--foreground)' }}>No hay pacientes aún</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Agregá tu primer paciente para comenzar</p>
          <Link
            href="/pacientes/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: 'var(--primary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Agregar paciente
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Desktop table header */}
          <div className="hidden lg:grid grid-cols-12 px-6 py-3 text-xs font-semibold tracking-wide uppercase"
            style={{ color: 'var(--text-subtle)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {p.apellido}, {p.nombre}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
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
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--danger)' }}
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
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {p.apellido}, {p.nombre}
                          </p>
                          {p.fecha_nacimiento && (
                            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                              {new Date().getFullYear() - new Date(p.fecha_nacimiento).getFullYear()} años
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0">
                        {p.telefono && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{p.telefono}</p>}
                        {p.email && <p className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>{p.email}</p>}
                      </div>
                      <div className="col-span-2 min-w-0">
                        {p.obra_social
                          ? <p className="text-sm truncate" style={{ color: 'var(--muted-foreground)' }}>{p.obra_social}</p>
                          : <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>}
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
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--danger)' }}
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
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="modal-content rounded-2xl p-6 max-w-sm w-full"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <TrashIcon />
            </div>
            <h3 className="text-base font-semibold text-center mb-1"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
              ¿Eliminar paciente?
            </h3>
            {pacienteAEliminar && (
              <p className="text-sm text-center mb-1" style={{ color: 'var(--muted-foreground)' }}>
                {pacienteAEliminar.apellido}, {pacienteAEliminar.nombre}
              </p>
            )}
            <p className="text-xs text-center mb-6" style={{ color: 'var(--text-subtle)' }}>
              Esta acción eliminará el paciente y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 h-10 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="flex-1 h-10 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)' }}
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
