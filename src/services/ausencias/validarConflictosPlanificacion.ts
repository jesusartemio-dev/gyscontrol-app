import { PrismaClient, TurnoDia } from '@prisma/client'
import { calcularDiasHabilesLista, toDateKey } from './calcularDiasHabiles'

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export interface ConflictoPlanificacion {
  fecha: string // ISO YYYY-MM-DD
  turno: TurnoDia
  planificacionDiaId: string
  proyectoId: string
  proyectoCodigo: string
  proyectoNombre: string
}

/**
 * Busca celdas de planificacion_dia del usuario en el rango hábil de la ausencia
 * que tengan proyectoId != null (conflicto con asignación productiva).
 */
export async function validarConflictosPlanificacion(
  userId: string,
  fechaInicio: Date,
  fechaFin: Date,
  turnoInicio: TurnoDia,
  turnoFin: TurnoDia,
  aplicaFinDeSemana: boolean,
  tx: PrismaTx,
): Promise<ConflictoPlanificacion[]> {
  // Build holiday set within the same tx
  let feriadoSet = new Set<string>()
  if (!aplicaFinDeSemana) {
    const cal = await tx.calendarioLaboral.findFirst({ where: { activo: true }, select: { id: true } })
    if (cal) {
      const exc = await tx.excepcionCalendario.findMany({
        where: {
          calendarioLaboralId: cal.id,
          tipo: { in: ['feriado', 'dia_no_laboral'] },
          fecha: { gte: fechaInicio, lte: fechaFin },
        },
        select: { fecha: true },
      })
      feriadoSet = new Set(exc.map((e) => toDateKey(e.fecha)))
    }
  }

  const diasLista = calcularDiasHabilesLista(
    fechaInicio, fechaFin, turnoInicio, turnoFin, aplicaFinDeSemana, feriadoSet,
  )

  if (diasLista.length === 0) return []

  // Fetch all planificacion_dia rows for the user in this range that have a proyecto
  const fechas = diasLista.map((d) => d.fecha)
  const existentes = await tx.planificacionDia.findMany({
    where: {
      userId,
      proyectoId: { not: null },
      fecha: { in: fechas },
    },
    select: {
      id: true,
      fecha: true,
      turno: true,
      proyectoId: true,
    },
  })

  if (existentes.length === 0) return []

  // Build a lookup map: "YYYY-MM-DD:turno" → planificacionDia
  const conflictoMap = new Map(
    existentes.map((p) => [`${toDateKey(p.fecha)}:${p.turno}`, p]),
  )

  const conflictos: ConflictoPlanificacion[] = []

  for (const dia of diasLista) {
    const key = `${toDateKey(dia.fecha)}:${dia.turno}`
    const match = conflictoMap.get(key)
    if (!match || !match.proyectoId) continue

    // Enrich with project info
    const proyecto = await tx.proyecto.findUnique({
      where: { id: match.proyectoId },
      select: { id: true, codigo: true, nombre: true },
    })

    conflictos.push({
      fecha: toDateKey(dia.fecha),
      turno: dia.turno,
      planificacionDiaId: match.id,
      proyectoId: match.proyectoId,
      proyectoCodigo: proyecto?.codigo ?? match.proyectoId,
      proyectoNombre: proyecto?.nombre ?? 'Desconocido',
    })
  }

  return conflictos
}
