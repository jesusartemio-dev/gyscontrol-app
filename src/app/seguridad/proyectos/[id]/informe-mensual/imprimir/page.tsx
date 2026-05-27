import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { mesParamSchema } from '@/lib/validators/informeMensual'
import { formatearMes } from '@/lib/utils/periodoMes'
import { obtenerInformeMensual } from '@/lib/services/informeMensualSeguridad'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { ESTADO_REPORTE_LABELS } from '@/lib/validators/reporteSeguridad'
import { PrintControls } from './PrintControls'

const ESTADO_JORNADA_LABEL: Record<string, string> = {
  iniciado: 'Iniciado', pendiente: 'Pendiente',
  aprobado: 'Aprobado', rechazado: 'Rechazado',
}

function formatDate(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateLong(d: Date | string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, pageBreak = false }: {
  title: string
  children: React.ReactNode
  pageBreak?: boolean
}) {
  return (
    <section className={pageBreak ? 'break-before-page' : ''}>
      <h2 className="text-base font-bold border-b pb-1 mb-3 mt-0">{title}</h2>
      {children}
    </section>
  )
}

// ─── Print table ──────────────────────────────────────────────────────────────

function PrintTable({ headers, rows }: {
  headers: string[]
  rows: (string | number | null | undefined)[][]
}) {
  return (
    <table className="w-full text-xs border-collapse mb-4">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="border border-gray-300 px-2 py-2 text-center text-gray-400 italic">
              Sin datos para este período
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-300 px-2 py-1">
                  {cell ?? '—'}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ImprimirPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const { id } = await params
  const { mes: mesParam } = await searchParams
  const mes = mesParamSchema.safeParse(mesParam).success ? mesParam! : formatearMes(new Date())

  const data = await obtenerInformeMensual(id, mes)
  if (!data) redirect(`/seguridad/proyectos/${id}/informe-mensual`)

  const { proyecto, periodo, kpis, personal, jornadas, registrosPorTipo, entregasEpp, reportesSemanales } = data
  const backUrl = `/seguridad/proyectos/${id}/informe-mensual`

  const TIPOS_ORDENADOS: TipoRegistroSeguridad[] = [
    'charla', 'inspeccion', 'observacion', 'incidente',
    'riesgo_critico', 'actividad_general', 'medio_ambiente', 'prevencion_salud',
  ]

  const totalRegistros = TIPOS_ORDENADOS.reduce(
    (s, t) => s + registrosPorTipo[t].length, 0,
  )

  return (
    <>
      <style>{`
        @page { size: A4; margin: 1.5cm; }
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 11px; }
          h1 { font-size: 16px; }
          h2 { font-size: 13px; }
          table { font-size: 10px; }
        }
      `}</style>

      <PrintControls backUrl={backUrl} />

      <div className="max-w-[900px] mx-auto px-4 pb-16 space-y-8 text-sm">

        {/* ── Portada ─────────────────────────────────────────────────── */}
        <div className="space-y-4 border-b pb-8">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Informe mensual de seguridad</p>
            <h1 className="text-2xl font-bold leading-tight">{proyecto.nombre}</h1>
            <p className="text-sm font-mono text-gray-500">{proyecto.codigo}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">Período: </span>
              <strong>{periodo.labelMes}</strong>
            </div>
            <div>
              <span className="text-gray-500">Días laborables: </span>
              <strong>{periodo.diasLaborables}</strong>
            </div>
            {proyecto.cliente && (
              <div>
                <span className="text-gray-500">Cliente: </span>
                <strong>{proyecto.cliente.nombre}</strong>
              </div>
            )}
            <div>
              <span className="text-gray-500">Gestor: </span>
              <strong>{proyecto.gestor.name ?? proyecto.gestor.email}</strong>
            </div>
            <div>
              <span className="text-gray-500">Estado del proyecto: </span>
              <strong className="capitalize">{proyecto.estado.replace(/_/g, ' ')}</strong>
            </div>
            <div>
              <span className="text-gray-500">Inicio del proyecto: </span>
              <strong>{formatDateLong(proyecto.fechaInicio)}</strong>
            </div>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <Section title="Indicadores del período">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'HHT del mes', value: kpis.hht.toFixed(1) },
              { label: 'Personal único', value: kpis.personalUnico },
              { label: 'Jornadas', value: kpis.jornadasTotal },
              { label: 'Días sin accidentes', value: kpis.diasSinAccidentes },
              { label: 'Charlas', value: kpis.charlasCount },
              { label: 'Asistentes', value: kpis.asistentesCharlas },
              { label: 'Inspecciones', value: kpis.inspeccionesCount },
              { label: 'Observaciones', value: kpis.observacionesCount },
              { label: 'Incidentes', value: kpis.incidentesCount },
              { label: 'Riesgos críticos', value: kpis.riesgoCriticoCount },
              { label: 'Entregas EPP', value: kpis.entregasEppCount },
              { label: 'Registros totales', value: totalRegistros },
            ].map(({ label, value }) => (
              <div key={label} className="border rounded p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Personal ─────────────────────────────────────────────────── */}
        <Section title="Personal del mes" pageBreak>
          <PrintTable
            headers={['Nombre', 'Email', 'Rol', 'Horas', 'Jornadas']}
            rows={personal.map((p) => [
              p.usuario.name ?? '—',
              p.usuario.email,
              p.rol ?? '—',
              p.totalHoras.toFixed(1),
              p.jornadasCount,
            ])}
          />
        </Section>

        {/* ── Jornadas ─────────────────────────────────────────────────── */}
        <Section title="Jornadas de campo">
          <PrintTable
            headers={['Fecha', 'Supervisor', 'Estado', 'Personas', 'Horas', 'SSOMA']}
            rows={jornadas.map((j) => {
              const horas = j.tareas.flatMap(t => t.miembros).reduce((s, m) => s + m.horas, 0)
              const personas = new Set(j.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))).size
              return [
                formatDate(j.fechaTrabajo),
                j.supervisor?.name ?? '—',
                ESTADO_JORNADA_LABEL[j.estado] ?? j.estado,
                personas,
                horas.toFixed(1),
                j.evidenciaSeguridad ? `${j.evidenciaSeguridad.estado} (${j.evidenciaSeguridad._count.registros} reg.)` : '—',
              ]
            })}
          />
        </Section>

        {/* ── Registros por tipo ────────────────────────────────────────── */}
        {TIPOS_ORDENADOS.map((tipo, idx) => {
          const registros = registrosPorTipo[tipo]
          const esCharla = tipo === 'charla'
          return (
            <Section key={tipo} title={TIPO_REGISTRO_LABELS[tipo]} pageBreak={idx === 0}>
              {registros.length === 0 ? (
                <p className="text-xs text-gray-400 italic mb-4">
                  Sin registros de este tipo en el período.
                </p>
              ) : (
                <>
                  <PrintTable
                    headers={[
                      'Fecha', 'Descripción',
                      ...(esCharla ? ['Asistentes'] : []),
                      'Supervisor', 'Ingeniero', 'Fotos',
                    ]}
                    rows={registros.map((r) => [
                      formatDate(r.evidencia.jornada.fechaTrabajo),
                      r.descripcion.length > 80
                        ? r.descripcion.slice(0, 79) + '…'
                        : r.descripcion,
                      ...(esCharla ? [r.asistentes ?? 0] : []),
                      r.evidencia.jornada.supervisor?.name ?? '—',
                      r.ingeniero.name ?? '—',
                      r.fotos.length,
                    ])}
                  />
                  {/* Miniaturas de fotos */}
                  {registros.some((r) => r.fotos.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
                      {registros.flatMap((r) => r.fotos).slice(0, 24).map((f) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={f.id}
                          src={`/api/seguridad/registros/fotos/${f.id}/contenido`}
                          alt={f.nombreArchivo}
                          className="h-16 w-16 object-cover rounded border"
                          loading="eager"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </Section>
          )
        })}

        {/* ── EPP ──────────────────────────────────────────────────────── */}
        <Section title="Entregas de EPP" pageBreak>
          <PrintTable
            headers={['Fecha', 'N° entrega', 'Empleado', 'Cargo', 'Ítems', 'Entregado por', 'Firma']}
            rows={entregasEpp.map((e) => [
              formatDate(e.fechaEntrega),
              e.numero,
              e.empleado.user.name ?? '—',
              e.empleado.cargo?.nombre ?? '—',
              e.items.length,
              e.entregadoPor.name ?? '—',
              e.firmaUrl ? 'Sí' : 'No',
            ])}
          />
        </Section>

        {/* ── Reportes semanales ────────────────────────────────────────── */}
        <Section title="Reportes semanales">
          {reportesSemanales.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No se han creado reportes semanales para este mes.
            </p>
          ) : (
            <div className="space-y-3">
              {reportesSemanales.map((r) => (
                <div key={r.id} className="border rounded p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{r.semanaIso}</p>
                    <span className="text-[10px] border rounded px-1.5 py-0.5 bg-gray-50">
                      {ESTADO_REPORTE_LABELS[r.estado as keyof typeof ESTADO_REPORTE_LABELS] ?? r.estado}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(r.fechaInicio)} — {formatDate(r.fechaFin)} · {r.ingeniero.name ?? r.ingeniero.email}
                  </p>
                  {r.resumenEjecutivo && (
                    <p className="text-xs leading-relaxed mt-1">{r.resumenEjecutivo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Pie ──────────────────────────────────────────────────────── */}
        <div className="text-[10px] text-gray-400 text-center border-t pt-4">
          Generado desde GySControl · {proyecto.codigo} · {periodo.labelMes}
        </div>
      </div>
    </>
  )
}
