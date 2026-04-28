'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { extractIdFromSlug } from '@/lib/utils'

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
}
const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'
const TEAL = '#3EC9C9'

function focusTeal(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-dim)' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
  )
}

function Card({ title, icon, badge, children }: { title: string; icon: React.ReactNode; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: TEAL }}>{icon}</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground-muted)' }}>{title}</span>
        {badge && (
          <span className="ml-1 text-[9px] font-bold px-1.5 rounded-full"
            style={{ background: '#F5A623', color: '#0a0600', lineHeight: '16px' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
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

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
      style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
  )
}

export default function NuevaSesionPage() {
  const router = useRouter()
  const { id: slug } = useParams<{ id: string }>()
  const id = extractIdFromSlug(slug)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [isPro,  setIsPro]  = useState(false)

  useEffect(() => {
    createClient().from('profiles').select('plan').single()
      .then(({ data }) => setIsPro(data?.plan === 'pro'))
  }, [])

  // Nota de voz
  const [recording,   setRecording]   = useState(false)
  const [audioBlob,   setAudioBlob]   = useState<Blob | null>(null)
  const [audioUrl,    setAudioUrl]    = useState<string | null>(null)
  const [recSeconds,  setRecSeconds]  = useState(0)
  const mediaRef   = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      setError('No se pudo acceder al micrófono.')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function discardAudio() {
    setAudioBlob(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setRecSeconds(0)
  }

  function fmtSec(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  const [form, setForm] = useState({
    fecha:        hoy,
    hora_inicio:  '',
    hora_fin:     '',
    tipo:         'presencial',
    estado:       'realizada',
    observaciones: '',
    tratamiento:   '',
    objetivo:      '',
    evolucion:     '',
    proximos_pasos:'',
    monto:         '',
    pagado:        false,
  })

  function set(field: string) {
    return (value: string | boolean) => setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase.from('sesiones').insert({
      paciente_id:    id,
      professional_id: user.id,
      fecha:          form.fecha,
      hora_inicio:    form.hora_inicio  || null,
      hora_fin:       form.hora_fin     || null,
      tipo:           form.tipo,
      estado:         form.estado,
      observaciones:  form.observaciones || null,
      tratamiento:    form.tratamiento  || null,
      objetivo:       form.objetivo     || null,
      evolucion:      form.evolucion    || null,
      proximos_pasos: form.proximos_pasos || null,
      monto:          form.monto ? parseFloat(form.monto) : null,
      pagado:         form.pagado,
    }).select('id').single()

    if (error) { setError('Error al guardar la sesión.'); setSaving(false); return }

    // Subir nota de voz como documento si existe
    if (audioBlob && data?.id) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const filename = `${user.id}/nota-voz-${data.id}.webm`
        const { data: upload } = await supabase.storage.from('documentos').upload(filename, audioBlob, { contentType: 'audio/webm', upsert: true })
        if (upload) {
          const { data: urlData } = await supabase.storage.from('documentos').createSignedUrl(filename, 60 * 60 * 24 * 365)
          await supabase.from('documentos').insert({
            paciente_id:    id,
            professional_id: user.id,
            nombre:         `Nota de voz — ${form.fecha}`,
            descripcion:    'Nota de voz registrada al finalizar la sesión',
            tipo:           'otro',
            archivo_url:    urlData?.signedUrl ?? '',
            archivo_nombre: `nota-voz-${form.fecha}.webm`,
            archivo_tipo:   'audio/webm',
            archivo_tamanio: audioBlob.size,
          })
        }
      }
    }

    router.push(`/pacientes/${slug}`)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <div className="flex items-center gap-4 mb-8 anim-fade-up">
          <Link href={`/pacientes/${slug}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ background: 'var(--overlay-sm)', border: '1px solid var(--border)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>Nueva sesión</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>Registrá el encuentro con el paciente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Fecha y hora */}
          <Card title="Fecha y modalidad" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1">
                <Label text="Fecha" required />
                <input type="date" value={form.fecha} onChange={e => set('fecha')(e.target.value)} required
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
              </div>
              <div>
                <Label text="Hora inicio" />
                <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio')(e.target.value)}
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
              </div>
              <div>
                <Label text="Hora fin" />
                <input type="time" value={form.hora_fin} onChange={e => set('hora_fin')(e.target.value)}
                  className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
              </div>
            </div>

            <div>
              <Label text="Modalidad" />
              <ToggleGroup value={form.tipo} onChange={set('tipo')} options={[
                { value: 'presencial', label: 'Presencial', color: 'var(--primary)' },
                { value: 'virtual',    label: 'Virtual',    color: 'var(--virtual)' },
              ]} />
            </div>

            <div>
              <Label text="Estado" />
              <ToggleGroup value={form.estado} onChange={set('estado')} options={[
                { value: 'realizada',    label: 'Realizada',    color: 'var(--success)' },
                { value: 'programada',   label: 'Programada',   color: 'var(--primary)' },
                { value: 'cancelada',    label: 'Cancelada',    color: 'var(--danger)' },
                { value: 'inasistencia', label: 'Inasistencia', color: 'var(--warning)' },
              ]} />
            </div>
          </Card>

          {/* Notas clínicas */}
          <Card title="Notas clínicas" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div>
              <Label text="Observaciones de la sesión" />
              <Textarea value={form.observaciones} onChange={set('observaciones')}
                placeholder="¿Qué sucedió en la sesión? Resumen del encuentro…" rows={4} />
            </div>
            <div>
              <Label text="Tratamiento aplicado" />
              <Textarea value={form.tratamiento} onChange={set('tratamiento')}
                placeholder="Técnicas o intervenciones utilizadas…" rows={2} />
            </div>
            <div>
              <Label text="Objetivo de la sesión" />
              <Textarea value={form.objetivo} onChange={set('objetivo')}
                placeholder="Objetivos planteados para este encuentro…" rows={2} />
            </div>
          </Card>

          {/* Evolución */}
          <Card title="Evolución y seguimiento" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <div>
              <Label text="Evolución del paciente" />
              <Textarea value={form.evolucion} onChange={set('evolucion')}
                placeholder="¿Cómo evolucionó el paciente? Cambios observados…" rows={3} />
            </div>
            <div>
              <Label text="Próximos pasos" />
              <Textarea value={form.proximos_pasos} onChange={set('proximos_pasos')}
                placeholder="Tareas, indicaciones o puntos para la próxima sesión…" rows={2} />
            </div>
          </Card>

          {/* Pago */}
          <Card title="Honorarios" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label text="Monto ($)" />
                <input type="number" min="0" step="0.01" value={form.monto}
                  onChange={e => set('monto')(e.target.value)}
                  placeholder="0.00" className={inputCls} style={inputStyle}
                  onFocus={focusTeal} onBlur={blurReset} />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <button type="button" onClick={() => set('pagado')(!form.pagado)}
                  className="h-10 rounded-xl text-sm font-medium flex items-center gap-2.5 px-4 transition-all"
                  style={{
                    background: form.pagado ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${form.pagado ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: form.pagado ? 'var(--success)' : 'var(--text-dim)',
                  }}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all`}
                    style={{ borderColor: form.pagado ? 'var(--success)' : 'var(--text-subtle)', background: form.pagado ? 'var(--success)' : 'transparent' }}>
                    {form.pagado && <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>}
                  </div>
                  {form.pagado ? 'Sesión pagada' : 'Marcar como pagada'}
                </button>
              </div>
            </div>
          </Card>

          {/* Nota de voz */}
          <Card title="Nota de voz" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          } badge={!isPro ? 'PRO' : undefined}>
            {isPro ? (
              <>
                <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
                  Grabá una nota rápida al finalizar la sesión. Se guardará como documento adjunto al paciente.
                </p>
                {!audioUrl ? (
                  <button type="button"
                    onClick={recording ? stopRecording : startRecording}
                    className="flex items-center gap-3 h-12 px-5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: recording ? 'rgba(248,113,113,0.15)' : 'rgba(62,201,201,0.1)',
                      border: `1px solid ${recording ? 'rgba(248,113,113,0.4)' : 'rgba(62,201,201,0.3)'}`,
                      color: recording ? 'var(--danger)' : TEAL,
                    }}>
                    {recording ? (
                      <>
                        <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--danger)', animation: 'pulse 1s infinite' }} />
                        Detener — {fmtSec(recSeconds)}
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 rounded-full" style={{ background: TEAL }} />
                        Iniciar grabación
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <audio src={audioUrl} controls className="w-full h-10" style={{ borderRadius: 12 }} />
                    <button type="button" onClick={discardAudio}
                      className="text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--danger)' }}>
                      × Descartar nota
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#F5A623" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#F5A623" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Disponible en Plan Pro</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    Grabá notas de voz al finalizar cada sesión.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1 pb-8">
            <Link href={`/pacientes/${slug}`}
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: 'var(--primary-foreground)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? (<><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
              </svg>Guardando…</>) : (<>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>Guardar sesión</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
