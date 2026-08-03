/**
 * Verifica (read-only) que la lógica corregida del filtro por fase en
 * /api/proyectos/[id]/cronograma/import-edts (GET) ahora sí encuentra EDTs
 * disponibles para la fase "EJECUCIÓN" del proyecto QRM16
 * (13503c49-9b35-4c69-b6d4-51770af52694), replicando el mismo código que
 * quedó en el route.ts tras el fix.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/verify-import-edts-fix.ts
 */
import { prisma } from '../src/lib/prisma'
import { normalizeStr } from '../src/lib/utils'

const PROYECTO_ID = '13503c49-9b35-4c69-b6d4-51770af52694'

async function main() {
  const faseProyecto = await prisma.proyectoFase.findFirst({
    where: { proyectoId: PROYECTO_ID, proyectoCronograma: { tipo: 'ejecucion' }, nombre: { contains: 'EJEC' } },
    select: { id: true, nombre: true }
  })
  if (!faseProyecto) throw new Error('Fase no encontrada')
  console.log(`Fase destino: "${faseProyecto.nombre}" (id=${faseProyecto.id})`)

  const edtsCatalogo = await prisma.edt.findMany({
    include: { faseDefault: { select: { nombre: true } } }
  })

  const edtsProyecto = await prisma.proyectoEdt.findMany({
    where: { proyectoId: PROYECTO_ID },
    select: { edtId: true }
  })
  const usados = new Set(edtsProyecto.map(e => e.edtId))

  let disponibles = edtsCatalogo.filter(e => !usados.has(e.id))

  const faseProyectoNorm = normalizeStr(faseProyecto.nombre)
  disponibles = disponibles.filter(edt => {
    const faseDefaultNorm = normalizeStr(edt.faseDefault?.nombre)
    return !!faseDefaultNorm && faseProyectoNorm.includes(faseDefaultNorm)
  })

  console.log(`\nEDTs disponibles para importar en "${faseProyecto.nombre}" (con el fix): ${disponibles.length}`)
  disponibles.forEach(e => console.log(`  - ${e.nombre} (faseDefault=${e.faseDefault?.nombre})`))
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
