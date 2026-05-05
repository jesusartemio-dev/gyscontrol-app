import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { rangoSemanaIso } from '@/lib/validators/reporteSeguridad'
import { listarRegistrosSeguridadDeSemana, obtenerJornadasDeSemana } from './registroSeguridad'

// ─── Include helpers ─────────────────────────────────────────────────────────

const REPORTE_INCLUDE = {
  proyecto: { select: { id: true, codigo: true, nombre: true } },
  ingeniero: { select: { id: true, name: true, email: true } },
  aprobador: { select: { id: true, name: true } },
} as const satisfies Prisma.ReporteSemanalSeguridadInclude

export type ReporteSeguridadDetalle = Prisma.ReporteSemanalSeguridadGetPayload<{
  include: typeof REPORTE_INCLUDE
}>

// ─── Obtener o crear ─────────────────────────────────────────────────────────

/**
 * Si ya existe un reporte para (proyectoId, semanaIso) lo retorna;
 * si no, lo crea en estado `borrador`.
 */
export async function obtenerOCrearReporte(
  proyectoId: string,
  semanaIso: string,
  ingenieroId: string,
): Promise<ReporteSeguridadDetalle> {
  const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIso)

  const existing = await prisma.reporteSemanalSeguridad.findUnique({
    where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
    include: REPORTE_INCLUDE,
  })
  if (existing) return existing

  return prisma.reporteSemanalSeguridad.create({
    data: {
      proyectoId,
      ingenieroId,
      semanaIso,
      fechaInicio,
      fechaFin,
      updatedAt: new Date(),
    },
    include: REPORTE_INCLUDE,
  })
}

// ─── Datos agregados ─────────────────────────────────────────────────────────

export interface KpiCalculado {
  jornadasCount: number
  personasEnCampo: number
  registrosTotales: number
  charlaCount: number
  inspeccionCount: number
  observacionCount: number
  incidenteCount: number
  accidenteCount: number
  actividadGeneralCount: number
  riesgoCriticoCount: number
  medioAmbienteCount: number
  prevencionSaludCount: number
  asistentesCharla: number
  fotosCount: number
}

export interface ReporteAgregado {
  reporte: ReporteSeguridadDetalle
  kpiCalculado: KpiCalculado
  registros: Awaited<ReturnType<typeof listarRegistrosSeguridadDeSemana>>
  jornadas: Awaited<ReturnType<typeof obtenerJornadasDeSemana>>
}

export async function obtenerReporteAgregado(reporteId: string): Promise<ReporteAgregado | null> {
  const reporte = await prisma.reporteSemanalSeguridad.findUnique({
    where: { id: reporteId },
    include: REPORTE_INCLUDE,
  })
  if (!reporte) return null

  const { proyectoId, fechaInicio, fechaFin } = reporte

  const [registros, jornadas] = await Promise.all([
    listarRegistrosSeguridadDeSemana(proyectoId, fechaInicio, fechaFin),
    obtenerJornadasDeSemana(proyectoId, fechaInicio, fechaFin),
  ])

  // Unique persons in campo (supervisor + miembros)
  const personaIds = new Set<string>()
  for (const j of jornadas) {
    personaIds.add(j.supervisorId)
    for (const t of j.tareas) {
      for (const m of t.miembros) {
        personaIds.add(m.usuarioId)
      }
    }
  }

  const kpiCalculado: KpiCalculado = {
    jornadasCount: jornadas.length,
    personasEnCampo: personaIds.size,
    registrosTotales: registros.length,
    charlaCount: registros.filter((r) => r.tipo === 'charla').length,
    inspeccionCount: registros.filter((r) => r.tipo === 'inspeccion').length,
    observacionCount: registros.filter((r) => r.tipo === 'observacion').length,
    incidenteCount: registros.filter((r) => r.tipo === 'incidente').length,
    accidenteCount: 0, // no hay campo en RegistroSeguridad para accidentes — se usa el override
    actividadGeneralCount: registros.filter((r) => r.tipo === 'actividad_general').length,
    riesgoCriticoCount: registros.filter((r) => r.tipo === 'riesgo_critico').length,
    medioAmbienteCount: registros.filter((r) => r.tipo === 'medio_ambiente').length,
    prevencionSaludCount: registros.filter((r) => r.tipo === 'prevencion_salud').length,
    asistentesCharla: registros
      .filter((r) => r.tipo === 'charla')
      .reduce((s, r) => s + (r.asistentes ?? 0), 0),
    fotosCount: registros.reduce((s, r) => s + r.fotos.length, 0),
  }

  return { reporte, kpiCalculado, registros, jornadas }
}

export { REPORTE_INCLUDE }
