import { prisma } from '@/lib/prisma'

/**
 * Backfill del "punto cero" del avance fechado.
 *
 * Problema: la curva S real se reconstruye desde ProyectoTareaAvance, pero esa tabla solo
 * existe desde que se añadió el registro fechado. Las tareas que ya venían avanzadas no
 * tienen ningún asiento, así que la curva arranca en 0 y queda muy por debajo de la
 * realidad (CJM48 dibuja 10.8% cuando va por 70.5%).
 *
 * Qué hace: por cada tarea de un cronograma de EJECUCIÓN con porcentajeCompletado > 0 y
 * CERO asientos, inserta uno solo con su % actual y la mejor fecha disponible:
 *
 *   1. fechaFinReal        — si la tarea está al 100% y la tiene
 *   2. última fecha de horas — jornada de campo o timesheet imputados a esa tarea
 *   3. fechaFin planificada — si ya pasó
 *   4. updatedAt de la tarea — último recurso
 *
 * origen = 'automatico' para que el tramo reconstruido sea distinguible del dato real.
 * No toca ninguna tarea que ya tenga histórico. Idempotente: al volver a correrlo esas
 * tareas ya tienen asiento y quedan fuera.
 *
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-avance-punto-cero.ts
 *   npx dotenv -e .env.production -o -- npx tsx scripts/backfill-avance-punto-cero.ts --commit
 *
 * Sin --commit no escribe nada (dry-run).
 */

const COMMIT = process.argv.includes('--commit')

/** Medianoche UTC — la fecha es parte de la clave única, no puede depender de la TZ. */
function diaUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

type Fuente = 'fechaFinReal' | 'horas' | 'fechaFinPlan' | 'updatedAt'

