import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ExcelJS from 'exceljs'
import { mesParamSchema } from '@/lib/validators/informeMensual'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import { ESTADO_REPORTE_LABELS } from '@/lib/validators/reporteSeguridad'
import { obtenerInformeMensual } from '@/lib/services/informeMensualSeguridad'
import type { JornadaInforme, EntregaInforme, RegistroSeguridadInforme, ReporteInforme } from '@/lib/services/informeMensualSeguridad'

export const maxDuration = 60

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad']

// ─── Styling helpers ──────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2E8F0' },
}

function styleHeader(row: ExcelJS.Row, colCount: number) {
  row.font = { bold: true }
  row.fill = HEADER_FILL
  row.border = {
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }
  for (let i = 1; i <= colCount; i++) {
    row.getCell(i).alignment = { vertical: 'middle', wrapText: false }
  }
  row.commit()
}

function addHeaders(ws: ExcelJS.Worksheet, headers: string[], widths?: number[]) {
  ws.addRow(headers)
  styleHeader(ws.lastRow!, headers.length)
  headers.forEach((_, i) => {
    ws.getColumn(i + 1).width = widths?.[i] ?? 22
  })
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildResumen(wb: ExcelJS.Workbook, data: ReturnType<typeof buildData>) {
  const ws = wb.addWorksheet('Resumen')
  ws.getColumn(1).width = 32
  ws.getColumn(2).width = 20

  const titleRow = ws.addRow(['KPI', 'Valor'])
  styleHeader(titleRow, 2)

  const kpis = data.kpis
  const rows: [string, string | number][] = [
    ['Período', data.periodo.labelMes],
    ['Días laborables', data.periodo.diasLaborables],
    ['HHT del mes', kpis.hht.toFixed(1)],
    ['HHT acumulado', kpis.hhtAcumulado.toFixed(1)],
    ['Personal único', kpis.personalUnico],
    ['Jornadas total', kpis.jornadasTotal],
    ['Jornadas aprobadas', kpis.jornadasAprobadas],
    ['Jornadas pendientes', kpis.jornadasPendientes],
    ['Jornadas rechazadas', kpis.jornadasRechazadas],
    ['Días sin accidentes', kpis.diasSinAccidentes],
    ['Charlas NDAD', kpis.charlasCount],
    ['Asistentes a charlas', kpis.asistentesCharlas],
    ['Inspecciones', kpis.inspeccionesCount],
    ['Observaciones', kpis.observacionesCount],
    ['Incidentes', kpis.incidentesCount],
    ['Riesgos críticos', kpis.riesgoCriticoCount],
    ['Medio ambiente', kpis.medioAmbienteCount],
    ['Prevención de salud', kpis.prevencionSaludCount],
    ['Actividad general', kpis.actividadGeneralCount],
    ['Entregas EPP', kpis.entregasEppCount],
    ['Fotos totales', kpis.fotosCount],
  ]
  rows.forEach(([label, val]) => {
    ws.addRow([label, val])
  })
}

function buildPersonal(wb: ExcelJS.Workbook, data: ReturnType<typeof buildData>) {
  const ws = wb.addWorksheet('Personal')
  addHeaders(ws,
    ['Nombre', 'Email', 'Rol en proyecto', 'Horas', 'Jornadas'],
    [30, 35, 22, 12, 12],
  )
  for (const p of data.personal) {
    ws.addRow([
      p.usuario.name ?? '—',
      p.usuario.email,
      p.rol ?? '—',
      p.totalHoras.toFixed(1),
      p.jornadasCount,
    ])
  }
}

function buildJornadas(wb: ExcelJS.Workbook, jornadas: JornadaInforme[]) {
  const ws = wb.addWorksheet('Jornadas')
  addHeaders(ws,
    ['Fecha', 'Supervisor', 'Estado', 'N° tareas', 'Personas', 'Horas', 'Estado SSOMA', 'Registros SSOMA'],
    [14, 28, 14, 12, 12, 10, 16, 18],
  )
  for (const j of jornadas) {
    const horas = j.tareas.flatMap(t => t.miembros).reduce((s, m) => s + m.horas, 0)
    const personas = new Set(j.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))).size
    ws.addRow([
      formatDate(j.fechaTrabajo),
      j.supervisor?.name ?? '—',
      j.estado,
      j.tareas.length,
      personas,
      horas.toFixed(1),
      j.evidenciaSeguridad?.estado ?? '—',
      j.evidenciaSeguridad?._count.registros ?? 0,
    ])
  }
}

