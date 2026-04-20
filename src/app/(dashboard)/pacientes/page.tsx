import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Paciente } from '@/types'
import { PacientesClient } from './PacientesClient'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*')
    .order('apellido', { ascending: true })

  const lista = (pacientes ?? []) as Paciente[]

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6 sm:mb-8 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold mb-1"
            style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>
            Pacientes
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {lista.length} pacientes en total
          </p>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3EC9C9, #2BA8A8)', color: 'var(--primary-foreground)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          Nuevo paciente
        </Link>
      </div>

      <PacientesClient initialPacientes={lista} />
    </div>
  )
}
