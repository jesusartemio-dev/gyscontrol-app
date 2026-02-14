/**
 * Utilidad para limpiar horas al reabrir/eliminar jornadas rechazadas.
 *
 * Flujo de horas:
 * - Al cerrar: ProyectoTarea.horasReales se incrementa 1x
 * - Al aprobar: se incrementa OTRA VEZ + crea RegistroHoras vinculados
 * - Al rechazar: solo cambia estado, NO revierte horas
 *
 * Esta función revierte esas horas y elimina RegistroHoras si existían.
 */

import { prisma } from '@/lib/prisma'

// Infer transaction client type from our prisma instance
type TransactionClient = Omit<typeof prisma, '$transaction' | '$connect' | '$disconnect' | '$on' | '$extends'>

interface CleanupResult {
  tareasAfectadas: string[]
  horasRevertidas: number
  registrosEliminados: number
}

/**
 * Limpia las horas registradas por una jornada rechazada.
 * Debe ejecutarse dentro de una transacción Prisma.
 */
export async function limpiarHorasJornadaRechazada(
  tx: TransactionClient,
  jornadaId: string
): Promise<CleanupResult> {
  // 1. Obtener jornada con tareas, miembros y sus registroHorasId
  const jornada = await tx.registroHorasCampo.findUnique({
    where: { id: jornadaId },
    include: {
      tareas: {
        include: {
          miembros: {
            select: {
              id: true,
              horas: true,
              registroHorasId: true,
              registroCampoTarea: {
                select: { proyectoTareaId: true }
              }
            }
          }
        }
      }
    }
  })

  if (!jornada) {
    return { tareasAfectadas: [], horasRevertidas: 0, registrosEliminados: 0 }
  }

  // 2. Calcular horas por tarea del cronograma
  const horasPorTarea = new Map<string, number>()
  const registroHorasIds: string[] = []

  for (const tarea of jornada.tareas) {
    for (const miembro of tarea.miembros) {
      // Acumular horas por proyectoTareaId
      const tareaId = miembro.registroCampoTarea.proyectoTareaId
      if (tareaId) {
        horasPorTarea.set(tareaId, (horasPorTarea.get(tareaId) || 0) + miembro.horas)
      }
      // Recopilar IDs de RegistroHoras vinculados
      if (miembro.registroHorasId) {
        registroHorasIds.push(miembro.registroHorasId)
      }
    }
  }

  const wasApproved = registroHorasIds.length > 0
  // Si fue aprobada: horas se incrementaron 2x (cierre + aprobación)
  // Si solo fue cerrada: horas se incrementaron 1x (solo cierre)
  const multiplier = wasApproved ? 2 : 1

  // 3. Si fue aprobada: limpiar FK y eliminar RegistroHoras
  if (wasApproved) {
    // Primero: quitar FK para evitar constraint violation
    await tx.registroHorasCampoMiembro.updateMany({
      where: {
        registroCampoTarea: { registroCampoId: jornadaId }
      },
      data: { registroHorasId: null }
    })

    // Luego: eliminar los RegistroHoras
    await tx.registroHoras.deleteMany({
      where: { id: { in: registroHorasIds } }
    })
  }

  // 4. Decrementar horasReales de cada tarea del cronograma
  let horasRevertidas = 0
  const tareasAfectadas: string[] = []

  for (const [tareaId, horas] of horasPorTarea.entries()) {
    const decremento = horas * multiplier

    // Obtener valor actual para evitar negativos
    const tareaActual = await tx.proyectoTarea.findUnique({
      where: { id: tareaId },
      select: { horasReales: true }
    })

    if (tareaActual) {
      const horasActuales = Number(tareaActual.horasReales) || 0
      const decrementoReal = Math.min(horasActuales, decremento)

      if (decrementoReal > 0) {
        await tx.proyectoTarea.update({
          where: { id: tareaId },
          data: {
            horasReales: { decrement: decrementoReal },
            updatedAt: new Date()
          }
        })
        horasRevertidas += decrementoReal
      }
      tareasAfectadas.push(tareaId)
    }
  }

  return {
    tareasAfectadas,
    horasRevertidas,
    registrosEliminados: registroHorasIds.length
  }
}
