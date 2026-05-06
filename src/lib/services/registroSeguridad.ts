import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function inicioDelDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

function finDelDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(23, 59, 59, 999)
  return d
}

export interface ListarJornadasActivasOpts {
  ingenieroId?: string
  soloAsignadas?: boolean
  fecha?: Date
  /** Si se pasan, filtra por rango (ignora `fecha`). Útil para backfill de reportes pasados. */
  fechaDesde?: Date
  fechaHasta?: Date
  /** Si se pasa, filtra solo a un proyecto específico. */
  proyectoId?: string
}

/**
 * Devuelve jornadas en estado `iniciado` o `pendiente`. Por defecto NO filtra por fecha
 * — una jornada abierta hace una semana sigue siendo válida para registrar evidencias.
 * Si se pasa `fecha` o `fechaDesde/fechaHasta`, restringe al rango indicado.
 * Si soloAsignadas=true se requiere ingenieroId y filtra por proyectos donde el ingeniero
 * está activo en PersonalProyecto.
 */
export async function listarJornadasActivasDelDia(opts: ListarJornadasActivasOpts = {}) {
  const tieneRango = opts.fechaDesde && opts.fechaHasta
  const tieneFecha = !!opts.fecha
  const where: Prisma.RegistroHorasCampoWhereInput = {
    estado: { in: ['iniciado', 'pendiente'] },
  }

  if (tieneRango) {
    where.fechaTrabajo = { gte: inicioDelDia(opts.fechaDesde!), lte: finDelDia(opts.fechaHasta!) }
  } else if (tieneFecha) {
    where.fechaTrabajo = { gte: inicioDelDia(opts.fecha!), lte: finDelDia(opts.fecha!) }
  }

  if (opts.proyectoId) where.proyectoId = opts.proyectoId

  if (opts.soloAsignadas && opts.ingenieroId && !opts.proyectoId) {
    const asignaciones = await prisma.personalProyecto.findMany({
      where: { userId: opts.ingenieroId, activo: true },
      select: { proyectoId: true },
    })
    const proyectoIds = asignaciones.map((a) => a.proyectoId)
    where.proyectoId = { in: proyectoIds.length > 0 ? proyectoIds : ['__none__'] }
  }

  return prisma.registroHorasCampo.findMany({
    where,
    select: {
      id: true,
      fechaTrabajo: true,
      estado: true,
      ubicacion: true,
      createdAt: true,
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      supervisor: { select: { id: true, name: true } },
      tareas: {
        select: {
          id: true,
          nombreTareaExtra: true,
          proyectoTarea: { select: { id: true, nombre: true } },
          miembros: {
            select: {
              usuarioId: true,
              horas: true,
              usuario: { select: { id: true, name: true } },
            },
          },
        },
      },
      evidenciaSeguridad: { select: { id: true, estado: true } },
    },
    orderBy: [{ fechaTrabajo: 'desc' }, { createdAt: 'desc' }],
  })
}

/**
 * Trae todas las jornadas de un proyecto en un rango de fechas (incluyendo tareas y miembros).
 * Pensado para el reporte semanal (Fase 2).
 */
export async function obtenerJornadasDeSemana(
  proyectoId: string,
  fechaInicio: Date,
  fechaFin: Date,
) {
  return prisma.registroHorasCampo.findMany({
    where: {
      proyectoId,
      fechaTrabajo: {
        gte: inicioDelDia(fechaInicio),
        lte: finDelDia(fechaFin),
      },
    },
    include: {
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      supervisor: { select: { id: true, name: true } },
      tareas: {
        include: {
          miembros: {
            include: { usuario: { select: { id: true, name: true } } },
          },
          proyectoTarea: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: { fechaTrabajo: 'asc' },
  })
}

const REGISTRO_INCLUDE = {
  evidencia: {
    select: {
      id: true,
      estado: true,
      jornada: {
        select: {
          id: true,
          fechaTrabajo: true,
          estado: true,
          proyecto: { select: { id: true, codigo: true, nombre: true } },
          supervisor: { select: { id: true, name: true } },
        },
      },
    },
  },
  ingeniero: { select: { id: true, name: true, email: true } },
  fotos: { orderBy: { orden: 'asc' } },
} as const satisfies Prisma.RegistroSeguridadInclude

export type RegistroSeguridadDetalle = Prisma.RegistroSeguridadGetPayload<{
  include: typeof REGISTRO_INCLUDE
}>

export async function listarRegistrosSeguridadDeJornada(jornadaId: string) {
  return prisma.registroSeguridad.findMany({
    where: { evidencia: { registroHorasCampoId: jornadaId } },
    include: REGISTRO_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Trae los registros de seguridad ligados a las jornadas de un proyecto en un rango.
 * Para el reporte semanal (Fase 2).
 */
export async function listarRegistrosSeguridadDeSemana(
  proyectoId: string,
  fechaInicio: Date,
  fechaFin: Date,
) {
  return prisma.registroSeguridad.findMany({
    where: {
      evidencia: {
        jornada: {
          proyectoId,
          fechaTrabajo: {
            gte: inicioDelDia(fechaInicio),
            lte: finDelDia(fechaFin),
          },
        },
      },
    },
    include: REGISTRO_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })
}

export { REGISTRO_INCLUDE }
