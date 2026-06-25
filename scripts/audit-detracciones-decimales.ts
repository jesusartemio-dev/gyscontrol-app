/**
 * Muestra los registros PagoCobro con detraccionMonto no entero.
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/audit-detracciones-decimales.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pagos = await prisma.pagoCobro.findMany({
    where: { esDetraccion: true, detraccionMonto: { not: null } },
    include: {
      cuentaPorCobrar: {
        select: {
          numeroDocumento: true,
          proyecto: { select: { codigo: true } },
          cliente: { select: { nombre: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const conDecimales = pagos.filter(p => {
    const m = p.detraccionMonto ?? 0
    return m !== Math.round(m)
  })

  if (conDecimales.length === 0) {
    console.log('✅ No hay registros con decimales en detraccionMonto.')
    return
  }

  console.log(`\n🔍 Registros con detraccionMonto no entero: ${conDecimales.length}\n`)
  console.log('ID'.padEnd(30), 'Documento'.padEnd(15), 'Proyecto'.padEnd(12), 'Cliente'.padEnd(25), 'Actual'.padEnd(12), '→ Redondeado')
  console.log('-'.repeat(115))

  for (const p of conDecimales) {
    const actual = p.detraccionMonto!
    const redondeado = Math.round(actual)
    const doc = p.cuentaPorCobrar?.numeroDocumento ?? '—'
    const proy = p.cuentaPorCobrar?.proyecto?.codigo ?? '—'
    const cliente = p.cuentaPorCobrar?.cliente?.nombre?.slice(0, 24) ?? '—'
    console.log(
      p.id.padEnd(30),
      doc.padEnd(15),
      proy.padEnd(12),
      cliente.padEnd(25),
      actual.toFixed(2).padEnd(12),
      `→ ${redondeado}`
    )
  }

  console.log(`\nTotal a corregir: ${conDecimales.length}`)
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
