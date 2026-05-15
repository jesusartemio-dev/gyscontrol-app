import { prisma } from '@/lib/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActualizarSaldoOpts {
  userId: string
  tipoAusenciaId: string
  anio: number
  /** Días a sumar (positivo) o restar (negativo) en diasPendientes */
  deltaPendientes?: number
  /** Días a sumar (positivo) o restar (negativo) en diasGozados */
  deltaGozados?: number
  motivo: string
  tipo: 'consumo' | 'devolucion' | 'asignacion_anual' | 'ajuste_manual'
  creadoPorId: string
  referenciaId?: string
  /** Si el saldo no existe para ese año, se crea con este valor por defecto */
  diasPorDefectoSiNuevo?: number
}

// ─── Obtener o crear saldo ────────────────────────────────────────────────────

export async function obtenerOCrearSaldo(
  userId: string,
  tipoAusenciaId: string,
  anio: number,
  diasPorDefecto: number,
) {
  const existing = await prisma.saldoAusencia.findUnique({
    where: { userId_tipoAusenciaId_anio: { userId, tipoAusenciaId, anio } },
  })
  if (existing) return existing

  return prisma.saldoAusencia.create({
    data: {
      userId,
      tipoAusenciaId,
      anio,
      diasAsignados: diasPorDefecto,
      diasGozados: 0,
      diasPendientes: 0,
      diasDisponibles: diasPorDefecto,
    },
  })
}

// ─── Aplicar movimiento de saldo ─────────────────────────────────────────────
// Recalcula diasDisponibles = diasAsignados - diasGozados - diasPendientes
// y registra un MovimientoSaldoAusencia. Todo dentro de una transacción.

export async function aplicarMovimientoSaldo(opts: ActualizarSaldoOpts): Promise<void> {
  const {
    userId,
    tipoAusenciaId,
    anio,
    deltaPendientes = 0,
    deltaGozados = 0,
    motivo,
    tipo,
    creadoPorId,
    referenciaId,
    diasPorDefectoSiNuevo = 0,
  } = opts

  await prisma.$transaction(async (tx) => {
    let saldo = await tx.saldoAusencia.findUnique({
      where: { userId_tipoAusenciaId_anio: { userId, tipoAusenciaId, anio } },
    })

    if (!saldo) {
      saldo = await tx.saldoAusencia.create({
        data: {
          userId,
          tipoAusenciaId,
          anio,
          diasAsignados: diasPorDefectoSiNuevo,
          diasGozados: 0,
          diasPendientes: 0,
          diasDisponibles: diasPorDefectoSiNuevo,
        },
      })
    }

    const nuevosPendientes = saldo.diasPendientes + deltaPendientes
    const nuevosGozados = saldo.diasGozados + deltaGozados
    const nuevosDisponibles =
      saldo.diasAsignados - nuevosGozados - nuevosPendientes

    await tx.saldoAusencia.update({
      where: { id: saldo.id },
      data: {
        diasPendientes: nuevosPendientes,
        diasGozados: nuevosGozados,
        diasDisponibles: nuevosDisponibles,
        updatedAt: new Date(),
      },
    })

    const diasMovimiento = Math.abs(deltaPendientes || deltaGozados)
    await tx.movimientoSaldoAusencia.create({
      data: {
        saldoId: saldo.id,
        tipo,
        dias: diasMovimiento,
        motivo,
        referenciaId: referenciaId ?? null,
        creadoPorId,
      },
    })
  })
}

// ─── Validar saldo disponible ─────────────────────────────────────────────────

export async function validarSaldoDisponible(
  userId: string,
  tipoAusenciaId: string,
  anio: number,
  diasRequeridos: number,
): Promise<{ valido: boolean; disponibles: number }> {
  const saldo = await prisma.saldoAusencia.findUnique({
    where: { userId_tipoAusenciaId_anio: { userId, tipoAusenciaId, anio } },
  })

  const disponibles = saldo?.diasDisponibles ?? 0
  return { valido: disponibles >= diasRequeridos, disponibles }
}
