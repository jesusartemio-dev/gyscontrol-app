import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    include: {
      proyectoCronograma: {
        where: { tipo: 'ejecucion' },
        include: {
          proyectoEdt: {
            include: { proyectoTarea: { select: { id: true, nombre: true, estado: true } } }
          }
        }
      }
    },
    orderBy: { codigo: 'asc' }
  })

  for (const p of proyectos) {
    const cron = p.proyectoCronograma[0]
    const edts = cron?.proyectoEdt || []
    const totalTareas = edts.reduce((s: number, e: any) => s + e.proyectoTarea.length, 0)
    console.log(`${p.codigo} — ${p.nombre}: ${edts.length} EDTs, ${totalTareas} tareas`)
    edts.forEach((e: any) => {
      console.log(`  EDT "${e.nombre}" — ${e.proyectoTarea.length} tareas`)
      e.proyectoTarea.forEach((t: any) => console.log(`    · ${t.nombre} [${t.estado}]`))
    })
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
