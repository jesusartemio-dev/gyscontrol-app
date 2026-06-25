/**
 * Detecta CxC cuya valorización vinculada NO está en estado 'facturada' o 'pagada'.
 * Indica que la CxC fue creada directamente sin seguir el flujo de Facturación.
 * Uso: npx dotenv -e .env.production -o -- tsx scripts/audit-cxc-valorizacion-estado.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cxcs = await prisma.cuentaPorCobrar.findMany({
    where: {
      estado: { not: 'anulada' },
      valorizacionId: { not: null },
    },
    select: {
      id: true,
      numeroDocumento: true,
      estado: true,
      monto: true,
      moneda: true,
      createdAt: true,
      proyecto: { select: { codigo: true } },
      cliente: { select: { nombre: true } },
      valorizacion: { select: { id: true, codigo: true, estado: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const fueraFlujo = cxcs.filter(c =>
    c.valorizacion && !['facturada', 'pagada'].includes(c.valorizacion.estado)
  )
  const enFlujo = cxcs.filter(c =>
    c.valorizacion && ['facturada', 'pagada'].includes(c.valorizacion.estado)
  )

  console.log(`\n📊 CxC con valorización vinculada: ${cxcs.length}`)
  console.log(`   Val. estado facturada/pagada (flujo OK): ${enFlujo.length}`)
  console.log(`   Val. en otro estado (fuera de flujo):    ${fueraFlujo.length}`)

  if (fueraFlujo.length > 0) {
    console.log('\n⚠️  CxC cuya valorización NO está en estado facturada/pagada:')
    console.log('-'.repeat(130))
    console.log(
      'Documento'.padEnd(14),
      'CxC Estado'.padEnd(12),
      'Proyecto'.padEnd(10),
      'Cliente'.padEnd(28),
      'Moneda'.padEnd(8),
      'Monto'.padEnd(12),
      'Valorización'.padEnd(20),
      'Val. Estado'
    )
    console.log('-'.repeat(130))
    for (const c of fueraFlujo) {
      console.log(
        (c.numeroDocumento ?? '—').padEnd(14),
        c.estado.padEnd(12),
        (c.proyecto?.codigo ?? '—').padEnd(10),
        (c.cliente?.nombre?.slice(0, 26) ?? '—').padEnd(28),
        c.moneda.padEnd(8),
        c.monto.toFixed(2).padEnd(12),
        (c.valorizacion?.codigo ?? '—').padEnd(20),
        c.valorizacion?.estado ?? '—'
      )
    }
  }

  console.log('\n✅ CxC en flujo correcto (val. facturada/pagada):')
  for (const c of enFlujo) {
    console.log(
      ' ',
      (c.numeroDocumento ?? '—').padEnd(14),
      (c.proyecto?.codigo ?? '—').padEnd(10),
      (c.valorizacion?.codigo ?? '—').padEnd(20),
      'val:', c.valorizacion?.estado
    )
  }
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
