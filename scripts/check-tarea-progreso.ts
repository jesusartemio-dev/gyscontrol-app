import { prisma } from '@/lib/prisma'

async function main() {
  const tareas = await prisma.proyectoTarea.findMany({
    where: {
      nombre: { contains: 'soportes' },
      proyectoEdt: { proyecto: { codigo: 'QRM15' } }
    },
    include: {
      proyectoEdt: {
        include: {
          proyectoCronograma: { select: { tipo: true } },
          proyecto: { select: { codigo: true } }
        }
      }
    }
  })

  console.log(`\nTareas encontradas: ${tareas.length}\n`)
  for (const t of tareas) {
    console.log({
      id: t.id,
      nombre: t.nombre,
      porcentaje: t.porcentajeCompletado,
      estado: t.estado,
      cronograma: t.proyectoEdt?.proyectoCronograma?.tipo
    })
  }

  // Ver cuáles tareas de campo (RegistroHorasCampoTarea) apuntan a esas tareas
  const ids = tareas.map(t => t.id)
  const campoTareas = await prisma.registroHorasCampoTarea.findMany({
    where: { proyectoTareaId: { in: ids } },
    include: {
      registroCampo: { select: { estado: true, fechaTrabajo: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`\nRegistros de campo vinculados: ${campoTareas.length}\n`)
  for (const ct of campoTareas) {
    console.log({
      proyectoTareaId: ct.proyectoTareaId,
      porcentajeInicial: ct.porcentajeInicial,
      porcentajeFinal: ct.porcentajeFinal,
      estadoJornada: ct.registroCampo?.estado,
      fecha: ct.registroCampo?.fechaTrabajo
    })
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
