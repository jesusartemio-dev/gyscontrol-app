import { prisma } from '@/lib/prisma'

/**
 * Fix ListaEquipoItem records with origen 'reemplazo' or 'cotizado' that have
 * catalogoEquipoId = null but their codigo matches a CatalogoEquipo entry.
 */
async function main() {
  console.log('🔍 Buscando ListaEquipoItems sin catalogoEquipoId que deberian tenerlo...\n')

  // Find items without catalogoEquipoId
  const sinCatalogo = await prisma.listaEquipoItem.findMany({
    where: {
      catalogoEquipoId: null,
    },
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      origen: true,
      estado: true,
      listaEquipo: { select: { codigo: true, proyecto: { select: { codigo: true } } } },
    },
  })

  console.log(`📋 Items sin catalogoEquipoId: ${sinCatalogo.length}`)

  if (sinCatalogo.length === 0) {
    console.log('✅ Nada que corregir.')
    return
  }

  // Get all catalog codes for lookup
  const codigos = [...new Set(sinCatalogo.map(i => i.codigo).filter(Boolean))]
  const catalogoItems = await prisma.catalogoEquipo.findMany({
    where: { codigo: { in: codigos } },
    select: { id: true, codigo: true },
  })

  const catalogoMap = new Map(catalogoItems.map(c => [c.codigo, c.id]))

  console.log(`📋 Codigos encontrados en catálogo: ${catalogoItems.length} de ${codigos.length}\n`)

  // Find matchable items
  const matchables = sinCatalogo.filter(i => catalogoMap.has(i.codigo))
  const sinMatch = sinCatalogo.filter(i => !catalogoMap.has(i.codigo))

  console.log(`✅ Con match en catálogo: ${matchables.length}`)
  console.log(`⚠️  Sin match (Eq. Libre legítimo): ${sinMatch.length}\n`)

  if (matchables.length === 0) {
    console.log('✅ Nada que corregir.')
    return
  }

  // Show what will be updated
  for (const item of matchables) {
    const proyecto = item.listaEquipo?.proyecto?.codigo || '?'
    const lista = item.listaEquipo?.codigo || '?'
    console.log(`   - [${proyecto}/${lista}] ${item.codigo} (${item.origen}) → catalogoEquipoId=${catalogoMap.get(item.codigo)}`)
  }

  console.log(`\n🔧 Actualizando ${matchables.length} items...`)

  let updated = 0
  for (const item of matchables) {
    const catalogoEquipoId = catalogoMap.get(item.codigo)!
    await prisma.listaEquipoItem.update({
      where: { id: item.id },
      data: { catalogoEquipoId, updatedAt: new Date() },
    })
    updated++
  }

  console.log(`\n✅ Corrección completada: ${updated} items actualizados.`)
  if (sinMatch.length > 0) {
    console.log(`ℹ️  ${sinMatch.length} items permanecen como 'Eq. Libre' (código no existe en catálogo — correcto).`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
