/**
 * Corrección puntual: CuentaPorCobrar.detraccionMonto de FMK01 (E001-1761) ya
 * se corrigió a 510.06 el 09-09 (vía "Verificar factura", antes de que
 * existiera el arreglo de sincronización 820b53c6). Ese arreglo solo actúa
 * hacia adelante — no corrigió retroactivamente lo que ya estaba
 * desincronizado, así que CobroValorizacion.detraccionMonto y el
 * AbonoValorizacion(detraccion).montoEsperado siguieron en 509.98.
 *
 * Este script hace manualmente lo que el endpoint ya hace solo desde ahora:
 * copiar el 510.06 correcto a los otros dos lugares.
 *
 * SIMULACRO POR DEFECTO:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/sincronizar-detraccion-fmk01.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'

const EJECUTAR = process.argv.includes('--ejecutar')
const NUMERO_DOCUMENTO = 'E001-1761'

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  const cxc = await prisma.cuentaPorCobrar.findFirstOrThrow({
    where: { numeroDocumento: NUMERO_DOCUMENTO },
    include: { valorizacion: { select: { id: true, cobro: true } } },
  })
  const cobro = cxc.valorizacion!.cobro!
  const abono = await prisma.abonoValorizacion.findFirstOrThrow({ where: { cobroId: cobro.id, tipo: 'detraccion' } })

  console.log(`### ${cxc.numeroDocumento}`)
  console.log(`  CuentaPorCobrar.detraccionMonto   : ${cxc.detraccionMonto}  (correcto, sin tocar)`)
  console.log(`  CobroValorizacion.detraccionMonto : ${cobro.detraccionMonto}  -> ${cxc.detraccionMonto}`)
  console.log(`  AbonoValorizacion.montoEsperado   : ${abono.montoEsperado} (${abono.estado})  -> ${cxc.detraccionMonto}${abono.estado !== 'pendiente' ? '  (NO se toca: ya no está pendiente)' : ''}`)

  if (!EJECUTAR) {
    console.log('\nSIMULACRO — no se escribió nada. Agrega --ejecutar para aplicarlo.')
    await prisma.$disconnect()
    return
  }

  await prisma.$transaction(async tx => {
    await tx.cobroValorizacion.update({
      where: { id: cobro.id },
      data: { detraccionMonto: cxc.detraccionMonto, updatedAt: new Date() },
    })
    if (abono.estado === 'pendiente') {
      await tx.abonoValorizacion.update({
        where: { id: abono.id },
        data: { montoEsperado: cxc.detraccionMonto },
      })
    }
  })

  const cobroDespues = await prisma.cobroValorizacion.findUniqueOrThrow({ where: { id: cobro.id } })
  const abonoDespues = await prisma.abonoValorizacion.findUniqueOrThrow({ where: { id: abono.id } })
  console.log(`\nCORREGIDO -> CobroValorizacion.detraccionMonto=${cobroDespues.detraccionMonto} | AbonoValorizacion.montoEsperado=${abonoDespues.montoEsperado}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
