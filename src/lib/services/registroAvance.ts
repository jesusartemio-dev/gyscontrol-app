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
  userId?: string
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
 * Si soloAsignadas=true se requiere userId y filtra por proyectos donde el usuario
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

  if (opts.soloAsignadas && opts.userId && !opts.proyectoId) {
    const asignaciones = await prisma.personalProyecto.findMany({
      where: { userId: opts.userId, activo: true },
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
      evidenciaAvance: { select: { id: true, estado: true } },
    },
    orderBy: [{ fechaTrabajo: 'desc' }, { createdAt: 'desc' }],
  })
}

/**
 * Trae todas las jornadas de un proyecto en un rango de fechas (incluyendo tareas y miembros).
 * Filtro gte/lte sobre registroHorasCampo.fechaTrabajo (no createdAt). Para el reporte semanal.
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

const REGISTRO_AVANCE_INCLUDE = {
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
  autor: { select: { id: true, name: true, email: true } },
  proyectoTarea: { select: { id: true, nombre: true } },
  fotos: { orderBy: { orden: 'asc' } },
} as const satisfies Prisma.RegistroAvanceInclude

export type RegistroAvanceDetalle = Prisma.RegistroAvanceGetPayload<{
  include: typeof REGISTRO_AVANCE_INCLUDE
}>

export async function listarRegistrosAvanceDeJornada(jornadaId: string) {
  return prisma.registroAvance.findMany({
    where: { evidencia: { registroHorasCampoId: jornadaId } },
    include: REGISTRO_AVANCE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Trae los registros de avance ligados a las jornadas de un proyecto en un rango.
 * Filtro gte/lte sobre evidencia.jornada.fechaTrabajo (no createdAt). Para el reporte semanal.
 */
export async function listarRegistrosAvanceDeSemana(
  proyectoId: string,
  fechaInicio: Date,
  fechaFin: Date,
) {
  return prisma.registroAvance.findMany({
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
    include: REGISTRO_AVANCE_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })
}

export { REGISTRO_AVANCE_INCLUDE }