function buildRegistros(
  wb: ExcelJS.Workbook,
  sheetName: string,
  tipo: TipoRegistroSeguridad,
  registros: RegistroSeguridadInforme[],
) {
  const ws = wb.addWorksheet(sheetName)
  const esCharla = tipo === 'charla'
  const headers = [
    'Fecha jornada', 'Descripción',
    ...(esCharla ? ['Asistentes'] : []),
    'Supervisor', 'Ingeniero', 'Observaciones', 'N° fotos',
  ]
  const widths = [14, 50, ...(esCharla ? [14] : []), 28, 28, 40, 10]
  addHeaders(ws, headers, widths)

  for (const r of registros) {
    ws.addRow([
      formatDate(r.evidencia.jornada.fechaTrabajo),
      r.descripcion,
      ...(esCharla ? [r.asistentes ?? 0] : []),
      r.evidencia.jornada.supervisor?.name ?? '—',
      r.ingeniero.name ?? r.ingeniero.email,
      r.observaciones ?? '—',
      r.fotos.length,
    ])
  }
}

function buildEPP(wb: ExcelJS.Workbook, entregas: EntregaInforme[]) {
  const ws = wb.addWorksheet('Entregas EPP')
  addHeaders(ws,
    ['Fecha', 'N° entrega', 'Empleado', 'Cargo', 'N° ítems', 'Entregado por', 'Firma', 'Estado'],
    [14, 18, 30, 24, 12, 28, 10, 14],
  )
  for (const e of entregas) {
    ws.addRow([
      formatDate(e.fechaEntrega),
      e.numero,
      e.empleado.user.name ?? e.empleado.user.email,
      e.empleado.cargo?.nombre ?? '—',
      e.items.length,
      e.entregadoPor.name ?? '—',
      e.firmaUrl ? 'Sí' : 'No',
      e.estado,
    ])
  }
}

function buildReportes(wb: ExcelJS.Workbook, reportes: ReporteInforme[]) {
  const ws = wb.addWorksheet('Reportes semanales')
  addHeaders(ws,
    ['Semana ISO', 'Fecha inicio', 'Fecha fin', 'Estado', 'Ingeniero', 'HHT', 'Incidentes', 'Resumen ejecutivo'],
    [16, 14, 14, 16, 28, 10, 14, 60],
  )
  for (const r of reportes) {
    ws.addRow([
      r.semanaIso,
      formatDate(r.fechaInicio),
      formatDate(r.fechaFin),
      ESTADO_REPORTE_LABELS[r.estado as keyof typeof ESTADO_REPORTE_LABELS] ?? r.estado,
      r.ingeniero.name ?? r.ingeniero.email,
      r.horasHombre?.toFixed(1) ?? '—',
      r.incidentesCount ?? '—',
      r.resumenEjecutivo ?? '—',
    ])
  }
}

// Type alias to avoid re-importing
type InformeData = NonNullable<Awaited<ReturnType<typeof obtenerInformeMensual>>>

function buildData(data: InformeData) {
  return data
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ proyectoId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_PERMITIDOS.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { proyectoId } = await params
    const mesRaw = req.nextUrl.searchParams.get('mes') ?? ''
    const mesParsed = mesParamSchema.safeParse(mesRaw)
    if (!mesParsed.success)
      return NextResponse.json({ error: 'Parámetro mes inválido' }, { status: 400 })

    const data = await obtenerInformeMensual(proyectoId, mesParsed.data)
    if (!data)
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    const wb = new ExcelJS.Workbook()
    wb.creator = 'GySControl'
    wb.created = new Date()

    buildResumen(wb, data)
    buildPersonal(wb, data)
    buildJornadas(wb, data.jornadas)

    const tiposOrdenados: TipoRegistroSeguridad[] = [
      'charla', 'inspeccion', 'observacion', 'incidente',
      'riesgo_critico', 'actividad_general', 'medio_ambiente', 'prevencion_salud',
    ]
    for (const tipo of tiposOrdenados) {
      const label = TIPO_REGISTRO_LABELS[tipo]
      buildRegistros(wb, label, tipo, data.registrosPorTipo[tipo])
    }

    buildEPP(wb, data.entregasEpp)
    buildReportes(wb, data.reportesSemanales)

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `Informe_${data.proyecto.codigo}_${mesParsed.data}.xlsx`

    return new NextResponse(buffer as unknown as Buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[exportar-excel] Error:', error)
    return NextResponse.json({ error: 'Error al generar el Excel' }, { status: 500 })
  }
}
