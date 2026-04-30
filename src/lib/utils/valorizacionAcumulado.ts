// =============================================================================
// Helpers de cálculo de acumulados y montos de Valorización
// =============================================================================
// Centraliza la lógica que estaba duplicada en 4 endpoints.
//
// Concepto clave: el "acumulado anterior" de una valorización N es la suma de
// montoValorizacion de las valorizaciones del MISMO proyecto con numero < N
// (excluyendo anuladas). NO debe sumar valorizaciones posteriores.
//
// El bug histórico filtraba por `id != excludeId`, lo que sumaba TODAS las
// otras valorizaciones del proyecto — incluyendo las posteriores. Eso causaba
// que al editar una valorización vieja, su acumulado quedara inflado con
// montos de valorizaciones futuras.
// =============================================================================

import { calcularAdelantoValorizacion } from './adelantoUtils'

// Tipo permisivo: acepta el cliente Prisma o un tx de transacción.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = any

const round2 = (n: number) => Math.round(n * 100) / 100

// =============================================================================
// Cálculo de campos derivados (montos)
// =============================================================================
export function calcularMontos(data: {
  montoValorizacion: number
  acumuladoAnterior: number
  presupuestoContractual: number
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
}) {
  const acumuladoActual = data.acumuladoAnterior + data.montoValorizacion
  const saldoPorValorizar = data.presupuestoContractual - acumuladoActual
  const porcentajeAvance = data.presupuestoContractual > 0
    ? (acumuladoActual / data.presupuestoContractual) * 100
    : 0

  const descuentoComercialMonto = data.montoValorizacion * data.descuentoComercialPorcentaje / 100
  const adelantoMonto = data.montoValorizacion * data.adelantoPorcentaje / 100
  const subtotal = data.montoValorizacion - descuentoComercialMonto - adelantoMonto
  const igvMonto = subtotal * data.igvPorcentaje / 100
  const fondoGarantiaMonto = subtotal * data.fondoGarantiaPorcentaje / 100
  const netoARecibir = subtotal + igvMonto - fondoGarantiaMonto

  return {
    acumuladoActual: round2(acumuladoActual),
    saldoPorValorizar: round2(saldoPorValorizar),
    porcentajeAvance: round2(porcentajeAvance),
    descuentoComercialMonto: round2(descuentoComercialMonto),
    adelantoMonto: round2(adelantoMonto),
    subtotal: round2(subtotal),
    igvMonto: round2(igvMonto),
    fondoGarantiaMonto: round2(fondoGarantiaMonto),
    netoARecibir: round2(netoARecibir),
  }
}

// =============================================================================
// Acumulado anterior — solo valorizaciones con numero < valNumero
// =============================================================================
export async function calcularAcumuladoAnterior(
  client: PrismaClientLike,
  proyectoId: string,
  valNumero: number,
): Promise<number> {
  const agg = await client.valorizacion.aggregate({
    where: {
      proyectoId,
      estado: { not: 'anulada' },
      numero: { lt: valNumero },
    },
    _sum: { montoValorizacion: true },
  })
  return agg._sum.montoValorizacion || 0
}

// =============================================================================
// Recalcular UNA valorización (montoValorizacion desde partidas + derivados)
// =============================================================================
export async function recalcularValorizacionPorId(
  client: PrismaClientLike,
  valorizacionId: string,
  opts: { recalcularDesdePartidas?: boolean } = {},
) {
  const { recalcularDesdePartidas = true } = opts

  const val = await client.valorizacion.findUnique({ where: { id: valorizacionId } })
  if (!val) return null

  // montoValorizacion: si hay partidas, sumarlas; sino mantener el actual
  let montoValorizacion = val.montoValorizacion
  if (recalcularDesdePartidas) {
    const partidas = await client.partidaValorizacion.findMany({ where: { valorizacionId } })
    if (partidas.length > 0) {
      montoValorizacion = round2(
        partidas.reduce((sum: number, p: { montoAvance: number }) => sum + p.montoAvance, 0)
      )
    }
  }

  const acumuladoAnterior = await calcularAcumuladoAnterior(client, val.proyectoId, val.numero)

  // Recalcular adelanto desde proyecto si tiene adelanto configurado
  const proyecto = await client.proyecto.findUnique({
    where: { id: val.proyectoId },
    select: { adelantoPorcentaje: true, adelantoMonto: true, adelantoAmortizado: true },
  })

  let adelantoPorcentaje = val.adelantoPorcentaje
  let adelantoMontoOverride: number | undefined

  if (proyecto && (proyecto.adelantoMonto ?? 0) > 0) {
    const adelantoCalc = calcularAdelantoValorizacion(proyecto, montoValorizacion)
    if (adelantoCalc.tieneAdelanto) {
      adelantoPorcentaje = adelantoCalc.adelantoPorcentaje
      adelantoMontoOverride = adelantoCalc.adelantoMonto
    }
  }

  const calculados = calcularMontos({
    montoValorizacion,
    acumuladoAnterior,
    presupuestoContractual: val.presupuestoContractual,
    descuentoComercialPorcentaje: val.descuentoComercialPorcentaje,
    adelantoPorcentaje,
    igvPorcentaje: val.igvPorcentaje,
    fondoGarantiaPorcentaje: val.fondoGarantiaPorcentaje,
  })

  if (adelantoMontoOverride !== undefined) {
    calculados.adelantoMonto = adelantoMontoOverride
  }

  return client.valorizacion.update({
    where: { id: valorizacionId },
    data: {
      montoValorizacion,
      acumuladoAnterior: round2(acumuladoAnterior),
      adelantoPorcentaje,
      ...calculados,
      updatedAt: new Date(),
    },
  })
}

// =============================================================================
// Cascada: recalcular todas las valorizaciones POSTERIORES a una dada
// (por número, dentro del mismo proyecto, no anuladas)
// =============================================================================
export async function recalcularValorizacionesPosteriores(
  client: PrismaClientLike,
  proyectoId: string,
  valNumeroDesde: number,
) {
  const posteriores = await client.valorizacion.findMany({
    where: {
      proyectoId,
      numero: { gt: valNumeroDesde },
      estado: { not: 'anulada' },
    },
    orderBy: { numero: 'asc' },
    select: { id: true },
  })

  for (const v of posteriores) {
    // En la cascada NO recalculamos desde partidas — los % de avance ya capturados
    // por el usuario son verdad inmutable. Solo refrescamos acumulados y derivados.
    await recalcularValorizacionPorId(client, v.id, { recalcularDesdePartidas: false })
  }

  return posteriores.length
}
