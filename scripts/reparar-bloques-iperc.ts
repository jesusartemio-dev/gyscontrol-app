/**
 * Rehace los bloques de un IPERC desde su estructura revisada.
 *
 * Los bloques se definían antes de que la estructura existiera, así que
 * quedaron repartidos por cantidad de tareas del cronograma: CJM52 tenía
 * 22, 22, 21 y 3 tareas cuando ya solo había 63 líneas que evaluar, y el
 * bloque 1 se marcaba fallido por las tareas que se habían unido.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/reparar-bloques-iperc.ts CJM52 --dry
 */
import { prisma } from '../src/lib/prisma'
import { sincronizarBloques } from '../src/lib/iperc/construirBloques'
import { limpiarNombre, sincronizarEstadoEstructura } from '../src/lib/iperc/construirEstructura'

const DRY = process.argv.includes('--dry')
const codigo = process.argv.slice(2).find(a => !a.startsWith('--'))

async function mostrar(ipercId: string, titulo: string) {
  const bs = await prisma.ipercBloque.findMany({ where: { ipercId }, orderBy: { numero: 'asc' } })
  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, origen: { not: 'fija' } },
    select: { proceso: true, actividad: true, tarea: true, peligrosPrevistos: true, tareaIds: true },
  })
  console.log(`\n${titulo}`)
  for (const b of bs) {
    const suyos = items.filter(i => i.tareaIds.some(t => b.tareaIds.includes(t)))
    const filas = suyos.reduce((n, i) => n + i.peligrosPrevistos, 0)
    console.log(`  #${b.numero} ${b.estado.padEnd(9)} ${String(suyos.length).padStart(2)} líneas · ${String(filas).padStart(2)} filas previstas · ${b.nombre.slice(0, 54)}`)
  }
}

async function main() {
  const iperc = await prisma.iperc.findFirst({
    where: codigo ? { proyecto: { codigo } } : {},
    select: { id: true, proyectoId: true, proyecto: { select: { codigo: true } } },
  })
  if (!iperc) { console.error('IPERC no encontrado'); process.exit(1) }

  await mostrar(iperc.id, `${iperc.proyecto.codigo} — ANTES`)
  if (DRY) { console.log('\nSimulación. Para aplicar, quita --dry'); return }

  await sincronizarBloques(iperc.proyectoId, iperc.id)
  await mostrar(iperc.id, `${iperc.proyecto.codigo} — DESPUÉS`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
