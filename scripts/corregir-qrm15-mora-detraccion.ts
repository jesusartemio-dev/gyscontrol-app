/**
 * Corrige QRM15 E001-1719 (op 48507), los dos hallazgos de Administración:
 *
 * 1) El ajuste de 28.31 al confirmar "Saldo a Girar" quedó guardado como
 *    'factoring_ajuste_mora' — pero es interés de reliquidación, no mora.
 *    Se recategoriza a 'factoring_ajuste_interes' (solo la etiqueta;
 *    esAjusteMora se deja en true, así el dashboard de empresa no cambia).
 *    cobro.interesReliquidacion ya está en 28.31 — no se toca.
 *
 * 2) El evento "Detracción" se confirmó con el comprobante en SOLES
 *    (14,248.00) en el campo de monto en dólares, sobrepagando la CxC en
 *    USD 10,008.83. Se corrige a 4,239.17 (USD), y el 14,248.00 se preserva
 *    como referencia en el nuevo campo detraccionMontoPEN.
 *
 * Después de los dos, se recalcula la CxC con la misma función que usa la
 * app (recalcularCuentaPorCobrar) — nada de saldo/estado se toca a mano.
 *
 * SIMULACRO POR DEFECTO:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/corregir-qrm15-mora-detraccion.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'
import { recalcularCuentaPorCobrar } from '../src/lib/services/pagoCobro'

const EJECUTAR = process.argv.includes('--ejecutar')
const NUMERO_DOCUMENTO = 'E001-1719'
const m = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2)

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  const cxc = await prisma.cuentaPorCobrar.findFirstOrThrow({
    where: { numeroDocumento: NUMERO_DOCUMENTO },
    include: { proyecto: { select: { codigo: true } }, valorizacion: { select: { id: true, cobro: true } } },
  })
  const cobro = cxc.valorizacion!.cobro!

  const abonoDetraccion = await prisma.abonoValorizacion.findFirstOrThrow({
    where: { cobroId: cobro.id, tipo: 'detraccion' },
  })
  const pagoDetraccion = await prisma.pagoCobro.findFirstOrThrow({ where: { id: abonoDetraccion.pagoCobroId! } })

  const pagoInteres = await prisma.pagoCobro.findFirst({
    where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring_ajuste_mora', monto: { lt: 100 } },
  })

  console.log(`### ${cxc.numeroDocumento} — ${cxc.proyecto?.codigo}`)
  console.log(`  AHORA: montoPagado ${m(cxc.montoPagado)} | saldoPendiente ${m(cxc.saldoPendiente)} | estado ${cxc.estado}\n`)

  console.log(`  [1] Recategorizar el ajuste de interés`)
  if (pagoInteres) {
    console.log(`      PagoCobro ${pagoInteres.id}: medioPago '${pagoInteres.medioPago}' (${m(pagoInteres.monto)}) -> 'factoring_ajuste_interes'`)
  } else {
    console.log(`      No se encontró el PagoCobro de 28.31 esperado — se omite este paso (revisar a mano)`)
  }

  console.log(`\n  [2] Corregir la detracción en soles`)
  console.log(`      AbonoValorizacion.montoReal: ${m(abonoDetraccion.montoReal)} -> 4239.17`)
  console.log(`      PagoCobro.monto:             ${m(pagoDetraccion.monto)} -> 4239.17`)
  console.log(`      PagoCobro.detraccionMontoPEN: ${m(pagoDetraccion.detraccionMontoPEN)} -> 14248.00 (se preserva como referencia)`)

  const saldoPrevisto = cxc.monto - (cxc.montoPagado - pagoDetraccion.monto + 4239.17)
  console.log(`\n  QUEDA: montoPagado ${m(cxc.monto)} | saldoPendiente 0.00 | estado pagada`)
  console.log(`  (chequeo: ${m(cxc.montoPagado)} - ${m(pagoDetraccion.monto)} + 4239.17 = ${m(cxc.montoPagado - pagoDetraccion.monto + 4239.17)})\n`)

  if (!EJECUTAR) {
    console.log('SIMULACRO — no se escribió nada. Agrega --ejecutar para aplicarlo.')
    await prisma.$disconnect()
    return
  }

  await prisma.$transaction(async tx => {
    if (pagoInteres) {
      await tx.pagoCobro.update({
        where: { id: pagoInteres.id },
        data: { medioPago: 'factoring_ajuste_interes', updatedAt: new Date() },
      })
    }
    await tx.abonoValorizacion.update({
      where: { id: abonoDetraccion.id },
      data: { montoReal: 4239.17 },
    })
    await tx.pagoCobro.update({
      where: { id: pagoDetraccion.id },
      data: { monto: 4239.17, detraccionMontoPEN: 14248.00, updatedAt: new Date() },
    })
    await recalcularCuentaPorCobrar(cxc.id, tx)
  })

  const despues = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
  console.log(`CORREGIDO -> montoPagado ${m(despues.montoPagado)} | saldoPendiente ${m(despues.saldoPendiente)} | estado ${despues.estado}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
