'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/* ── helpers de estilo ─────────────────────────────────── */
const TEAL = '#3EC9C9'

function focusTeal(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E8EDF5',
}

/* ── sub-componentes ───────────────────────────────────── */
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
  )
}

function TInput({ value, onChange, placeholder, type = 'text', required }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      className={inputCls} style={inputStyle}
      onFocus={focusTeal} onBlur={blurReset}
    />
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: TEAL }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: '#C8D4E8' }}>{title}</span>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

/* ── tipos de archivo ──────────────────────────────────── */
type FileItem = {
  id: string
  file: File
  tipo: 'informe' | 'foto' | 'analisis' | 'test' | 'historia_clinica' | 'otro'
  nombre: string
  uploading: boolean
  error: string
}

const TIPO_OPTS = [
  { value: 'informe',         label: 'Informe'         },
  { value: 'foto',            label: 'Foto'            },
  { value: 'analisis',        label: 'Análisis'        },
  { value: 'test',            label: 'Test'            },
  { value: 'historia_clinica',label: 'Hist. clínica'   },
  { value: 'otro',            label: 'Otro'            },
] as const

function fileIcon(file: File) {
  if (file.type.startsWith('image/')) return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#A78BFA" strokeWidth="1.8"/>
      <circle cx="8.5" cy="8.5" r="1.5" stroke="#A78BFA" strokeWidth="1.8"/>
      <path d="M21 15l-5-5L5 21" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (file.type === 'application/pdf') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="14,2 14,8 20,8" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="13" x2="15" y2="13" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="17" x2="13" y2="17" stroke="#F87171" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#6B7A99" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="14,2 14,8 20,8" stroke="#6B7A99" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/* ── página principal ──────────────────────────────────── */
export default function NuevoPacientePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nombre: '', apellido: '', fecha_nacimiento: '', dni: '',
    email: '', telefono: '', obra_social: '', numero_afiliado: '',
    motivo_consulta: '', diagnostico: '', estado: 'activo',
  })
  const [files, setFiles] = useState<FileItem[]>([])
  const [dragging, setDragging] = useState(false)

  function setField(field: string) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }))
  }

  /* drag & drop */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(incoming: File[]) {
    const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif','application/pdf',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const valid = incoming.filter(f => ALLOWED.includes(f.type))
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        tipo: (f.type.startsWith('image/') ? 'foto' : 'otro') as FileItem['tipo'],
        nombre: f.name.replace(/\.[^.]+$/, ''),
        uploading: false,
        error: '',
      }))
    ])
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function updateFile(id: string, patch: Partial<FileItem>) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  /* submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    /* 1 — guardar paciente */
    const { data: paciente, error: pErr } = await supabase
      .from('pacientes')
      .insert({
        ...form,
        professional_id: user.id,
        fecha_nacimiento:  form.fecha_nacimiento  || null,
        dni:               form.dni               || null,
        email:             form.email             || null,
        telefono:          form.telefono          || null,
        obra_social:       form.obra_social        || null,
        numero_afiliado:   form.numero_afiliado   || null,
        motivo_consulta:   form.motivo_consulta   || null,
        diagnostico:       form.diagnostico       || null,
      })
      .select().single()

    if (pErr) { setError('Error al guardar el paciente.'); setSaving(false); return }

    /* 2 — subir archivos */
    for (const item of files) {
      updateFile(item.id, { uploading: true })
      const ext  = item.file.name.split('.').pop()
      const path = `${user.id}/${paciente.id}/${item.id}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('documentos').upload(path, item.file)

      if (upErr) { updateFile(item.id, { uploading: false, error: upErr.message }); continue }

      const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(path)

      await supabase.from('documentos').insert({
        paciente_id:    paciente.id,
        professional_id: user.id,
        nombre:         item.nombre || item.file.name,
        tipo:           item.tipo,
        archivo_url:    publicUrl,
        archivo_nombre: item.file.name,
        archivo_tipo:   item.file.type,
        archivo_tamanio: item.file.size,
      })
      updateFile(item.id, { uploading: false })
    }

    router.push(`/pacientes/${paciente.id}`)
  }

  const estadoOpts = [
    { value: 'activo',   label: 'Activo',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'   },
    { value: 'inactivo', label: 'Inactivo', color: '#6B7A99', bg: 'rgba(107,122,153,0.1)'  },
    { value: 'alta',     label: 'Alta',     color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'   },
    { value: 'derivado', label: 'Derivado', color: '#F87171', bg: 'rgba(248,113,113,0.1)'  },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#0A0E1A' }}>
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8 anim-fade-up">
          <Link href="/pacientes"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>
              Nuevo paciente
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#5A6A88' }}>Completá los datos para crear el perfil</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Datos personales ── */}
          <Card title="Datos personales" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <Label text="Nombre" required />
                <TInput value={form.nombre} onChange={setField('nombre')} placeholder="Juan" required />
              </div>
              <div>
                <Label text="Apellido" required />
                <TInput value={form.apellido} onChange={setField('apellido')} placeholder="García" required />
              </div>
              <div>
                <Label text="DNI" />
                <TInput value={form.dni} onChange={setField('dni')} placeholder="12.345.678" />
              </div>
              <div>
                <Label text="Fecha de nacimiento" />
                <TInput value={form.fecha_nacimiento} onChange={setField('fecha_nacimiento')} type="date" />
              </div>
            </div>
          </Card>

          {/* ── Contacto ── */}
          <Card title="Contacto" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <Label text="Teléfono" />
                <TInput value={form.telefono} onChange={setField('telefono')} placeholder="+54 9 11 1234-5678" />
              </div>
              <div>
                <Label text="Email" />
                <TInput value={form.email} onChange={setField('email')} type="email" placeholder="paciente@email.com" />
              </div>
            </div>
          </Card>

          {/* ── Cobertura ── */}
          <Card title="Cobertura médica" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <Label text="Obra social / prepaga" />
                <TInput value={form.obra_social} onChange={setField('obra_social')} placeholder="OSDE, Swiss Medical…" />
              </div>
              <div>
                <Label text="Nº de afiliado" />
                <TInput value={form.numero_afiliado} onChange={setField('numero_afiliado')} placeholder="123456789" />
              </div>
            </div>
          </Card>

          {/* ── Info clínica ── */}
          <Card title="Información clínica" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <div>
              <Label text="Motivo de consulta" />
              <textarea
                value={form.motivo_consulta}
                onChange={e => setField('motivo_consulta')(e.target.value)}
                placeholder="Describí el motivo principal de consulta…"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={focusTeal} onBlur={blurReset}
              />
            </div>
            <div>
              <Label text="Diagnóstico presuntivo" />
              <textarea
                value={form.diagnostico}
                onChange={e => setField('diagnostico')(e.target.value)}
                placeholder="Diagnóstico inicial o presuntivo…"
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={focusTeal} onBlur={blurReset}
              />
            </div>
            <div>
              <Label text="Estado" />
              <div className="grid grid-cols-4 gap-2">
                {estadoOpts.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setField('estado')(opt.value)}
                    className="h-9 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.estado === opt.value ? opt.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.estado === opt.value ? opt.color + '50' : 'rgba(255,255,255,0.07)'}`,
                      color: form.estado === opt.value ? opt.color : '#5A6A88',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Documentos ── */}
          <Card title="Documentos iniciales" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? TEAL : 'rgba(255,255,255,0.1)'}`,
                background: dragging ? 'rgba(62,201,201,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17,8 12,3 7,8" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" stroke={TEAL} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#C8D4E8' }}>
                {dragging ? 'Soltá los archivos aquí' : 'Arrastrá archivos o hacé click'}
              </p>
              <p className="text-xs" style={{ color: '#5A6A88' }}>
                JPG, PNG, PDF, DOC · Máx. 20 MB por archivo
              </p>
            </div>
            <input
              ref={fileInputRef} type="file" multiple className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => e.target.files && addFiles(Array.from(e.target.files))}
            />

            {/* Lista de archivos */}
            {files.length > 0 && (
              <div className="space-y-2 mt-1">
                {files.map(item => (
                  <div key={item.id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-shrink-0">{fileIcon(item.file)}</div>

                    {/* Nombre editable */}
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.nombre}
                        onChange={e => updateFile(item.id, { nombre: e.target.value })}
                        className="w-full bg-transparent text-sm outline-none font-medium"
                        style={{ color: '#C8D4E8' }}
                      />
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#5A6A88' }}>
                        {item.file.name} · {formatBytes(item.file.size)}
                      </p>
                      {item.error && (
                        <p className="text-xs mt-0.5" style={{ color: '#F87171' }}>{item.error}</p>
                      )}
                    </div>

                    {/* Tipo */}
                    <select
                      value={item.tipo}
                      onChange={e => updateFile(item.id, { tipo: e.target.value as FileItem['tipo'] })}
                      className="text-xs h-7 px-2 rounded-lg outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8A9AB8' }}
                    >
                      {TIPO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    {/* Quitar */}
                    {item.uploading ? (
                      <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                      </svg>
                    ) : (
                      <button type="button" onClick={() => removeFile(item.id)}
                        className="flex-shrink-0 transition-opacity hover:opacity-60">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="#5A6A88" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="#5A6A88" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Error ── */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex items-center justify-end gap-3 pt-1 pb-8">
            <Link href="/pacientes"
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{
                background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)',
                color: '#0A0E1A',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Guardar paciente
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
