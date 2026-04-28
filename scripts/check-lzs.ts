import { prisma } from '@/lib/prisma'

async function main() {
  const item = await prisma.listaEquipoItem.findUnique({
    where: { id: 'kbq631qbq6k98a6bij49bdzj' },
    select: {
      id: true,
      codigo: true,
      origen: true,
      proyectoEquipoItemId: true,
      proyectoEquipoItem: {
        select: { id: true, codigo: true, estado: true, listaEquipoSeleccionadoId: true },
      },
    },
  })
  console.log('LZS:PT5A5T30 estado actual:')
  console.log(JSON.stringify(item, null, 2))

  // Verifica directo
  if (item?.proyectoEquipoItem) {
    const eqId = item.proyectoEquipoItem.listaEquipoSeleccionadoId
    console.log(`\nEquipo's listaEquipoSeleccionadoId = ${eqId}`)
    console.log(`Item id = ${item.id}`)
    console.log(`Match? ${eqId === item.id}`)
    console.log(`Distintos? ${eqId !== item.id}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