async function main() {
  const hoy = diaUTC(new Date())

  const cronogramas = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' },
    select: { id: true, proyectoId: true, proyecto: { select: { codigo: true } } },
  })

  const aInsertar: {
    proyectoTareaId: string
    proyectoId: string
    fecha: Date
    porcentaje: number
    fuente: Fuente
    codigo: string
    tarea: string
  }[] = []
  const resumen = new Map<string, { tareas: number; puntos: number; fuentes: Record<string, number> }>()

  for (const c of cronogramas) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id, porcentajeCompletado: { gt: 0 } },
      select: {
        id: true, nombre: true, porcentajeCompletado: true,
        fechaFin: true, fechaFinReal: true, updatedAt: true,
      },
    })
    if (tareas.length === 0) continue

    // Tareas que YA tienen histórico: se excluyen enteras.
    const conHistorico = new Set(
      (
        await prisma.proyectoTareaAvance.findMany({
          where: { proyectoTareaId: { in: tareas.map((t) => t.id) } },
          select: { proyectoTareaId: true },
          distinct: ['proyectoTareaId'],
        })
      ).map((a) => a.proyectoTareaId),
    )

    const pendientes = tareas.filter((t) => !conHistorico.has(t.id))
    if (pendientes.length === 0) continue
    const ids = pendientes.map((t) => t.id)

    // Fuente 2: última fecha con horas imputadas a la tarea (campo o timesheet).
    const ultimaHora = new Map<string, Date>()
    const anota = (tareaId: string | null, fecha: Date) => {
      if (!tareaId) return
      const prev = ultimaHora.get(tareaId)
      if (!prev || fecha > prev) ultimaHora.set(tareaId, fecha)
    }
    const campo = await prisma.registroHorasCampoTarea.findMany({
      where: { proyectoTareaId: { in: ids } },
      select: { proyectoTareaId: true, registroCampo: { select: { fechaTrabajo: true } } },
    })
    for (const r of campo) anota(r.proyectoTareaId, r.registroCampo.fechaTrabajo)
    const timesheet = await prisma.registroHoras.findMany({
      where: { proyectoTareaId: { in: ids } },
      select: { proyectoTareaId: true, fechaTrabajo: true },
    })
    for (const r of timesheet) anota(r.proyectoTareaId, r.fechaTrabajo)

    for (const t of pendientes) {
      let fecha: Date
      let fuente: Fuente
      const horas = ultimaHora.get(t.id)

      if (t.porcentajeCompletado >= 100 && t.fechaFinReal) {
        fecha = diaUTC(t.fechaFinReal); fuente = 'fechaFinReal'
      } else if (horas) {
        fecha = diaUTC(horas); fuente = 'horas'
      } else if (t.fechaFin && diaUTC(t.fechaFin) <= hoy) {
        fecha = diaUTC(t.fechaFin); fuente = 'fechaFinPlan'
      } else {
        fecha = diaUTC(t.updatedAt); fuente = 'updatedAt'
      }

      // Nunca fechar en el futuro: un avance no puede pertenecer a una semana que no llegó.
      if (fecha > hoy) { fecha = hoy; fuente = 'updatedAt' }

      aInsertar.push({
        proyectoTareaId: t.id,
        proyectoId: c.proyectoId,
        fecha,
        porcentaje: t.porcentajeCompletado,
        fuente,
        codigo: c.proyecto.codigo,
        tarea: t.nombre,
      })

      const r = resumen.get(c.proyecto.codigo) ?? { tareas: 0, puntos: 0, fuentes: {} }
      r.tareas += 1
      r.puntos += t.porcentajeCompletado
      r.fuentes[fuente] = (r.fuentes[fuente] ?? 0) + 1
      resumen.set(c.proyecto.codigo, r)
    }
  }

  console.log(COMMIT ? '=== MODO ESCRITURA (--commit) ===' : '=== DRY-RUN (sin --commit no escribe nada) ===')
  console.log(`\nAsientos a insertar: ${aInsertar.length}\n`)

  console.table(
    [...resumen.entries()].sort().map(([codigo, r]) => ({
      proyecto: codigo,
      tareas: r.tareas,
      'fechaFinReal': r.fuentes['fechaFinReal'] ?? 0,
      'horas': r.fuentes['horas'] ?? 0,
      'fechaFinPlan': r.fuentes['fechaFinPlan'] ?? 0,
      'updatedAt': r.fuentes['updatedAt'] ?? 0,
    })),
  )

  const porFuente: Record<string, number> = {}
  for (const a of aInsertar) porFuente[a.fuente] = (porFuente[a.fuente] ?? 0) + 1
  console.log('\nCalidad de la fecha (global):')
  console.table(
    Object.entries(porFuente).map(([f, n]) => ({
      fuente: f,
      asientos: n,
      '%': `${((n / aInsertar.length) * 100).toFixed(0)}%`,
      confianza: f === 'fechaFinReal' || f === 'horas' ? 'alta' : f === 'fechaFinPlan' ? 'media' : 'baja',
    })),
  )

  console.log('\nMuestra (10 primeros):')
  console.table(
    aInsertar.slice(0, 10).map((a) => ({
      proy: a.codigo,
      tarea: a.tarea.slice(0, 38),
      fecha: a.fecha.toISOString().slice(0, 10),
      pct: a.porcentaje,
      fuente: a.fuente,
    })),
  )

  if (!COMMIT) {
    console.log('\n→ Dry-run. Para escribir: añadir --commit')
    return
  }

  // createMany + skipDuplicates: si otra vía insertó ya un asiento (tarea, fecha), no lo pisa.
  const res = await prisma.proyectoTareaAvance.createMany({
    data: aInsertar.map((a) => ({
      proyectoTareaId: a.proyectoTareaId,
      proyectoId: a.proyectoId,
      fecha: a.fecha,
      porcentaje: a.porcentaje,
      origen: 'automatico' as const,
      usuarioId: null,
    })),
    skipDuplicates: true,
  })
  console.log(`\n✅ Insertados ${res.count} asientos (de ${aInsertar.length} candidatos).`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
