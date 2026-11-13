/**
 * Deja una sola forma de escribir la condición de la actividad.
 *
 * En la base convivían "No rutinaria" (211 filas) y "No Rutinaria" (2, las
 * actividades fijas importadas del Excel del SSOMA, que la escribe con
 * mayúscula). El formulario de edición solo aceptaba las dos primeras, así
 * que abrir una de esas dos dejaba el select vacío y el botón de guardar no
 * hacía nada.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/normalizar-condicion-iperc.ts --dry
 */
import { prisma } from '../src/lib/prisma'

const DRY = process.argv.includes('--dry')

/** Las dos formas que usa la app. */
const canonico = (v: string) => (/^\s*no/i.test(v) ? 'No rutinaria' : 'Rutinaria')

async function main() {
  const filas = await prisma.ipercFila.findMany({
    select: { id: true, condicionActividad: true },
  })
  const fijas = await prisma.ipercCatalogoActividadFija.findMany({
    select: { id: true, condicionActividad: true },
  })

  const aCambiar = [
    ...filas.filter(f => f.condicionActividad !== canonico(f.condicionActividad))
      .map(f => ({ tabla: 'fila' as const, id: f.id, de: f.condicionActividad })),
    ...fijas.filter(f => f.condicionActividad !== canonico(f.condicionActividad))
      .map(f => ({ tabla: 'fija' as const, id: f.id, de: f.condicionActividad })),
  ]

  console.log(`Filas del IPERC: ${filas.length} · actividades fijas: ${fijas.length}`)
  console.log(`A normalizar: ${aCambiar.length}`)
  for (const c of aCambiar) {
    console.log(`  ${c.tabla}  ${JSON.stringify(c.de)} → ${JSON.stringify(canonico(c.de))}`)
  }

  if (aCambiar.length === 0 || DRY) {
    if (DRY) console.log('\nSimulación. Para aplicar, quita --dry')
    return
  }

  for (const c of aCambiar) {
    const data = { condicionActividad: canonico(c.de) }
    if (c.tabla === 'fila') {
      await prisma.ipercFila.update({ where: { id: c.id }, data })
    } else {
      await prisma.ipercCatalogoActividadFija.update({ where: { id: c.id }, data })
    }
  }
  console.log(`\nListo. ${aCambiar.length} normalizadas.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
