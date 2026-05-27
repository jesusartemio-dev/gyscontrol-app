import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { rangoMes, diasLaborablesEnMes, labelMes } from '@/lib/utils/periodoMes'
import { REGISTRO_INCLUDE } from './registroSeguridad'
import { REPORTE_INCLUDE } from './reporteSeguridad'
import type { TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'
import type { KpisMensuales, PersonalMes } from '@/lib/validators/informeMensual'

const TIPOS_REGISTRO: TipoRegistroSeguridad[] = [
  'charla',
  'inspeccion',
  'observacion',
  'incidente',
  'actividad_general',
  'riesgo_critico',
  'medio_ambiente',
  'prevencion_salud',
]

const JORNADA_INCLUDE = {
  supervisor: { select: { id: true, name: true, email: true } },
  aprobadoPor: { select: { id: true, name: true } },
  tareas: {
    include: {
      miembros: {
        include: {
          usuario: { select: { id: true, name: true, email: true } },
        },
      },
      proyectoTarea: { select: { id: true, nombre: true } },
    },
  },
  evidenciaSeguridad: {
    select: {
      id: true,
      estado: true,
      _count: { select: { registros: true } },
    },
  },
} as const satisfies Prisma.RegistroHorasCampoInclude

export type JornadaInforme = Prisma.RegistroHorasCampoGetPayload<{
  include: typeof JORNADA_INCLUDE
}>

const ENTREGA_INCLUDE = {
  empleado: {
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      cargo: { select: { id: true, nombre: true } },
    },
  },
  items: {
    include: {
      catalogoEpp: {
        select: { id: true, codigo: true, descripcion: true, subcategoria: true },
      },
    },
  },
  entregadoPor: { select: { id: true, name: true } },
} as const satisfies Prisma.EntregaEPPInclude

export type EntregaInforme = Prisma.EntregaEPPGetPayload<{
  include: typeof ENTREGA_INCLUDE
}>

export type RegistroSeguridadInforme = Prisma.RegistroSeguridadGetPayload<{
  include: typeof REGISTRO_INCLUDE
}>

export type ReporteInforme = Prisma.ReporteSemanalSeguridadGetPayload<{
  include: typeof REPORTE_INCLUDE
}>

export interface InformeMensualAgregado {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    estado: string
    fechaInicio: Date
    fechaFin: Date | null
    cliente: { id: string; nombre: string } | null
    gestor: { id: string; name: string | null; email: string }
    comercial: { id: string; name: string | null; email: string } | null
  }
  periodo: {
    mes: string
    fechaInicio: Date
    fechaFin: Date
    diasLaborables: number
    labelMes: string
  }
  kpis: KpisMensuales
  personal: PersonalMes[]
  jornadas: JornadaInforme[]
  registrosPorTipo: Record<TipoRegistroSeguridad, RegistroSeguridadInforme[]>
  entregasEpp: EntregaInforme[]
  reportesSemanales: ReporteInforme[]
}

