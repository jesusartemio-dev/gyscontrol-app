import { prisma } from '@/lib/prisma'

/**
 * Fix PedidoEquipoItem records with catalogoEquipoId = null but their
 * code matches a CatalogoEquipo entry, or their linked ListaEquipoItem has one.
 */
async function main() {
  console.log('🔍 Buscando PedidoEquipoItems sin catalogoEquipoId...\n')

  const sinCatalogo = await prisma.pedidoEquipoItem.findMany({
    where: { catalogoEquipoId: null },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      pedidoEquipo: { select: { codigo: true, proyecto: { select: { codigo: true } } } },
      listaEquipoItem: { select: { catalogoEquipoId: true } },
    },
  })

  console.log(`📋 Items sin catalogoEquipoId: ${sinCatalogo.length}`)
  if (sinCatalogo.length === 0) {
    console.log('✅ Nada que corregir.')
    return
  }

  // Strategy 1: use catalogoEquipoId from linked listaEquipoItem
  const conLista = sinCatalogo.filter(i => i.listaEquipoItem?.catalogoEquipoId)
  // Strategy 2: match by codigo in catalog
  const sinLista = sinCatalogo.filter(i => !i.listaEquipoItem?.catalogoEquipoId)

  console.log(`   - Con match por lista: ${conLista.length}`)
  console.log(`   - A buscar por código: ${sinLista.length}\n`)

  // Lookup remaining by code
  const codigos = [...new Set(sinLista.map(i => i.codigo).filter(Boolean))]
  const catalogoItems = await prisma.catalogoEquipo.findMany({
    where: { codigo: { in: codigos } },
    select: { id: true, codigo: true },
  })
  const catalogoMap = new Map(catalogoItems.map(c => [c.codigo, c.id]))

  const conCodigo = sinLista.filter(i => catalogoMap.has(i.codigo))
  const sinMatch = sinLista.filter(i => !catalogoMap.has(i.codigo))

  console.log(`   - Con match por código: ${conCodigo.length}`)
  console.log(`   - Sin match (Eq. Libre legítimo): ${sinMatch.length}\n`)

  const total = conLista.length + conCodigo.length
  if (total === 0) {
    console.log('✅ Nada que corregir.')
    return
  }

  console.log(`🔧 Actualizando ${total} items...`)

  for (const item of conLista) {
    const proyecto = item.pedidoEquipo?.proyecto?.codigo || '?'
    const pedido = item.pedidoEquipo?.codigo || '?'
    console.log(`   ✅ [${proyecto}/${pedido}] ${item.codigo} → via lista`)
    await prisma.pedidoEquipoItem.update({
      where: { id: item.id },
      data: { catalogoEquipoId: item.listaEquipoItem!.catalogoEquipoId!, updatedAt: new Date() },
    })
  }

  for (const item of conCodigo) {
    const proyecto = item.pedidoEquipo?.proyecto?.codigo || '?'
    const pedido = item.pedidoEquipo?.codigo || '?'
    console.log(`   ✅ [${proyecto}/${pedido}] ${item.codigo} → via código`)
    await prisma.pedidoEquipoItem.update({
      where: { id: item.id },
      data: { catalogoEquipoId: catalogoMap.get(item.codigo)!, updatedAt: new Date() },
    })
  }

  console.log(`\n✅ Corrección completada: ${total} items actualizados.`)
  if (sinMatch.length > 0) {
    console.log(`ℹ️  ${sinMatch.length} items permanecen como 'Eq. Libre' (legítimos).`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
