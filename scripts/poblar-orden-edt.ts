/**
 * Puebla Edt.orden con la secuencia constructiva real confirmada por el
 * usuario, dentro de cada Fase — corrige el bug de que Comisionamiento (CMM)
 * salía antes que Construcción (CON) en el cronograma generado (el orden
 * dependía del orden de llegada de un array en memoria, no de este campo).
 *
 * Dry-run por defecto, --apply para escribir de verdad.
 *
 * Uso local:
 *   npx tsx scripts/poblar-orden-edt.ts
 *   npx tsx scripts/poblar-orden-edt.ts --apply
 *
 * Uso en producción (con permiso explícito del usuario):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/poblar-orden-edt.ts
 *   npx dotenv -e .env.production -o -- npx tsx scripts/poblar-orden-edt.ts --apply
 */

import { prisma } from '../src/lib/prisma'

const ORDEN_POR_EDT: Record<string, number> = {
  // PLANIFICACION
  GES: 0,
  PRO: 1,
  SEG: 2,
  // INGENIERIA
  ING: 0,
  PLA: 1,
  PLC: 2,
  HMI: 3,
  // EJECUCION
  PRE: 0,
  TAB: 1,
  CON: 2,
  CMM: 3,
  // CIERRE
  CIE: 0,
}

async function main() {
  const apply = process.argv.includes('--apply')
  console.log(apply ? '\n🚀 Modo APLICAR — se va a escribir Edt.orden\n' : '\n🔎 Modo DRY-RUN — no se modifica nada\n')

  const edts = await prisma.edt.findMany({
    select: { id: true, nombre: true, orden: true, faseDefault: { select: { nombre: true } } },
  })

  for (const edt of edts) {
    const nuevoOrden = ORDEN_POR_EDT[edt.nombre]
    if (nuevoOrden === undefined) {
      console.log(`⚠️  ${edt.nombre} (fase: ${edt.faseDefault?.nombre ?? 'SIN FASE'}) no está en la lista — se deja en ${edt.orden}`)
      continue
    }
    console.log(`${edt.nombre} (${edt.faseDefault?.nombre ?? 'SIN FASE'}): ${edt.orden} -> ${nuevoOrden}`)
    if (apply) {
      await prisma.edt.update({ where: { id: edt.id }, data: { orden: nuevoOrden } })
    }
  }

  console.log(apply ? '\n✅ Edt.orden actualizado.' : '\nDry-run completo. Corré con --apply para escribir de verdad.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
