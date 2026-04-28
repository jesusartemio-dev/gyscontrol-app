import { prisma } from '@/lib/prisma'

async function main() {
  const ids = [
    'cwrzu7u27auuh833io5dp3ro', // RSLZRA1
    'jut13mmgo2exqkrv80wz1rjo', // QTEX-3-230-RAG-ATEX
    'kbq631qbq6k98a6bij49bdzj', // LZS:PT5A5T30
  ]

  for (const id of ids) {
    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        origen: true,
        proyectoEquipoItemId: true,
        reemplazaProyectoEquipoCotizadoItemId: true,
        listaId: true,
      },
    })

    if (!item) continue

    console.log('━'.repeat(110))
    console.log(`📦 ${item.codigo} — ${item.descripcion}`)
    console.log(`   Origen: ${item.origen}`)
    console.log(`   FK1 proyectoEquipoItemId: ${item.proyectoEquipoItemId}`)
    console.log(`   FK2 reemplazaProyectoEquipoCotizadoItemId: ${item.reemplazaProyectoEquipoCotizadoItemId}`)

    if (item.proyectoEquipoItemId) {
      const peci1 = await prisma.proyectoEquipoCotizadoItem.findUnique({
        where: { id: item.proyectoEquipoItemId },
        select: {
          codigo: true,
          descripcion: true,
          estado: true,
          listaEquipoSeleccionadoId: true,
        },
      })
      console.log(`   → FK1 apunta a equipo: ${peci1?.codigo} | ${peci1?.descripcion}`)
      console.log(`     estado=${peci1?.estado}, listaEquipoSeleccionadoId=${peci1?.listaEquipoSeleccionadoId ?? 'NULL'}`)
    }

    if (item.reemplazaProyectoEquipoCotizadoItemId) {
      const peci2 = await prisma.proyectoEquipoCotizadoItem.findUnique({
        where: { id: item.reemplazaProyectoEquipoCotizadoItemId },
        select: {
          codigo: true,
          descripcion: true,
          estado: true,
          listaEquipoSeleccionadoId: true,
        },
      })
      console.log(`   → FK2 apunta a equipo: ${peci2?.codigo} | ${peci2?.descripcion}`)
      console.log(`     estado=${peci2?.estado}, listaEquipoSeleccionadoId=${peci2?.listaEquipoSeleccionadoId ?? 'NULL'}`)
    }

    // ¿Quién es el item "vigente" para los equipos a los que apunta?
    const equipoIds = [item.proyectoEquipoItemId, item.reemplazaProyectoEquipoCotizadoItemId].filter(Boolean) as string[]
    const equipos = await prisma.proyectoEquipoCotizadoItem.findMany({
      where: { id: { in: equipoIds } },
      select: {
        id: true,
        codigo: true,
        listaEquipoSeleccionado: {
          select: { id: true, codigo: true, descripcion: true, origen: true, listaId: true },
        },
      },
    })
    for (const e of equipos) {
      if (e.listaEquipoSeleccionado) {
        console.log(`   ℹ️  Equipo ${e.codigo} actualmente apunta a lista item: ${e.listaEquipoSeleccionado.codigo} (${e.listaEquipoSeleccionado.origen})`)
      }
    }
  }
  console.log('━'.repeat(110))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
