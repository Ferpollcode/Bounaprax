import { createClient } from '@/lib/supabase/server'
import { ReportesClient } from './ReportesClient'
import { hasOptimizaAccess } from '@/lib/access'

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
    supabase.from('sesiones').select('id, fecha, estado, monto').gte('fecha', desde).lte('fecha', hasta),
    supabase.from('pagos').select('id, fecha, monto, tipo, estado').gte('fecha', desde).lte('fecha', hasta),
    supabase.from('pacientes').select('id, estado, created_at'),
    supabase.auth.getUser(),
  ])

  const { data: profile } = user
    ? await supabase.from('profiles').select('plan, access_expires_at, created_at').eq('id', user.id).single()
    : { data: null }

  return (
    <ReportesClient
      sesiones={sesiones ?? []}
      pagos={pagos ?? []}
      pacientes={pacientes ?? []}
      mes={`${year}-${String(month).padStart(2, '0')}`}
      desde={desde}
      hasta={hasta}
      isPro={hasOptimizaAccess(profile)}
    />
  )
}
