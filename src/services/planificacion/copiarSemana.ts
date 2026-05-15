import { prisma } from '@/lib/prisma'
import type { PrismaTx } from './validarAsignacion'
import { validarAsignacion } from './validarAsignacion'
import { parseISOWeek, addDays, toDateKey } from '@/lib/utils/planificacion'

export interface CopiarSemanaInput {
  semanaOrigen: string  // "2026-W20"
  semanaDestino: string // "2026-W22"
  departamentoId?: string
}

export interface CopiarSemanaResult {
  celdasCreadas: number
  celdasOmitidas: number
  razonesOmision: {
    ausencia_destino: number
    proyecto_inactivo: number
    celda_ya_existe: number
    celda_excepcional: number
  }
}

export { parseISOWeek, addDays }

export async function copiarSemana(
  input: CopiarSemanaInput,
  userId: string,
): Promise<CopiarSemanaResult> {
  const monOrigen = parseISOWeek(input.semanaOrigen)
  const monDestino = parseISOWeek(input.semanaDestino)

  const razonesOmision = { ausencia_destino: 0, proyecto_inactivo: 0, celda_ya_existe: 0, celda_excepcional: 0 }

  return prisma.$transaction(async (tx) => {
    const diasOrigen = Array.from({ length: 7 }, (_, i) => addDays(monOrigen, i))

    // Filtrar por departamento si se especifica
    let userIds: string[] | undefined
    if (input.departamentoId) {
      const empleados = await tx.empleado.findMany({
        where: { departamentoId: input.departamentoId, activo: true },
        select: { userId: true },
      })
      userIds = empleados.map((e) => e.userId)
      if (userIds.length === 0) {
        return { celdasCreadas: 0, celdasOmitidas: 0, razonesOmision }
      }
    }

    // Cargar todas las celdas de proyecto de la semana origen (sin ausencias)
    const todasCeldas = await tx.planificacionDia.findMany({
      where: {
        fecha: { gte: diasOrigen[0], lte: diasOrigen[6] },
        proyectoId: { not: null },
        solicitudAusenciaId: null,
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
    })

    const celdasOrigen = todasCeldas.filter((c) => !c.esExcepcional)
    razonesOmision.celda_excepcional = todasCeldas.length - celdasOrigen.length

    let celdasCreadas = 0
    let celdasOmitidas = razonesOmision.celda_excepcional

    for (const celda of celdasOrigen) {
      const diasOffset = Math.round((celda.fecha.getTime() - monOrigen.getTime()) / 86400000)
      const fechaDestino = addDays(monDestino, diasOffset)

      // Verificar si ya existe una celda en destino
      const existe = await tx.planificacionDia.findFirst({
        where: { userId: celda.userId, fecha: fechaDestino, turno: celda.turno },
        select: { id: true },
      })
      if (existe) {
        razonesOmision.celda_ya_existe++
        celdasOmitidas++
        continue
      }

      // Ejecutar validaciones en destino
      const validacion = await validarAsignacion(
        celda.userId,
        fechaDestino,
        celda.turno as 'dia_completo' | 'am' | 'pm',
        celda.proyectoId!,
        celda.esExcepcional,
        tx as unknown as PrismaTx,
      )

      if (!validacion.valido) {
        const codigos = validacion.errores.map((e) => e.codigo)
        if (codigos.includes('conflicto_ausencia')) {
          razonesOmision.ausencia_destino++
        } else if (
          codigos.includes('proyecto_no_activo') ||
          codigos.includes('fecha_fuera_de_rango_proyecto')
        ) {
          razonesOmision.proyecto_inactivo++
        }
        celdasOmitidas++
        continue
      }

      await tx.planificacionDia.create({
        data: {
          userId: celda.userId,
          fecha: fechaDestino,
          turno: celda.turno,
          proyectoId: celda.proyectoId,
          esExcepcional: celda.esExcepcional,
          notas: celda.notas,
          createdById: userId,
        },
      })

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          entidadTipo: 'PLANIFICACION_DIA',
          entidadId: celda.userId,
          accion: 'planificacion.celda_copiada',
          usuarioId: userId,
          descripcion: `Celda copiada de ${input.semanaOrigen} a ${input.semanaDestino}`,
          cambios: JSON.stringify({ origenCeldaId: celda.id, fecha: toDateKey(fechaDestino) }),
        },
      })

      celdasCreadas++
    }

    return { celdasCreadas, celdasOmitidas, razonesOmision }
  })
}