export async function obtenerInformeMensual(
  proyectoId: string,
  mes: string,
): Promise<InformeMensualAgregado | null> {
  const { fechaInicio, fechaFin } = rangoMes(mes)

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      cliente: { select: { id: true, nombre: true } },
      gestor: { select: { id: true, name: true, email: true } },
      comercial: { select: { id: true, name: true, email: true } },
    },
  })
  if (!proyecto) return null

  const [
    jornadas,
    registros,
    hhtMensualResult,
    hhtAcumuladoResult,
    entregasEpp,
    reportesSemanales,
    ultimoIncidente,
    personalProyecto,
  ] = await Promise.all([
    prisma.registroHorasCampo.findMany({
      where: { proyectoId, fechaTrabajo: { gte: fechaInicio, lte: fechaFin } },
      include: JORNADA_INCLUDE,
      orderBy: { fechaTrabajo: 'asc' },
    }),
    prisma.registroSeguridad.findMany({
      where: {
        evidencia: {
          jornada: { proyectoId, fechaTrabajo: { gte: fechaInicio, lte: fechaFin } },
        },
      },
      include: REGISTRO_INCLUDE,
      orderBy: { createdAt: 'asc' },
    }),
    // HHT del mes: suma de horas de todos los miembros de tareas en jornadas del mes
    prisma.registroHorasCampoMiembro.aggregate({
      where: {
        registroCampoTarea: {
          registroCampo: {
            proyectoId,
            fechaTrabajo: { gte: fechaInicio, lte: fechaFin },
          },
        },
      },
      _sum: { horas: true },
    }),
    // HHT acumulado: todas las horas del proyecto desde el inicio
    prisma.registroHorasCampoMiembro.aggregate({
      where: {
        registroCampoTarea: { registroCampo: { proyectoId } },
      },
      _sum: { horas: true },
    }),
    prisma.entregaEPP.findMany({
      where: { proyectoId, fechaEntrega: { gte: fechaInicio, lte: fechaFin } },
      include: ENTREGA_INCLUDE,
      orderBy: { fechaEntrega: 'asc' },
    }),
    // Reportes semanales cuyo rango se solapa con el mes
    prisma.reporteSemanalSeguridad.findMany({
      where: {
        proyectoId,
        fechaInicio: { lte: fechaFin },
        fechaFin: { gte: fechaInicio },
      },
      include: REPORTE_INCLUDE,
      orderBy: { semanaIso: 'asc' },
    }),
    // Último incidente registrado en el proyecto (para días sin accidentes)
    prisma.registroSeguridad.findFirst({
      where: {
        tipo: 'incidente',
        evidencia: { jornada: { proyectoId } },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.personalProyecto.findMany({
      where: { proyectoId, activo: true },
      select: { userId: true, rol: true },
    }),
  ])

  // ── Personal del mes ───────────────────────────────────────────────────────
  const personalMap = new Map<
    string,
    { usuario: { id: string; name: string | null; email: string }; horas: number; jornadas: Set<string> }
  >()
  for (const jornada of jornadas) {
    for (const tarea of jornada.tareas) {
      for (const miembro of tarea.miembros) {
        if (!personalMap.has(miembro.usuarioId)) {
          personalMap.set(miembro.usuarioId, {
            usuario: miembro.usuario,
            horas: 0,
            jornadas: new Set(),
          })
        }
        const entry = personalMap.get(miembro.usuarioId)!
        entry.horas += miembro.horas
        entry.jornadas.add(jornada.id)
      }
    }
  }

  const rolMap = new Map(personalProyecto.map((pp) => [pp.userId, pp.rol as string]))

  const personal: PersonalMes[] = Array.from(personalMap.entries())
    .map(([userId, data]) => ({
      usuario: data.usuario,
      totalHoras: data.horas,
      jornadasCount: data.jornadas.size,
      rol: rolMap.get(userId),
    }))
    .sort((a, b) => b.totalHoras - a.totalHoras)

  // ── KPIs de jornadas ──────────────────────────────────────────────────────
  const jornadasAprobadas = jornadas.filter((j) => j.estado === 'aprobado').length
  const jornadasPendientes = jornadas.filter((j) => j.estado === 'pendiente').length
  const jornadasRechazadas = jornadas.filter((j) => j.estado === 'rechazado').length
  const jornadasIniciadas = jornadas.filter((j) => j.estado === 'iniciado').length
  const jornadasConEvidencia = jornadas.filter((j) => j.evidenciaSeguridad !== null).length

  // ── KPIs de registros ────────────────────────────────────────────────────
  const countTipo = (tipo: TipoRegistroSeguridad) =>
    registros.filter((r) => r.tipo === tipo).length

  // ── Días sin accidentes ──────────────────────────────────────────────────
  // Desde el último incidente registrado, o desde fechaInicio del proyecto si nunca hubo
  const referenciaAccidente = ultimoIncidente?.createdAt ?? proyecto.fechaInicio
  const hoy = new Date()
  const diasSinAccidentes = Math.max(
    0,
    Math.floor((hoy.getTime() - referenciaAccidente.getTime()) / (1000 * 60 * 60 * 24)),
  )

  // ── Agrupar registros por tipo ────────────────────────────────────────────
  const registrosPorTipo = Object.fromEntries(
    TIPOS_REGISTRO.map((tipo) => [tipo, registros.filter((r) => r.tipo === tipo)]),
  ) as Record<TipoRegistroSeguridad, RegistroSeguridadInforme[]>

  const kpis: KpisMensuales = {
    hht: hhtMensualResult._sum.horas ?? 0,
    hhtAcumulado: hhtAcumuladoResult._sum.horas ?? 0,
    personalUnico: personalMap.size,
    jornadasTotal: jornadas.length,
    jornadasAprobadas,
    jornadasPendientes,
    jornadasRechazadas,
    jornadasIniciadas,
    jornadasConEvidencia,
    jornadasSinEvidencia: jornadas.length - jornadasConEvidencia,
    charlasCount: countTipo('charla'),
    inspeccionesCount: countTipo('inspeccion'),
    observacionesCount: countTipo('observacion'),
    incidentesCount: countTipo('incidente'),
    riesgoCriticoCount: countTipo('riesgo_critico'),
    medioAmbienteCount: countTipo('medio_ambiente'),
    prevencionSaludCount: countTipo('prevencion_salud'),
    actividadGeneralCount: countTipo('actividad_general'),
    asistentesCharlas: registros
      .filter((r) => r.tipo === 'charla')
      .reduce((sum, r) => sum + (r.asistentes ?? 0), 0),
    entregasEppCount: entregasEpp.length,
    fotosCount: registros.reduce((sum, r) => sum + r.fotos.length, 0),
    diasSinAccidentes,
  }

  return {
    proyecto,
    periodo: {
      mes,
      fechaInicio,
      fechaFin,
      diasLaborables: diasLaborablesEnMes(mes),
      labelMes: labelMes(mes),
    },
    kpis,
    personal,
    jornadas,
    registrosPorTipo,
    entregasEpp,
    reportesSemanales,
  }
}
