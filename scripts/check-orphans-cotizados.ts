import { prisma } from '@/lib/prisma'

/**
 * Detecta huérfanos REALES con criterio fino:
 *   - origen = 'cotizado' (visualmente muestra "cotizado" en la lista)
 *   - proyectoEquipoItemId no nulo (apunta a un equipo)
 *   - El equipo NO le apunta de vuelta (listaEquipoSeleccionadoId nulo o distinto)
 *
 * Excluye los reemplazos (origen='reemplazo') porque éstos muestran
 * tooltip "Reemplaza a:" válido aunque el back-link esté roto.
 *
 * Read-only.
 */
async function main() {
  console.log('🔍 Buscando huérfanos REALES (origen=cotizado con back-link roto)...\n')

  const candidatos = await prisma.listaEquipoItem.findMany({
    where: {
      proyectoEquipoItemId: { not: null },
      origen: 'cotizado',
    },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      origen: true,
      estado: true,
      cantidad: true,
      cantidadPedida: true,
      proyectoEquipoItemId: true,
      reemplazaProyectoEquipoCotizadoItemId: true,
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
          codigo: true,
          estado: true,
          listaEquipoSeleccionadoId: true,
          listaEquipoSeleccionado: {
            select: { id: true, codigo: true, descripcion: true, origen: true },
          },
          proyectoEquipoCotizado: { select: { id: true, nombre: true } },
        },
      },
      pedidoEquipoItem: {
        select: {
          id: true,
          cantidadPedida: true,
          cantidadAtendida: true,
          estado: true,
          pedidoEquipo: { select: { codigo: true, estado: true } },
        },
      },
    },
  })

  const orphans = candidatos.filter(item => {
    const equipo = item.proyectoEquipoItem
    if (!equipo) return true
    return equipo.listaEquipoSeleccionadoId !== item.id
  })

  console.log(`📋 Lista items con origen='cotizado' y proyectoEquipoItemId no nulo: ${candidatos.length}`)
  console.log(`⚠️  Huérfanos reales detectados: ${orphans.length}\n`)

  if (orphans.length === 0) {
    console.log('✅ No hay huérfanos. Nada que corregir.')
    return
  }

  console.log('━'.repeat(120))

  for (const item of orphans) {
    const equipoGrupoId = item.proyectoEquipoItem?.proyectoEquipoCotizado.id
    const proyId = item.listaEquipo.proyecto.id
    const listaId = item.listaEquipo.id

    let backLink = 'EQUIPO NO EXISTE'
    if (item.proyectoEquipoItem) {
      backLink = item.proyectoEquipoItem.listaEquipoSeleccionadoId === null
        ? 'NULL (clásico bug desvincular)'
        : `apunta a OTRO ítem: ${item.proyectoEquipoItem.listaEquipoSeleccionado?.codigo} (${item.proyectoEquipoItem.listaEquipoSeleccionado?.origen})`
    }

    console.log(`
📦 ${item.codigo} — ${item.descripcion}
   Proyecto: [${item.listaEquipo.proyecto.codigo}] ${item.listaEquipo.proyecto.nombre}
   Lista: ${item.listaEquipo.codigo} (${item.listaEquipo.estado})
   Cantidad: ${item.cantidad}  |  Cantidad pedida: ${item.cantidadPedida}
   Estado equipo: ${item.proyectoEquipoItem?.estado ?? '?'}
   Back-link: ${backLink}
   Pedidos: ${item.pedidoEquipoItem.length} ${item.pedidoEquipoItem.length > 0 ? '— ' + item.pedidoEquipoItem.map(p => `${p.pedidoEquipo.codigo}(${p.pedidoEquipo.estado})`).join(', ') : ''}
   🔗 Lista: https://app.gyscontrol.com/proyectos/${proyId}/listas/${listaId}
   🔗 Equipo: https://app.gyscontrol.com/proyectos/${proyId}/equipos/detalle/${equipoGrupoId}`)
  }

  console.log('\n' + '━'.repeat(120))
  console.log(`Resumen:`)
  console.log(`   Total huérfanos reales: ${orphans.length}`)
  console.log(`   Con pedidos asociados: ${orphans.filter(o => o.pedidoEquipoItem.length > 0).length}`)
  console.log(`   Sin pedidos: ${orphans.filter(o => o.pedidoEquipoItem.length === 0).length}`)
  console.log(`   Por sub-tipo:`)
  console.log(`      Patrón A (back-link NULL): ${orphans.filter(o => o.proyectoEquipoItem?.listaEquipoSeleccionadoId === null).length}`)
  console.log(`      Patrón B (apunta a otro): ${orphans.filter(o => o.proyectoEquipoItem?.listaEquipoSeleccionadoId !== null && o.proyectoEquipoItem?.listaEquipoSeleccionadoId !== o.id).length}`)
  console.log(`   Por estado de lista:`)
  const porEstadoLista = orphans.reduce((acc, o) => {
    const e = o.listaEquipo?.estado || '?'
    acc[e] = (acc[e] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  for (const [estado, count] of Object.entries(porEstadoLista)) {
    console.log(`      ${estado}: ${count}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
