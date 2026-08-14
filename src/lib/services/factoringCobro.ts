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
 * Desembolso de factoring (opción B, modelo de cobros esperados): genera el
 * PagoCobro del adelanto real y su AbonoValorizacion ya 'recibido', el del
 * costo de financiamiento (esCostoFinanciamiento), y crea saldo_girar,
 * detraccion y excedente como AbonoValorizacion 'pendiente' con su monto
 * teórico — se marcan recibidos por separado, vía marcarAbonoFactoringRecibido,
 * cuando llegan. Recalcula la CxC y deja CobroValorizacion en 'desembolsada'.
 * Debe correr dentro de una transacción (tx obligatorio: a diferencia de
 * recalcularCuentaPorCobrar, acá sí queremos que todo o nada se escriba
 * junto, porque involucra crear dinero real).
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
 * Marca un "cobro esperado" (evento 2, 3 o 4 de una operación de factoring)
 * como recibido: crea el PagoCobro real por el monto REAL (no el teórico —
 * puede diferir por mora), y si llegó por menos, un segundo PagoCobro de
 * ajuste (esAjusteMora) por la diferencia, para que el saldo de la CxC
 * siempre pueda cerrar en 0 exacto sin fingir dinero que no llegó.
 *
 * Orden entre eventos: el adelanto (evento 1, creado por
 * procesarDesembolsoFactoring) debe estar 'recibido' antes que cualquier
 * otro — esto generaliza y reemplaza el guard viejo de
 * procesarConfirmacionFactoring (que buscaba un PagoCobro medioPago=
 * 'factoring' por texto): ahora se busca el AbonoValorizacion tipo='adelanto'
 * estado='recibido' directamente. Sigue bloqueando el caso CJM43 (operación
 * 'desembolsada' solo por backfill de estado, sin que el adelanto pasara
 * nunca por procesarDesembolsoFactoring) porque esa operación tampoco tiene
 * ese abono. saldo_girar y detraccion no tienen orden entre sí. excedente
 * exige que los dos anteriores ya estén recibidos (o que nunca hayan
 * existido, si su monto teórico era 0) — y al recibirse, cierra la operación
 * como 'confirmada', absorbiendo lo que antes hacía procesarConfirmacionFactoring.
 *
 * Idempotente: si el abono ya está 'recibido', bloquea.
 */
