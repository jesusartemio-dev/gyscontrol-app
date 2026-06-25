/**
 * Corrige registros PagoCobro con detraccionMonto no entero.
 * También actualiza monto (que refleja el mismo valor) y recalcula
 * montoPagado / saldoPendiente de la CxC afectada.
 *
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/fix-detracciones-decimales.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pagos = await prisma.pagoCobro.findMany({
    where: { esDetraccion: true, detraccionMonto: { not: null } },
    include: {
      cuentaPorCobrar: {
        select: {
          id: true,
          numeroDocumento: true,
          monto: true,
          proyecto: { select: { codigo: true } },
          cliente: { select: { nombre: true } },
        },
      },
    },
  })

  const conDecimales = pagos.filter(p => {
    const m = p.detraccionMonto ?? 0
    return m !== Math.round(m)
  })

  if (conDecimales.length === 0) {
    console.log('✅ No hay registros con decimales. Nada que corregir.')
    return
  }

  console.log(`\n🔧 Corrigiendo ${conDecimales.length} registro(s)...\n`)

  for (const p of conDecimales) {
    const montoAntes = p.detraccionMonto!
    const montoDespues = Math.round(montoAntes)
    const diferencia = montoDespues - montoAntes
    const cxcId = p.cuentaPorCobrarId

    // 1. Corregir el PagoCobro
    await prisma.pagoCobro.update({
      where: { id: p.id },
      data: {
        monto: montoDespues,
        detraccionMonto: montoDespues,
        updatedAt: new Date(),
      },
    })

    // 2. Recalcular montoPagado y saldoPendiente de la CxC
    const todosPagos = await prisma.pagoCobro.findMany({
      where: { cuentaPorCobrarId: cxcId },
      select: { monto: true },
    })
    const nuevoMontoPagado = Math.round(todosPagos.reduce((s, pg) => s + pg.monto, 0) * 100) / 100
    const cxc = p.cuentaPorCobrar!
    const nuevoSaldo = Math.round((cxc.monto - nuevoMontoPagado) * 100) / 100

    await prisma.cuentaPorCobrar.update({
      where: { id: cxcId },
      data: {
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldo,
        updatedAt: new Date(),
      },
    })

    console.log(`✅ PagoCobro ${p.id}`)
    console.log(`   Documento : ${cxc.numeroDocumento} — ${cxc.proyecto?.codigo} (${cxc.cliente?.nombre})`)
    console.log(`   detraccionMonto: S/ ${montoAntes.toFixed(2)} → S/ ${montoDespues}`)
    console.log(`   monto pago:      S/ ${montoAntes.toFixed(2)} → S/ ${montoDespues}`)
    console.log(`   diferencia:      +S/ ${diferencia.toFixed(2)}`)
    console.log(`   CxC montoPagado recalculado: S/ ${nuevoMontoPagado.toFixed(2)}`)
    console.log(`   CxC saldoPendiente nuevo:    S/ ${nuevoSaldo.toFixed(2)}`)
  }

  console.log('\n✨ Corrección completada.')
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
