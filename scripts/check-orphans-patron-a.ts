import { prisma } from '@/lib/prisma'

async function main() {
  const ids = [
    'cwrzu7u27auuh833io5dp3ro',
    'jut13mmgo2exqkrv80wz1rjo',
    'kbq631qbq6k98a6bij49bdzj',
  ]

  for (const id of ids) {
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      include: {
        listaEquipo: {
          select: {
            id: true,
            codigo: true,
            estado: true,
            proyecto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
        proyectoEquipoItem: {
          select: {
            id: true,
            estado: true,
            listaEquipoSeleccionadoId: true,
            proyectoEquipoCotizado: { select: { id: true, nombre: true } },
          },
        },
        pedidoEquipoItem: {
          select: {
            id: true,
            cantidadPedida: true,
            cantidadAtendida: true,
            estado: true,
            pedidoEquipo: { select: { id: true, codigo: true, estado: true } },
          },
        },
        cotizacionProveedorItems: { select: { id: true, esSeleccionada: true } },
        cotizacionSeleccionada: { select: { id: true, precioUnitario: true, cantidad: true } },
      },
    })

    if (!item) {
      console.log(`❌ ${id}: NO ENCONTRADO`)
      continue
    }

    const proyId = item.listaEquipo.proyecto.id
    const listaId = item.listaEquipo.id
    const equipoGrupoId = item.proyectoEquipoItem?.proyectoEquipoCotizado.id

    console.log('━'.repeat(110))
    console.log(`📦 ${item.codigo} — ${item.descripcion}`)
    console.log(`   Proyecto: [${item.listaEquipo.proyecto.codigo}] ${item.listaEquipo.proyecto.nombre}`)
    console.log(`   Lista: ${item.listaEquipo.codigo} (${item.listaEquipo.estado})`)
    console.log(`   Origen actual: ${item.origen}  |  Cantidad: ${item.cantidad}  |  Cantidad pedida: ${item.cantidadPedida}`)
    console.log(`   Equipo cotizado: grupo "${item.proyectoEquipoItem?.proyectoEquipoCotizado.nombre}" — estado=${item.proyectoEquipoItem?.estado}`)
    console.log()
    console.log(`   🔗 URL Lista:`)
    console.log(`      https://app.gyscontrol.com/proyectos/${proyId}/listas/${listaId}`)
    console.log(`   🔗 URL Equipo (grupo):`)
    console.log(`      https://app.gyscontrol.com/proyectos/${proyId}/equipos/detalle/${equipoGrupoId}`)

    if (item.pedidoEquipoItem.length > 0) {
      console.log()
      console.log(`   📋 Pedidos asociados (${item.pedidoEquipoItem.length}):`)
      for (const p of item.pedidoEquipoItem) {
        console.log(`      - Pedido ${p.pedidoEquipo.codigo} (${p.pedidoEquipo.estado}): pedido=${p.cantidadPedida}, atendido=${p.cantidadAtendida}, estado_item=${p.estado}`)
      }
    }

    if (item.cotizacionSeleccionada) {
      console.log()
      console.log(`   💰 Cotización seleccionada: precio=${item.cotizacionSeleccionada.precioUnitario}, cant=${item.cotizacionSeleccionada.cantidad}`)
    }
    if (item.cotizacionProveedorItems.length > 0) {
      console.log(`   💼 Cotizaciones de proveedor: ${item.cotizacionProveedorItems.length} (${item.cotizacionProveedorItems.filter(c => c.esSeleccionada).length} seleccionadas)`)
    }
  }
  console.log('━'.repeat(110))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
