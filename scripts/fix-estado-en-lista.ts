import { prisma } from '@/lib/prisma'

/**
 * Fix ProyectoEquipoCotizadoItem records that have a listaEquipoSeleccionadoId
 * but their estado is still 'pendiente' — should be 'en_lista'.
 *
 * Also fixes records that have a listaId but no listaEquipoSeleccionadoId.
 */
async function main() {
  console.log('🔍 Buscando items con estado inconsistente...\n')

  // Case 1: Has listaEquipoSeleccionadoId but estado is 'pendiente'
  const conSeleccionadoPendiente = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: {
      listaEquipoSeleccionadoId: { not: null },
      estado: 'pendiente',
    },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      estado: true,
      listaEquipoSeleccionadoId: true,
      proyectoEquipoCotizado: { select: { nombre: true, proyecto: { select: { codigo: true } } } },
    },
  })

  console.log(`📋 Caso 1: Items con listaEquipoSeleccionadoId pero estado 'pendiente': ${conSeleccionadoPendiente.length}`)
  for (const item of conSeleccionadoPendiente) {
    console.log(`   - [${item.proyectoEquipoCotizado?.proyecto?.codigo}] ${item.codigo} — ${item.descripcion?.substring(0, 50)}`)
  }

  // Case 2: Has listaId but no listaEquipoSeleccionadoId and estado is 'pendiente'
  // Try to find the matching ListaEquipoItem
  const conListaIdSinSeleccionado = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: {
      listaId: { not: null },
      listaEquipoSeleccionadoId: null,
      estado: 'pendiente',
    },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      estado: true,
      listaId: true,
      proyectoEquipoCotizado: { select: { nombre: true, proyecto: { select: { codigo: true } } } },
    },
  })

  console.log(`📋 Caso 2: Items con listaId pero sin listaEquipoSeleccionadoId y estado 'pendiente': ${conListaIdSinSeleccionado.length}`)
  for (const item of conListaIdSinSeleccionado) {
    console.log(`   - [${item.proyectoEquipoCotizado?.proyecto?.codigo}] ${item.codigo} — ${item.descripcion?.substring(0, 50)}`)
  }

  // Case 3: Has ListaEquipoItem pointing to it (proyectoEquipoItemId) but estado is 'pendiente'
  const conListaItemApuntando = await prisma.proyectoEquipoCotizadoItem.findMany({
    where: {
      estado: 'pendiente',
      listaEquipoSeleccionadoId: null,
      listaEquipoItemsAsociados: { some: {} }, // has at least one ListaEquipoItem pointing to it
    },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      listaEquipoItemsAsociados: {
        where: { estado: { not: 'rechazado' } },
        select: { id: true, codigo: true, cantidad: true, estado: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      proyectoEquipoCotizado: { select: { nombre: true, proyecto: { select: { codigo: true } } } },
    },
  })

  console.log(`📋 Caso 3: Items con ListaEquipoItem apuntando pero estado 'pendiente' y sin seleccionado: ${conListaItemApuntando.length}`)
  for (const item of conListaItemApuntando) {
    const li = item.listaEquipoItemsAsociados[0]
    console.log(`   - [${item.proyectoEquipoCotizado?.proyecto?.codigo}] ${item.codigo} — lista item: ${li?.codigo} (${li?.estado})`)
  }

  const totalFixes = conSeleccionadoPendiente.length + conListaIdSinSeleccionado.length + conListaItemApuntando.length
  if (totalFixes === 0) {
    console.log('\n✅ No hay items inconsistentes. Todo está correcto.')
    return
  }

  console.log(`\n🔧 Corrigiendo ${totalFixes} items...\n`)

  let fixed = 0

  // Fix Case 1: Set estado to 'en_lista'
  if (conSeleccionadoPendiente.length > 0) {
    const result = await prisma.proyectoEquipoCotizadoItem.updateMany({
      where: {
        id: { in: conSeleccionadoPendiente.map(i => i.id) },
      },
      data: { estado: 'en_lista' },
    })
    fixed += result.count
    console.log(`   ✅ Caso 1: ${result.count} items actualizados a 'en_lista'`)
  }

  // Fix Case 2: Find matching ListaEquipoItem and set both
  for (const item of conListaIdSinSeleccionado) {
    const listaItem = await prisma.listaEquipoItem.findFirst({
      where: {
        listaId: item.listaId!,
        proyectoEquipoItemId: item.id,
        estado: { not: 'rechazado' },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })

    if (listaItem) {
      await prisma.proyectoEquipoCotizadoItem.update({
        where: { id: item.id },
        data: { estado: 'en_lista', listaEquipoSeleccionadoId: listaItem.id },
      })
      fixed++
      console.log(`   ✅ Caso 2: ${item.codigo} → en_lista + seleccionadoId=${listaItem.id.substring(0, 15)}...`)
    } else {
      // Has listaId but no matching item — just update estado
      await prisma.proyectoEquipoCotizadoItem.update({
        where: { id: item.id },
        data: { estado: 'en_lista' },
      })
      fixed++
      console.log(`   ⚠️  Caso 2: ${item.codigo} → en_lista (sin ListaEquipoItem encontrado)`)
    }
  }

  // Fix Case 3: Set listaEquipoSeleccionadoId and estado
  for (const item of conListaItemApuntando) {
    const li = item.listaEquipoItemsAsociados[0]
    if (li) {
      await prisma.proyectoEquipoCotizadoItem.update({
        where: { id: item.id },
        data: { estado: 'en_lista', listaEquipoSeleccionadoId: li.id },
      })
      fixed++
      console.log(`   ✅ Caso 3: ${item.codigo} → en_lista + seleccionadoId=${li.id.substring(0, 15)}...`)
    }
  }

  console.log(`\n✅ Corrección completada: ${fixed} items actualizados.`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
