'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Consultorio } from '@/types'

const COLORS = ['#3EC9C9','#F5A623','#A78BFA','#34D399','#FB7185','#60A5FA','#FBBF24','#F472B6']

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#E8EDF5',
}
const inputCls = 'w-full h-10 px-3.5 rounded-xl text-sm outline-none transition-colors'

function focusTeal(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(62,201,201,0.5)'
  e.target.style.background  = 'rgba(62,201,201,0.04)'
}
function blurReset(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
  e.target.style.background  = 'rgba(255,255,255,0.04)'
}

type FormState = { nombre: string; direccion: string; ciudad: string; telefono: string; color: string }
const emptyForm: FormState = { nombre: '', direccion: '', ciudad: '', telefono: '', color: COLORS[0] }

export default function ConsultoriosPage() {
  const [consultorios, setConsultorios] = useState<Consultorio[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>(emptyForm)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('consultorios').select('*').order('created_at')
    setConsultorios((data ?? []) as Consultorio[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function set(field: keyof FormState) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }))
  }

  function startNew() {
    setForm(emptyForm); setEditing(null); setShowForm(true); setError('')
  }

  function startEdit(c: Consultorio) {
    setForm({ nombre: c.nombre, direccion: c.direccion ?? '', ciudad: c.ciudad ?? '', telefono: c.telefono ?? '', color: c.color })
    setEditing(c.id); setShowForm(true); setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      nombre:    form.nombre,
      direccion: form.direccion || null,
      ciudad:    form.ciudad    || null,
      telefono:  form.telefono  || null,
      color:     form.color,
      professional_id: user.id,
    }

    const { error } = editing
      ? await supabase.from('consultorios').update(payload).eq('id', editing)
      : await supabase.from('consultorios').insert(payload)

    if (error) { setError('Error al guardar.'); setSaving(false) }
    else { setShowForm(false); setEditing(null); await load(); setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('consultorios').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  async function toggleActivo(c: Consultorio) {
    const supabase = createClient()
    await supabase.from('consultorios').update({ activo: !c.activo }).eq('id', c.id)
    await load()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#E8EDF5', fontFamily: 'var(--font-display)' }}>Consultorios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5A6A88' }}>
            {consultorios.length === 0 ? 'Agregá tus lugares de trabajo' : `${consultorios.length} consultorio${consultorios.length !== 1 ? 's' : ''} registrado${consultorios.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!showForm && (
          <button onClick={startNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Nuevo consultorio
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSave} className="rounded-2xl p-6 mb-6 space-y-4 anim-fade-up"
          style={{ background: '#0F1524', border: '1px solid rgba(62,201,201,0.2)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: '#E8EDF5' }}>
              {editing ? 'Editar consultorio' : 'Nuevo consultorio'}
            </p>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
              className="transition-opacity hover:opacity-60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>
                Nombre <span style={{ color: '#3EC9C9' }}>*</span>
              </p>
              <input type="text" value={form.nombre} onChange={e => set('nombre')(e.target.value)} required
                placeholder="Consultorio Centro, Clínica San Martín…"
                className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>Dirección</p>
              <input type="text" value={form.direccion} onChange={e => set('direccion')(e.target.value)}
                placeholder="Av. Corrientes 1234"
                className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>Ciudad</p>
              <input type="text" value={form.ciudad} onChange={e => set('ciudad')(e.target.value)}
                placeholder="Buenos Aires"
                className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>Teléfono</p>
              <input type="text" value={form.telefono} onChange={e => set('telefono')(e.target.value)}
                placeholder="+54 11 1234-5678"
                className={inputCls} style={inputStyle} onFocus={focusTeal} onBlur={blurReset} />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1.5" style={{ color: '#5A6A88' }}>Color</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color')(c)}
                    className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline: form.color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      transform: form.color === c ? 'scale(1.15)' : undefined,
                    }} />
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#F87171' }}>{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
              className="h-9 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7A99' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="h-9 px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: saving ? 'rgba(62,201,201,0.35)' : 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#0A0E1A' }}>
              {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear consultorio')}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#3EC9C9" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
          </svg>
        </div>
      ) : consultorios.length === 0 && !showForm ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: '#0F1524', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(62,201,201,0.08)', border: '1px solid rgba(62,201,201,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#3EC9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="#3EC9C9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-base font-medium mb-1" style={{ color: '#E8EDF5' }}>Sin consultorios</p>
          <p className="text-sm mb-5" style={{ color: '#5A6A88' }}>Agregá los lugares donde trabajás</p>
          <button onClick={startNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(62,201,201,0.1)', border: '1px solid rgba(62,201,201,0.2)', color: '#3EC9C9' }}>
            + Agregar consultorio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {consultorios.map(c => (
            <div key={c.id} className="rounded-2xl p-5 flex items-center gap-4 transition-opacity"
              style={{
                background: '#0F1524',
                border: `1px solid ${c.activo ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'}`,
                opacity: c.activo ? 1 : 0.5,
              }}>
              {/* Color dot */}
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12h6v10" stroke={c.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: '#E8EDF5' }}>{c.nombre}</p>
                  {!c.activo && (
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(107,122,153,0.1)', color: '#6B7A99' }}>Inactivo</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#5A6A88' }}>
                  {[c.direccion, c.ciudad].filter(Boolean).join(', ') || 'Sin dirección'}
                  {c.telefono ? ` · ${c.telefono}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleActivo(c)}
                  className="h-8 px-3 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6B7A99' }}>
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => startEdit(c)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#8A9AB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)' }}>
                  {deleting === c.id ? (
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#F87171" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6" stroke="#F87171" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
