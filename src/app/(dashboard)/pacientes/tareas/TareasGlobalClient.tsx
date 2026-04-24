'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Paciente } from '@/types'
import type { Tarea } from './page'

const avatarColors = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24']
function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return avatarColors[n % avatarColors.length]
}
function initials(nombre: string, apellido: string) {
  return `${apellido[0] ?? ''}${nombre[0] ?? ''}`.toUpperCase()
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
  initialTareas: Tarea[]
}

type FiltroEstado = 'todas' | 'pendientes' | 'completadas'

export function TareasGlobalClient({ pacientes, initialTareas }: Props) {
  const [tareas, setTareas] = useState<Tarea[]>(initialTareas)
  const [filtro, setFiltro] = useState<FiltroEstado>('pendientes')
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  const pacienteMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  const tareasFiltradas = tareas.filter(t => {
    const paciente = pacienteMap[t.paciente_id]
    const matchSearch = !search || `${paciente?.apellido ?? ''} ${paciente?.nombre ?? ''}`.toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todas' || (filtro === 'pendientes' ? !t.completada : t.completada)
    return matchSearch && matchFiltro
  })

  const pendientesCount = tareas.filter(t => !t.completada).length
  const completadasCount = tareas.filter(t => t.completada).length

  async function addTarea() {
    if (!nuevaTarea.trim() || !pacienteSeleccionado) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }
    const { data } = await supabase.from('paciente_tareas').insert({
      paciente_id: pacienteSeleccionado,
      professional_id: user.id,
      texto: nuevaTarea.trim(),
      completada: false,
    }).select().single()
    if (data) {
      setTareas(prev => [data as Tarea, ...prev])
      setNuevaTarea('')
    }
    setAdding(false)
  }

  async function toggleTarea(tarea: Tarea) {
    const supabase = createClient()
    await supabase.from('paciente_tareas').update({ completada: !tarea.completada }).eq('id', tarea.id)
    setTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, completada: !t.completada } : t))
  }

  async function deleteTarea(id: string) {
    const supabase = createClient()
    await supabase.from('paciente_tareas').delete().eq('id', id)
    setTareas(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Add task form */}
      <div className="rounded-2xl p-4 anim-fade-up"
        style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-subtle)' }}>
          Nueva tarea
        </p>
        <div className="flex flex-col gap-2">
          <select
            value={pacienteSeleccionado}
            onChange={e => setPacienteSeleccionado(e.target.value)}
            className="w-full h-11 px-3 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: pacienteSeleccionado ? 'var(--foreground)' : 'var(--text-subtle)',
            }}
          >
            <option value="">Seleccionar paciente...</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Descripción de la tarea..."
              value={nuevaTarea}
              onChange={e => setNuevaTarea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTarea()}
              className="flex-1 h-11 px-3 rounded-xl text-sm outline-none min-w-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
            />
            <button
              onClick={addTarea}
              disabled={!nuevaTarea.trim() || !pacienteSeleccionado || adding}
              className="h-11 px-4 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 active:opacity-70 whitespace-nowrap flex-shrink-0"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)' }}
            >
              {adding ? '...' : '+ Agregar'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter + search bar */}
      <div className="flex flex-col gap-2 anim-fade-up">
        {/* Filter tabs — scrollable on mobile */}
        <div className="flex rounded-xl overflow-hidden w-full"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { key: 'pendientes', label: `Pendientes`, count: pendientesCount },
            { key: 'todas',      label: 'Todas',      count: null },
            { key: 'completadas',label: 'Completadas', count: completadasCount },
          ] as { key: FiltroEstado; label: string; count: number | null }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className="flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1"
              style={{
                background: filtro === f.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filtro === f.key ? 'var(--foreground)' : 'var(--text-subtle)',
              }}
            >
              {f.label}
              {f.count !== null && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                  style={{ background: filtro === f.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)' }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-subtle)' }}>
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 rounded-xl text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--foreground)' }}
          />
        </div>
      </div>

      {/* Task list */}
      {tareasFiltradas.length === 0 ? (
        <div className="rounded-2xl p-10 text-center anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {filtro === 'pendientes' ? 'No hay tareas pendientes' : filtro === 'completadas' ? 'No hay tareas completadas' : 'No hay tareas'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="stagger">
            {tareasFiltradas.map((tarea, i) => {
              const paciente = pacienteMap[tarea.paciente_id]
              const color = paciente ? avatarColor(paciente.id) : '#6b7a99'
              const isLast = i === tareasFiltradas.length - 1
              return (
                <div key={tarea.id}
                  className="flex items-center gap-3 px-4 py-3.5 anim-fade-up transition-colors active:bg-white/[0.02]"
                  style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Checkbox — large tap target */}
                  <button
                    onClick={() => toggleTarea(tarea)}
                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-95"
                    style={{
                      background: tarea.completada ? 'rgba(52,211,153,0.15)' : 'transparent',
                      border: tarea.completada ? '1.5px solid var(--success)' : '1.5px solid rgba(255,255,255,0.2)',
                    }}
                    aria-label={tarea.completada ? 'Marcar pendiente' : 'Marcar completada'}
                  >
                    {tarea.completada && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Task text */}
                  <p className="flex-1 text-sm min-w-0" style={{
                    color: tarea.completada ? 'var(--text-subtle)' : 'var(--foreground)',
                    textDecoration: tarea.completada ? 'line-through' : 'none',
                  }}>
                    {tarea.texto}
                  </p>

                  {/* Patient badge */}
                  {paciente && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${color}1A`, color, border: `1px solid ${color}30` }}>
                        {initials(paciente.nombre, paciente.apellido)}
                      </div>
                      <span className="text-xs hidden sm:block truncate max-w-[80px]" style={{ color: 'var(--text-subtle)' }}>
                        {paciente.apellido}
                      </span>
                    </div>
                  )}

                  {/* Delete — always visible on mobile, hover on desktop */}
                  <button
                    onClick={() => deleteTarea(tarea.id)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:opacity-70"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--danger)' }}
                    aria-label="Eliminar tarea"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