export async function marcarAbonoFactoringRecibido(
  abonoId: string,
  montoReal: number,
  fechaReal: Date,
  tx: PrismaClientOrTx,
  observaciones?: string | null
) {
  const abono = await tx.abonoValorizacion.findUnique({
    where: { id: abonoId },
    include: { cobro: { include: { valorizacion: { include: { cuentasPorCobrar: true } } } } },
  })
  if (!abono) {
    throw new Error('Cobro esperado no encontrado')
  }
  if (abono.estado === 'recibido') {
    throw new Error('Este cobro esperado ya fue recibido')
  }
  if (!abono.tipo) {
    throw new Error('Este abono no tiene un tipo de evento definido — no se puede procesar por este flujo')
  }

  const cobro = abono.cobro
  const cxc = cobro.valorizacion.cuentasPorCobrar.find(c => c.estado !== 'anulada')
  if (!cxc) {
    throw new Error('La valorización no tiene una CuentaPorCobrar activa')
  }

  // Orden entre eventos.
  const adelantoRecibido = await tx.abonoValorizacion.findFirst({
    where: { cobroId: cobro.id, tipo: 'adelanto', estado: 'recibido' },
    select: { id: true },
  })
  if (!adelantoRecibido) {
    throw new Error('No se puede recibir ningún evento antes que el adelanto')
  }
  if (abono.tipo === 'excedente') {
    const pendientesPrevios = await tx.abonoValorizacion.findFirst({
      where: { cobroId: cobro.id, tipo: { in: ['saldo_girar', 'detraccion'] }, estado: 'pendiente' },
      select: { id: true },
    })
    if (pendientesPrevios) {
      throw new Error('No se puede recibir el excedente: todavía falta recibir el saldo a girar y/o la detracción')
    }
  }

  const medioPago = abono.tipo === 'saldo_girar' ? 'factoring'
    : abono.tipo === 'detraccion' ? 'detraccion'
    : 'factoring_excedente' // excedente

  let cuentaBancariaId: string | null = null
  if (abono.tipo !== 'detraccion') {
    const cuentaBancaria = await resolverCuentaBancariaFactoring(cxc.moneda, tx)
    cuentaBancariaId = cuentaBancaria.id
  }

  const etiqueta = abono.tipo === 'saldo_girar' ? 'Saldo a girar'
    : abono.tipo === 'detraccion' ? 'Detracción'
    : 'Excedente'

  const pagoReal = await tx.pagoCobro.create({
    data: {
      cuentaPorCobrarId: cxc.id,
      cuentaBancariaId,
      monto: montoReal,
      fechaPago: fechaReal,
      medioPago,
      esDetraccion: abono.tipo === 'detraccion',
      observaciones: observaciones || `${etiqueta} factoring${cobro.financiera ? ` ${cobro.financiera}` : ''}`,
      updatedAt: new Date(),
    },
  })

  // Ajuste por mora: si llegó menos de lo esperado, la diferencia cierra el
  // saldo como costo/pérdida (esAjusteMora), no como dinero recibido.
  const diferencia = abono.montoEsperado != null ? round2(abono.montoEsperado - montoReal) : 0
  if (diferencia > 0.01) {
    await tx.pagoCobro.create({
      data: {
        cuentaPorCobrarId: cxc.id,
        cuentaBancariaId: null,
        monto: diferencia,
        fechaPago: fechaReal,
        medioPago: 'factoring_ajuste_mora',
        esAjusteMora: true,
        observaciones: `Ajuste por mora — ${etiqueta.toLowerCase()} esperado ${abono.montoEsperado}, recibido ${montoReal}`,
        updatedAt: new Date(),
      },
    })
  }

  const abonoActualizado = await tx.abonoValorizacion.update({
    where: { id: abonoId },
    data: {
      estado: 'recibido',
      montoReal,
      fechaReal,
      observaciones: observaciones ?? abono.observaciones,
      pagoCobroId: pagoReal.id,
    },
  })

  await recalcularCuentaPorCobrar(cxc.id, tx)

  if (abono.tipo === 'excedente') {
    await tx.cobroValorizacion.update({
      where: { id: cobro.id },
      data: { estado: 'confirmada', fechaConfirmacion: fechaReal, updatedAt: new Date() },
    })
  }

  return abonoActualizado
}

/**
 * Revierte (Caso 1, Sub-fase E) un desembolso de factoring ya guardado, siempre
 * que ningún evento posterior (saldo_girar/detraccion/excedente) se haya
 * marcado recibido todavía — es decir, deshace exactamente lo que hizo
 * procesarDesembolsoFactoring, sin nada más encima.
 *
 * El adelanto (evento 1) siempre está 'recibido' — lo pone automático el
 * propio desembolso, no es una acción del usuario — así que no cuenta para la
 * precondición ni bloquea esta reversión.
 *
 * anula (no borra) los PagoCobro reales del desembolso (adelanto + costo de
 * financiamiento, si existió); borra sin rastro los 4 AbonoValorizacion —
 * seguro porque nada más referencia un AbonoValorizacion por FK y el rastro
 * de auditoría real vive en el PagoCobro anulado, no en el abono. Deja
 * fechaDesembolso en null para que el trigger existente en POST /cobro
 * (transición null→poblado) reprocese solo cuando se corrija y regrabe.
 */
