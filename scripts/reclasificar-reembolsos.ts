/**
 * Reclasifica DepositoHoja con tipo='anticipo' que en realidad son reembolsos
 * post-validación (se registraron DESPUÉS del evento 'validado').
 *
 * Por defecto corre en modo DRY-RUN (solo muestra qué haría).
 * Para aplicar: pasá --apply como argumento.
 *
 * Uso:
 *   dotenv -e .env -o -- npx tsx scripts/reclasificar-reembolsos.ts           # dry-run local
 *   dotenv -e .env -o -- npx tsx scripts/reclasificar-reembolsos.ts --apply   # aplica local
 *   dotenv -e .env.production -o -- npx tsx scripts/reclasificar-reembolsos.ts            # dry-run prod
 *   dotenv -e .env.production -o -- npx tsx scripts/reclasificar-reembolsos.ts --apply    # aplica prod
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(APPLY ? '🔄 MODO APLICAR (se modificarán datos)' : '🔍 MODO DRY-RUN (sin cambios)')
  console.log('─'.repeat(60))

  // Buscar todos los anticipos
  const anticipos = await prisma.depositoHoja.findMany({
    where: { tipo: 'anticipo' },
    include: {
      hojaDeGastos: {
        select: {
          id: true,
          numero: true,
          estado: true,
          saldo: true,
          eventos: {
            where: { tipo: 'validado' },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const candidatos: typeof anticipos = []
  for (const ant of anticipos) {
    const fechaValidacion = ant.hojaDeGastos.eventos[0]?.createdAt
    if (!fechaValidacion) continue
    if (ant.createdAt > fechaValidacion) {
      candidatos.push(ant)
    }
  }

  if (candidatos.length === 0) {
    console.log('✅ No hay anticipos post-validación para reclasificar')
    return
  }

  console.log(`Encontrados ${candidatos.length} anticipos que fueron creados DESPUÉS de la validación:\n`)
  for (const c of candidatos) {
    console.log(
      `  • Hoja ${c.hojaDeGastos.numero} (${c.hojaDeGastos.estado})  ` +
      `anticipo #${c.id.slice(-6)}  S/ ${c.monto.toFixed(2)}  ` +
      `creado ${c.createdAt.toISOString().slice(0, 10)}  ` +
      `validado ${c.hojaDeGastos.eventos[0]?.createdAt.toISOString().slice(0, 10)}`
    )
  }

  if (!APPLY) {
    console.log('\n💡 Para aplicar: pasá --apply')
    return
  }

  console.log('\n🔄 Reclasificando a tipo=reembolso...')
  const result = await prisma.depositoHoja.updateMany({
    where: { id: { in: candidatos.map(c => c.id) } },
    data: { tipo: 'reembolso' },
  })
  console.log(`✅ Reclasificados: ${result.count}`)

  console.log('\n🔄 Recalculando saldos de las hojas afectadas...')
  const hojaIds = [...new Set(candidatos.map(c => c.hojaDeGastos.id))]
  for (const hojaId of hojaIds) {
    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id: hojaId } })
    if (!hoja) continue
    const [anticipos, reembolsos, devoluciones] = await Promise.all([
      prisma.depositoHoja.findMany({ where: { hojaDeGastosId: hojaId, tipo: 'anticipo' } }),
      prisma.depositoHoja.findMany({ where: { hojaDeGastosId: hojaId, tipo: 'reembolso' } }),
      prisma.depositoHoja.findMany({ where: { hojaDeGastosId: hojaId, tipo: 'devolucion' } }),
    ])
    const totalAnticipos = anticipos.reduce((s, d) => s + d.monto, 0)
    const totalReembolsos = reembolsos.reduce((s, d) => s + d.monto, 0)
    const totalDevoluciones = devoluciones.reduce((s, d) => s + d.monto, 0)
    await prisma.hojaDeGastos.update({
      where: { id: hojaId },
      data: {
        montoDepositado: totalAnticipos + totalReembolsos,
        saldo: totalAnticipos + totalReembolsos - hoja.montoGastado - totalDevoluciones,
        updatedAt: new Date(),
      },
    })
  }
  console.log(`✅ Saldos recalculados en ${hojaIds.length} hojas`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
