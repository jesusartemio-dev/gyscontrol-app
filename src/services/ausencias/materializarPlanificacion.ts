import { PrismaClient } from '@prisma/client'
import { calcularDiasHabilesLista, toDateKey } from './calcularDiasHabiles'

type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

interface MaterializarOpts {
  desasignarProyectos?: boolean
}

interface MaterializarResult {
  celdasCreadas: number
  celdasEliminadas: number
}

/**
 * Crea las celdas de PlanificacionDia para una SolicitudAusencia aprobada.
 * Debe ejecutarse DENTRO de una transacción existente (recibe tx).
 * Si desasignarProyectos=true, borra celdas con proyectoId antes de crear.
 * Si desasignarProyectos=false y hay conflicto, lanza error (la validación previa debió bloquearlo).
 */
export async function materializarPlanificacion(
  solicitudId: string,
  opciones: MaterializarOpts,
  aprobadorId: string,
  tx: PrismaTx,
): Promise<MaterializarResult> {
  const { desasignarProyectos = false } = opciones

  // ── 1. Cargar solicitud con tipoAusencia ──────────────────────────────────
  const solicitud = await tx.solicitudAusencia.findUnique({
    where: { id: solicitudId },
    include: { tipoAusencia: { select: { aplicaFinDeSemana: true } } },
  })
  if (!solicitud) throw new Error(`SolicitudAusencia ${solicitudId} no encontrada`)

  // ── 2. Construir feriadoSet dentro de la misma tx ─────────────────────────
  let feriadoSet = new Set<string>()
  if (!solicitud.tipoAusencia.aplicaFinDeSemana) {
    const cal = await tx.calendarioLaboral.findFirst({
      where: { activo: true },
      select: { id: true },
    })
    if (cal) {
      const exc = await tx.excepcionCalendario.findMany({
        where: {
          calendarioLaboralId: cal.id,
          tipo: { in: ['feriado', 'dia_no_laboral'] },
          fecha: { gte: solicitud.fechaInicio, lte: solicitud.fechaFin },
        },
        select: { fecha: true },
      })
      feriadoSet = new Set(exc.map((e) => toDateKey(e.fecha)))
    }
  }

  // ── 3. Calcular lista de celdas a crear ───────────────────────────────────
  const diasLista = calcularDiasHabilesLista(
    solicitud.fechaInicio,
    solicitud.fechaFin,
    solicitud.turnoInicio,
    solicitud.turnoFin,
    solicitud.tipoAusencia.aplicaFinDeSemana,
    feriadoSet,
  )

  let celdasCreadas = 0
  let celdasEliminadas = 0

  // ── 4. Para cada día hábil: verificar, limpiar, crear ────────────────────
  for (const dia of diasLista) {
    const existing = await tx.planificacionDia.findUnique({
      where: {
        userId_fecha_turno: {
          userId: solicitud.solicitanteId,
          fecha: dia.fecha,
          turno: dia.turno,
        },
      },
      select: { id: true, proyectoId: true, solicitudAusenciaId: true },
    })

    if (existing) {
      if (existing.proyectoId !== null) {
        if (!desasignarProyectos) {
          // Shouldn't reach here if validation ran correctly
          throw new Error(
            `Conflicto no resuelto en ${toDateKey(dia.fecha)} turno=${dia.turno}. ` +
              `Ejecuta validarConflictosPlanificacion antes de materializar.`,
          )
        }
        // Desasignar: borrar la celda de proyecto y registrar audit
        await tx.planificacionDia.delete({ where: { id: existing.id } })
        await tx.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            entidadTipo: 'PLANIFICACION_DIA',
            entidadId: existing.id,
            accion: 'planificacion.desasignada_por_ausencia',
            usuarioId: aprobadorId,
            descripcion: `Celda ${toDateKey(dia.fecha)}/${dia.turno} desasignada de proyecto para materializar ausencia ${solicitudId}`,
            cambios: JSON.stringify({ proyectoId: existing.proyectoId, reemplazadoPor: solicitudId }),
          },
        })
        celdasEliminadas++
      } else if (existing.solicitudAusenciaId !== null) {
        // Integrity error: two absences on the same slot
        throw new Error(
          `Integridad: ya existe una ausencia en ${toDateKey(dia.fecha)} turno=${dia.turno} ` +
            `(solicitudAusenciaId=${existing.solicitudAusenciaId})`,
        )
      }
    }

    // Crear celda de ausencia
    await tx.planificacionDia.create({
      data: {
        userId: solicitud.solicitanteId,
        fecha: dia.fecha,
        turno: dia.turno,
        solicitudAusenciaId: solicitudId,
        tipoAusenciaId: solicitud.tipoAusenciaId,
        proyectoId: null,
        esExcepcional: false,
        createdById: aprobadorId,
      },
    })
    celdasCreadas++
  }

  return { celdasCreadas, celdasEliminadas }
}
