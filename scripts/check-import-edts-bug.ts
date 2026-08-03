/**
 * Diagnóstico read-only: reproduce por qué "Importar EDT" para la fase
 * EJECUCIÓN del proyecto 13503c49-9b35-4c69-b6d4-51770af52694 muestra
 * "0 EDTs disponibles". Hipótesis: el GET de
 * /api/proyectos/[id]/cronograma/import-edts excluye del catálogo cualquier
 * Edt cuyo id ya esté usado en CUALQUIER cronograma del proyecto (no solo el
 * cronograma de la fase destino), así que si ya se importaron todos los EDTs
 * del catálogo en "Planificación", "Ejecución" siempre queda en 0 aunque no
 * tenga ninguno propio.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-import-edts-bug.ts
 */
import { prisma } from '../src/lib/prisma'

const PROYECTO_ID = '13503c49-9b35-4c69-b6d4-51770af52694'

async function main() {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: PROYECTO_ID },
    select: { id: true, codigo: true, nombre: true }
  })
  if (!proyecto) throw new Error('Proyecto no encontrado')
  console.log(`Proyecto: ${proyecto.codigo} ${proyecto.nombre}`)

  const totalCatalogo = await prisma.edt.count()
  console.log(`\nTotal EDTs en catálogo: ${totalCatalogo}`)

  const edtsProyecto = await prisma.proyectoEdt.findMany({
    where: { proyectoId: PROYECTO_ID },
    select: {
      id: true,
      nombre: true,
      edtId: true,
      edt: { select: { nombre: true } },
      proyectoCronograma: { select: { id: true, tipo: true } },
      proyectoFase: { select: { nombre: true } }
    }
  })
  console.log(`\nProyectoEdt existentes en TODO el proyecto: ${edtsProyecto.length}`)
  edtsProyecto.forEach(e => {
    console.log(`  - catalogo="${e.edt?.nombre}" nombre="${e.nombre}" cronograma=${e.proyectoCronograma?.tipo} fase=${e.proyectoFase?.nombre} edtId(catalogo)=${e.edtId}`)
  })

  const edtIdsUsadosEnProyecto = new Set(edtsProyecto.map(e => e.edtId))
  console.log(`\ncatalogIds únicos usados en TODO el proyecto: ${edtIdsUsadosEnProyecto.size} de ${totalCatalogo} en catálogo`)
  console.log('=> Con la lógica actual del GET (excluye por proyectoId sin filtrar cronograma), "Disponibles" = ' + (totalCatalogo - edtIdsUsadosEnProyecto.size))

  const ejecucion = edtsProyecto.filter(e => e.proyectoCronograma?.tipo === 'ejecucion')
  const catalogIdsEnEjecucion = new Set(ejecucion.map(e => e.edtId))
  console.log(`\ncatalogIds usados SOLO en cronograma "ejecucion": ${catalogIdsEnEjecucion.size}`)
  console.log('=> Si el filtro fuera correcto (por cronograma de la fase destino), "Disponibles" en Ejecución debería ser = ' + (totalCatalogo - catalogIdsEnEjecucion.size))
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
