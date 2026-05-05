import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Paciente, Sesion, Pago, Documento, Consultorio } from '@/types'
import { PatientDetailClient, type DocWithPath } from './PatientDetailClient'
import { extractIdFromSlug } from '@/lib/utils'
import { getAccessProfile, hasProAccess } from '@/lib/access'

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const id = extractIdFromSlug(slug)
  const supabase = await createClient()

  const [
    { data: paciente },
    { data: sesiones },
    { data: pagos },
    { data: documentos },
    { data: consultorios },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase.from('sesiones').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
    supabase.from('pagos').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
    supabase.from('documentos').select('*').eq('paciente_id', id).order('created_at', { ascending: false }),
    supabase.from('consultorios').select('id, nombre, color').eq('activo', true).order('nombre'),
    supabase.auth.getUser(),
  ])

  if (!paciente) notFound()

  const profile = await getAccessProfile(supabase, user?.id)

  // Extract storage path from URL for each document (needed for signed URLs)
  const MARKER = '/storage/v1/object/public/documentos/'
  const docs = ((documentos ?? []) as Documento[]).map((doc): DocWithPath => {
    const idx = doc.archivo_url.indexOf(MARKER)
    return { ...doc, storagePath: idx >= 0 ? doc.archivo_url.slice(idx + MARKER.length) : '' }
  })

  return (
    <PatientDetailClient
      paciente={paciente as Paciente}
      sesiones={(sesiones ?? []) as Sesion[]}
      pagos={(pagos ?? []) as Pago[]}
      docs={docs}
      consultorios={(consultorios ?? []) as Pick<Consultorio, 'id' | 'nombre' | 'color'>[]}
      isPro={hasProAccess(profile)}
    />
  )
}
