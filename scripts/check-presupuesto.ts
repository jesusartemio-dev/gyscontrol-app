import { prisma } from '@/lib/prisma'

async function main() {
  const total = await prisma.listaEquipoItem.count()
  const conPresupuesto = await prisma.listaEquipoItem.count({ where: { presupuesto: { not: null, gt: 0 } } })
  const sinPresupuesto = await prisma.listaEquipoItem.count({ where: { OR: [{ presupuesto: null }, { presupuesto: 0 }] } })

  console.log('Total ListaEquipoItems:', total)
  console.log('Con presupuesto > 0:', conPresupuesto)
  console.log('Sin presupuesto (null o 0):', sinPresupuesto)

  const ejemplos = await prisma.listaEquipoItem.findMany({
    where: { presupuesto: { not: null, gt: 0 } },
    select: { codigo: true, presupuesto: true, precioElegido: true, costoElegido: true, origen: true },
    take: 8,
  })
  console.log('\nEjemplos con presupuesto:', ejemplos)
}

main().catch(console.error).finally(() => prisma.$disconnect())
