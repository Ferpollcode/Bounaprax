import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { extractIdFromSlug } from '@/lib/utils'
import type { Paciente, Sesion, Pago } from '@/types'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function fmtFecha(s: string) {
  const [y, m, d] = s.split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

export default async function ImprimirPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const id = extractIdFromSlug(slug)
  const supabase = await createClient()

  const [{ data: paciente }, { data: sesiones }, { data: pagos }] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', id).single(),
    supabase.from('sesiones').select('*').eq('paciente_id', id).order('fecha', { ascending: true }),
    supabase.from('pagos').select('*').eq('paciente_id', id).order('fecha', { ascending: false }),
  ])

  if (!paciente) notFound()

  const p = paciente as Paciente
  const ss = (sesiones ?? []) as Sesion[]
  const pg = (pagos ?? []) as Pago[]
  const totalPagado = pg.filter(x => x.estado === 'pagado').reduce((s, x) => s + (x.monto ?? 0), 0)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
        body { font-family: 'Georgia', serif; }
        .print-container { max-width: 820px; margin: 0 auto; padding: 32px; color: #1a1a2e; }
        h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
        h2 { font-size: 16px; font-weight: bold; margin: 24px 0 10px; border-bottom: 2px solid #3EC9C9; padding-bottom: 6px; color: #1a3a5c; }
        h3 { font-size: 14px; font-weight: bold; margin: 12px 0 4px; color: #2d3748; }
        p, td, th { font-size: 13px; line-height: 1.6; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
        .field { margin-bottom: 8px; }
        .field-label { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
        .field-value { font-size: 13px; color: #222; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 50px; font-size: 11px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; border-bottom: 1px solid #ddd; padding: 6px 8px; }
        td { padding: 8px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .sesion-card { border: 1px solid #e8e8e8; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #aaa; }
      `}</style>

      {/* Botón imprimir (no se imprime) */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button onClick={() => window.history.back()}
          className="h-9 px-4 rounded-xl text-sm font-medium"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
          ← Volver
        </button>
        <button onClick={() => window.print()}
          className="h-9 px-4 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#3EC9C9,#2BA8A8)', color: '#fff' }}>
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      <div className="print-container" style={{ maxWidth: 820, margin: '0 auto', padding: 32, color: '#1a1a2e', fontFamily: 'Georgia, serif' }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 'bold', margin: '0 0 4px' }}>Historia Clínica Digital</h1>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              Generado el {fmtFecha(new Date().toISOString().split('T')[0])}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 22, fontWeight: 'bold', color: '#3EC9C9', margin: 0 }}>Buonaprax</p>
            <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Plataforma de gestión clínica</p>
          </div>
        </div>

        <div style={{ height: 3, background: 'linear-gradient(90deg, #3EC9C9, #818CF8)', borderRadius: 4, marginBottom: 28 }} />

        {/* Datos del paciente */}
        <h2 style={{ fontSize: 15, fontWeight: 'bold', margin: '0 0 12px', borderBottom: '2px solid #3EC9C9', paddingBottom: 6, color: '#1a3a5c' }}>
          Datos del paciente
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            ['Nombre completo', `${p.nombre} ${p.apellido}`],
            ['DNI', p.dni ?? '—'],
            ['Fecha de nacimiento', p.fecha_nacimiento ? fmtFecha(p.fecha_nacimiento) : '—'],
            ['Teléfono', p.telefono ?? '—'],
            ['Email', p.email ?? '—'],
            ['Obra social', p.obra_social ?? '—'],
            ['N° afiliado', p.numero_afiliado ?? '—'],
            ['Estado', p.estado ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#222', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Motivo y diagnóstico */}
        {(p.motivo_consulta || p.diagnostico) && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 'bold', margin: '20px 0 12px', borderBottom: '2px solid #3EC9C9', paddingBottom: 6, color: '#1a3a5c' }}>
              Motivo de consulta y diagnóstico
            </h2>
            {p.motivo_consulta && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', margin: '0 0 4px' }}>Motivo de consulta</p>
                <p style={{ fontSize: 13, color: '#222', margin: 0 }}>{p.motivo_consulta}</p>
              </div>
            )}
            {p.diagnostico && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', margin: '0 0 4px' }}>Diagnóstico</p>
                <p style={{ fontSize: 13, color: '#222', margin: 0 }}>{p.diagnostico}</p>
              </div>
            )}
          </>
        )}

        {/* Sesiones */}
        {ss.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 'bold', margin: '20px 0 12px', borderBottom: '2px solid #3EC9C9', paddingBottom: 6, color: '#1a3a5c' }}>
              Historial de sesiones ({ss.length})
            </h2>
            {ss.map((s, i) => (
              <div key={s.id} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 14px', marginBottom: 10, pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: '#1a1a2e' }}>
                    Sesión {i + 1} — {fmtFecha(s.fecha)}
                    {s.hora_inicio && ` · ${s.hora_inicio}`}
                    {s.hora_fin && ` – ${s.hora_fin}`}
                  </p>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: s.estado === 'realizada' ? '#34D399' : s.estado === 'cancelada' ? '#F87171' : s.estado === 'inasistencia' ? '#FBBF24' : '#3EC9C9' }}>
                    {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                  </span>
                </div>
                {s.observaciones && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Observaciones:</strong> {s.observaciones}</p>}
                {s.tratamiento && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Tratamiento:</strong> {s.tratamiento}</p>}
                {s.objetivo && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Objetivo:</strong> {s.objetivo}</p>}
                {s.evolucion && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Evolución:</strong> {s.evolucion}</p>}
                {s.proximos_pasos && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Próximos pasos:</strong> {s.proximos_pasos}</p>}
                {s.monto && <p style={{ fontSize: 12, margin: '4px 0', color: '#333' }}><strong>Honorarios:</strong> ${s.monto.toLocaleString('es-AR')} — {s.pagado ? 'Pagado' : 'Pendiente'}</p>}
              </div>
            ))}
          </>
        )}

        {/* Resumen de pagos */}
        {pg.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 'bold', margin: '20px 0 12px', borderBottom: '2px solid #3EC9C9', paddingBottom: 6, color: '#1a3a5c' }}>
              Resumen de pagos
            </h2>
            <p style={{ fontSize: 13, marginBottom: 10 }}>
              Total cobrado: <strong style={{ color: '#34D399' }}>${totalPagado.toLocaleString('es-AR')}</strong>
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha', 'Concepto', 'Tipo', 'Monto', 'Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', borderBottom: '1px solid #ddd', padding: '6px 8px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pg.map(pago => (
                  <tr key={pago.id}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>{fmtFecha(pago.fecha)}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>{pago.concepto ?? '—'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>{pago.tipo}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>${(pago.monto ?? 0).toLocaleString('es-AR')}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12, color: pago.estado === 'pagado' ? '#34D399' : '#F87171' }}>{pago.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #ddd', fontSize: 11, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
          <span>Documento generado por Buonaprax · Confidencial</span>
          <span>{p.nombre} {p.apellido} · {fmtFecha(new Date().toISOString().split('T')[0])}</span>
        </div>
      </div>
    </>
  )
}
