import type { PrismaTx, TurnoDia } from './validarAsignacion'
import { validarAsignacion } from './validarAsignacion'

export interface AsignacionInput {
  userId: string
  fecha: string // YYYY-MM-DD
  turno: TurnoDia
  proyectoId: string
  esExcepcional: boolean
  notas?: string | null
}

export interface OmisionInfo {
  fecha: string
  userId: string
  razon: string
}

export interface BatchResult {
  creadas: number
  actualizadas: number
  omitidas: OmisionInfo[]
}

export async function batchAsignar(
  asignaciones: AsignacionInput[],
  createdById: string,
  tx: PrismaTx,
): Promise<BatchResult> {
  let creadas = 0
  let actualizadas = 0
  const omitidas: OmisionInfo[] = []

  for (const item of asignaciones) {
    const fecha = new Date(item.fecha + 'T00:00:00.000Z')

    const validacion = await validarAsignacion(
      item.userId,
      fecha,
      item.turno,
      item.proyectoId,
      item.esExcepcional,
      tx,
    )

    if (!validacion.valido) {
      omitidas.push({
        fecha: item.fecha,
        userId: item.userId,
        razon: validacion.errores[0]?.codigo ?? 'validacion_fallida',
      })
      continue
    }

    const existente = await tx.planificacionDia.findFirst({
      where: { userId: item.userId, fecha, turno: item.turno },
    })

    if (existente) {
      if (existente.solicitudAusenciaId) {
        omitidas.push({ fecha: item.fecha, userId: item.userId, razon: 'celda_ausencia' })
        continue
      }

      await tx.planificacionDia.update({
        where: { id: existente.id },
        data: {
          proyectoId: item.proyectoId,
          esExcepcional: item.esExcepcional,
          notas: item.notas ?? null,
          updatedById: createdById,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: existente.id,
          accion: 'planificacion.celda_actualizada',
          usuarioId: createdById,
          descripcion: `Celda actualizada (batch) para ${item.userId} en ${item.fecha}`,
          cambios: JSON.stringify(item),
        },
      })

      actualizadas++
    } else {
      const created = await tx.planificacionDia.create({
        data: {
          userId: item.userId,
          fecha,
          turno: item.turno,
          proyectoId: item.proyectoId,
          esExcepcional: item.esExcepcional,
          notas: item.notas ?? null,
          createdById,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: created.id,
          accion: 'planificacion.celda_asignada',
          usuarioId: createdById,
          descripcion: `Celda asignada (batch) para ${item.userId} en ${item.fecha}`,
          cambios: JSON.stringify(item),
        },
      })

      creadas++
    }
  }

  return { creadas, actualizadas, omitidas }
}
