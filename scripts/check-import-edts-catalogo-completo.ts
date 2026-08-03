/**
 * Lista todo el catálogo de EDTs con su faseDefault, para ver cuáles son los
 * 4 EDTs que el proyecto QRM16 (13503c49-9b35-4c69-b6d4-51770af52694) aún no
 * usa, y si alguno tiene faseDefault.nombre === "EJECUCIÓN" (que es lo único
 * que el GET de import-edts dejaría pasar al importar en esa fase).
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-import-edts-catalogo-completo.ts
 */
import { prisma } from '../src/lib/prisma'

const PROYECTO_ID = '13503c49-9b35-4c69-b6d4-51770af52694'

async function main() {
  const catalogo = await prisma.edt.findMany({
    include: { faseDefault: { select: { nombre: true } } },
    orderBy: { nombre: 'asc' }
  })

  const edtsProyecto = await prisma.proyectoEdt.findMany({
    where: { proyectoId: PROYECTO_ID },
    select: { edtId: true }
  })
  const usados = new Set(edtsProyecto.map(e => e.edtId))

  console.log('Catálogo completo:')
  catalogo.forEach(e => {
    const marca = usados.has(e.id) ? '(ya usado en el proyecto)' : '(NO usado — candidato a "disponible")'
    console.log(`  - ${e.nombre} | faseDefault=${e.faseDefault?.nombre ?? '(ninguna)'} ${marca}`)
  })

  const faseEjecucion = await prisma.proyectoFase.findFirst({
    where: { proyectoId: PROYECTO_ID, nombre: { contains: 'EJECU', mode: 'insensitive' } },
    select: { id: true, nombre: true, proyectoCronograma: { select: { tipo: true } } }
  })
  console.log('\nFase(s) "EJECUCIÓN" del proyecto (puede haber una por cronograma):')
  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoId: PROYECTO_ID, nombre: { contains: 'EJECU', mode: 'insensitive' } },
    select: { id: true, nombre: true, proyectoCronograma: { select: { tipo: true } } }
  })
  fases.forEach(f => console.log(`  - id=${f.id} nombre="${f.nombre}" cronograma=${f.proyectoCronograma?.tipo}`))
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
