/**
 * Backfill: copiar ListaEquipoItem.proveedorId → PedidoEquipoItem.proveedorId
 * cuando el ítem del pedido no tiene proveedor pero la lista de origen sí.
 *
 * Uso:
 *   dotenv -e .env -o -- npx tsx scripts/backfill-pei-proveedor.ts          # dry-run local
 *   dotenv -e .env -o -- npx tsx scripts/backfill-pei-proveedor.ts --apply  # aplica local
 *   dotenv -e .env.production -o -- npx tsx scripts/backfill-pei-proveedor.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  console.log(APPLY ? '🔄 APPLY' : '🔍 DRY-RUN')

  const items = await prisma.pedidoEquipoItem.findMany({
    where: {
      proveedorId: null,
      listaEquipoItem: { proveedorId: { not: null } },
    },
    select: {
      id: true,
      codigo: true,
      pedidoEquipo: { select: { codigo: true } },
      listaEquipoItem: {
        select: {
          proveedorId: true,
          proveedor: { select: { nombre: true } },
        },
      },
    },
  })

  if (items.length === 0) {
    console.log('✅ No hay items para backfillear.')
    return
  }

  console.log(`Encontrados ${items.length} items con backfill pendiente:`)
  for (const item of items) {
    console.log(`  ${item.pedidoEquipo.codigo}/${item.codigo} → ${item.listaEquipoItem?.proveedor?.nombre}`)
  }

  if (!APPLY) {
    console.log('\n💡 Para aplicar pasá --apply')
    return
  }

  let count = 0
  for (const item of items) {
    if (item.listaEquipoItem?.proveedorId) {
      await prisma.pedidoEquipoItem.update({
        where: { id: item.id },
        data: {
          proveedorId: item.listaEquipoItem.proveedorId,
          proveedorNombre: item.listaEquipoItem.proveedor?.nombre || null,
          updatedAt: new Date(),
        },
      })
      count++
    }
  }
  console.log(`✅ Aplicado a ${count} items`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
