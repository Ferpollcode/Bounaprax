'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Paciente } from '@/types'
import type { Recordatorio } from './page'

const prioridadConfig = {
  alta:   { label: 'Alta',   color: 'var(--danger)',      bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.2)'  },
  normal: { label: 'Normal', color: 'var(--primary)',     bg: 'rgba(62,201,201,0.08)',   border: 'rgba(62,201,201,0.15)'  },
  baja:   { label: 'Baja',   color: 'var(--text-subtle)', bg: 'rgba(107,122,153,0.08)', border: 'rgba(107,122,153,0.15)' },
}

function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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

function formatDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isPast = d < now
  return {
    label: d.toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    isToday,
    isPast,
  }
}

interface Props {
  pacientes: Paciente[]
  initialRecordatorios: Recordatorio[]
}

type Filtro = 'pendientes' | 'todas' | 'completados'

export function RecordatoriosClient({ pacientes, initialRecordatorios }: Props) {
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(initialRecordatorios)
  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha_recordatorio: '',
    paciente_id: '',
    prioridad: 'normal' as 'baja' | 'normal' | 'alta',
  })

  const pacienteMap = Object.fromEntries(pacientes.map(p => [p.id, p]))

  const filtrados = recordatorios.filter(r =>
    filtro === 'todas' || (filtro === 'pendientes' ? !r.completado : r.completado)
  )

  const pendientesCount = recordatorios.filter(r => !r.completado).length

  async function saveRecordatorio() {
    if (!form.titulo.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data } = await supabase.from('recordatorios').insert({
      professional_id: user.id,
      paciente_id: form.paciente_id || null,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      fecha_recordatorio: form.fecha_recordatorio || null,
      prioridad: form.prioridad,
      completado: false,
    }).select().single()
    if (data) {
      setRecordatorios(prev => [data as Recordatorio, ...prev].sort((a, b) => {
        if (!a.fecha_recordatorio) return 1
        if (!b.fecha_recordatorio) return -1
        return new Date(a.fecha_recordatorio).getTime() - new Date(b.fecha_recordatorio).getTime()
      }))
      setForm({ titulo: '', descripcion: '', fecha_recordatorio: '', paciente_id: '', prioridad: 'normal' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function toggleRecordatorio(r: Recordatorio) {
    const supabase = createClient()
    await supabase.from('recordatorios').update({ completado: !r.completado }).eq('id', r.id)
    setRecordatorios(prev => prev.map(x => x.id === r.id ? { ...x, completado: !r.completado } : x))
  }

  async function deleteRecordatorio(id: string) {
    const supabase = createClient()
    await supabase.from('recordatorios').delete().eq('id', id)
    setRecordatorios(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-2 anim-fade-up">
        {/* Filter tabs — full width on mobile */}
        <div className="flex rounded-xl overflow-hidden w-full"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { key: 'pendientes',  label: 'Pendientes', count: pendientesCount },
            { key: 'todas',       label: 'Todas',      count: null },
            { key: 'completados', label: 'Hechos',     count: null },
          ] as { key: Filtro; label: string; count: number | null }[]).map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className="flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1"
              style={{
                background: filtro === f.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filtro === f.key ? 'var(--foreground)' : 'var(--text-subtle)',
              }}>
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
        {/* New button — full width on mobile */}
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full sm:w-auto sm:self-end flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-70"
          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--warning)' }}
        >
          <BellIcon size={15} />
          {showForm ? 'Cancelar' : 'Nuevo recordatorio'}
        </button>
      </div>

      {/* New recordatorio form */}
      {showForm && (
        <div className="rounded-2xl p-4 sm:p-5 anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(251,191,36,0.15)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-subtle)' }}>
            Nuevo recordatorio
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título *"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full h-11 px-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
            />
            {/* Fields stack on mobile, 3 cols on sm+ */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3">
              <input
                type="datetime-local"
                value={form.fecha_recordatorio}
                onChange={e => setForm(f => ({ ...f, fecha_recordatorio: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
              />
              <select
                value={form.paciente_id}
                onChange={e => setForm(f => ({ ...f, paciente_id: e.target.value }))}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: form.paciente_id ? 'var(--foreground)' : 'var(--text-subtle)' }}
              >
                <option value="">Paciente (opcional)</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
              </select>
              <select
                value={form.prioridad}
                onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as 'baja' | 'normal' | 'alta' }))}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
              >
                <option value="baja">Prioridad baja</option>
                <option value="normal">Prioridad normal</option>
                <option value="alta">Prioridad alta</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)}
                className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 active:opacity-60"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-foreground)' }}>
                Cancelar
              </button>
              <button onClick={saveRecordatorio} disabled={!form.titulo.trim() || saving}
                className="flex-1 sm:flex-none h-10 px-5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 active:opacity-70"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: 'var(--warning)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {filtrados.length === 0 ? (
        <div className="rounded-2xl p-12 text-center anim-fade-up"
          style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', color: 'var(--warning)' }}>
            <BellIcon size={20} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            {filtro === 'pendientes' ? 'Sin recordatorios pendientes' : 'Sin recordatorios'}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Creá un recordatorio con el botón de arriba
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(r => {
            const prio = prioridadConfig[r.prioridad] ?? prioridadConfig.normal
            const paciente = r.paciente_id ? pacienteMap[r.paciente_id] : null
            const fecha = formatDate(r.fecha_recordatorio)
            return (
              <div key={r.id}
                className="rounded-2xl p-4 flex gap-3 anim-fade-up"
                style={{ background: 'var(--card)', border: `1px solid ${r.completado ? 'rgba(255,255,255,0.05)' : prio.border}` }}>
                {/* Checkbox — large tap target */}
                <button
                  onClick={() => toggleRecordatorio(r)}
                  className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-95"
                  style={{
                    background: r.completado ? prio.bg : 'transparent',
                    border: `1.5px solid ${r.completado ? prio.color : 'rgba(255,255,255,0.2)'}`,
                  }}
                  aria-label={r.completado ? 'Marcar pendiente' : 'Marcar completado'}
                >
                  {r.completado && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke={prio.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{
                      color: r.completado ? 'var(--text-subtle)' : 'var(--foreground)',
                      textDecoration: r.completado ? 'line-through' : 'none',
                    }}>
                      {r.titulo}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0"
                      style={{ background: prio.bg, color: prio.color }}>
                      {prio.label}
                    </span>
                  </div>
                  {r.descripcion && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{r.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {fecha && (
                      <span className="text-xs flex items-center gap-1"
                        style={{ color: fecha.isPast && !r.completado ? 'var(--danger)' : fecha.isToday ? 'var(--warning)' : 'var(--text-subtle)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {fecha.label}
                        {fecha.isPast && !r.completado && ' · Vencido'}
                        {fecha.isToday && !fecha.isPast && ' · Hoy'}
                      </span>
                    )}
                    {paciente && (
                      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                        {paciente.apellido}, {paciente.nombre}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete — always visible on mobile */}
                <button
                  onClick={() => deleteRecordatorio(r.id)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity active:opacity-70 self-start"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.12)', color: 'var(--danger)' }}
                  aria-label="Eliminar recordatorio"
                >
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
