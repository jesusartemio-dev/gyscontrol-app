/**
 * Reconcilia ProyectoTarea.estado con ProyectoTarea.porcentajeCompletado.
 *
 * Ambos campos deben ir sincronizados (ver src/lib/services/avanceTarea.ts), pero ediciones
 * manuales del "Estado" en el árbol/tabla del cronograma (antes de este fix) podían escribir
 * `estado` sin tocar `porcentajeCompletado`, dejando tareas como "completada" con % parcial —
 * eso las excluía del modal "Agregar Tarea" de mi-jornada, que filtraba por estado.
 *
 * Regla de reconciliación (misma fórmula que recalcularCacheAvance):
 *   porcentaje >= 100 -> completada
 *   0 < porcentaje < 100 -> en_progreso
 *   porcentaje === 0 -> pendiente
 * Solo se tocan tareas cuyo estado actual es uno de esos tres derivables. No se tocan
 * 'planificado' | 'cancelada' | 'pausada': esos no se derivan del %.
 *
 * Uso: npx tsx scripts/fix-tareas-estado-porcentaje-desync.ts [--apply]
 * Sin --apply corre en modo dry-run (solo reporta).
 */
import { prisma } from '../src/lib/prisma'

const ESTADOS_DERIVABLES = ['completada', 'en_progreso', 'pendiente'] as const

function estadoEsperado(pct: number): (typeof ESTADOS_DERIVABLES)[number] {
  if (pct >= 100) return 'completada'
  if (pct > 0) return 'en_progreso'
  return 'pendiente'
}

async function main() {
  const apply = process.argv.includes('--apply')

  const tareas = await prisma.proyectoTarea.findMany({
    where: { estado: { in: [...ESTADOS_DERIVABLES] } },
    select: {
      id: true,
      nombre: true,
      estado: true,
      porcentajeCompletado: true,
      proyectoEdt: { select: { proyectoCronograma: { select: { proyecto: { select: { codigo: true } } } } } },
    },
  })

  const desincronizadas = tareas.filter((t) => t.estado !== estadoEsperado(t.porcentajeCompletado))

  console.log(`Tareas revisadas: ${tareas.length}`)
  console.log(`Tareas desincronizadas: ${desincronizadas.length}`)

  for (const t of desincronizadas) {
    const esperado = estadoEsperado(t.porcentajeCompletado)
    console.log(
      `- [${t.proyectoEdt.proyectoCronograma.proyecto.codigo}] "${t.nombre}" (${t.id}): estado='${t.estado}' porcentaje=${t.porcentajeCompletado} -> esperado='${esperado}'`
    )
  }

  if (!apply) {
    console.log('\nDry-run (no se aplicaron cambios). Pasa --apply para corregir estado según el %.')
    return
  }

  for (const t of desincronizadas) {
    const esperado = estadoEsperado(t.porcentajeCompletado)
    await prisma.proyectoTarea.update({
      where: { id: t.id },
      data: {
        estado: esperado,
        fechaFinReal: esperado === 'completada' ? undefined : null,
        updatedAt: new Date(),
      },
    })
  }
  console.log(`\nCorregidas ${desincronizadas.length} tareas.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
