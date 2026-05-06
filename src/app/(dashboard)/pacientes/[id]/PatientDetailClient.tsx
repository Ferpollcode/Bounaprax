'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { pacienteSlug } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Paciente, Sesion, Pago, Documento } from '@/types'

/* ── extended type ──────────────────────────────────────── */
export type DocWithPath = Documento & { storagePath: string }

/* ── constants ──────────────────────────────────────────── */
const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  activo:   { label: 'Activo',   color: 'var(--success)', bg: 'rgba(52,211,153,0.1)'  },
  inactivo: { label: 'Inactivo', color: 'var(--muted-foreground)', bg: 'rgba(107,122,153,0.1)' },
  alta:     { label: 'Alta',     color: 'var(--warning)', bg: 'rgba(251,191,36,0.1)'  },
  derivado: { label: 'Derivado', color: 'var(--danger)', bg: 'rgba(248,113,113,0.1)' },
}
const sesionEstado: Record<string, { label: string; color: string }> = {
  realizada:    { label: 'Asistió',      color: 'var(--success)' },
  programada:   { label: 'Programada',   color: 'var(--primary)' },
  cancelada:    { label: 'Cancelada',    color: 'var(--danger)' },
  inasistencia: { label: 'Inasistencia', color: 'var(--warning)' },
}
const sesionCategoriaLabel: Record<string, { label: string; color: string }> = {
  sesion:      { label: 'Sesión',      color: '#3EC9C9' },
  evaluacion:  { label: 'Evaluación',  color: '#60A5FA' },
  devolucion:  { label: 'Devolución',  color: '#A78BFA' },
  tratamiento: { label: 'Tratamiento', color: '#F5A623' },
}
const asistenciaLabel: Record<string, { label: string; icon: string; color: string }> = {
  realizada:    { label: 'Asistió',  icon: '✓', color: 'var(--success)' },
  programada:   { label: 'Pendiente',icon: '○', color: 'var(--primary)' },
  cancelada:    { label: 'Canceló',  icon: '✕', color: 'var(--danger)'  },
  inasistencia: { label: 'Faltó',    icon: '!', color: 'var(--warning)'  },
}
const tipoIcono: Record<string, string> = {
  foto: '🖼️', informe: '📄', analisis: '🔬', test: '📋', historia_clinica: '📚', otro: '📎',
}

const TEAL  = '#3EC9C9'
const AMBER = '#F5A623'

const TIPO_OPTS = [
  { value: 'informe',         label: 'Informe'       },
  { value: 'foto',            label: 'Foto'          },
  { value: 'analisis',        label: 'Análisis'      },
  { value: 'test',            label: 'Test'          },
  { value: 'historia_clinica',label: 'Hist. clínica' },
  { value: 'otro',            label: 'Otro'          },
] as const

const tiposPago = [
  { value: 'efectivo',      label: 'Efectivo',      icon: '💵' },
  { value: 'transferencia', label: 'Transferencia', icon: '📲' },
  { value: 'tarjeta',       label: 'Tarjeta',       icon: '💳' },
  { value: 'obra_social',   label: 'Obra social',   icon: '🏥' },
  { value: 'otro',          label: 'Otro',          icon: '•'  },
]
const estadosPago = [
  { value: 'pagado',    label: 'Pagado',    color: 'var(--success)' },
  { value: 'pendiente', label: 'Pendiente', color: 'var(--warning)' },
  { value: 'devuelto',  label: 'Devuelto',  color: 'var(--danger)' },
]

