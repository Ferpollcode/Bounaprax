import { createClient } from '@/lib/supabase/server'
import { ReportesClient } from './ReportesClient'
import { getAccessProfile, hasProAccess } from '@/lib/access'

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const supabase = await createClient()

  const now = new Date()
  const [year, month] = mes
    ? mes.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1]

  const desde = `${year}-${String(month).padStart(2, '0')}-01`
  const hasta = new Date(year, month, 0).toISOString().split('T')[0]

  const [
    { data: sesiones },
    { data: pagos },
    { data: pacientes },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('sesiones').select('id, fecha, estado, monto, pagado').gte('fecha', desde).lte('fecha', hasta),
    supabase.from('pagos').select('id, fecha, monto, tipo, estado, sesion_id').gte('fecha', desde).lte('fecha', hasta),
    supabase.from('pacientes').select('id, estado, created_at'),
    supabase.auth.getUser(),
  ])

  const profile = await getAccessProfile(supabase, user?.id)

  return (
    <ReportesClient
      sesiones={sesiones ?? []}
      pagos={pagos ?? []}
      pacientes={pacientes ?? []}
      mes={`${year}-${String(month).padStart(2, '0')}`}
      desde={desde}
      hasta={hasta}
      isPro={hasProAccess(profile)}
    />
  )
}
