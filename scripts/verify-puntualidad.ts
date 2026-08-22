import { prisma } from '@/lib/prisma'
import { getISOWeek, getWeekRange } from '@/lib/utils/timesheetAprobacion'

// Reproduce la agregación de GET /api/gestion/puntualidad-registro (read-only).

const MS_PER_DAY = 86_400_000

async function main() {
  const nSemanas = 16
  const hoy = new Date()
  const dia = hoy.getUTCDay()
  const lunesActual = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) + (dia === 0 ? -6 : 1 - dia) * MS_PER_DAY,
  )
  const desde = new Date(lunesActual.getTime() - (nSemanas - 1) * 7 * MS_PER_DAY)

  const [registros, aprobaciones, jornadas] = await Promise.all([
    prisma.registroHoras.findMany({ where: { fechaTrabajo: { gte: desde } }, select: { fechaTrabajo: true, usuarioId: true } }),
    prisma.timesheetAprobacion.findMany({ where: { estado: 'aprobado' }, select: { semana: true, usuarioId: true } }),
    prisma.registroHorasCampo.findMany({
      where: { fechaTrabajo: { gte: desde } },
      select: { fechaTrabajo: true, fechaCierre: true, estado: true },
    }),
  ])

  const m = new Map<string, { horas: Set<string>; apr: Set<string>; j: number; jAb: number; dias: number[] }>()
  const acc = (k: string) => {
    if (!m.has(k)) m.set(k, { horas: new Set(), apr: new Set(), j: 0, jAb: 0, dias: [] })
    return m.get(k)!
  }
  for (const r of registros) acc(getISOWeek(r.fechaTrabajo)).horas.add(r.usuarioId)
  for (const a of aprobaciones) if (m.has(a.semana)) acc(a.semana).apr.add(a.usuarioId)
  for (const j of jornadas) {
    const a = acc(getISOWeek(j.fechaTrabajo))
    a.j += 1
    if (j.estado === 'iniciado') a.jAb += 1
    else if (j.fechaCierre) a.dias.push(Math.round((j.fechaCierre.getTime() - j.fechaTrabajo.getTime()) / MS_PER_DAY))
  }
  const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null)

  const filas = [...m.keys()].sort().map((k) => {
    const a = m.get(k)!
    const { inicio, fin } = getWeekRange(k)
    const cerraron = [...a.apr].filter((u) => a.horas.has(u)).length
    return {
      semana: k,
      rango: `${inicio.toISOString().slice(5, 10)} → ${fin.toISOString().slice(5, 10)}`,
      enCurso: fin >= hoy ? 'sí' : '',
      conHoras: a.horas.size,
      cerrados: cerraron,
      cobertura: a.horas.size ? `${Math.round((cerraron / a.horas.size) * 100)}%` : '—',
      jornadas: a.j,
      abiertas: a.jAb || '',
      diasCierre: med(a.dias) ?? '—',
    }
  })
  console.table(filas)

  const cerradas = filas.filter((f) => f.enCurso !== 'sí')
  const u8 = cerradas.slice(-8)
  const th = u8.reduce((s, f) => s + f.conHoras, 0)
  const tc = u8.reduce((s, f) => s + f.cerrados, 0)
  console.log(`\nResumen 8 semanas cerradas: cobertura ${th ? Math.round((tc / th) * 100) : 0}% (${tc}/${th})`)
  const dias = cerradas.map((f) => f.diasCierre).filter((d): d is number => typeof d === 'number')
  console.log(`Mediana de días en cerrar jornada: ${med(dias) ?? '—'}`)
  console.log(`Jornadas abiertas ahora: ${await prisma.registroHorasCampo.count({ where: { estado: 'iniciado' } })}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
