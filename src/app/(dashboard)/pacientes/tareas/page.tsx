import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Paciente } from '@/types'
import { TareasGlobalClient } from './TareasGlobalClient'

export interface Tarea {
  id: string
  paciente_id: string
  professional_id: string
  texto: string
  completada: boolean
  created_at: string
}

export default async function TareasPage() {
  const supabase = await createClient()

  const [{ data: pacientes }, { data: tareas }] = await Promise.all([
    supabase.from('pacientes').select('*').order('apellido', { ascending: true }),
    supabase.from('paciente_tareas').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="flex items-center gap-3 mb-6 anim-fade-up">
        <Link
          href="/pacientes"
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Pacientes
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-subtle)' }}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Tareas</span>
      </div>

      <div className="flex items-start justify-between mb-6 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold mb-1"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            Tareas
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Pendientes y completadas por paciente
          </p>
        </div>
      </div>

      <TareasGlobalClient
        pacientes={(pacientes ?? []) as Paciente[]}
        initialTareas={(tareas ?? []) as Tarea[]}
      />
    </div>
  )
}