export async function revertirDesembolsoFactoring(
  cobroValorizacionId: string,
  motivo: string,
  tx: PrismaClientOrTx
) {
  const cobro = await tx.cobroValorizacion.findUnique({
    where: { id: cobroValorizacionId },
    include: { valorizacion: { include: { cuentasPorCobrar: true } }, abonos: true },
  })
  if (!cobro) {
    throw new Error('CobroValorizacion no encontrado')
  }
  if (cobro.estado !== 'desembolsada') {
    throw new Error(`No se puede revertir: la operación está en estado '${cobro.estado}', no 'desembolsada'`)
  }
  const yaHayRecibidos = cobro.abonos.some(
    a => a.tipo !== 'adelanto' && a.estado === 'recibido'
  )
  if (yaHayRecibidos) {
    throw new Error(
      'No se puede revertir el desembolso: ya hay eventos recibidos sobre él. Revierte primero cada evento recibido (incluido el excedente si aplica) y luego el desembolso.'
    )
  }

  const cxc = cobro.valorizacion.cuentasPorCobrar.find(c => c.estado !== 'anulada')
  if (!cxc) {
    throw new Error('La valorización no tiene una CuentaPorCobrar activa')
  }

  const fechaAnulacion = new Date()

  const abonoAdelanto = cobro.abonos.find(a => a.tipo === 'adelanto')
  if (abonoAdelanto?.pagoCobroId) {
    await tx.pagoCobro.update({
      where: { id: abonoAdelanto.pagoCobroId },
      data: { anulado: true, motivoAnulacion: motivo, fechaAnulacion, updatedAt: new Date() },
    })
  }

  const pagoCosto = await tx.pagoCobro.findFirst({
    where: { cuentaPorCobrarId: cxc.id, esCostoFinanciamiento: true, anulado: false },
  })
  if (pagoCosto) {
    await tx.pagoCobro.update({
      where: { id: pagoCosto.id },
      data: { anulado: true, motivoAnulacion: motivo, fechaAnulacion, updatedAt: new Date() },
    })
  }

  await tx.abonoValorizacion.deleteMany({ where: { cobroId: cobroValorizacionId } })

  await tx.cobroValorizacion.update({
    where: { id: cobroValorizacionId },
    data: { estado: 'en_negociacion', fechaDesembolso: null, updatedAt: new Date() },
  })

  await recalcularCuentaPorCobrar(cxc.id, tx)
}

/**
 * Revierte (Caso 2, Sub-fase E) un "cobro esperado" ya marcado recibido —
 * ej. detraccion recibida con el monto equivocado. Anula el PagoCobro real y,
 * si existió, su PagoCobro hermano de ajuste por mora (mismo pago, misma
 * fecha, mismo tipo de evento en la observación — se crean juntos en
 * marcarAbonoFactoringRecibido, deben revertirse juntos). El abono vuelve a
 * 'pendiente' con su monto teórico intacto.
 *
 * Guard de orden simétrico al de recepción: si se intenta revertir
 * saldo_girar o detraccion mientras el excedente de la misma operación ya
 * está 'recibido', bloquea — revertir dejaría un excedente confirmado sin la
 * premisa que lo permitió.
 *
 * Si el evento es 'excedente', además revierte sus 2 efectos: CobroValorizacion
 * vuelve de 'confirmada' a 'desembolsada' (sin fechaConfirmacion), y si la
 * Valorizacion había subido a 'pagada' por este cobro, baja a 'facturada'
 * (recalcularCuentaPorCobrar ya hace ese downgrade).
 */
