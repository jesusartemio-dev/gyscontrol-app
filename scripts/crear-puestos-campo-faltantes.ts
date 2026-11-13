// ===================================================
// 📁 crear-puestos-campo-faltantes.ts
// 📌 Los tres oficios de campo que la MPP real tiene y el catálogo no.
//
// `MppEppCatalogo.asignacionesDefault`, que venía del documento MPP real,
// asignaba EPP a Técnico Andamiero (36), Soldador (24) y Operador de Manlift
// (19). Ninguno existía en la tabla `puesto`, así que al pasar los defaults al
// catálogo de puestos esas 79 asignaciones se perdían.
//
// Son trabajos reales: CJM50 tiene la torre de andamio de 10 cuerpos y el
// manlift con operador certificado.
//
// Crear el puesto no lo mete en ningún organigrama: recién aparece como
// columna de una matriz cuando alguien lo agrega al organigrama del proyecto.
// Lo que habilita es tener sus EPP por defecto listos para cuando se use.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/crear-puestos-campo-faltantes.ts
//   ... --aplicar
// ===================================================

import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

/**
 * `orden` ubica la columna en la matriz y en el organigrama. El andamiero va
 * pegado a su supervisor (100) y los otros dos después del último técnico
 * (180). `rolFuncional` queda en null como el resto de los técnicos: no
 * responden por ningún EDT.
 */
const PUESTOS = [
  { nombre: 'Técnico Andamiero', orden: 105, categoria: 'campo' },
  { nombre: 'Soldador', orden: 190, categoria: 'campo' },
  { nombre: 'Operador de Manlift', orden: 200, categoria: 'campo' },
]

async function main() {
  const existentes = await prisma.puesto.findMany({
    where: { nombre: { in: PUESTOS.map(p => p.nombre) } },
    select: { nombre: true },
  })
  const yaEstan = new Set(existentes.map(p => p.nombre))
  const faltan = PUESTOS.filter(p => !yaEstan.has(p.nombre))

  console.log(`Ya existen: ${yaEstan.size ? [...yaEstan].join(', ') : 'ninguno'}`)
  console.log(`A crear: ${faltan.length}`)
  for (const p of faltan) {
    console.log(`  · ${p.nombre}  orden=${p.orden} categoria=${p.categoria} vaACampo=true`)
  }

  if (faltan.length === 0) {
    console.log('\nNada que hacer.')
    return
  }

  if (!APLICAR) {
    console.log('\nSimulación. Para aplicar: --aplicar')
    return
  }

  for (const p of faltan) {
    await prisma.puesto.create({
      data: {
        nombre: p.nombre,
        orden: p.orden,
        categoria: p.categoria,
        vaACampo: true,
        rolFuncional: null,
        rolFijoProyecto: null,
        activo: true,
        updatedAt: new Date(),
      },
    })
    console.log(`✓ ${p.nombre}`)
  }

  const deCampo = await prisma.puesto.count({ where: { vaACampo: true, activo: true } })
  console.log(`\nListo. Puestos de campo: ${deCampo}.`)
  console.log('Ahora corre migrar-epp-defaults-a-puestos.ts --aplicar para recuperar sus EPP.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
