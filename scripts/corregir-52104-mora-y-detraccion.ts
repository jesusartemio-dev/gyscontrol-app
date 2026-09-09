/**
 * Corrige la operación 52104 (E001-1737, E001-1738, E001-1739), tras
 * comparar contra la hoja de Administración:
 *
 * 1) E001-1737 y E001-1738: el ajuste de "Saldo a Girar" (26.32 y 52.86) se
 *    confirmó el 06/05/2026, antes del fix 321d14f0 — quedó etiquetado
 *    'factoring_ajuste_mora' cuando en realidad es interés de reliquidación.
 *    Mismo bug que ya se corrigió en QRM15. Se recategoriza el PagoCobro y
 *    se llena cobro.interesReliquidacion (que estaba vacío en las dos).
 *
 * 2) E001-1737: su cobro ya existía antes de que se sincronizara
 *    detraccionPct/detraccionMonto a nivel CxC. El Cronograma ya tiene el
 *    evento correcto (1,126.32 pendiente) — se copia ese mismo valor a la
 *    CxC, no se inventa nada nuevo.
 *
 * SIMULACRO POR DEFECTO:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/corregir-52104-mora-y-detraccion.ts [--ejecutar]
 */
import { prisma } from '../src/lib/prisma'

const EJECUTAR = process.argv.includes('--ejecutar')
const m = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2)

async function main() {
  const url = process.env.DATABASE_URL || ''
  console.log(`ENTORNO: ${/neon\.tech|ep-[a-z0-9-]+/.test(url) ? '*** PRODUCCION ***' : 'local/dev'}`)
  console.log(`MODO   : ${EJECUTAR ? '*** EJECUTAR ***' : 'SIMULACRO (no escribe nada)'}\n`)

  // ── 1) Recategorizar el ajuste de interés en 1737 y 1738 ──
  for (const doc of ['E001-1737', 'E001-1738']) {
    const cxc = await prisma.cuentaPorCobrar.findFirstOrThrow({
      where: { numeroDocumento: doc },
      include: { valorizacion: { select: { cobro: true } } },
    })
    const cobro = cxc.valorizacion!.cobro!
    const pagoInteres = await prisma.pagoCobro.findFirst({
      where: { cuentaPorCobrarId: cxc.id, medioPago: 'factoring_ajuste_mora' },
    })
    if (!pagoInteres) { console.log(`### ${doc}: no se encontró el PagoCobro de ajuste — se omite`); continue }

    console.log(`### ${doc}`)
    console.log(`  PagoCobro ${pagoInteres.id}: medioPago 'factoring_ajuste_mora' (${m(pagoInteres.monto)}) -> 'factoring_ajuste_interes'`)
    console.log(`  cobro.interesReliquidacion: ${m(cobro.interesReliquidacion)} -> ${m(pagoInteres.monto)}`)

    if (EJECUTAR) {
      await prisma.$transaction(async tx => {
        await tx.pagoCobro.update({
          where: { id: pagoInteres.id },
          data: { medioPago: 'factoring_ajuste_interes', updatedAt: new Date() },
        })
        if (cobro.interesReliquidacion == null) {
          await tx.cobroValorizacion.update({
            where: { id: cobro.id },
            data: { interesReliquidacion: pagoInteres.monto, updatedAt: new Date() },
          })
        }
      })
      console.log(`  hecho`)
    }
    console.log('')
  }

  // ── 2) Sincronizar detracción de E001-1737 a nivel CxC ──
  const cxc1737 = await prisma.cuentaPorCobrar.findFirstOrThrow({
    where: { numeroDocumento: 'E001-1737' },
    include: { valorizacion: { select: { cobro: true } } },
  })
  const cobro1737 = cxc1737.valorizacion!.cobro!
  const abonoDetraccion = await prisma.abonoValorizacion.findFirstOrThrow({
    where: { cobroId: cobro1737.id, tipo: 'detraccion' },
  })

  console.log(`### E001-1737 — sincronizar detracción a nivel CxC`)
  console.log(`  CxC.detraccionPct   : ${cxc1737.detraccionPct} -> 12`)
  console.log(`  CxC.detraccionMonto : ${m(cxc1737.detraccionMonto)} -> ${m(abonoDetraccion.montoEsperado)}  (ya está en el Cronograma, solo se copia)`)
  console.log(`  cobro.detraccionPct   : ${cobro1737.detraccionPct} -> 12`)
  console.log(`  cobro.detraccionMonto : ${m(cobro1737.detraccionMonto)} -> ${m(abonoDetraccion.montoEsperado)}`)

  if (EJECUTAR) {
    await prisma.$transaction(async tx => {
      await tx.cuentaPorCobrar.update({
        where: { id: cxc1737.id },
        data: { detraccionPct: 12, detraccionMonto: abonoDetraccion.montoEsperado, updatedAt: new Date() },
      })
      await tx.cobroValorizacion.update({
        where: { id: cobro1737.id },
        data: { detraccionPct: 12, detraccionMonto: abonoDetraccion.montoEsperado, updatedAt: new Date() },
      })
    })
    console.log(`  hecho`)
  }

  if (!EJECUTAR) {
    console.log('\nSIMULACRO — no se escribió nada. Agrega --ejecutar para aplicarlo.')
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
