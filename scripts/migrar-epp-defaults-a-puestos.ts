// ===================================================
// 📁 migrar-epp-defaults-a-puestos.ts
// 📌 Pasa los EPP por defecto del catálogo viejo al catálogo de puestos.
//
// `MppEppCatalogo.asignacionesDefault` guardaba los diez nombres fijos del
// código ('Técnico Electrónico', 'Sup. De Andamio', 'Operador de manlift'),
// que no son los puestos del organigrama. Nunca se usaron al generar: la
// matriz arrancaba vacía y la IA la llenaba desde cero.
//
// Esto los reescribe contra la tabla `puesto`, que es la misma en todos los
// proyectos, para que puedan ser la base de la matriz.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/migrar-epp-defaults-a-puestos.ts
//   ... --aplicar
// ===================================================

import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

/**
 * Los diez nombres del catálogo viejo contra el catálogo de puestos.
 *
 * Tres no existen como puesto —no hay Soldador, Técnico Andamiero ni Operador
 * de manlift en el organigrama— así que sus EPP por defecto se pierden; van
 * explícitos en null para que se vea que es a propósito y no un olvido.
 *
 * Dos son aproximaciones y conviene que el SSOMA las mire: 'Técnico
 * Electrónico' se lleva a 'Técnico Eléctrico' (está también 'Técnico
 * Electrotecnia') y 'Técnico Auxiliar' a 'Técnico Auxiliar Mecánico'.
 */
const MAPEO: Record<string, string | null> = {
  'Ing. Supervisor de Proyecto': 'Supervisor de Proyecto',
  'Ingeniero de seguridad': 'Ingeniero de Seguridad',
  'Ing. Programador': 'Programador',
  'Técnico instrumentista': 'Técnico Instrumentista',
  'Técnico Electrónico': 'Técnico Eléctrico',
  'Sup. De Andamio': 'Supervisor Andamiero',
  'Técnico Andamiero': null,
  'Operador de manlift': null,
  Soldador: null,
  'Técnico Auxiliar': 'Técnico Auxiliar Mecánico',
}

async function main() {
  const puestos = await prisma.puesto.findMany({ select: { id: true, nombre: true, vaACampo: true } })
  const porNombre = new Map(puestos.map(p => [p.nombre, p]))

  for (const destino of Object.values(MAPEO)) {
    if (destino && !porNombre.has(destino)) {
      console.error(`✗ El mapeo apunta a "${destino}", que no existe en el catálogo de puestos.`)
      process.exit(1)
    }
  }

  const epps = await prisma.mppEppCatalogo.findMany({
    select: { id: true, orden: true, nombre: true, asignacionesDefault: true },
    orderBy: { orden: 'asc' },
  })

  const aCrear: Array<{ mppEppCatalogoId: string; puestoId: string }> = []
  const perdidos = new Map<string, number>()
  const porPuesto = new Map<string, number>()
  let legacyDesconocido = 0

  for (const epp of epps) {
    const legacy = epp.asignacionesDefault as string[]
    const puestoIds = new Set<string>()

    for (const nombre of legacy) {
      if (!(nombre in MAPEO)) {
        console.error(`⚠ "${nombre}" no está en el mapeo (EPP ${epp.orden})`)
        legacyDesconocido++
        continue
      }
      const destino = MAPEO[nombre]
      if (!destino) {
        perdidos.set(nombre, (perdidos.get(nombre) ?? 0) + 1)
        continue
      }
      puestoIds.add(porNombre.get(destino)!.id)
      porPuesto.set(destino, (porPuesto.get(destino) ?? 0) + 1)
    }

    for (const puestoId of puestoIds) {
      aCrear.push({ mppEppCatalogoId: epp.id, puestoId })
    }
  }

  console.log(`EPP en el catálogo: ${epps.length}`)
  console.log(`Asignaciones a crear: ${aCrear.length}\n`)

  console.log('Por puesto:')
  for (const [nombre, n] of [...porPuesto].sort((a, b) => b[1] - a[1])) {
    const p = porNombre.get(nombre)!
    console.log(`  ${nombre.padEnd(28)} ${String(n).padStart(2)} EPP${p.vaACampo ? '' : '   (no va a campo)'}`)
  }

  console.log('\nSe pierden, porque el puesto no existe en el organigrama:')
  for (const [nombre, n] of perdidos) console.log(`  ${nombre.padEnd(28)} ${String(n).padStart(2)} EPP`)

  const sinNada = puestos
    .filter(p => p.vaACampo && !porPuesto.has(p.nombre))
    .map(p => p.nombre)
  console.log(`\nPuestos de campo que quedan sin ningún EPP (${sinNada.length}), para que el SSOMA los llene:`)
  sinNada.forEach(n => console.log(`  · ${n}`))

  if (legacyDesconocido > 0) {
    console.error(`\n✗ ${legacyDesconocido} nombre(s) fuera del mapeo. No se aplica nada.`)
    process.exit(1)
  }

  if (!APLICAR) {
    console.log('\nSimulación. Para aplicar: --aplicar')
    return
  }

  // Idempotente: skipDuplicates respeta el único (epp, puesto), así que
  // correrlo dos veces no duplica ni pisa lo que el SSOMA haya agregado.
  const { count } = await prisma.mppEppPuestoDefault.createMany({
    data: aCrear,
    skipDuplicates: true,
  })
  const total = await prisma.mppEppPuestoDefault.count()
  console.log(`\nListo. Creadas ${count}, en total ${total} asignaciones por defecto.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
