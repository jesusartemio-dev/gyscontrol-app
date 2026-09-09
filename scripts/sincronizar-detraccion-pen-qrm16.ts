/**
 * QRM16 E001-1737 ya tiene la detracción confirmada con el depósito real en
 * soles (S/ 3964, constancia 303851272) guardado en PagoCobro, pero
 * CuentaPorCobrar.detraccionMontoPEN quedó en null porque se confirmó antes
 * de que existiera la sincronización (fix en factoringCobro.ts). Por eso la
 * card de resumen no lo mostraba, aunque el reporte sí (detraccionEnSoles
 * caía al cálculo por TC, que coincidía por casualidad con el valor real).
 *
 * Copia el valor real, ya confirmado, a la CxC — mismo patrón que
 * sincronizar-detraccion-fmk01.ts y corregir-52104-mora-y-detraccion.ts.
 *
 * SIMULACRO POR DEFECTO:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/sincronizar-detraccion-pen-qrm16.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'

const EJECUTAR = process.argv.includes('--ejecutar')
const NUMERO_DOCUMENTO = 'E001-1737'

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  const cxc = await prisma.cuentaPorCobrar.findFirstOrThrow({
    where: { numeroDocumento: NUMERO_DOCUMENTO },
    include: { valorizacion: { select: { cobro: true } } },
  })
  const cobro = cxc.valorizacion!.cobro!
  const abono = await prisma.abonoValorizacion.findFirstOrThrow({ where: { cobroId: cobro.id, tipo: 'detraccion' } })
  if (!abono.pagoCobroId) { console.log(`${NUMERO_DOCUMENTO}: el evento no está confirmado — nada que sincronizar`); return }
  const pago = await prisma.pagoCobro.findUniqueOrThrow({ where: { id: abono.pagoCobroId } })

  console.log(`### ${NUMERO_DOCUMENTO}`)
  console.log(`  PagoCobro.detraccionMontoPEN : ${pago.detraccionMontoPEN} (constancia ${pago.numeroConstanciaBN})`)
  console.log(`  CxC.detraccionMontoPEN       : ${cxc.detraccionMontoPEN} -> ${pago.detraccionMontoPEN}`)

  if (!EJECUTAR) {
    console.log('\nSIMULACRO — no se escribió nada. Agrega --ejecutar para aplicarlo.')
    await prisma.$disconnect()
    return
  }

  await prisma.cuentaPorCobrar.update({
    where: { id: cxc.id },
    data: { detraccionMontoPEN: pago.detraccionMontoPEN, updatedAt: new Date() },
  })
  const despues = await prisma.cuentaPorCobrar.findUniqueOrThrow({ where: { id: cxc.id } })
  console.log(`\nCORREGIDO -> CxC.detraccionMontoPEN = ${despues.detraccionMontoPEN}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
