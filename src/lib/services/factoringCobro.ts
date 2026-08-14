import { prisma } from '@/lib/prisma'
import { recalcularCuentaPorCobrar } from '@/lib/services/pagoCobro'

/** Subconjunto de delegados de Prisma que necesita este servicio. */
type PrismaClientOrTx = Pick<
  typeof prisma,
  'cobroValorizacion' | 'pagoCobro' | 'cuentaBancaria' | 'valorizacion' | 'cuentaPorCobrar' | 'abonoValorizacion'
>

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Cuenta bancaria donde entra (y desde donde se libera) el dinero de factoring.
 * Hoy todo el desembolso entra a una sola cuenta Interbank de la empresa —
 * se resuelve por nombre de banco + moneda de la CxC, sin campo dedicado en
 * CobroValorizacion (evaluar agregarlo si algún día hay más de una cuenta candidata).
 */
async function resolverCuentaBancariaFactoring(moneda: string, client: PrismaClientOrTx) {
  const cuenta = await client.cuentaBancaria.findFirst({
    where: {
      activa: true,
      moneda,
      nombreBanco: { contains: 'interbank', mode: 'insensitive' },
    },
  })
  if (!cuenta) {
    throw new Error(
      `No se encontró una cuenta bancaria Interbank activa en ${moneda} para aplicar el desembolso de factoring`
    )
  }
  return cuenta
}

/**
 * Desembolso de factoring (opción B): genera el PagoCobro del adelanto neto real
 * y, si corresponde, el del costo de financiamiento (interés+comisión+gastos+IGV,
 * marcado esCostoFinanciamiento). El excedente NO se toca acá — queda pendiente
 * hasta procesarConfirmacionFactoring. Recalcula la CxC y deja CobroValorizacion
 * en 'desembolsada'. Debe correr dentro de una transacción (tx obligatorio: a
 * diferencia de recalcularCuentaPorCobrar, acá sí queremos que todo o nada se
 * escriba junto, porque involucra crear dinero real).
 */
export async function procesarDesembolsoFactoring(cobroValorizacionId: string, tx: PrismaClientOrTx) {
  const cobro = await tx.cobroValorizacion.findUnique({
    where: { id: cobroValorizacionId },
    include: { valorizacion: { include: { cuentasPorCobrar: true } } },
  })
  if (!cobro) {
    throw new Error('CobroValorizacion no encontrado')
  }
  if (cobro.tipo !== 'factoring') {
    throw new Error('procesarDesembolsoFactoring solo aplica a operaciones tipo factoring')
  }
  if (!cobro.fechaDesembolso) {
    throw new Error('Falta fechaDesembolso para procesar el desembolso')
  }
  // Idempotencia (defensa en profundidad, además del guard del endpoint que
  // solo llama esta función en la transición null -> poblado de fechaDesembolso):
  // si esto ya no está en_negociacion, ya se proceso antes — no repetir.
  if (cobro.estado !== 'en_negociacion') {
    throw new Error(
      `No se puede procesar el desembolso: la operación ya está en estado '${cobro.estado}'`
    )
  }
  if (!cobro.adelantoBanpro || cobro.adelantoBanpro <= 0) {
    throw new Error('Falta adelantoBanpro para procesar el desembolso')
  }

  const cxc = cobro.valorizacion.cuentasPorCobrar.find(c => c.estado !== 'anulada')
  if (!cxc) {
    throw new Error('La valorización no tiene una CuentaPorCobrar activa para aplicar el desembolso')
  }

  const cuentaBancaria = await resolverCuentaBancariaFactoring(cxc.moneda, tx)

  // 1) Adelanto (evento 1) — dinero real que entra a Interbank el mismo día.
  // Solo por el monto del adelanto, NO el montoADesembolsar completo (que
  // junta adelanto + saldo a girar) — ese era el bug: el saldo a girar llega
  // días después, por separado, y se crea como "cobro esperado" más abajo.
  const pagoAdelanto = await tx.pagoCobro.create({
    data: {
      cuentaPorCobrarId: cxc.id,
      cuentaBancariaId: cuentaBancaria.id,
      monto: cobro.adelantoBanpro,
      fechaPago: cobro.fechaDesembolso,
      medioPago: 'factoring',
      numeroOperacion: cobro.numeroOperacion,
      observaciones: `Desembolso factoring${cobro.financiera ? ` ${cobro.financiera}` : ''}${cobro.numeroOperacion ? ` — operación ${cobro.numeroOperacion}` : ''}`,
      updatedAt: new Date(),
    },
  })

  // El adelanto es, a la vez, el "cobro esperado" del evento 1 — se crea ya
  // 'recibido' porque registrar el desembolso ES el evento (a diferencia de
  // los otros 3, que llegan después).
  await tx.abonoValorizacion.create({
    data: {
      cobroId: cobroValorizacionId,
      tipo: 'adelanto',
      estado: 'recibido',
      montoEsperado: cobro.adelantoBanpro,
      montoReal: cobro.adelantoBanpro,
      fechaEsperada: cobro.fechaDesembolso,
      fechaReal: cobro.fechaDesembolso,
      pagoCobroId: pagoAdelanto.id,
    },
  })

  // 2) Costo de financiamiento — cierra saldo, no es dinero recibido. Sin cambios.
  const totalCostos = round2(
    (cobro.interesMonto ?? 0) +
    (cobro.comisionEstructuracion ?? 0) +
    (cobro.gastosAdicionales ?? 0) +
    (cobro.igvGastos ?? 0)
  )
  if (totalCostos > 0) {
    await tx.pagoCobro.create({
      data: {
        cuentaPorCobrarId: cxc.id,
        cuentaBancariaId: null,
        monto: totalCostos,
        fechaPago: cobro.fechaDesembolso,
        medioPago: 'factoring_costo',
        esCostoFinanciamiento: true,
        observaciones: `Costo financiamiento factoring — interés ${cobro.interesMonto ?? 0} + comisión ${cobro.comisionEstructuracion ?? 0} + gastos ${cobro.gastosAdicionales ?? 0} + IGV gastos ${cobro.igvGastos ?? 0}`,
        updatedAt: new Date(),
      },
    })
  }

  // 3) Eventos 2, 3 y 4 — "cobros esperados" pendientes, sin PagoCobro todavía.
  // Llegan después y se marcan recibidos por separado (Sub-fase C). Solo se
  // crea cada uno si su monto teórico es > 0 — mismo criterio que el costo.
  if (cobro.saldoAGirar && cobro.saldoAGirar > 0) {
    await tx.abonoValorizacion.create({
      data: { cobroId: cobroValorizacionId, tipo: 'saldo_girar', estado: 'pendiente', montoEsperado: cobro.saldoAGirar },
    })
  }
  if (cobro.detraccionMonto && cobro.detraccionMonto > 0) {
    await tx.abonoValorizacion.create({
      data: { cobroId: cobroValorizacionId, tipo: 'detraccion', estado: 'pendiente', montoEsperado: cobro.detraccionMonto },
    })
  }
  if (cobro.excedenteMonto && cobro.excedenteMonto > 0) {
    await tx.abonoValorizacion.create({
      data: {
        cobroId: cobroValorizacionId, tipo: 'excedente', estado: 'pendiente',
        montoEsperado: cobro.excedenteMonto, fechaEsperada: cobro.fechaVencimiento,
      },
    })
  }

  await recalcularCuentaPorCobrar(cxc.id, tx)

  await tx.cobroValorizacion.update({
    where: { id: cobroValorizacionId },
    data: { estado: 'desembolsada', updatedAt: new Date() },
  })
}

