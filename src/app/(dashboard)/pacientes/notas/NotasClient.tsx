'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Paciente, PacienteNota } from '@/types'

const avatarColors = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24']
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return avatarColors[n % avatarColors.length]
}
function initials(nombre: string, apellido: string) {
  return `${apellido[0] ?? ''}${nombre[0] ?? ''}`.toUpperCase()
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

interface Props {
  pacientes: Paciente[]
  initialNotas: PacienteNota[]
}

export function NotasClient({ pacientes, initialNotas }: Props) {
  const [notas, setNotas] = useState<PacienteNota[]>(initialNotas)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(pacientes.map(p => p.id)))
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const filtered = pacientes.filter(p =>
    `${p.apellido} ${p.nombre}`.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function notasDePaciente(pacienteId: string) {
    return notas.filter(n => n.paciente_id === pacienteId)
  }

  async function addNota(paciente: Paciente) {
    const texto = (drafts[paciente.id] ?? '').trim()
    if (!texto) return
    setSaving(paciente.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); return }
    const { data } = await supabase.from('paciente_notas').insert({
      paciente_id: paciente.id,
      professional_id: user.id,
      contenido: texto,
    }).select().single()
    if (data) {
      setNotas(prev => [data as PacienteNota, ...prev])
      setDrafts(prev => ({ ...prev, [paciente.id]: '' }))
    }
    setSaving(null)
  }

  async function deleteNota(id: string) {
    const supabase = createClient()
    await supabase.from('paciente_notas').delete().eq('id', id)
    setNotas(prev => prev.filter(n => n.id !== id))
  }

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    Object.values(textareaRefs.current).forEach(el => autoResize(el))
  }, [drafts])

  if (pacientes.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center anim-fade-up"
        style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-base font-medium mb-2" style={{ color: 'var(--foreground)' }}>Sin pacientes</p>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Agregá pacientes para empezar a tomar notas</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative anim-fade-up mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-subtle)' }}>
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
          <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pl-9 pr-4 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
        />
      </div>

      {filtered.map(paciente => {
        const isOpen = openIds.has(paciente.id)
        const pNotas = notasDePaciente(paciente.id)
        const color = avatarColor(paciente.id)
        const draft = drafts[paciente.id] ?? ''

        return (
          <div key={paciente.id} className="rounded-2xl overflow-hidden anim-fade-up"
            style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Patient header — large tap target */}
            <button
              className="w-full flex items-center gap-3 px-4 py-4 sm:px-5 transition-colors active:bg-white/[0.04] hover:bg-white/[0.02]"
              onClick={() => toggle(paciente.id)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                {initials(paciente.nombre, paciente.apellido)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {paciente.apellido}, {paciente.nombre}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {pNotas.length === 0 ? 'Sin notas' : `${pNotas.length} nota${pNotas.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>
                <ChevronIcon open={isOpen} />
              </div>
            </button>

            {/* Notes content */}
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {/* New note input */}
                <div className="px-3 py-3 sm:px-5 sm:py-4"
                  style={{ borderBottom: pNotas.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <textarea
                      ref={el => { textareaRefs.current[paciente.id] = el }}
                      placeholder="Escribir una nota..."
                      value={draft}
                      rows={2}
                      onChange={e => {
                        setDrafts(prev => ({ ...prev, [paciente.id]: e.target.value }))
                        autoResize(e.target)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNota(paciente)
                      }}
                      className="w-full px-3 pt-3 pb-2 text-sm resize-none outline-none bg-transparent"
                      style={{ color: 'var(--foreground)', minHeight: '64px' }}
                    />
                    <div className="flex items-center justify-end px-3 pb-2.5">
                      <button
                        onClick={() => addNota(paciente)}
                        disabled={!draft.trim() || saving === paciente.id}
                        className="h-8 px-3 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 active:opacity-70"
                        style={{ background: 'rgba(62,201,201,0.15)', border: '1px solid rgba(62,201,201,0.25)', color: 'var(--primary)' }}
                      >
                        {saving === paciente.id ? 'Guardando...' : 'Guardar nota'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Existing notes */}
                {pNotas.length > 0 && (
                  <div className="px-3 py-3 sm:px-5 space-y-2">
                    {pNotas.map(nota => (
                      <div key={nota.id}
                        className="flex gap-2 rounded-xl p-3 transition-colors"
                        style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                            {nota.contenido}
                          </p>
                          <p className="text-xs mt-1.5" style={{ color: 'var(--text-subtle)' }}>
                            {formatDate(nota.created_at)}
                          </p>
                        </div>
                        {/* Always visible on mobile, hover-only on desktop */}
                        <button
                          onClick={() => deleteNota(nota.id)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:opacity-70"
                          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--danger)' }}
                          aria-label="Eliminar nota"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
