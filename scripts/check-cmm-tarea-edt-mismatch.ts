/**
 * Diagnóstico read-only: busca ProyectoTarea cuyo proyectoEdtId no coincide
 * con el proyectoEdtId de su ProyectoActividad, para EDTs cuyo nombre catálogo
 * empieza con "CMM". Esto explicaría el error "La tarea no pertenece al EDT
 * de esta jornada" al agregar tareas desde /mi-trabajo/mi-jornada.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-cmm-tarea-edt-mismatch.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const proyectoEdts = await prisma.proyectoEdt.findMany({
    where: { edt: { nombre: { startsWith: 'CMM' } } },
    select: {
      id: true,
      nombre: true,
      proyectoId: true,
      proyectoCronogramaId: true,
      edt: { select: { nombre: true } },
      proyectoCronograma: { select: { tipo: true } },
      proyecto: { select: { nombre: true, codigo: true } }
    }
  })

  console.log(`ProyectoEdt con catálogo "CMM*": ${proyectoEdts.length}`)
  for (const pe of proyectoEdts) {
    console.log(`\n- ${pe.edt?.nombre} / ${pe.nombre} | proyecto=${pe.proyecto?.codigo} ${pe.proyecto?.nombre} | cronograma=${pe.proyectoCronograma?.tipo} | id=${pe.id}`)

    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoEdtId: pe.id },
      select: { id: true, nombre: true, proyectoEdtId: true }
    })
    console.log(`  actividades: ${actividades.length}`)

    for (const act of actividades) {
      const tareas = await prisma.proyectoTarea.findMany({
        where: { proyectoActividadId: act.id },
        select: { id: true, nombre: true, proyectoEdtId: true, estado: true }
      })
      const mismatched = tareas.filter(t => t.proyectoEdtId !== act.proyectoEdtId)
      if (mismatched.length > 0) {
        console.log(`  ⚠️ Actividad "${act.nombre}" (${act.id}) tiene ${mismatched.length} tarea(s) con proyectoEdtId distinto:`)
        for (const t of mismatched) {
          console.log(`     - Tarea "${t.nombre}" (${t.id}) estado=${t.estado} tarea.proyectoEdtId=${t.proyectoEdtId} != actividad.proyectoEdtId=${act.proyectoEdtId}`)
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
