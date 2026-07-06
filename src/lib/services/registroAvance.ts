import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { ROLES_BYPASS } from '@/lib/auth/rolesEvidenciaProyecto'

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
  /** Rol global (enum Role). Decide el alcance: ROLES_BYPASS ven todo; el resto, solo asignados. */
  role?: string
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
 *
 * Alcance por rol:
 *   - ROLES_BYPASS (admin/gerente/gestor): proyectoId libre; soloAsignadas=false ve todas;
 *     soloAsignadas=true restringe a sus proyectos (PersonalProyecto.activo).
 *   - Resto (proyectos/coordinador, no-bypass): SIEMPRE limitado a sus proyectos asignados,
 *     ignorando soloAsignadas=false. Un proyectoId fuera de sus asignaciones devuelve [].
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

  // --- Alcance por proyecto según rol ---
  const isBypass = !!opts.role && (ROLES_BYPASS as readonly string[]).includes(opts.role)

  if (isBypass) {
    // admin/gerente/gestor: proyectoId libre; soloAsignadas (opcional) restringe a sus asignaciones.
    if (opts.proyectoId) {
      where.proyectoId = opts.proyectoId
    } else if (opts.soloAsignadas && opts.userId) {
      const asignaciones = await prisma.personalProyecto.findMany({
        where: { userId: opts.userId, activo: true },
        select: { proyectoId: true },
      })
      const proyectoIds = asignaciones.map((a) => a.proyectoId)
      where.proyectoId = { in: proyectoIds.length > 0 ? proyectoIds : ['__none__'] }
    }
  } else {
    // Roles de campo (proyectos/coordinador): si soloAsignadas=false ven todas las jornadas
    // (igual que bypass con soloAsignadas=false). Si soloAsignadas=true, solo sus proyectos.
    // Sin userId y soloAsignadas=true no ven nada.
    if (opts.soloAsignadas !== false) {
      const proyectoIds = opts.userId
        ? (
            await prisma.personalProyecto.findMany({
              where: { userId: opts.userId, activo: true },
              select: { proyectoId: true },
            })
          ).map((a) => a.proyectoId)
        : []

      if (opts.proyectoId) {
        where.proyectoId = proyectoIds.includes(opts.proyectoId) ? opts.proyectoId : '__none__'
      } else {
        where.proyectoId = { in: proyectoIds.length > 0 ? proyectoIds : ['__none__'] }
      }
    } else if (opts.proyectoId) {
      where.proyectoId = opts.proyectoId
    }
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
  registroHorasCampoTarea: {
    select: {
      id: true,
      nombreTareaExtra: true,
      proyectoTarea: { select: { id: true, nombre: true } },
    },
  },
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
