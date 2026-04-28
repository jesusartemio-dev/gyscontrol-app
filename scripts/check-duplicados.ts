import { prisma } from '@/lib/prisma'

async function main() {
  const equipoIds = [
    '555e89e2-207f-4211-8fae-3e5e3077b05d', // IMC-075's equipo
    '8c4d98a3-20e4-454f-b49e-df8375853020', // UNF105's equipo
  ]

  for (const equipoId of equipoIds) {
    const equipo = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id: equipoId },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        cantidad: true,
        estado: true,
        listaEquipoSeleccionadoId: true,
      },
    })
    if (!equipo) continue

    console.log('━'.repeat(120))
    console.log(`📦 EQUIPO COTIZADO: ${equipo.codigo} — ${equipo.descripcion}`)
    console.log(`   Estado: ${equipo.estado}  |  Cantidad cotizada: ${equipo.cantidad}`)
    console.log(`   Selected actual: ${equipo.listaEquipoSeleccionadoId}\n`)

    // Todos los lista items que apuntan a este equipo
    const listaItems = await prisma.listaEquipoItem.findMany({
      where: { proyectoEquipoItemId: equipoId },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        origen: true,
        estado: true,
        cantidad: true,
        cantidadPedida: true,
        createdAt: true,
        listaEquipo: { select: { codigo: true } },
        pedidoEquipoItem: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log(`   ${listaItems.length} lista item(s) apuntan a este equipo via proyectoEquipoItemId:\n`)
    for (const li of listaItems) {
      const isSelected = li.id === equipo.listaEquipoSeleccionadoId
      const marker = isSelected ? '⭐ SELECTED' : '   '
      console.log(`   ${marker} [${li.listaEquipo.codigo}] ${li.codigo} — ${li.descripcion}`)
      console.log(`        id=${li.id}  |  origen=${li.origen}  |  estado=${li.estado}  |  cant=${li.cantidad}  |  pedida=${li.cantidadPedida}  |  pedidos=${li.pedidoEquipoItem.length}`)
      console.log(`        creado: ${li.createdAt.toISOString()}`)
    }
    console.log()
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