export async function revertirAbonoFactoringRecibido(
  abonoId: string,
  motivo: string,
  tx: PrismaClientOrTx
) {
  const abono = await tx.abonoValorizacion.findUnique({
    where: { id: abonoId },
    include: { cobro: { include: { valorizacion: { include: { cuentasPorCobrar: true } } } } },
  })
  if (!abono) {
    throw new Error('Cobro esperado no encontrado')
  }
  if (abono.estado !== 'recibido') {
    throw new Error('Este cobro esperado no está recibido — no hay nada que revertir')
  }
  if (!abono.tipo) {
    throw new Error('Este abono no tiene un tipo de evento definido — no se puede procesar por este flujo')
  }
  // El adelanto no se revierte suelto: es la base de todo el resto del
  // cronograma (el guard de orden de marcarAbonoFactoringRecibido exige que
  // esté 'recibido' antes que cualquier otro evento). Revertirlo con esta
  // función solo anularía SU PagoCobro, dejando el de costo de financiamiento
  // (que no está vinculado a ningún abono) activo y el resto del cronograma
  // en un estado inconsistente. La única forma correcta de deshacer el
  // adelanto es revertir el desembolso completo (Caso 1).
  if (abono.tipo === 'adelanto') {
    throw new Error('El adelanto no se revierte individualmente — usa "Revertir desembolso" para deshacer la operación completa')
  }

  const cobro = abono.cobro
  const cxc = cobro.valorizacion.cuentasPorCobrar.find(c => c.estado !== 'anulada')
  if (!cxc) {
    throw new Error('La valorización no tiene una CuentaPorCobrar activa')
  }

  // Guard de orden simétrico: no se puede revertir saldo_girar/detraccion si
  // el excedente (que dependía de ambos) ya está recibido.
  if (abono.tipo === 'saldo_girar' || abono.tipo === 'detraccion') {
    const excedenteRecibido = await tx.abonoValorizacion.findFirst({
      where: { cobroId: cobro.id, tipo: 'excedente', estado: 'recibido' },
      select: { id: true },
    })
    if (excedenteRecibido) {
      throw new Error('No se puede revertir: el excedente de esta operación ya fue recibido. Revierte primero el excedente.')
    }
  }

  const fechaAnulacion = new Date()

  if (abono.pagoCobroId) {
    const pagoReal = await tx.pagoCobro.findUnique({ where: { id: abono.pagoCobroId } })
    if (pagoReal) {
      await tx.pagoCobro.update({
        where: { id: pagoReal.id },
        data: { anulado: true, motivoAnulacion: motivo, fechaAnulacion, updatedAt: new Date() },
      })

      // PagoCobro hermano de ajuste por mora — mismo pago, misma fecha, mismo
      // tipo de evento en la observación (ver marcarAbonoFactoringRecibido).
      const etiqueta = abono.tipo === 'saldo_girar' ? 'Saldo a girar'
        : abono.tipo === 'detraccion' ? 'Detracción'
        : 'Excedente'
      const pagoMora = await tx.pagoCobro.findFirst({
        where: {
          cuentaPorCobrarId: cxc.id,
          esAjusteMora: true,
          anulado: false,
          fechaPago: pagoReal.fechaPago,
          observaciones: { contains: etiqueta, mode: 'insensitive' },
        },
      })
      if (pagoMora) {
        await tx.pagoCobro.update({
          where: { id: pagoMora.id },
          data: { anulado: true, motivoAnulacion: motivo, fechaAnulacion, updatedAt: new Date() },
        })
      }
    }
  }

  const notaReversion = `Revertido: ${motivo} — antes: ${abono.montoReal ?? ''} el ${abono.fechaReal ? abono.fechaReal.toISOString().split('T')[0] : ''}`
  const abonoActualizado = await tx.abonoValorizacion.update({
    where: { id: abonoId },
    data: {
      estado: 'pendiente',
      montoReal: null,
      fechaReal: null,
      pagoCobroId: null,
      observaciones: abono.observaciones ? `${abono.observaciones} | ${notaReversion}` : notaReversion,
    },
  })

  if (abono.tipo === 'excedente') {
    await tx.cobroValorizacion.update({
      where: { id: cobro.id },
      data: { estado: 'desembolsada', fechaConfirmacion: null, updatedAt: new Date() },
    })
  }

  await recalcularCuentaPorCobrar(cxc.id, tx)

  return abonoActualizado
}
