// ===================================================
// 📁 Archivo: backfill-oc-pedido-equipo-id.ts
// 📌 Ubicación: scripts/
// 🔧 Descripción: Setea OrdenCompra.pedidoEquipoId en OCs huérfanas (creadas
//                 desde el flujo manual /logistica/ordenes-compra/nueva).
//                 Para cada OC con pedidoEquipoId NULL, mira los pedidoEquipoItemId
//                 de sus items: si TODOS apuntan al mismo PedidoEquipo, vincula la OC.
//                 Si vienen de varios pedidos o ninguno, la deja como está.
// 🧠 Uso:
//   npx tsx scripts/backfill-oc-pedido-equipo-id.ts                                          (dev)
//   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-oc-pedido-equipo-id.ts      (prod)
//   Flag --dry-run para solo reportar sin escribir.
// ===================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const dbUrl = process.env.DATABASE_URL?.slice(0, 60) ?? '(sin DATABASE_URL)'

  console.log('🔎 DB destino:', dbUrl)
  console.log(dryRun ? '🧪 Modo DRY-RUN (no se escribirá nada)' : '✏️  Modo ESCRITURA')
  console.log('')

  // 1) Traer OCs sin pedidoEquipoId que tengan al menos un item ligado a un pedido
  const ocsHuerfanas = await prisma.ordenCompra.findMany({
    where: {
      pedidoEquipoId: null,
      items: { some: { pedidoEquipoItemId: { not: null } } },
    },
    select: {
      id: true,
      numero: true,
      items: {
        select: { pedidoEquipoItemId: true },
      },
    },
  })

  console.log(`📋 OCs huérfanas con items ligados a pedido: ${ocsHuerfanas.length}`)
  if (ocsHuerfanas.length === 0) {
    console.log('✅ Nada que hacer.')
    return
  }

  // 2) Para cada OC, resolver el pedidoId de sus items
  const candidatas: { id: string; numero: string; pedidoEquipoId: string }[] = []
  const ambiguas: { numero: string; pedidos: string[] }[] = []

  for (const oc of ocsHuerfanas) {
    const itemIds = oc.items
      .map((i) => i.pedidoEquipoItemId)
      .filter((id): id is string => !!id)

    if (itemIds.length === 0) continue

    const pedidoItems = await prisma.pedidoEquipoItem.findMany({
      where: { id: { in: itemIds } },
      select: { pedidoId: true },
    })

    const pedidosUnicos = [...new Set(pedidoItems.map((pi) => pi.pedidoId))]

    if (pedidosUnicos.length === 1) {
      candidatas.push({ id: oc.id, numero: oc.numero, pedidoEquipoId: pedidosUnicos[0] })
    } else if (pedidosUnicos.length > 1) {
      ambiguas.push({ numero: oc.numero, pedidos: pedidosUnicos })
    }
  }

  console.log(`✅ OCs vinculables (1 solo pedido): ${candidatas.length}`)
  console.log(`⚠️  OCs ambiguas (varios pedidos, se omiten): ${ambiguas.length}`)
  console.log('')

  if (ambiguas.length > 0) {
    console.log('OCs con items de varios pedidos (revisar manualmente si fuera necesario):')
    ambiguas.slice(0, 10).forEach((a) => {
      console.log(`   - ${a.numero} → ${a.pedidos.length} pedidos`)
    })
    if (ambiguas.length > 10) console.log(`   ... y ${ambiguas.length - 10} más`)
    console.log('')
  }

  if (candidatas.length === 0) {
    console.log('Nada que actualizar.')
    return
  }

  if (dryRun) {
    console.log('Ejemplo de las primeras 10 actualizaciones que se harían:')
    candidatas.slice(0, 10).forEach((c) => {
      console.log(`   - ${c.numero} → pedidoEquipoId=${c.pedidoEquipoId}`)
    })
    console.log('')
    console.log('🧪 DRY-RUN: no se actualizó nada. Corre sin --dry-run para aplicar.')
    return
  }

  // 3) Actualizar (no se puede en batch porque cada OC va a un pedidoEquipoId distinto)
  let actualizadas = 0
  for (const c of candidatas) {
    await prisma.ordenCompra.update({
      where: { id: c.id },
      data: { pedidoEquipoId: c.pedidoEquipoId, updatedAt: new Date() },
    })
    actualizadas++
    if (actualizadas % 50 === 0) {
      console.log(`   ✔ ${actualizadas}/${candidatas.length} actualizadas`)
    }
  }

  console.log('')
  console.log(`✅ Terminado — ${actualizadas} OCs vinculadas a su pedido.`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
