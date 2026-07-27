/**
 * Diagnóstico read-only: revisa las tareas ya agregadas a la jornada CJM44 del
 * 26-jul (la bloqueada en "CON - Construcción" por el bug del auto-preselect)
 * antes de decidir si es seguro resetear su proyectoEdtId a null.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-cjm44-26jul-tareas.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const jornada = await prisma.registroHorasCampo.findFirst({
    where: {
      proyecto: { codigo: { startsWith: 'CJM44' } },
      fechaTrabajo: { gte: new Date('2026-07-26T00:00:00'), lt: new Date('2026-07-27T00:00:00') }
    },
    select: {
      id: true,
      fechaTrabajo: true,
      estado: true,
      proyectoEdtId: true,
      proyectoEdt: { select: { nombre: true, edt: { select: { nombre: true } } } },
      tareas: {
        select: {
          id: true,
          esAutoAsistencia: true,
          nombreTareaExtra: true,
          proyectoTarea: {
            select: {
              id: true,
              nombre: true,
              proyectoEdtId: true,
              proyectoEdt: { select: { nombre: true, edt: { select: { nombre: true } } } }
            }
          }
        }
      }
    }
  })

  if (!jornada) {
    console.log('No se encontró la jornada CJM44 del 26-jul')
    return
  }

  console.log(`Jornada ${jornada.id} | ${jornada.fechaTrabajo.toISOString().slice(0,10)} | estado=${jornada.estado}`)
  console.log(`EDT actual: ${jornada.proyectoEdt ? `${jornada.proyectoEdt.edt?.nombre} - ${jornada.proyectoEdt.nombre}` : '(ninguno)'} (id=${jornada.proyectoEdtId})`)
  console.log(`\nTareas (${jornada.tareas.length}):`)
  for (const t of jornada.tareas) {
    if (t.esAutoAsistencia) {
      console.log(`  - [asistencia auto] ${t.id}`)
      continue
    }
    if (t.proyectoTarea) {
      const edtLabel = t.proyectoTarea.proyectoEdt ? `${t.proyectoTarea.proyectoEdt.edt?.nombre} - ${t.proyectoTarea.proyectoEdt.nombre}` : '(sin edt)'
      console.log(`  - "${t.proyectoTarea.nombre}" edt=${edtLabel} (proyectoTareaId=${t.proyectoTarea.id})`)
    } else {
      console.log(`  - extra suelta: "${t.nombreTareaExtra}"`)
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
