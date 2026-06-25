/**
 * Muestra CxC sin valorización vinculada (creadas directamente, sin pasar por Facturación).
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/audit-cxc-sin-valorizacion.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cxcs = await prisma.cuentaPorCobrar.findMany({
    where: { estado: { not: 'anulada' } },
    select: {
      id: true,
      numeroDocumento: true,
      valorizacionId: true,
      estado: true,
      monto: true,
      moneda: true,
      createdAt: true,
      proyecto: { select: { codigo: true } },
      cliente: { select: { nombre: true } },
      valorizacion: { select: { codigo: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const sinVal = cxcs.filter(c => !c.valorizacionId)
  const conVal = cxcs.filter(c => !!c.valorizacionId)

  console.log(`\n📊 Resumen CxC activas (no anuladas)`)
  console.log(`   Con valorización vinculada:   ${conVal.length}`)
  console.log(`   Sin valorización (directas):  ${sinVal.length}`)
  console.log(`   TOTAL:                         ${cxcs.length}`)

  if (sinVal.length === 0) {
    console.log('\n✅ Todas las CxC tienen valorización vinculada.')
    return
  }

  console.log('\n🔍 CxC sin valorización (flujo directo):')
  console.log('-'.repeat(110))
  console.log(
    'Documento'.padEnd(14),
    'Proyecto'.padEnd(10),
    'Cliente'.padEnd(30),
    'Moneda'.padEnd(8),
    'Monto'.padEnd(14),
    'Estado'.padEnd(14),
    'Creada'
  )
  console.log('-'.repeat(110))

  for (const c of sinVal) {
    console.log(
      (c.numeroDocumento ?? '—').padEnd(14),
      (c.proyecto?.codigo ?? '—').padEnd(10),
      (c.cliente?.nombre?.slice(0, 28) ?? '—').padEnd(30),
      c.moneda.padEnd(8),
      c.monto.toFixed(2).padEnd(14),
      c.estado.padEnd(14),
      c.createdAt.toISOString().split('T')[0]
    )
  }
  console.log('-'.repeat(110))
  console.log(`Total: ${sinVal.length} CxC sin valorización`)
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
