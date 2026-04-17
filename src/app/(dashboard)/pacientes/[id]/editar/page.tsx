'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { extractIdFromSlug, pacienteSlug } from '@/lib/utils'

type ConsultorioOpt = { id: string; nombre: string; color: string }

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E8EDF5',
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
    <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>
      {text}{required && <span style={{ color: TEAL }}> *</span>}
    </p>
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

const estadoOpts = [
  { value: 'activo',   label: 'Activo',   color: '#34D399', bg: 'rgba(52,211,153,0.1)'  },
  { value: 'inactivo', label: 'Inactivo', color: '#6B7A99', bg: 'rgba(107,122,153,0.1)' },
  { value: 'alta',     label: 'Alta',     color: '#FBBF24', bg: 'rgba(251,191,36,0.1)'  },
  { value: 'derivado', label: 'Derivado', color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
]

export default function EditarPacientePage() {
  const router = useRouter()
  const { id: slug } = useParams<{ id: string }>()
  const id = extractIdFromSlug(slug)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    nombre: '', apellido: '', fecha_nacimiento: '', dni: '',
    email: '', telefono: '', obra_social: '', numero_afiliado: '',
    motivo_consulta: '', diagnostico: '', estado: 'activo',
    cuit: '', razon_social: '', condicion_iva: '', direccion_fiscal: '', cbu: '', alias_cbu: '',
  })
  const [consultorioId, setConsultorioId] = useState('')
  const [consultorios, setConsultorios]   = useState<ConsultorioOpt[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('pacientes').select('*').eq('id', id).single(),
      supabase.from('consultorios').select('id, nombre, color').eq('activo', true).order('nombre'),
    ]).then(([{ data }, { data: cons }]) => {
      if (data) {
        setForm({
          nombre:           data.nombre           ?? '',
          apellido:         data.apellido         ?? '',
          fecha_nacimiento: data.fecha_nacimiento ?? '',
          dni:              data.dni              ?? '',
          email:            data.email            ?? '',
          telefono:         data.telefono         ?? '',
          obra_social:      data.obra_social       ?? '',
          numero_afiliado:  data.numero_afiliado  ?? '',
          motivo_consulta:  data.motivo_consulta  ?? '',
          diagnostico:      data.diagnostico      ?? '',
          estado:           data.estado           ?? 'activo',
          cuit:             data.cuit             ?? '',
          razon_social:     data.razon_social     ?? '',
          condicion_iva:    data.condicion_iva    ?? '',
          direccion_fiscal: data.direccion_fiscal ?? '',
          cbu:              data.cbu              ?? '',
          alias_cbu:        data.alias_cbu        ?? '',
        })
        setConsultorioId(data.consultorio_id ?? '')
      }
      setConsultorios((cons ?? []) as ConsultorioOpt[])
      setLoading(false)
    })
  }, [id])

  function set(field: string) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.from('pacientes').update({
      ...form,
      consultorio_id:   consultorioId         || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      dni:              form.dni              || null,
      email:            form.email            || null,
      telefono:         form.telefono         || null,
      obra_social:      form.obra_social       || null,
      numero_afiliado:  form.numero_afiliado  || null,
      motivo_consulta:  form.motivo_consulta  || null,
      diagnostico:      form.diagnostico      || null,
      cuit:             form.cuit             || null,
      razon_social:     form.razon_social     || null,
      condicion_iva:    form.condicion_iva    || null,
      direccion_fiscal: form.direccion_fiscal || null,
      cbu:              form.cbu              || null,
      alias_cbu:        form.alias_cbu        || null,
    }).eq('id', id)

    if (error) { setError('Error al guardar los cambios.'); setSaving(false) }
    else router.push(`/pacientes/${pacienteSlug(form.apellido, form.nombre, id)}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
      </svg>
    </div>
  )

  const TInput = ({ field, placeholder, type = 'text', required }: { field: string; placeholder?: string; type?: string; required?: boolean }) => (
    <input
      type={type} value={form[field as keyof typeof form]} onChange={e => set(field)(e.target.value)}
      placeholder={placeholder} required={required}
      className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset}
    />
  )

  return (
    <div className="min-h-screen" style={{ background: '#0A0E1A' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-4 mb-8 anim-fade-up">
          <Link href={`/pacientes/${slug}`}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>Editar paciente</h1>
            <p className="text-sm mt-0.5" style={{ color: '#5A6A88' }}>Modificá los datos del perfil</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <Card title="Datos personales" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label text="Nombre" required /><TInput field="nombre" placeholder="Juan" required /></div>
              <div><Label text="Apellido" required /><TInput field="apellido" placeholder="García" required /></div>
              <div><Label text="DNI" /><TInput field="dni" placeholder="12.345.678" /></div>
              <div><Label text="Fecha de nacimiento" /><TInput field="fecha_nacimiento" type="date" /></div>
            </div>
          </Card>

          <Card title="Contacto" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label text="Teléfono" /><TInput field="telefono" placeholder="+54 9 11 1234-5678" /></div>
              <div><Label text="Email" /><TInput field="email" type="email" placeholder="paciente@email.com" /></div>
            </div>
          </Card>

          <Card title="Cobertura médica" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label text="Obra social / prepaga" /><TInput field="obra_social" placeholder="OSDE, Swiss Medical…" /></div>
              <div><Label text="Nº de afiliado" /><TInput field="numero_afiliado" placeholder="123456789" /></div>
            </div>
          </Card>

          {consultorios.length > 0 && (
            <Card title="Consultorio" icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {consultorios.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConsultorioId(prev => prev === c.id ? '' : c.id)}
                    className="flex items-center gap-3 h-11 px-4 rounded-xl text-sm font-medium transition-all text-left"
                    style={{
                      background: consultorioId === c.id ? `${c.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${consultorioId === c.id ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                      color: consultorioId === c.id ? c.color : '#6B7A99',
                    }}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    {c.nombre}
                    {consultorioId === c.id && (
                      <svg className="ml-auto flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              {consultorioId && (
                <button type="button" onClick={() => setConsultorioId('')}
                  className="text-xs transition-opacity hover:opacity-70 mt-1"
                  style={{ color: '#5A6A88' }}>
                  Quitar asignación
                </button>
              )}
            </Card>
          )}

          <Card title="Información clínica" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <div>
              <Label text="Motivo de consulta" />
              <textarea value={form.motivo_consulta} onChange={e => set('motivo_consulta')(e.target.value)}
                placeholder="Motivo principal de consulta…" rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <Label text="Diagnóstico" />
              <textarea value={form.diagnostico} onChange={e => set('diagnostico')(e.target.value)}
                placeholder="Diagnóstico actual…" rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors resize-none"
                style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <Label text="Estado" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {estadoOpts.map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('estado')(opt.value)}
                    className="h-9 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.estado === opt.value ? opt.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.estado === opt.value ? opt.color + '50' : 'rgba(255,255,255,0.07)'}`,
                      color: form.estado === opt.value ? opt.color : '#5A6A88',
                    }}>{opt.label}</button>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Facturación" icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 10h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label text="CUIT / CUIL" /><TInput field="cuit" placeholder="20-12345678-9" /></div>
              <div><Label text="Razón social" /><TInput field="razon_social" placeholder="Juan García" /></div>
            </div>
            <div>
              <Label text="Condición IVA" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Monotributista', 'Responsable Inscripto', 'Exento', 'Consumidor Final', 'No Responsable'].map(opt => (
                  <button key={opt} type="button" onClick={() => set('condicion_iva')(form.condicion_iva === opt ? '' : opt)}
                    className="h-9 px-3 rounded-xl text-xs font-medium transition-all text-left"
                    style={{
                      background: form.condicion_iva === opt ? 'rgba(62,201,201,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.condicion_iva === opt ? 'rgba(62,201,201,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      color: form.condicion_iva === opt ? '#3EC9C9' : '#5A6A88',
                    }}>{opt}</button>
                ))}
              </div>
            </div>
            <div><Label text="Dirección fiscal" /><TInput field="direccion_fiscal" placeholder="Av. Corrientes 1234, CABA" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label text="CBU" /><TInput field="cbu" placeholder="0000000000000000000000" /></div>
              <div><Label text="Alias CBU" /><TInput field="alias_cbu" placeholder="alias.banco.mp" /></div>
            </div>
          </Card>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1 pb-8">
            <Link href={`/pacientes/${slug}`}
              className="h-10 px-5 rounded-xl text-sm font-medium flex items-center transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="h-10 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? (
                <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                </svg>Guardando…</>
              ) : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>Guardar cambios</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
