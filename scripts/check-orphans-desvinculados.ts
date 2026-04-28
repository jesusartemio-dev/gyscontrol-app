import { prisma } from '@/lib/prisma'

/**
 * Detecta ListaEquipoItems huérfanos producto del bug en handleDesvincular.
 *
 * Síntoma: el lista item conserva origen='cotizado'/'reemplazo' y
 * proyectoEquipoItemId apuntando a un equipo, pero el equipo ya no le
 * apunta de vuelta (listaEquipoSeleccionadoId distinto o null).
 *
 * Read-only: solo lista, no modifica nada.
 */
async function main() {
  console.log('🔍 Buscando ListaEquipoItems huérfanos (desvinculados con origen no actualizado)...\n')

  const candidatos = await prisma.listaEquipoItem.findMany({
    where: {
      proyectoEquipoItemId: { not: null },
      origen: { in: ['cotizado', 'reemplazo'] },
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
          codigo: true,
          nombre: true,
          estado: true,
          proyecto: { select: { codigo: true, nombre: true } },
        },
      },
      proyectoEquipoItem: {
        select: {
          id: true,
          estado: true,
          listaEquipoSeleccionadoId: true,
        },
      },
      pedidoEquipoItem: {
        select: { id: true, cantidadPedida: true },
      },
    },
  })

  const orphans = candidatos.filter(item => {
    const equipo = item.proyectoEquipoItem
    if (!equipo) return true
    return equipo.listaEquipoSeleccionadoId !== item.id
  })

  console.log(`📋 Candidatos revisados: ${candidatos.length}`)
  console.log(`⚠️  Huérfanos detectados: ${orphans.length}\n`)

  if (orphans.length === 0) {
    console.log('✅ No hay huérfanos. Nada que corregir.')
    return
  }

  console.log('━'.repeat(120))
  console.log('Detalle de huérfanos:')
  console.log('━'.repeat(120))

  for (const item of orphans) {
    const proyecto = item.listaEquipo?.proyecto?.codigo || '?'
    const proyectoNombre = item.listaEquipo?.proyecto?.nombre || ''
    const lista = item.listaEquipo?.codigo || '?'
    const listaEstado = item.listaEquipo?.estado || '?'
    const equipo = item.proyectoEquipoItem
    const pedidos = item.pedidoEquipoItem.length
    const totalPedido = item.pedidoEquipoItem.reduce((s, p) => s + (p.cantidadPedida || 0), 0)

    let backLink = 'EQUIPO NO EXISTE'
    if (equipo) {
      backLink = equipo.listaEquipoSeleccionadoId === null
        ? 'equipo.listaEquipoSeleccionadoId=NULL'
        : `equipo.listaEquipoSeleccionadoId=${equipo.listaEquipoSeleccionadoId} (apunta a OTRO)`
    }

    console.log(`
📦 [${proyecto}] ${proyectoNombre}
   Lista: ${lista} (${listaEstado})  |  Item ID: ${item.id}
   Código: ${item.codigo}  |  ${item.descripcion}
   Origen: ${item.origen}  |  Estado item: ${item.estado}  |  Cantidad: ${item.cantidad}
   FK rota: ${backLink}
   Equipo cotizado: ${equipo ? `${equipo.id} (estado=${equipo.estado})` : 'NO EXISTE'}
   Pedidos asociados: ${pedidos}  |  Total pedido: ${totalPedido}`)
  }

  console.log('\n' + '━'.repeat(120))
  console.log(`Resumen:`)
  console.log(`   Total huérfanos: ${orphans.length}`)
  console.log(`   Con pedidos asociados: ${orphans.filter(o => o.pedidoEquipoItem.length > 0).length}`)
  console.log(`   Sin pedidos: ${orphans.filter(o => o.pedidoEquipoItem.length === 0).length}`)
  console.log(`   Por origen:`)
  console.log(`      cotizado: ${orphans.filter(o => o.origen === 'cotizado').length}`)
  console.log(`      reemplazo: ${orphans.filter(o => o.origen === 'reemplazo').length}`)
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
