import { prisma } from '@/lib/prisma'
import { getWeekRange } from '@/lib/utils/timesheetAprobacion'

// Cuántos timesheets se aprobaron por semana, con las fechas reales de cada semana ISO.

async function main() {
  const filas = await prisma.timesheetAprobacion.groupBy({
    by: ['semana'],
    _count: { _all: true },
    _max: { fechaEnvio: true },
    orderBy: { semana: 'asc' },
  })

  const hoy = new Date()
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' })

  console.log('=== Timesheets aprobados por semana ISO (todas están en estado "aprobado") ===\n')
  console.table(
    filas.map((f) => {
      const { inicio, fin } = getWeekRange(f.semana)
      return {
        semana: f.semana,
        desde: fmt(inicio),
        hasta: fmt(fin),
        personas: f._count._all,
        'último envío': f._max.fechaEnvio?.toISOString().slice(0, 10) ?? '—',
        'ya pasó': fin < hoy ? 'sí' : 'NO (en curso)',
      }
    }),
  )

  // ¿Hay semanas recientes SIN ninguna fila? Eso distingue "no enviaron" de "no existe".
  console.log('\n=== Semanas recientes sin ninguna fila de timesheet ===')
  const existentes = new Set(filas.map((f) => f.semana))
  const faltantes: string[] = []
  for (let w = 20; w <= 35; w++) {
    const s = `2026-W${String(w).padStart(2, '0')}`
    if (!existentes.has(s)) {
      const { inicio, fin } = getWeekRange(s)
      faltantes.push(`${s}  (${fmt(inicio)} – ${fmt(fin)})`)
    }
  }
  console.log(faltantes.length ? faltantes.join('\n') : '(ninguna: todas las semanas W20-W35 tienen al menos una)')

  // Cuánta gente registró horas cada semana, tenga o no timesheet aprobado.
  console.log('\n=== Personas que registraron horas por semana (base real de comparación) ===')
  const desde = getWeekRange('2026-W20').inicio
  const registros = await prisma.registroHoras.findMany({
    where: { fechaTrabajo: { gte: desde } },
    select: { fechaTrabajo: true, usuarioId: true },
  })
  const porSemana = new Map<string, Set<string>>()
  for (const r of registros) {
    const d = r.fechaTrabajo
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const dayNum = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - dayNum)
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
    const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)
    const k = `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
    if (!porSemana.has(k)) porSemana.set(k, new Set())
    porSemana.get(k)!.add(r.usuarioId)
  }
  const aprobadosPorSemana = new Map(filas.map((f) => [f.semana, f._count._all]))
  console.table(
    [...porSemana.keys()].sort().map((k) => {
      const { inicio, fin } = getWeekRange(k)
      return {
        semana: k,
        desde: fmt(inicio),
        hasta: fmt(fin),
        'registraron horas': porSemana.get(k)!.size,
        'timesheet aprobado': aprobadosPorSemana.get(k) ?? 0,
      }
    }),
  )
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