/**
 * Confirmación del cliente (opción B): libera el excedente retenido (PagoCobro
 * real) y cierra la operación como 'confirmada'. Solo procede si la operación
 * está 'desembolsada' — bloquea si ya está 'confirmada' (doble clic / doble
 * llamada) o si todavía no se desembolsó.
 */
export async function procesarConfirmacionFactoring(
  cobroValorizacionId: string,
  fechaConfirmacion: Date,
  tx: PrismaClientOrTx
) {
  const cobro = await tx.cobroValorizacion.findUnique({
    where: { id: cobroValorizacionId },
    include: { valorizacion: { include: { cuentasPorCobrar: true } } },
  })
  if (!cobro) {
    throw new Error('CobroValorizacion no encontrado')
  }
  if (cobro.estado === 'confirmada') {
    throw new Error('La operación ya fue confirmada')
  }
  if (cobro.estado !== 'desembolsada') {
    throw new Error(
      `No se puede confirmar: la operación está en estado '${cobro.estado}', se esperaba 'desembolsada'`
    )
  }

  const cxc = cobro.valorizacion.cuentasPorCobrar.find(c => c.estado !== 'anulada')
  if (!cxc) {
    throw new Error('La valorización no tiene una CuentaPorCobrar activa para aplicar la confirmación')
  }

  // El desembolso debe haber pasado por procesarDesembolsoFactoring (que deja un
  // PagoCobro medioPago='factoring') antes de poder confirmar. Sin esto, una
  // operación marcada 'desembolsada' solo por una migración/backfill de estado
  // (como CJM43, que llegó a 'desembolsada' en la Fase 3 sin que su adelanto
  // pasara nunca por el flujo nuevo) podría "confirmarse" y liberar el excedente
  // sin que el adelanto ni el costo de financiamiento se hayan registrado nunca
  // como PagoCobro real. No es un parche puntual: ninguna operación debería
  // poder confirmarse si su adelanto no se registró por este flujo.
  const tieneDesembolsoProcesado = await tx.pagoCobro.findFirst({
    where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring' },
    select: { id: true },
  })
  if (!tieneDesembolsoProcesado) {
    throw new Error(
      'No se puede confirmar: el desembolso de esta operación no fue procesado por el flujo actual; requiere regularización'
    )
  }

  const excedente = cobro.excedenteMonto ?? 0
  if (excedente > 0) {
    const cuentaBancaria = await resolverCuentaBancariaFactoring(cxc.moneda, tx)
    await tx.pagoCobro.create({
      data: {
        cuentaPorCobrarId: cxc.id,
        cuentaBancariaId: cuentaBancaria.id,
        monto: excedente,
        fechaPago: fechaConfirmacion,
        medioPago: 'factoring_excedente',
        observaciones: `Excedente liberado factoring${cobro.financiera ? ` ${cobro.financiera}` : ''} tras confirmación del cliente`,
        updatedAt: new Date(),
      },
    })
  }

  await recalcularCuentaPorCobrar(cxc.id, tx)

  await tx.cobroValorizacion.update({
    where: { id: cobroValorizacionId },
    data: { estado: 'confirmada', fechaConfirmacion, updatedAt: new Date() },
  })
}
