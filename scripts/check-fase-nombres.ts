/**
 * Compara los nombres de fase del catálogo (tabla Fase, referenciada por
 * Edt.faseDefaultId) contra los nombres de ProyectoFase, char por char, para
 * confirmar si hay un mismatch de tildes/mayúsculas que rompe el filtro
 * exacto `edt.faseDefault?.nombre === faseProyecto.nombre` en
 * /api/proyectos/[id]/cronograma/import-edts (GET).
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/check-fase-nombres.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const fasesCatalogo = await prisma.faseDefault.findMany({ select: { id: true, nombre: true } })
  console.log('Fases del catálogo (tabla FaseDefault, usada como faseDefault de Edt):')
  fasesCatalogo.forEach(f => {
    console.log(`  - "${f.nombre}" (len=${f.nombre.length}) codes=${[...f.nombre].map(c => c.codePointAt(0)).join(',')}`)
  })

  const proyectoFases = await prisma.proyectoFase.findMany({
    where: { nombre: { contains: 'EJEC', mode: 'insensitive' } },
    select: { nombre: true },
    distinct: ['nombre']
  })
  console.log('\nNombres de ProyectoFase que contienen "EJEC" (distinct):')
  proyectoFases.forEach(f => {
    console.log(`  - "${f.nombre}" (len=${f.nombre.length}) codes=${[...f.nombre].map(c => c.codePointAt(0)).join(',')}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
