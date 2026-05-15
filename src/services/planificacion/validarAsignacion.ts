import { PrismaClient } from '@prisma/client'

export type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
// Solo dia_completo está habilitado; turno_a/b/c/noche están en el enum DB pero pendientes de definición
export type TurnoDia = 'dia_completo'

export interface ValidacionError {
  codigo: string
  mensaje: string
  detalle?: unknown
}
export interface ValidacionWarning {
  codigo: string
  mensaje: string
}
export interface ValidacionResult {
  valido: boolean
  errores: ValidacionError[]
  warnings: ValidacionWarning[]
}

const ESTADOS_INACTIVOS = ['cerrado', 'pausado', 'cancelado']

function turnosConflicto(turno: TurnoDia): TurnoDia[] {
  return ['dia_completo']
}

/**
 * Valida si una celda de planificación puede crearse/actualizarse.
 * Ejecuta todas las validaciones dentro de la transacción recibida.
 *
 * Reglas (en orden de cortocircuito):
 * 1. Empleado activo
 * 2. Proyecto activo (no en estado inactivo)
 * 3. Fecha dentro del rango del proyecto
 * 4. Sin ausencia aprobada que cubra esa fecha+turno
 * 5. No es fin de semana sin esExcepcional=true
 * 6. (warning) Persona no asignada oficialmente al proyecto
 */
export async function validarAsignacion(
  userId: string,
  fecha: Date,
  turno: TurnoDia,
  proyectoId: string,
  esExcepcional: boolean,
  tx: PrismaTx,
): Promise<ValidacionResult> {
  const errores: ValidacionError[] = []
  const warnings: ValidacionWarning[] = []

  // 1. Empleado activo
  const empleado = await tx.empleado.findUnique({
    where: { userId },
    select: { activo: true },
  })
  if (!empleado || !empleado.activo) {
    return {
      valido: false,
      errores: [{ codigo: 'empleado_no_activo', mensaje: 'El usuario no tiene un empleado activo' }],
      warnings,
    }
  }

  // 2. Proyecto activo
  const proyecto = await tx.proyecto.findUnique({
    where: { id: proyectoId },
    select: { estado: true, fechaInicio: true, fechaFin: true },
  })
  if (!proyecto || ESTADOS_INACTIVOS.includes(proyecto.estado)) {
    return {
      valido: false,
      errores: [{ codigo: 'proyecto_no_activo', mensaje: 'El proyecto no existe o no está activo' }],
      warnings,
    }
  }

  // 3. Fecha dentro del rango del proyecto
  const fechaMs = fecha.getTime()
  if (fechaMs < proyecto.fechaInicio.getTime()) {
    errores.push({
      codigo: 'fecha_fuera_de_rango_proyecto',
      mensaje: `La fecha es anterior al inicio del proyecto (${proyecto.fechaInicio.toISOString().slice(0, 10)})`,
    })
  } else if (proyecto.fechaFin && fechaMs > proyecto.fechaFin.getTime()) {
    errores.push({
      codigo: 'fecha_fuera_de_rango_proyecto',
      mensaje: `La fecha es posterior al fin del proyecto (${proyecto.fechaFin.toISOString().slice(0, 10)})`,
    })
  }

  // 4. Conflicto con ausencia aprobada/en_curso (celdas con solicitudAusenciaId)
  if (errores.length === 0) {
    const ausenciaCell = await tx.planificacionDia.findFirst({
      where: {
        userId,
        fecha,
        solicitudAusenciaId: { not: null },
        turno: { in: turnosConflicto(turno) },
      },
      include: {
        solicitudAusencia: {
          select: {
            id: true,
            estado: true,
            tipoAusencia: { select: { nombre: true } },
          },
        },
      },
    })
    if (ausenciaCell) {
      errores.push({
        codigo: 'conflicto_ausencia',
        mensaje: 'El usuario tiene una ausencia aprobada que cubre esta fecha y turno',
        detalle: {
          solicitudAusenciaId: ausenciaCell.solicitudAusenciaId,
          tipo: ausenciaCell.solicitudAusencia?.tipoAusencia?.nombre,
          estado: ausenciaCell.solicitudAusencia?.estado,
        },
      })
    }
  }

  // 5. Fin de semana sin esExcepcional
  const dia = fecha.getUTCDay() // 0=Domingo, 6=Sábado
  if ((dia === 0 || dia === 6) && !esExcepcional) {
    errores.push({
      codigo: 'fin_de_semana_no_excepcional',
      mensaje: 'La fecha es fin de semana. Marque esExcepcional=true para confirmar.',
    })
  }

  // 6. Warning: persona no asignada al proyecto (no bloquea)
  const enProyecto = await tx.personalProyecto.findFirst({
    where: { userId, proyectoId, activo: true },
    select: { id: true },
  })
  if (!enProyecto) {
    warnings.push({
      codigo: 'persona_no_en_proyecto',
      mensaje: 'La persona no está asignada oficialmente a este proyecto',
    })
  }

  return { valido: errores.length === 0, errores, warnings }
}
