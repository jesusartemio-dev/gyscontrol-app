/**
 * Diagnóstico read-only: lista los ProyectoEdt de ejecución del proyecto CJM44,
 * para confirmar si existe uno con catálogo "CON*" que se auto-preselecciona
 * en AgregarTareaModal antes de que el usuario elija "CMM" manualmente.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-cjm44-edts-ejecucion.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const proyecto = await prisma.proyecto.findFirst({
    where: { codigo: { startsWith: 'CJM44' } },
    select: { id: true, codigo: true, nombre: true }
  })
  if (!proyecto) throw new Error('Proyecto CJM44 no encontrado')
  console.log(`Proyecto: ${proyecto.codigo} ${proyecto.nombre} (${proyecto.id})`)

  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoId: proyecto.id, proyectoCronograma: { tipo: 'ejecucion' } },
    select: { id: true, nombre: true, edt: { select: { nombre: true } } }
  })
  console.log(`\nEDTs de ejecución: ${edts.length}`)
  edts.forEach(e => console.log(`  - ${e.edt?.nombre} - ${e.nombre} (id=${e.id})`))

  // Jornadas recientes de CJM44 y su proyectoEdtId actual
  const jornadas = await prisma.registroHorasCampo.findMany({
    where: { proyectoId: proyecto.id },
    orderBy: { fechaTrabajo: 'desc' },
    take: 15,
    select: {
      id: true,
      fechaTrabajo: true,
      estado: true,
      proyectoEdtId: true,
      proyectoEdt: { select: { nombre: true, edt: { select: { nombre: true } } } }
    }
  })
  console.log(`\nJornadas recientes: ${jornadas.length}`)
  jornadas.forEach(j => {
    const edtLabel = j.proyectoEdt ? `${j.proyectoEdt.edt?.nombre} - ${j.proyectoEdt.nombre}` : '(sin EDT)'
    console.log(`  - ${j.fechaTrabajo.toISOString().slice(0,10)} estado=${j.estado} edt=${edtLabel} (proyectoEdtId=${j.proyectoEdtId})`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