/* ── helpers ────────────────────────────────────────────── */
function calcEdad(f?: string) {
  if (!f) return null
  const hoy = new Date()
  const nac = new Date(f + 'T12:00:00') // evita desfase UTC
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}
function fmtDate(s: string) {
  return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function storagePathFromUrl(url?: string | null) {
  if (!url) return undefined
  const marker = '/storage/v1/object/public/documentos/'
  const index = url.indexOf(marker)
  if (index === -1) return undefined
  return decodeURIComponent(url.slice(index + marker.length))
}
function escapeHtml(value?: string | null) {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ── shared form styles ─────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}
const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'

function focusTeal(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

/* ── TodoSection ────────────────────────────────────────── */
interface Tarea {
  id: string
  texto: string
  completada: boolean
  created_at: string
}

function TodoSection({ pacienteId }: { pacienteId: string }) {
  const [tareas, setTareas]     = useState<Tarea[]>([])
  const [texto, setTexto]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState('')

  const fetchTareas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('paciente_tareas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true })
    setTareas((data ?? []) as Tarea[])
    setLoading(false)
  }, [pacienteId])

  useState(() => { fetchTareas() })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }
    await supabase.from('paciente_tareas').insert({
      paciente_id: pacienteId, professional_id: user.id,
      texto: texto.trim(), completada: false,
    })
    setTexto('')
    setAdding(false)
    fetchTareas()
  }

  async function toggleCompletada(tarea: Tarea) {
    const supabase = createClient()
    await supabase.from('paciente_tareas').update({ completada: !tarea.completada }).eq('id', tarea.id)
    setTareas(ts => ts.map(t => t.id === tarea.id ? { ...t, completada: !t.completada } : t))
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('paciente_tareas').delete().eq('id', id)
    setTareas(ts => ts.filter(t => t.id !== id))
  }

  function startEdit(t: Tarea) {
    setEditingId(t.id)
    setEditTexto(t.texto)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTexto('')
  }

  async function handleEditSave(id: string) {
    if (!editTexto.trim()) return
    const supabase = createClient()
    await supabase.from('paciente_tareas').update({ texto: editTexto.trim() }).eq('id', id)
    setTareas(ts => ts.map(t => t.id === id ? { ...t, texto: editTexto.trim() } : t))
    cancelEdit()
  }

  const pendientes  = tareas.filter(t => !t.completada)
  const completadas = tareas.filter(t => t.completada)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>
            Tareas
          </h3>
          {pendientes.length > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(62,201,201,0.12)', color: TEAL }}>
              {pendientes.length}
            </span>
          )}
        </div>
      </div>

      {/* Input nueva tarea */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Nueva tarea…"
          className={inputCls + ' flex-1'}
          style={inputStyle}
          onFocus={focusTeal} onBlur={blurReset}
        />
        <button type="submit" disabled={adding || !texto.trim()}
          className="h-10 px-4 rounded-xl text-sm font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
          style={{
            background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.25)',
            color: TEAL, opacity: (!texto.trim() || adding) ? 0.5 : 1,
          }}>
          + Agregar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-4">
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
          </svg>
        </div>
      ) : tareas.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-subtle)' }}>
          Sin tareas pendientes
        </p>
      ) : (
        <div className="space-y-1.5">
          {pendientes.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
              <button type="button" onClick={() => toggleCompletada(t)}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: TEAL, background: 'transparent' }} />
              {editingId === t.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editTexto}
                    onChange={e => setEditTexto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEditSave(t.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    className={inputCls + ' flex-1 h-8 text-sm'}
                    style={{ ...inputStyle, height: 32, fontSize: 13 }}
                  />
                  <button type="button" onClick={() => handleEditSave(t.id)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                    style={{ background: 'rgba(62,201,201,0.15)', color: TEAL, border: '1px solid rgba(62,201,201,0.3)' }}>
                    Guardar
                  </button>
                  <button type="button" onClick={cancelEdit}
                    className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                    style={{ background: 'var(--overlay-sm)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm" style={{ color: 'var(--foreground-muted)' }}>{t.texto}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => startEdit(t)}
                      className="p-1 rounded-lg transition-colors hover:bg-white/10"
                      style={{ color: 'var(--muted-foreground)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button type="button" onClick={() => handleDelete(t.id)}
                      className="p-1 rounded-lg transition-colors hover:bg-white/10"
                      style={{ color: 'var(--danger)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {completadas.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase pt-2 pb-1 px-1"
                style={{ color: 'var(--text-subtle)' }}>Completadas</p>
              {completadas.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)', opacity: 0.55 }}>
                  <button type="button" onClick={() => toggleCompletada(t)}
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: TEAL, border: `2px solid ${TEAL}` }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {editingId === t.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTexto}
                        onChange={e => setEditTexto(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(t.id); if (e.key === 'Escape') cancelEdit() }}
                        autoFocus
                        className={inputCls + ' flex-1 h-8 text-sm'}
                        style={{ ...inputStyle, height: 32, fontSize: 13 }}
                      />
                      <button type="button" onClick={() => handleEditSave(t.id)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                        style={{ background: 'rgba(62,201,201,0.15)', color: TEAL, border: '1px solid rgba(62,201,201,0.3)' }}>
                        Guardar
                      </button>
                      <button type="button" onClick={cancelEdit}
                        className="text-xs font-semibold px-2 py-1 rounded-lg transition-opacity hover:opacity-80 flex-shrink-0"
                        style={{ background: 'var(--overlay-sm)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm line-through" style={{ color: 'var(--text-dim)' }}>{t.texto}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={() => startEdit(t)}
                          className="p-1 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: 'var(--muted-foreground)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(t.id)}
                          className="p-1 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: 'var(--danger)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── small shared components ────────────────────────────── */
function InfoItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-subtle)' }}>{label}</p>
      <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{value}</p>
    </div>
  )
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
  )
}

function FormCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: TEAL }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground-muted)' }}>{title}</span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  )
}

function ToggleGroup({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; color?: string }[]
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => {
        const active = value === opt.value
        const color  = opt.color ?? TEAL
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? color + '45' : 'rgba(255,255,255,0.07)'}`,
              color: active ? color : 'var(--text-dim)',
            }}>{opt.label}</button>
        )
      })}
    </div>
  )
}

function FTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
      style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
  )
}

/* ── Modal ──────────────────────────────────────────────── */
function Modal({ open, onClose, title, subtitle, wide, children }: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  wide?: boolean
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="modal-backdrop absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />
      <div
        className={`modal-content relative z-10 w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[90dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl`}
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Drag pill indicator (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="flex items-start justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
          <div>
            <h2 className="text-base font-bold sm:text-lg" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 transition-opacity hover:opacity-70"
            style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

function RoadmapSection({ paciente, initialDocs }: { paciente: Paciente; initialDocs: DocWithPath[] }) {
  const router = useRouter()
  const [content, setContent] = useState(paciente.hoja_ruta ?? '')
  const [draft, setDraft] = useState(paciente.hoja_ruta ?? '')
  const [attachments, setAttachments] = useState<DocWithPath[]>(
    initialDocs.filter(doc => doc.descripcion === 'hoja_ruta')
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const roadmapFileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('pacientes')
      .update({ hoja_ruta: draft.trim() ? draft : null })
      .eq('id', paciente.id)

    if (err) {
      setError('Error al guardar la hoja de ruta.')
      setSaving(false)
      return
    }

    setContent(draft)
    setSaving(false)
    setOpen(false)
  }

  async function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const valid = Array.from(files).filter(file => allowed.includes(file.type) && file.size <= 20 * 1024 * 1024)
    if (valid.length === 0) {
      setError('No se pudo cargar. Usa imagenes, PDF o DOC de hasta 20 MB.')
      setUploading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('No se pudo identificar el usuario.')
      setUploading(false)
      return
    }

    const uploaded: DocWithPath[] = []
    for (const file of valid) {
      const ext = file.name.split('.').pop()
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const path = `${user.id}/${paciente.id}/hoja-ruta-${fileId}.${ext}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file)
      if (upErr) continue

      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path)
      const { data: docData, error: docErr } = await supabase.from('documentos').insert({
        paciente_id: paciente.id,
        professional_id: user.id,
        nombre: file.name.replace(/\.[^.]+$/, ''),
        tipo: file.type.startsWith('image/') ? 'foto' : 'historia_clinica',
        descripcion: 'hoja_ruta',
        archivo_url: publicUrl,
        archivo_nombre: file.name,
        archivo_tipo: file.type,
        archivo_tamanio: file.size,
      }).select().single()

      if (!docErr && docData) uploaded.push({ ...(docData as Documento), storagePath: path })
    }

    if (uploaded.length === 0) setError('No se pudo subir el archivo. Intenta de nuevo.')
    setAttachments(prev => [...uploaded, ...prev])
    if (roadmapFileInputRef.current) roadmapFileInputRef.current.value = ''
    setUploading(false)
    router.refresh()
  }

  async function handleDownloadAttachment(doc: DocWithPath) {
    const supabase = createClient()
    if (doc.storagePath) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storagePath, 120)
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
        return
      }
    }
    window.open(doc.archivo_url, '_blank')
  }

  async function handleDeleteAttachment(doc: DocWithPath) {
    if (!window.confirm(`Eliminar "${doc.nombre}" de la hoja de ruta?`)) return
    setDeletingDocId(doc.id)
    const supabase = createClient()
    if (doc.storagePath) await supabase.storage.from('documentos').remove([doc.storagePath])
    await supabase.from('documentos').delete().eq('id', doc.id)
    setAttachments(prev => prev.filter(item => item.id !== doc.id))
    setDeletingDocId(null)
    router.refresh()
  }

  return (
    <>
      <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>
              Hoja de ruta
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              Seguimiento editable del paciente, sesión tras sesión.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setDraft(content); setOpen(true); setError('') }}
            className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)', color: TEAL }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Editar
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setDraft(content); setOpen(true); setError('') }}
          className="w-full rounded-xl p-4 text-left transition-colors hover:bg-white/[0.03]"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {content.trim() ? (
            <p className="text-sm leading-relaxed line-clamp-6 whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
              {content}
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
              Sin hoja de ruta todavía. Abrila para empezar a escribir.
            </p>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--background)' }}>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>Hoja de ruta</p>
              <h2 className="text-lg font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                {paciente.apellido}, {paciente.nombre}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-4 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mx-4 sm:mx-6 mt-4 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 min-h-0">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={`# Hoja de ruta\n\n## ${new Date().toLocaleDateString('es-AR')}\n- Observaciones de la sesión\n- Próximos puntos a revisar`}
              className="w-full h-full resize-none rounded-2xl p-4 sm:p-5 text-sm sm:text-base leading-relaxed outline-none"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <aside className="rounded-2xl p-4 overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>Archivos</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Adjuntos de esta hoja de ruta.</p>
                </div>
                <button
                  type="button"
                  onClick={() => roadmapFileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 px-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)', color: TEAL }}
                >
                  {uploading ? 'Subiendo...' : 'Cargar'}
                </button>
                <input
                  ref={roadmapFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={e => handleUploadFiles(e.target.files)}
                />
              </div>

              {attachments.length === 0 ? (
                <button
                  type="button"
                  onClick={() => roadmapFileInputRef.current?.click()}
                  className="w-full rounded-xl p-4 text-center transition-opacity hover:opacity-80"
                  style={{ border: '1px dashed rgba(62,201,201,0.35)', background: 'rgba(62,201,201,0.03)' }}
                >
                  <p className="text-sm font-medium" style={{ color: TEAL }}>Cargar archivos</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Imagenes, PDF o DOC.</p>
                </button>
              ) : (
                <div className="space-y-2">
                  {attachments.map(doc => (
                    <div key={doc.id} className="rounded-xl p-3 flex items-start gap-2.5"
                      style={{ background: 'var(--overlay-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-base flex-shrink-0">{tipoIcono[doc.tipo] ?? '📎'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground-muted)' }}>{doc.nombre}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                          {fmtDate(doc.created_at)}{doc.archivo_tamanio ? ` · ${formatBytes(doc.archivo_tamanio)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(doc)}
                          title="Abrir"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                          style={{ background: 'rgba(62,201,201,0.12)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="7,10 12,15 17,10" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(doc)}
                          disabled={deletingDocId === doc.id}
                          title="Eliminar"
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 disabled:opacity-40"
                          style={{ background: 'rgba(248,113,113,0.12)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <polyline points="3,6 5,6 21,6" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </>
  )
}

/* ── SesionForm ─────────────────────────────────────────── */
function SesionForm({ pacienteId, consultorios, defaultConsultorioId, onSuccess, onCancel }: {
  pacienteId: string
  consultorios: { id: string; nombre: string; color: string }[]
  defaultConsultorioId?: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const [form, setForm] = useState({
    fecha: hoy, hora_inicio: '', hora_fin: '',
    tipo: 'presencial', estado: 'realizada',
    observaciones: '', monto: '', pagado: false,
    consultorio_id: defaultConsultorioId ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }
  function setBool(field: string) { return (v: boolean) => setForm(f => ({ ...f, [field]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('sesiones').insert({
      paciente_id:     pacienteId,
      professional_id: user.id,
      consultorio_id:  form.consultorio_id || null,
      fecha:           form.fecha,
      hora_inicio:     form.hora_inicio  || null,
      hora_fin:        form.hora_fin     || null,
      tipo:            form.tipo,
      estado:          form.estado,
      observaciones:   form.observaciones || null,
      monto:           form.monto ? parseFloat(form.monto) : null,
      pagado:          form.pagado,
    })

    if (err) { setError('Error al guardar la sesión.'); setSaving(false) }
    else onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard title="Fecha y modalidad" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label text="Fecha" required />
            <input type="date" value={form.fecha} onChange={e => setStr('fecha')(e.target.value)} required
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div>
            <Label text="Hora inicio" />
            <input type="time" value={form.hora_inicio} onChange={e => setStr('hora_inicio')(e.target.value)}
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div>
            <Label text="Hora fin" />
            <input type="time" value={form.hora_fin} onChange={e => setStr('hora_fin')(e.target.value)}
              className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
          </div>
        </div>
        <div>
          <Label text="Modalidad" />
          <ToggleGroup value={form.tipo} onChange={setStr('tipo')} options={[
            { value: 'presencial', label: 'Presencial', color: TEAL },
            { value: 'virtual',    label: 'Virtual',    color: 'var(--virtual)' },
          ]} />
        </div>
        <div>
          <Label text="Estado" />
          <ToggleGroup value={form.estado} onChange={setStr('estado')} options={[
            { value: 'realizada',    label: 'Asistió',      color: 'var(--success)' },
            { value: 'programada',   label: 'Programada',   color: TEAL },
            { value: 'cancelada',    label: 'Cancelada',    color: 'var(--danger)' },
            { value: 'inasistencia', label: 'Inasistencia', color: 'var(--warning)' },
          ]} />
        </div>
      </FormCard>

      {consultorios.length > 0 && (
        <FormCard title="Consultorio" icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }>
          <div className="flex flex-wrap gap-2">
            {consultorios.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, consultorio_id: f.consultorio_id === c.id ? '' : c.id }))}
                className="flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: form.consultorio_id === c.id ? `${c.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.consultorio_id === c.id ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                  color: form.consultorio_id === c.id ? c.color : 'var(--text-dim)',
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                {c.nombre}
              </button>
            ))}
          </div>
        </FormCard>
      )}

      <FormCard title="Notas clínicas" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div>
          <Label text="Observaciones de la sesión" />
          <FTextarea value={form.observaciones} onChange={setStr('observaciones')}
            placeholder="¿Qué sucedió en la sesión? Resumen del encuentro…" rows={4} />
        </div>
      </FormCard>

      <FormCard title="Honorarios" icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label text="Monto ($)" />
            <input type="number" min="0" step="0.01" value={form.monto}
              onChange={e => setStr('monto')(e.target.value)}
              placeholder="0.00" className={inputCls} style={inputStyle}
              onFocus={focusTeal} onBlur={blurReset} />
          </div>
          <div className="flex flex-col justify-end">
            <button type="button" onClick={() => setBool('pagado')(!form.pagado)}
              className="h-10 rounded-xl text-sm font-medium flex items-center gap-2.5 px-4 transition-all"
              style={{
                background: form.pagado ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.pagado ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: form.pagado ? 'var(--success)' : 'var(--text-dim)',
              }}>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                style={{ borderColor: form.pagado ? 'var(--success)' : 'var(--text-subtle)', background: form.pagado ? 'var(--success)' : 'transparent' }}>
                {form.pagado && <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>}
              </div>
              {form.pagado ? 'Sesión pagada' : 'Marcar como pagada'}
            </button>
          </div>
        </div>
      </FormCard>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 sm:flex-none h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving
            ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>
            : 'Guardar sesión'}
        </button>
      </div>
    </form>
  )
}

/* ── PagoForm ───────────────────────────────────────────── */
function PagoForm({ pacienteId, sesiones, onSuccess, onCancel }: {
  pacienteId: string
  sesiones: Sesion[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const [form, setForm] = useState({
    fecha: hoy, monto: '', tipo: 'efectivo', concepto: '', estado: 'pagado', sesion_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setStr(field: string) { return (v: string) => setForm(f => ({ ...f, [field]: v })) }
  function sessionLabel(s: Sesion) {
    const date = fmtDate(s.fecha)
    const hour = s.hora_inicio ? ` · ${s.hora_inicio.slice(0, 5)}` : ''
    const amount = s.monto != null ? ` · ${fmtMoney(s.monto)}` : ''
    return `${date}${hour}${amount}`
  }
  function handleSesionChange(id: string) {
    const selected = sesiones.find(s => s.id === id)
    setForm(f => ({
      ...f,
      sesion_id: id,
      fecha: selected?.fecha ?? f.fecha,
      monto: selected?.monto != null ? String(selected.monto) : f.monto,
      concepto: selected ? `Sesión ${fmtDate(selected.fecha)}` : f.concepto,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.monto || parseFloat(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.'); return
    }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error: err } = await supabase.from('pagos').insert({
      paciente_id:     pacienteId,
      sesion_id:       form.sesion_id || null,
      professional_id: user.id,
      fecha:           form.fecha,
      monto:           parseFloat(form.monto),
      tipo:            form.tipo,
      concepto:        form.concepto || null,
      estado:          form.estado,
    })

    if (err) { setError('Error al registrar el pago.'); setSaving(false) }
    else {
      if (form.sesion_id) {
        await supabase
          .from('sesiones')
          .update({ pagado: form.estado === 'pagado' })
          .eq('id', form.sesion_id)
      }
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center py-2">
        <Label text="Monto" required />
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-semibold" style={{ color: 'var(--text-dim)' }}>$</span>
          <input
            type="number" min="0" step="0.01" value={form.monto}
            onChange={e => setStr('monto')(e.target.value)}
            placeholder="0.00" required autoFocus
            className="text-4xl font-bold text-center bg-transparent outline-none w-48"
            style={{ color: AMBER }}
          />
        </div>
      </div>

      <div className="h-px" style={{ background: 'var(--overlay-sm)' }} />

      <div>
        <Label text="Fecha" />
        <input type="date" value={form.fecha} onChange={e => setStr('fecha')(e.target.value)}
          className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
      </div>

      <div>
        <Label text="Sesión asociada" />
        <select value={form.sesion_id} onChange={e => handleSesionChange(e.target.value)}
          className={inputCls} style={inputStyle}>
          <option value="">Sin asociar a una sesión</option>
          {sesiones.map(s => (
            <option key={s.id} value={s.id}>{sessionLabel(s)}</option>
          ))}
        </select>
      </div>

      <div>
        <Label text="Forma de pago" />
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {tiposPago.map(t => (
            <button key={t.value} type="button" onClick={() => setStr('tipo')(t.value)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all"
              style={{
                background: form.tipo === t.value ? 'rgba(245,166,35,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.tipo === t.value ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: form.tipo === t.value ? AMBER : 'var(--text-dim)',
              }}>
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label text="Estado" />
        <div className="flex gap-2 flex-wrap">
          {estadosPago.map(s => (
            <button key={s.value} type="button" onClick={() => setStr('estado')(s.value)}
              className="h-9 px-4 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: form.estado === s.value ? `${s.color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.estado === s.value ? s.color + '45' : 'rgba(255,255,255,0.07)'}`,
                color: form.estado === s.value ? s.color : 'var(--text-dim)',
              }}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label text="Concepto / nota" />
        <FTextarea value={form.concepto} onChange={setStr('concepto')}
          placeholder="Ej: Sesión individual, evaluación inicial…" rows={2} />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm font-medium flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 sm:flex-none h-11 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: saving ? 'rgba(245,166,35,0.35)' : 'linear-gradient(135deg,#F5A623,#D4891A)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving
            ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>
            : 'Registrar pago'}
        </button>
      </div>
    </form>
  )
}

/* ── DocumentsSection ───────────────────────────────────── */
type FileItemNew = {
  id: string
  file: File
  tipo: Documento['tipo']
  nombre: string
}

function DocumentsSection({ pacienteId, initialDocs }: {
  pacienteId: string
  initialDocs: DocWithPath[]
}) {
  const [docs, setDocs] = useState<DocWithPath[]>(initialDocs)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newFiles, setNewFiles] = useState<FileItemNew[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingDoc, setEditingDoc] = useState<{ id: string; nombre: string; tipo: Documento['tipo'] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownload(doc: DocWithPath) {
    const supabase = createClient()
    if (doc.storagePath) {
      const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storagePath, 120)
      if (data?.signedUrl) { window.open(data.signedUrl, '_blank'); return }
    }
    window.open(doc.archivo_url, '_blank')
  }

  async function handleDelete(doc: DocWithPath) {
    if (!window.confirm(`¿Eliminar "${doc.nombre}"?`)) return
    setDeletingId(doc.id)
    const supabase = createClient()
    if (doc.storagePath) {
      await supabase.storage.from('documentos').remove([doc.storagePath])
    }
    await supabase.from('documentos').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setDeletingId(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(incoming: File[]) {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const valid = incoming.filter(f => ALLOWED.includes(f.type) && f.size <= 20 * 1024 * 1024)
    setNewFiles(prev => [
      ...prev,
      ...valid.map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        tipo: (f.type.startsWith('image/') ? 'foto' : 'otro') as Documento['tipo'],
        nombre: f.name.replace(/\.[^.]+$/, ''),
      }))
    ])
  }

  async function handleUpload() {
    if (newFiles.length === 0) return
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const uploaded: DocWithPath[] = []
    for (const item of newFiles) {
      const ext  = item.file.name.split('.').pop()
      const path = `${user.id}/${pacienteId}/${item.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, item.file)
      if (upErr) continue
      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path)
      const { data: docData } = await supabase.from('documentos').insert({
        paciente_id:     pacienteId,
        professional_id: user.id,
        nombre:          item.nombre || item.file.name,
        tipo:            item.tipo,
        archivo_url:     publicUrl,
        archivo_nombre:  item.file.name,
        archivo_tipo:    item.file.type,
        archivo_tamanio: item.file.size,
      }).select().single()
      if (docData) uploaded.push({ ...(docData as Documento), storagePath: path })
    }

    const { data: refreshedDocs } = await supabase
      .from('documentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })

    if (refreshedDocs) {
      setDocs((refreshedDocs as Documento[]).map(doc => ({
        ...doc,
        storagePath: storagePathFromUrl(doc.archivo_url) ?? '',
      })))
    } else {
      setDocs(prev => [...uploaded.reverse(), ...prev])
    }
    setNewFiles([])
    setUploadOpen(false)
    setUploading(false)
  }

  async function handleEditSave() {
    if (!editingDoc) return
    const supabase = createClient()
    await supabase.from('documentos').update({ nombre: editingDoc.nombre, tipo: editingDoc.tipo }).eq('id', editingDoc.id)
    setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, nombre: editingDoc.nombre, tipo: editingDoc.tipo } : d))
    setEditingDoc(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
          Documentos
          <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}>{docs.length}</span>
        </p>
        <button
          onClick={() => { setUploadOpen(o => !o); setNewFiles([]) }}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Upload area */}
      {uploadOpen && (
        <div className="mb-4">
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl p-5 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? TEAL : 'rgba(62,201,201,0.3)'}`,
              background: dragging ? 'rgba(62,201,201,0.04)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file" multiple className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="17,8 12,3 7,8" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <p className="text-sm font-medium" style={{ color: TEAL }}>Arrastrá archivos o hacé clic</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Imágenes, PDF, DOC · Máx 20 MB c/u</p>
          </div>

          {newFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {newFiles.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
                  <span className="text-base flex-shrink-0">{item.tipo === 'foto' ? '🖼️' : '📎'}</span>
                  <input
                    className="flex-1 bg-transparent text-xs outline-none min-w-0"
                    style={{ color: 'var(--foreground-muted)' }}
                    value={item.nombre}
                    onChange={e => setNewFiles(prev => prev.map(f => f.id === item.id ? { ...f, nombre: e.target.value } : f))}
                  />
                  <select
                    value={item.tipo}
                    onChange={e => setNewFiles(prev => prev.map(f => f.id === item.id ? { ...f, tipo: e.target.value as Documento['tipo'] } : f))}
                    className="text-xs rounded-lg px-2 py-1 outline-none flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
                  >
                    {TIPO_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewFiles(prev => prev.filter(f => f.id !== item.id))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setUploadOpen(false); setNewFiles([]) }}
                  className="h-8 px-4 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleUpload} disabled={uploading}
                  className="h-8 px-4 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ background: uploading ? 'rgba(62,201,201,0.3)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)' }}>
                  {uploading ? 'Subiendo…' : `Subir ${newFiles.length} archivo${newFiles.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {newFiles.length === 0 && (
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => setUploadOpen(false)}
                className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-dim)' }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents list */}
      {docs.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Sin documentos adjuntos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2.5 rounded-xl p-3 group"
              style={{ background: 'var(--overlay-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-lg flex-shrink-0">{tipoIcono[doc.tipo] ?? '📎'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--foreground-muted)' }}>{doc.nombre}</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {fmtDate(doc.created_at)}{doc.archivo_tamanio ? ` · ${formatBytes(doc.archivo_tamanio)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  title="Descargar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                  style={{ background: 'rgba(62,201,201,0.12)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="7,10 12,15 17,10" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDoc({ id: doc.id, nombre: doc.nombre, tipo: doc.tipo })}
                  title="Editar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  title="Eliminar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 disabled:opacity-40"
                  style={{ background: 'rgba(248,113,113,0.12)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <polyline points="3,6 5,6 21,6" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-1 14H6L5 6" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit document modal */}
      <Modal open={!!editingDoc} onClose={() => setEditingDoc(null)} title="Editar documento">
        {editingDoc && (
          <div className="space-y-4">
            <div>
              <Label text="Nombre" />
              <input
                type="text"
                value={editingDoc.nombre}
                onChange={e => setEditingDoc(d => d ? { ...d, nombre: e.target.value } : d)}
                className={inputCls} style={inputStyle}
                onFocus={focusTeal} onBlur={blurReset}
              />
            </div>
            <div>
              <Label text="Tipo de documento" />
              <div className="flex flex-wrap gap-2">
                {TIPO_OPTS.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setEditingDoc(d => d ? { ...d, tipo: t.value as Documento['tipo'] } : d)}
                    className="h-8 px-3 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: editingDoc.tipo === t.value ? 'rgba(62,201,201,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${editingDoc.tipo === t.value ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: editingDoc.tipo === t.value ? TEAL : 'var(--text-dim)',
                    }}>
                    {tipoIcono[t.value] ?? '📎'} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditingDoc(null)}
                className="h-9 px-4 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleEditSave}
                className="h-9 px-5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)' }}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────── */
type ConsultorioOpt = { id: string; nombre: string; color: string }

function ProGate({ isPro, children }: { isPro: boolean; children: React.ReactNode }) {
  if (isPro) return <>{children}</>
  return (
    <div className="relative" title="Requiere plan PRO">
      <div style={{ opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>{children}</div>
      <span
        className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 rounded-full"
        style={{ background: '#F5A623', color: '#0a0600', lineHeight: '16px' }}
      >PRO</span>
    </div>
  )
}

export function PatientDetailClient({
  paciente,
  sesiones,
  pagos,
  docs,
  consultorios = [],
  isPro = false,
}: {
  paciente: Paciente
  sesiones: Sesion[]
  pagos: Pago[]
  docs: DocWithPath[]
  consultorios?: ConsultorioOpt[]
  isPro?: boolean
}) {
  const router = useRouter()
  const [sesionOpen,     setSesionOpen]     = useState(false)
  const [pagoOpen,       setPagoOpen]       = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [proName,        setProName]        = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setProName((user?.user_metadata?.nombre as string | undefined) ?? '')
    })
  }, [])

  const p   = paciente
  const est = estadoConfig[p.estado] ?? estadoConfig.activo
  const edad = calcEdad(p.fecha_nacimiento)
  const consultorioActivo = consultorios.find(c => c.id === p.consultorio_id)

  const sesionesConPagoIds = new Set(pagos.map(pay => pay.sesion_id).filter(Boolean))
  const totalSesionesPagadas = sesiones
    .filter(s => s.pagado && s.monto != null && !sesionesConPagoIds.has(s.id))
    .reduce((a, s) => a + (s.monto ?? 0), 0)
  const totalSesionesPendientes = sesiones
    .filter(s => !s.pagado && s.monto != null && !sesionesConPagoIds.has(s.id))
    .reduce((a, s) => a + (s.monto ?? 0), 0)
  const totalPagado    = pagos.filter(pay => pay.estado === 'pagado').reduce((a, b) => a + (b.monto ?? 0), 0) + totalSesionesPagadas
  const totalPendiente = pagos.filter(pay => pay.estado === 'pendiente').reduce((a, b) => a + (b.monto ?? 0), 0) + totalSesionesPendientes
  const attendanceSummary = [
    { key: 'realizada',    label: 'Asistió',   color: 'var(--success)' },
    { key: 'programada',   label: 'Pendiente', color: 'var(--primary)' },
    { key: 'cancelada',    label: 'Canceló',   color: 'var(--danger)' },
    { key: 'inasistencia', label: 'Faltó',     color: 'var(--warning)' },
  ].map(item => ({ ...item, count: sesiones.filter(s => s.estado === item.key).length }))
    .filter(item => item.count > 0)

  function handleWhatsApp() {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    const proxima = sesiones
      .filter(s => s.estado === 'programada' && s.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]

    const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

    let mensaje: string
    if (proxima) {
      const d = new Date(proxima.fecha + 'T12:00:00')
      const fechaStr = `el ${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
      const horaStr = proxima.hora_inicio ? ` a las ${proxima.hora_inicio}` : ''
      mensaje = `Hola ${p.nombre}! 👋 Te recordamos que tenés sesión ${fechaStr}${horaStr}. Por favor confirmá tu asistencia. ¡Hasta pronto!`
    } else {
      mensaje = `Hola ${p.nombre}! 👋 Te escribimos desde el consultorio. Por favor contactanos para coordinar tu próxima sesión.`
    }

    const telefono = p.telefono?.replace(/\D/g, '') ?? ''
    const url = telefono
      ? `https://wa.me/549${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  function handleViewSesion(sesion: Sesion) {
    router.push(`/agenda?dia=${sesion.fecha}&sesion=${sesion.id}`)
  }

  async function handleDeleteSesion(sesion: Sesion) {
    const fecha = fmtDate(sesion.fecha)
    if (!window.confirm(`¿Eliminar la sesión del ${fecha}?`)) return
    setDeletingSessionId(sesion.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('sesiones')
      .delete()
      .eq('id', sesion.id)

    setDeletingSessionId(null)
    if (!error) router.refresh()
  }

  function handleReciboPDF(pay: Pago) {
    const fechaEmision = new Date(pay.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const tipoPagoLabel: Record<string, string> = {
      efectivo: 'Efectivo', transferencia: 'Transferencia bancaria',
      tarjeta: 'Tarjeta', obra_social: 'Obra social', otro: 'Otro',
    }
    const estadoPago: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
      pagado:    { label: 'PAGADO',    bg: '#D1FAE5', fg: '#065F46', dot: '#059669' },
      pendiente: { label: 'PENDIENTE', bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' },
      devuelto:  { label: 'DEVUELTO',  bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
    }
    const ep = estadoPago[pay.estado] ?? estadoPago.pagado
    const nroRecibo = pay.id.replace(/-/g, '').slice(-8).toUpperCase()
    const fileBase = `recibo-${nroRecibo}`
    const pacienteNombre = `${p.apellido}, ${p.nombre}`
    const obraSocial = p.obra_social ? `${p.obra_social}${p.numero_afiliado ? ' · ' + p.numero_afiliado : ''}` : ''
    const reciboMensaje = `Hola ${p.nombre}, te enviamos el recibo de ${fmtMoney(pay.monto)}.`
    const telefonoRecibo = p.telefono?.replace(/\D/g, '') ?? ''
    const whatsappUrl = telefonoRecibo
      ? `https://wa.me/549${telefonoRecibo}?text=${encodeURIComponent(reciboMensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(reciboMensaje)}`
    const receiptData = {
      status: ep,
      amount: fmtMoney(pay.monto),
      concept: pay.concepto || 'Consulta',
      generated: fechaHoy,
      rows: [
        ['Paciente', pacienteNombre],
        ...(p.dni ? [['DNI', p.dni]] : []),
        ...(obraSocial ? [['Obra social', obraSocial]] : []),
        ['Fecha', fechaEmision],
        ['Medio de pago', tipoPagoLabel[pay.tipo] ?? pay.tipo],
        ...(proName ? [['Profesional', proName]] : []),
      ],
    }
    const receiptDataJson = JSON.stringify(receiptData).replace(/</g, '\\u003c')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibo N° ${nroRecibo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#F3F4F6;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px}
.card{background:#fff;max-width:460px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10)}
.top{background:#0A0E1A;padding:22px 28px;display:flex;justify-content:space-between;align-items:center}
.logo{color:#3EC9C9;font-size:19px;font-weight:800;letter-spacing:-0.4px}
.nro{color:#6B7A99;font-size:11px;text-align:right}
.nro b{color:#9CA3AF;display:block;font-size:13px;font-weight:700}
.status{background:${ep.bg};padding:11px 28px;display:flex;align-items:center;gap:9px}
.dot{width:9px;height:9px;border-radius:50%;background:${ep.dot};flex-shrink:0}
.status-txt{font-size:12px;font-weight:800;color:${ep.fg};letter-spacing:.12em}
.body{padding:28px}
.importe{text-align:center;padding:22px 0 26px;border-bottom:2px dashed #E5E7EB;margin-bottom:26px}
.importe-lbl{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9CA3AF;margin-bottom:10px}
.importe-val{font-size:44px;font-weight:900;color:#111827;letter-spacing:-2px}
.concepto{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:14px 18px;margin-bottom:22px}
.concepto-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;margin-bottom:5px}
.concepto-val{font-size:15px;color:#111827;font-weight:600}
.row{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid #F3F4F6}
.row:last-child{border-bottom:none}
.rl{font-size:12px;color:#6B7280;font-weight:500}
.rv{font-size:13px;color:#1F2937;font-weight:600;text-align:right;max-width:58%}
.footer{background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 28px;display:flex;justify-content:space-between;align-items:center}
.footer-txt{font-size:11px;color:#9CA3AF;line-height:1.5}
.print-btn{background:linear-gradient(135deg,#3EC9C9,#2BA8A8);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;box-shadow:0 3px 10px rgba(62,201,201,.4)}
@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0;max-width:100%}.print-btn,.footer{display:none!important}}
</style>
</head>
<body>
<div class="card">
  <div class="top">
    <span class="logo">Bounaprax</span>
    <div class="nro">Recibo<b>N° ${nroRecibo}</b></div>
  </div>
  <div class="status">
    <div class="dot"></div>
    <span class="status-txt">${ep.label}</span>
  </div>
  <div class="body">
    <div class="importe">
      <div class="importe-lbl">Importe</div>
      <div class="importe-val">${fmtMoney(pay.monto)}</div>
    </div>
    <div class="concepto">
      <div class="concepto-lbl">Concepto</div>
      <div class="concepto-val">${pay.concepto || 'Consulta'}</div>
    </div>
    <div class="row"><span class="rl">Paciente</span><span class="rv">${p.apellido}, ${p.nombre}</span></div>
    ${p.dni ? `<div class="row"><span class="rl">DNI</span><span class="rv">${p.dni}</span></div>` : ''}
    ${p.obra_social ? `<div class="row"><span class="rl">Obra social</span><span class="rv">${p.obra_social}${p.numero_afiliado ? ' · ' + p.numero_afiliado : ''}</span></div>` : ''}
    <div class="row"><span class="rl">Fecha</span><span class="rv">${fechaEmision}</span></div>
    <div class="row"><span class="rl">Medio de pago</span><span class="rv">${tipoPagoLabel[pay.tipo] ?? pay.tipo}</span></div>
    ${proName ? `<div class="row"><span class="rl">Profesional</span><span class="rv">${proName}</span></div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-txt">Generado el ${fechaHoy}<br>Bounaprax · Gestión de pacientes</div>
    <button class="print-btn" onclick="window.print()">Imprimir / PDF</button>
  </div>
</div>
</body></html>`
    const receiptHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibo ${escapeHtml(nroRecibo)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 portrait;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#001633;background:#eef2f7;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:18px}
.receipt{background:#fff;width:9cm;height:14cm;overflow:hidden;box-shadow:0 10px 36px rgba(15,23,42,.14);display:flex;flex-direction:column}
.print-copy{display:none}
.status{background:${ep.bg};height:.78cm;padding:0 .78cm;display:flex;align-items:center;gap:.18cm}
.dot{width:.13cm;height:.13cm;border-radius:50%;background:${ep.dot};flex-shrink:0}
.status-txt{font-size:10px;font-weight:900;color:${ep.fg};letter-spacing:.14em}
.body{padding:.72cm .58cm .28cm;flex:1}
.importe{text-align:center;padding:.12cm 0 .58cm;border-bottom:1.5px dashed #DDE3EA;margin-bottom:.54cm}
.importe-lbl{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#A4ACBA;margin-bottom:.18cm}
.importe-val{font-size:34px;line-height:1;font-weight:900;color:#001633;letter-spacing:0}
.concepto{background:#FBFCFE;border:1px solid #E2E8F0;border-radius:10px;padding:.22cm .34cm;margin-bottom:.48cm}
.concepto-lbl{font-size:8.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#A4ACBA;margin-bottom:.1cm}
.concepto-val{font-size:13px;color:#001633;font-weight:800;line-height:1.18}
.row{display:flex;justify-content:space-between;align-items:center;gap:.35cm;padding:.18cm 0;border-bottom:1px solid #EEF2F7}
.row:last-child{border-bottom:none}
.rl{font-size:11px;color:#536078;font-weight:500}
.rv{font-size:11px;color:#001633;font-weight:800;text-align:right;max-width:58%;line-height:1.16}
.footer{height:1.7cm;background:#FBFCFE;border-top:1px solid #E2E8F0;padding:.24cm .58cm;display:flex;justify-content:space-between;align-items:flex-end;gap:.45cm}
.footer-txt{font-size:9px;color:#98A2B3;line-height:1.35}
.signature{width:3.3cm;text-align:center;color:#667085;font-size:9px;font-weight:700}
.signature-line{border-top:1px solid #98A2B3;margin-bottom:.12cm}
.controls{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:9cm}
.btn{background:#fff;color:#001633;border:1px solid #D9E0EA;padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;box-shadow:0 3px 10px rgba(15,23,42,.08)}
.btn.primary{background:linear-gradient(135deg,#3EC9C9,#2BA8A8);color:#fff;border:none;box-shadow:0 6px 16px rgba(43,168,168,.28)}
.hint{font-size:11px;color:#667085;text-align:center;max-width:9cm;line-height:1.4}
@media print{html,body{width:21cm;height:29.7cm;background:#fff;padding:0;display:block}.receipt{width:9cm;height:14cm;box-shadow:none;margin:.7cm auto 0}.print-copy{display:flex!important;margin-top:.4cm}.controls,.hint{display:none!important}}
</style>
</head>
<body>
<div class="receipt" id="receipt">
  <div class="status">
    <div class="dot"></div>
    <span class="status-txt">${escapeHtml(ep.label)}</span>
  </div>
  <div class="body">
    <div class="importe">
      <div class="importe-lbl">Importe</div>
      <div class="importe-val">${escapeHtml(fmtMoney(pay.monto))}</div>
    </div>
    <div class="concepto">
      <div class="concepto-lbl">Concepto</div>
      <div class="concepto-val">${escapeHtml(pay.concepto || 'Consulta')}</div>
    </div>
    <div class="row"><span class="rl">Paciente</span><span class="rv">${escapeHtml(pacienteNombre)}</span></div>
    ${p.dni ? `<div class="row"><span class="rl">DNI</span><span class="rv">${escapeHtml(p.dni)}</span></div>` : ''}
    ${obraSocial ? `<div class="row"><span class="rl">Obra social</span><span class="rv">${escapeHtml(obraSocial)}</span></div>` : ''}
    <div class="row"><span class="rl">Fecha</span><span class="rv">${escapeHtml(fechaEmision)}</span></div>
    <div class="row"><span class="rl">Medio de pago</span><span class="rv">${escapeHtml(tipoPagoLabel[pay.tipo] ?? pay.tipo)}</span></div>
    ${proName ? `<div class="row"><span class="rl">Profesional</span><span class="rv">${escapeHtml(proName)}</span></div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-txt">Generado el ${escapeHtml(fechaHoy)}<br>Bounaprax · Gestion de pacientes</div>
    <div class="signature"><div class="signature-line"></div>Firma</div>
  </div>
</div>
<div class="receipt print-copy">
  <div class="status">
    <div class="dot"></div>
    <span class="status-txt">${escapeHtml(ep.label)}</span>
  </div>
  <div class="body">
    <div class="importe">
      <div class="importe-lbl">Importe</div>
      <div class="importe-val">${escapeHtml(fmtMoney(pay.monto))}</div>
    </div>
    <div class="concepto">
      <div class="concepto-lbl">Concepto</div>
      <div class="concepto-val">${escapeHtml(pay.concepto || 'Consulta')}</div>
    </div>
    <div class="row"><span class="rl">Paciente</span><span class="rv">${escapeHtml(pacienteNombre)}</span></div>
    ${p.dni ? `<div class="row"><span class="rl">DNI</span><span class="rv">${escapeHtml(p.dni)}</span></div>` : ''}
    ${obraSocial ? `<div class="row"><span class="rl">Obra social</span><span class="rv">${escapeHtml(obraSocial)}</span></div>` : ''}
    <div class="row"><span class="rl">Fecha</span><span class="rv">${escapeHtml(fechaEmision)}</span></div>
    <div class="row"><span class="rl">Medio de pago</span><span class="rv">${escapeHtml(tipoPagoLabel[pay.tipo] ?? pay.tipo)}</span></div>
    ${proName ? `<div class="row"><span class="rl">Profesional</span><span class="rv">${escapeHtml(proName)}</span></div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-txt">Generado el ${escapeHtml(fechaHoy)}<br>Bounaprax · Gestion de pacientes</div>
    <div class="signature"><div class="signature-line"></div>Firma</div>
  </div>
</div>
<div class="controls">
  <button class="btn primary" onclick="window.print()">Imprimir / PDF</button>
  <button class="btn" onclick="shareImage()">WhatsApp imagen</button>
  <button class="btn" onclick="sharePdf()">WhatsApp PDF</button>
  <button class="btn" onclick="downloadImage()">Descargar imagen</button>
  <button class="btn" onclick="downloadPdf()">Descargar PDF</button>
</div>
<div class="hint">WhatsApp no permite adjuntar archivos automaticamente desde un enlace. Si el navegador no abre el menu de compartir, se descarga el archivo y se abre WhatsApp para adjuntarlo manualmente.</div>
<script>
const FILE_BASE = '${escapeHtml(fileBase)}';
const SHARE_TEXT = 'Recibo Bounaprax ${escapeHtml(nroRecibo)} - ${escapeHtml(pacienteNombre)}';
const WHATSAPP_URL = '${escapeHtml(whatsappUrl)}';
const RECEIPT = ${receiptDataJson};
function bytesFromString(value){return new TextEncoder().encode(value)}
function dataUrlToBytes(dataUrl){const binary=atob(dataUrl.split(',')[1]);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)}
function xml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function clip(value,max){const text=String(value??'');return text.length>max?text.slice(0,max-1)+'…':text}
function receiptSvg(){let rows='';let y=640;for(const row of RECEIPT.rows){rows+='<line x1="58" y1="'+(y+34)+'" x2="842" y2="'+(y+34)+'" stroke="#EEF2F7" stroke-width="2"/><text x="58" y="'+y+'" font-size="22" fill="#536078" font-weight="500">'+xml(row[0])+'</text><text x="842" y="'+y+'" font-size="22" fill="#001633" font-weight="800" text-anchor="end">'+xml(clip(row[1],28))+'</text>';y+=62}return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400"><rect width="900" height="1400" fill="#ffffff"/><rect width="900" height="78" fill="'+xml(RECEIPT.status.bg)+'"/><circle cx="82" cy="39" r="7" fill="'+xml(RECEIPT.status.dot)+'"/><text x="106" y="47" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="3" fill="'+xml(RECEIPT.status.fg)+'">'+xml(RECEIPT.status.label)+'</text><text x="450" y="205" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="4" fill="#A4ACBA">IMPORTE</text><text x="450" y="282" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="900" fill="#001633">'+xml(RECEIPT.amount)+'</text><line x1="58" y1="366" x2="842" y2="366" stroke="#DDE3EA" stroke-width="3" stroke-dasharray="14 10"/><rect x="58" y="410" width="784" height="92" rx="16" fill="#FBFCFE" stroke="#E2E8F0" stroke-width="2"/><text x="90" y="450" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" letter-spacing="3" fill="#A4ACBA">CONCEPTO</text><text x="90" y="486" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="#001633">'+xml(clip(RECEIPT.concept,31))+'</text><g font-family="Arial, Helvetica, sans-serif">'+rows+'</g><rect x="0" y="1230" width="900" height="170" fill="#FBFCFE"/><line x1="0" y1="1230" x2="900" y2="1230" stroke="#E2E8F0" stroke-width="2"/><text x="58" y="1300" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#98A2B3">Generado el '+xml(RECEIPT.generated)+'</text><text x="58" y="1330" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#98A2B3">Bounaprax · Gestion de pacientes</text><line x1="518" y1="1298" x2="842" y2="1298" stroke="#98A2B3" stroke-width="2"/><text x="680" y="1336" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#667085">Firma</text></svg>'}
async function receiptCanvas(){const svg=receiptSvg();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();const loaded=new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});img.src=url;await loaded;const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1400;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);return canvas}finally{URL.revokeObjectURL(url)}}
async function imageFile(){const canvas=await receiptCanvas();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));return new File([blob],FILE_BASE+'.png',{type:'image/png'})}
async function pdfFile(){const canvas=await receiptCanvas();const jpegBytes=dataUrlToBytes(canvas.toDataURL('image/jpeg',.94));const widthPt=255.12;const heightPt=396.85;const chunks=[];const offsets=[];let size=0;const add=value=>{const bytes=value instanceof Uint8Array?value:bytesFromString(value);chunks.push(bytes);size+=bytes.length};const obj=(id,body)=>{offsets[id]=size;add(id+' 0 obj\\n'+body+'\\nendobj\\n')};add('%PDF-1.4\\n%binary\\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+widthPt+' '+heightPt+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');offsets[4]=size;add('4 0 obj\\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpegBytes.length+' >>\\nstream\\n');add(jpegBytes);add('\\nendstream\\nendobj\\n');const content='q\\n'+widthPt+' 0 0 '+heightPt+' 0 0 cm\\n/Im0 Do\\nQ\\n';obj(5,'<< /Length '+bytesFromString(content).length+' >>\\nstream\\n'+content+'endstream');const xref=size;add('xref\\n0 6\\n0000000000 65535 f \\n');for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \\n');add('trailer\\n<< /Size 6 /Root 1 0 R >>\\nstartxref\\n'+xref+'\\n%%EOF');return new File(chunks,FILE_BASE+'.pdf',{type:'application/pdf'})}
function openWhatsApp(){window.open(WHATSAPP_URL,'_blank','noopener,noreferrer')}
async function shareFile(file){if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){await navigator.share({files:[file],title:SHARE_TEXT,text:SHARE_TEXT});return}downloadBlob(file,file.name);openWhatsApp()}
async function shareImage(){try{await shareFile(await imageFile())}catch(error){alert('No se pudo generar la imagen. Usa Imprimir / PDF o intenta desde Chrome actualizado.');console.error(error)}}
async function sharePdf(){try{await shareFile(await pdfFile())}catch(error){alert('No se pudo generar el PDF. Usa Imprimir / PDF o intenta desde Chrome actualizado.');console.error(error)}}
async function downloadImage(){try{const file=await imageFile();downloadBlob(file,file.name)}catch(error){alert('No se pudo descargar la imagen.');console.error(error)}}
async function downloadPdf(){try{const file=await pdfFile();downloadBlob(file,file.name)}catch(error){alert('No se pudo descargar el PDF.');console.error(error)}}
</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(receiptHtml); w.document.close() }
  }

  async function handleDownloadAll() {
    if (docs.length === 0 || downloadingAll) return
    setDownloadingAll(true)
    try {
      const JSZip = (await import('jszip')).default
      const supabase = createClient()
      const zip = new JSZip()
      for (const doc of docs) {
        if (!doc.storagePath) continue
        const { data: urlData } = await supabase.storage.from('documentos').createSignedUrl(doc.storagePath, 120)
        if (!urlData?.signedUrl) continue
        const res = await fetch(urlData.signedUrl)
        const blob = await res.blob()
        zip.file(doc.archivo_nombre || doc.nombre, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${p.apellido}-${p.nombre}-documentos.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingAll(false)
    }
  }

  function handleHistoriaClinica() {
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hoja de ruta clínica — ${p.apellido}, ${p.nombre}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#fff}
.top{background:#0A0E1A;padding:16px 32px;display:flex;justify-content:space-between;align-items:center}
.top-logo{color:#3EC9C9;font-size:18px;font-weight:700}
.top-date{color:#6B7A99;font-size:12px}
.page{max-width:760px;margin:0 auto;padding:40px 32px 80px}
.ph{margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #F3F4F6}
.ph-name{font-size:26px;font-weight:700;color:#111827;margin-bottom:8px}
.ph-meta{display:flex;flex-wrap:wrap;gap:10px}
.chip{font-size:12px;color:#6B7A99;background:#F9FAFB;border:1px solid #E5E7EB;padding:2px 10px;border-radius:20px}
.sec{margin-bottom:28px}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;padding-bottom:8px;border-bottom:1px solid #F3F4F6;margin-bottom:16px}
.info-label{font-size:11px;color:#9CA3AF;margin-bottom:2px}
.info-value{font-size:14px;color:#1F2937;line-height:1.6;white-space:pre-wrap}
.info-row{margin-bottom:12px}
.roadmap{border:1px solid #E5E7EB;border-radius:10px;padding:18px;font-size:14px;color:#1F2937;line-height:1.7;white-space:pre-wrap;page-break-inside:auto}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.b-realizada{background:#D1FAE5;color:#065F46}
.b-programada{background:#CFFAFE;color:#0E7490}
.b-cancelada{background:#FEE2E2;color:#991B1B}
.b-inasistencia{background:#FEF3C7;color:#92400E}
.docs-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.doc-item{border:1px solid #E5E7EB;border-radius:8px;padding:12px}
.print-btn{position:fixed;bottom:24px;right:24px;background:#3EC9C9;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 14px rgba(62,201,201,.4)}
@media print{.print-btn,.top{display:none}.page{padding-top:16px}}
</style>
</head>
<body>
<div class="top"><span class="top-logo">Bounaprax</span><span class="top-date">Hoja de ruta generada el ${fechaHoy}</span></div>
<div class="page">
  <div class="ph">
    <div class="ph-name">${p.apellido}, ${p.nombre}</div>
    <div class="ph-meta">
      ${p.dni ? `<span class="chip">DNI: ${p.dni}</span>` : ''}
      ${p.fecha_nacimiento ? `<span class="chip">${new Date(p.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR')}</span>` : ''}
      ${p.telefono ? `<span class="chip">${p.telefono}</span>` : ''}
      ${p.email ? `<span class="chip">${p.email}</span>` : ''}
      ${p.obra_social ? `<span class="chip">${p.obra_social}${p.numero_afiliado ? ' · ' + p.numero_afiliado : ''}</span>` : ''}
    </div>
  </div>

  ${(p.motivo_consulta || p.diagnostico) ? `
  <div class="sec">
    <div class="sec-title">Información clínica</div>
    ${p.motivo_consulta ? `<div class="info-row"><div class="info-label">Motivo de consulta</div><div class="info-value">${p.motivo_consulta}</div></div>` : ''}
    ${p.diagnostico ? `<div class="info-row"><div class="info-label">Diagnóstico</div><div class="info-value">${p.diagnostico}</div></div>` : ''}
  </div>` : ''}

  <div class="sec">
    <div class="sec-title">Hoja de ruta</div>
    ${p.hoja_ruta?.trim()
      ? `<div class="roadmap">${escapeHtml(p.hoja_ruta)}</div>`
      : '<p style="color:#9CA3AF;font-size:14px">Sin hoja de ruta registrada.</p>'
    }
  </div>

  ${docs.length > 0 ? `
  <div class="sec">
    <div class="sec-title">Documentos (${docs.length})</div>
    <div class="docs-grid">
      ${docs.map(d => `<div class="doc-item"><div style="font-size:14px;font-weight:500;color:#111827">${d.nombre}</div><div style="font-size:12px;color:#9CA3AF;margin-top:2px">${d.tipo.replace('_',' ')} · ${new Date(d.created_at).toLocaleDateString('es-AR')}</div></div>`).join('')}
    </div>
  </div>` : ''}
</div>
<button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  function handleAsistenciasPDF() {
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Asistencias — ${p.apellido}, ${p.nombre}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#fff}
.top{background:#0A0E1A;padding:16px 32px;display:flex;justify-content:space-between;align-items:center}
.top-logo{color:#3EC9C9;font-size:18px;font-weight:700}
.top-date{color:#6B7A99;font-size:12px}
.page{max-width:760px;margin:0 auto;padding:40px 32px 80px}
.ph{margin-bottom:28px;padding-bottom:22px;border-bottom:2px solid #F3F4F6}
.ph-name{font-size:26px;font-weight:700;color:#111827;margin-bottom:8px}
.ph-meta{display:flex;flex-wrap:wrap;gap:10px}
.chip{font-size:12px;color:#6B7A99;background:#F9FAFB;border:1px solid #E5E7EB;padding:2px 10px;border-radius:20px}
.sec{margin-bottom:28px}
.sec-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;padding-bottom:8px;border-bottom:1px solid #F3F4F6;margin-bottom:16px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
.stat{border:1px solid #E5E7EB;border-radius:12px;padding:14px;background:#FAFAFB}
.stat-count{font-size:22px;font-weight:700;margin-bottom:4px}
.stat-label{font-size:12px;color:#6B7280}
.ses{border:1px solid #E5E7EB;border-radius:10px;padding:16px 18px;margin-bottom:12px;page-break-inside:avoid}
.ses-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.ses-fecha{font-size:13px;font-weight:600;color:#111827}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
.b-realizada{background:#D1FAE5;color:#065F46}
.b-programada{background:#CFFAFE;color:#0E7490}
.b-cancelada{background:#FEE2E2;color:#991B1B}
.b-inasistencia{background:#FEF3C7;color:#92400E}
.muted{font-size:12px;color:#9CA3AF}
.obs{margin-top:8px;font-size:13px;color:#374151;line-height:1.6}
.print-btn{position:fixed;bottom:24px;right:24px;background:#3EC9C9;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 14px rgba(62,201,201,.4)}
@media print{.print-btn,.top{display:none}.page{padding-top:16px}.stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
</style>
</head>
<body>
<div class="top"><span class="top-logo">Bounaprax</span><span class="top-date">Asistencias generadas el ${fechaHoy}</span></div>
<div class="page">
  <div class="ph">
    <div class="ph-name">${p.apellido}, ${p.nombre}</div>
    <div class="ph-meta">
      <span class="chip">Total de sesiones: ${sesiones.length}</span>
      ${p.dni ? `<span class="chip">DNI: ${p.dni}</span>` : ''}
      ${p.obra_social ? `<span class="chip">${p.obra_social}</span>` : ''}
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Resumen de asistencia</div>
    <div class="stats">
      ${attendanceSummary.map(item => {
        const colors = item.key === 'realizada'
          ? { bg: '#D1FAE5', fg: '#065F46' }
          : item.key === 'cancelada'
            ? { bg: '#FEE2E2', fg: '#991B1B' }
            : item.key === 'inasistencia'
              ? { bg: '#FEF3C7', fg: '#92400E' }
              : { bg: '#CFFAFE', fg: '#0E7490' }
        return `<div class="stat" style="background:${colors.bg};border-color:${colors.bg}">
          <div class="stat-count" style="color:${colors.fg}">${item.count}</div>
          <div class="stat-label">${item.label}</div>
        </div>`
      }).join('')}
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Detalle de asistencias</div>
    ${sesiones.length === 0 ? '<p style="color:#9CA3AF;font-size:14px">Sin sesiones registradas.</p>' :
      [...sesiones].reverse().map(s => {
        const fecha = new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const estadoLabel: Record<string, string> = { realizada: 'Asistió', programada: 'Pendiente', cancelada: 'Canceló', inasistencia: 'Faltó' }
        const categoria = s.categoria ? ` · ${s.categoria}` : ''
        return `<div class="ses">
          <div class="ses-head">
            <span class="ses-fecha">${fecha}</span>
            <span class="badge b-${s.estado}">${estadoLabel[s.estado] ?? s.estado}</span>
            <span class="muted">${s.tipo}${categoria}${s.hora_inicio ? ' · ' + s.hora_inicio.slice(0,5) : ''}</span>
          </div>
          ${s.observaciones ? `<div class="obs">${s.observaciones}</div>` : ''}
        </div>`
      }).join('')
    }
  </div>
</div>
<button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <>
      <div className="min-h-screen max-w-5xl">

        {/* ══════════════════════════════════════════════
            MOBILE HEADER — compacto, una sola fila
        ══════════════════════════════════════════════ */}
        <div className="px-4 pt-4 pb-3 lg:hidden anim-fade-up">
          {/* Fila 1: back + avatar + nombre + editar */}
          <div className="flex items-center gap-3 mb-3">
            <Link href="/pacientes"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.2)', color: 'var(--primary)' }}>
              {p.nombre[0]}{p.apellido[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-tight truncate"
                style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                {p.apellido}, {p.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: est.bg, color: est.color }}>{est.label}</span>
                {edad && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{edad} a.</span>}
                {consultorioActivo && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: consultorioActivo.color }} />
                    {consultorioActivo.nombre}
                  </span>
                )}
              </div>
            </div>
            <Link href={`/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}/editar`}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Fila 2: CTA buttons — ancho completo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSesionOpen(true)}
              className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.25)', color: 'var(--primary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Nueva sesión
            </button>
            <button
              onClick={() => setPagoOpen(true)}
              className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.25)', color: 'var(--accent)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Registrar pago
            </button>
            <ProGate isPro={isPro}>
              <button
                onClick={handleHistoriaClinica}
                className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 w-full"
                style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: 'var(--virtual)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Hoja de ruta
              </button>
            </ProGate>
            <ProGate isPro={isPro}>
              <button
                onClick={handleAsistenciasPDF}
                className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 w-full"
                style={{ background: 'rgba(62,201,201,0.12)', border: '1px solid rgba(62,201,201,0.25)', color: 'var(--primary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                PDF asistencias
              </button>
            </ProGate>
            <button
              onClick={handleDownloadAll}
              disabled={docs.length === 0 || downloadingAll}
              className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)' }}>
              {downloadingAll
                ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
              }
              {downloadingAll ? 'Descargando…' : 'Descargar docs'}
            </button>

            {/* WhatsApp recordatorio */}
            <ProGate isPro={isPro}>
              <button
                onClick={handleWhatsApp}
                className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 w-full"
                style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Recordatorio
              </button>
            </ProGate>

            {/* Imprimir historia clínica */}
            <ProGate isPro={isPro}>
              <Link
                href={isPro ? `/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}/imprimir` : '#'}
                target={isPro ? '_blank' : undefined}
                className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,159,67,0.12)', border: '1px solid rgba(255,159,67,0.3)', color: '#FF9F43' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                Imprimir historia
              </Link>
            </ProGate>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            DESKTOP HEADER — igual que antes
        ══════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-8 pb-0 mb-6 anim-fade-up">
          <div className="flex items-center gap-4">
            <Link href="/pacientes"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: 'var(--primary)' }}>
                {p.nombre[0]}{p.apellido[0]}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
                  {p.apellido}, {p.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium"
                    style={{ background: est.bg, color: est.color }}>{est.label}</span>
                  {edad && <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{edad} años</span>}
                  {p.obra_social && <span className="text-sm" style={{ color: 'var(--text-dim)' }}>· {p.obra_social}</span>}
                  {consultorioActivo && (
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-dim)' }}>
                      · <span className="w-2 h-2 rounded-full inline-block" style={{ background: consultorioActivo.color }} />
                      {consultorioActivo.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button onClick={() => setSesionOpen(true)}
              className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: 'var(--primary)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Sesión
            </button>
            <button onClick={() => setPagoOpen(true)}
              className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', color: 'var(--accent)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Pago
            </button>
            <ProGate isPro={isPro}>
              <button onClick={handleHistoriaClinica}
                className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: 'var(--virtual-dim)', border: '1px solid rgba(167,139,250,0.2)', color: 'var(--virtual)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Hoja de ruta
              </button>
            </ProGate>
            <ProGate isPro={isPro}>
              <button onClick={handleAsistenciasPDF}
                className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: 'var(--teal-dim)', border: '1px solid rgba(62,201,201,0.2)', color: 'var(--primary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Asistencias
              </button>
            </ProGate>
            <ProGate isPro={isPro}>
              <button onClick={handleWhatsApp}
                className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25D366' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Recordatorio
              </button>
            </ProGate>
            <button onClick={handleDownloadAll} disabled={docs.length === 0 || downloadingAll}
              className="h-9 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--success-dim)', border: '1px solid rgba(52,211,153,0.2)', color: 'var(--success)' }}>
              {downloadingAll
                ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
              }
              {downloadingAll ? 'Descargando…' : 'Descargar'}
            </button>
            <Link href={`/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}/editar`}
              className="h-9 px-3 rounded-xl flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-medium">Editar</span>
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            CONTENIDO (compartido mobile + desktop)
        ══════════════════════════════════════════════ */}
        <div className="px-4 lg:px-8 lg:pt-0">

        {/* ── Stats rápidas ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4 lg:gap-3 lg:mb-5">
          {[
            { label: 'Sesiones',   value: String(sesiones.length), color: 'var(--primary)' },
            { label: 'Cobrado',    value: fmtMoney(totalPagado),    color: 'var(--success)' },
            { label: 'Pendiente',  value: fmtMoney(totalPendiente), color: 'var(--warning)' },
            { label: 'Docs',       value: String(docs.length),      color: 'var(--virtual)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 lg:px-4 lg:py-3 min-w-0"
              style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] lg:text-xs mb-0.5 lg:mb-1 truncate" style={{ color: 'var(--text-subtle)' }}>{s.label}</p>
              <p className="text-sm lg:text-base font-bold truncate" style={{ color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Columna izquierda ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl p-5 space-y-3.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>Datos personales</p>
                <Link href={`/pacientes/${pacienteSlug(p.apellido, p.nombre, p.id)}/editar`}
                  className="text-xs font-medium transition-opacity hover:opacity-80 px-2 py-1.5 -mr-2 -my-1 rounded-lg"
                  style={{ color: TEAL }}>Editar</Link>
              </div>
              {consultorioActivo && (
                <div className="flex items-center gap-2 pb-1 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: consultorioActivo.color }} />
                  <div>
                    <p className="text-xs font-semibold tracking-widest uppercase mb-0" style={{ color: 'var(--text-subtle)' }}>Consultorio</p>
                    <p className="text-sm font-medium" style={{ color: consultorioActivo.color }}>{consultorioActivo.nombre}</p>
                  </div>
                </div>
              )}
              <InfoItem label="DNI" value={p.dni} />
              <InfoItem label="Fecha de nac." value={p.fecha_nacimiento ? fmtDate(p.fecha_nacimiento) : null} />
              <InfoItem label="Teléfono" value={p.telefono} />
              <InfoItem label="Email" value={p.email} />
              {!p.dni && !p.telefono && !p.email && !p.fecha_nacimiento && !consultorioActivo && (
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Sin datos adicionales</p>
              )}
            </div>

            {(p.obra_social || p.numero_afiliado) && (
              <div className="rounded-2xl p-5 space-y-3.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--text-subtle)' }}>Cobertura</p>
                <InfoItem label="Obra social" value={p.obra_social} />
                <InfoItem label="Nº afiliado"  value={p.numero_afiliado} />
              </div>
            )}

            {(p.motivo_consulta || p.diagnostico) && (
              <div className="rounded-2xl p-5 space-y-3.5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--text-subtle)' }}>Info clínica</p>
                <InfoItem label="Motivo" value={p.motivo_consulta} />
                <InfoItem label="Diagnóstico" value={p.diagnostico} />
              </div>
            )}
          </div>

          {/* ── Columna derecha ── */}
          <div className="lg:col-span-2 space-y-4">

            <RoadmapSection paciente={p} initialDocs={docs} />

            {/* Sesiones */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                  Sesiones
                  <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}>{sesiones.length}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Link href="/agenda"
                    className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)', color: TEAL, textDecoration: 'none' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Agendar sesión
                  </Link>
                  <button onClick={() => setSesionOpen(true)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              {sesiones.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Sin sesiones registradas.</p>
              ) : (
                <>
                  {/* Resumen de asistencia */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[
                      { key: 'realizada',    label: 'Asistió',   color: 'var(--success)' },
                      { key: 'programada',   label: 'Pendiente', color: 'var(--primary)' },
                      { key: 'cancelada',    label: 'Canceló',   color: 'var(--danger)'  },
                      { key: 'inasistencia', label: 'Faltó',     color: 'var(--warning)' },
                    ].map(({ key, label, color }) => {
                      const count = sesiones.filter(s => s.estado === key).length
                      if (count === 0) return null
                      return (
                        <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                          style={{ background: `${color.replace('var(--', '').replace(')', '')}`.includes('success') ? 'rgba(52,211,153,0.08)' : color.includes('danger') ? 'rgba(248,113,113,0.08)' : color.includes('warning') ? 'rgba(251,191,36,0.08)' : 'rgba(62,201,201,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="text-xs font-semibold" style={{ color }}>{count}</span>
                          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="space-y-2">
                    {sesiones.map(s => {
                      const se     = sesionEstado[s.estado] ?? sesionEstado.realizada
                      const asist  = asistenciaLabel[s.estado] ?? asistenciaLabel.programada
                      const catCfg = s.categoria ? (sesionCategoriaLabel[s.categoria] ?? null) : null
                      const d = new Date(s.fecha + 'T00:00:00')
                      return (
                        <div key={s.id} role="button" tabIndex={0}
                          onClick={() => handleViewSesion(s)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleViewSesion(s)
                            }
                          }}
                          className="w-full rounded-xl p-3.5 flex items-start gap-3 text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}>
                          {/* Date badge */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
                            style={{ background: `${se.color}15` }}>
                            <span className="text-xs font-bold leading-none" style={{ color: se.color }}>
                              {d.getDate()}
                            </span>
                            <span className="text-[10px] leading-none mt-0.5" style={{ color: se.color }}>
                              {d.toLocaleString('es-AR', { month: 'short' })}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Attendance + category row */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-xs font-bold"
                                style={{ color: asist.color }}>
                                <span className="text-[11px]">{asist.icon}</span>
                                {asist.label}
                              </span>
                              {catCfg && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                                  style={{ background: `${catCfg.color}15`, color: catCfg.color }}>
                                  {catCfg.label}
                                </span>
                              )}
                              <span className="text-xs capitalize" style={{ color: 'var(--text-dim)' }}>{s.tipo}</span>
                              {s.hora_inicio && (
                                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                                  · {s.hora_inicio.slice(0, 5)}
                                </span>
                              )}
                            </div>
                            {s.observaciones
                              ? <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                                  {s.observaciones}
                                </p>
                              : <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--primary)' }}>
                                  Ver sesión
                                </p>
                            }
                            {s.observaciones && (
                              <p className="text-xs font-medium mt-1" style={{ color: 'var(--primary)' }}>
                                Ver sesión
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
                            {s.monto != null && (
                              <div>
                                <p className="text-sm font-semibold" style={{ color: s.pagado ? 'var(--success)' : 'var(--warning)' }}>
                                  {fmtMoney(s.monto)}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>{s.pagado ? 'pagado' : 'pendiente'}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteSesion(s)
                              }}
                              disabled={deletingSessionId === s.id}
                              title="Eliminar sesión"
                              className="h-7 w-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Pagos */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase flex items-center gap-2" style={{ color: 'var(--text-subtle)' }}>
                  Pagos
                  <span className="px-1.5 py-0.5 rounded-md text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}>{pagos.length}</span>
                </p>
                <button onClick={() => setPagoOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {pagos.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Sin pagos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {pagos.map(pay => {
                    const ep = pay.estado === 'pagado' ? { color: 'var(--success)', label: 'Pagado' }
                      : pay.estado === 'pendiente' ? { color: 'var(--warning)', label: 'Pendiente' }
                      : { color: 'var(--danger)', label: 'Devuelto' }
                    const linkedSession = pay.sesion_id ? sesiones.find(s => s.id === pay.sesion_id) : null
                    return (
                      <div key={pay.id} className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground-muted)' }}>
                            {pay.concepto || 'Consulta'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            {fmtDate(pay.fecha)} · {pay.tipo.replace('_', ' ')}
                          </p>
                          {linkedSession && (
                            <p className="text-xs mt-1" style={{ color: 'var(--primary)' }}>
                              Sesión: {fmtDate(linkedSession.fecha)}{linkedSession.hora_inicio ? ` · ${linkedSession.hora_inicio.slice(0, 5)}` : ''}
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0"
                          style={{ background: `${ep.color}15`, color: ep.color }}>
                          {ep.label}
                        </span>
                        <p className="text-base font-bold flex-shrink-0" style={{ color: 'var(--foreground)' }}>
                          {fmtMoney(pay.monto)}
                        </p>
                        <ProGate isPro={isPro}>
                          <button
                            onClick={() => handleReciboPDF(pay)}
                            title="Generar recibo PDF"
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/>
                              <polyline points="14,2 14,8 20,8" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/>
                              <line x1="16" y1="13" x2="8" y2="13" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/>
                              <line x1="16" y1="17" x2="8" y2="17" stroke={AMBER} strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </ProGate>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Tareas / TODO */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <TodoSection pacienteId={p.id} />
            </div>

            {/* Documentos */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <DocumentsSection pacienteId={p.id} initialDocs={docs} />
            </div>

          </div>
        </div>
        </div>{/* /px-4 wrapper */}
      </div>{/* /max-w-5xl */}

      {/* ── Modales ── */}
      <Modal
        open={sesionOpen}
        onClose={() => setSesionOpen(false)}
        title="Nueva sesión"
        subtitle="Registrá el encuentro con el paciente"
        wide
      >
        <SesionForm
          pacienteId={p.id}
          consultorios={consultorios}
          defaultConsultorioId={p.consultorio_id}
          onSuccess={() => { setSesionOpen(false); router.refresh() }}
          onCancel={() => setSesionOpen(false)}
        />
      </Modal>

      <Modal
        open={pagoOpen}
        onClose={() => setPagoOpen(false)}
        title="Registrar pago"
        subtitle="Asentá el cobro de la consulta"
      >
        <PagoForm
          pacienteId={p.id}
          sesiones={sesiones}
          onSuccess={() => { setPagoOpen(false); router.refresh() }}
          onCancel={() => setPagoOpen(false)}
        />
      </Modal>
    </>
  )
}
