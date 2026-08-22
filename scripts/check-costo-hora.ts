import { prisma } from '@/lib/prisma'

// ¿Está bien poblado costoHora? Read-only.

async function main() {
  const desde = new Date(Date.UTC(2026, 2, 1))
  const rs = await prisma.registroHoras.findMany({
    where: { fechaTrabajo: { gte: desde } },
    select: { costoHora: true, horasTrabajadas: true, user: { select: { name: true } } },
  })

  const g = new Map<string, { h: number; costos: Set<number>; ceros: number; n: number }>()
  for (const r of rs) {
    const k = r.user?.name ?? '(sin usuario)'
    const a = g.get(k) ?? { h: 0, costos: new Set<number>(), ceros: 0, n: 0 }
    const c = Number(r.costoHora ?? 0)
    a.h += Number(r.horasTrabajadas)
    a.costos.add(Number(c.toFixed(2)))
    if (c === 0) a.ceros++
    a.n++
    g.set(k, a)
  }

  console.table(
    [...g.entries()]
      .map(([n, a]) => ({
        persona: n.slice(0, 24),
        horas: Math.round(a.h),
        'registros': a.n,
        'con costo 0': a.ceros,
        'costoHora usados': [...a.costos].sort((x, y) => x - y).join(' · ').slice(0, 34),
      }))
      .sort((a, b) => b.horas - a.horas),
  )

  const cero = rs.filter((r) => Number(r.costoHora ?? 0) === 0).length
  const horasCero = rs.filter((r) => Number(r.costoHora ?? 0) === 0)
    .reduce((s, r) => s + Number(r.horasTrabajadas), 0)
  console.log(`\nregistros con costoHora = 0: ${cero} de ${rs.length}  (${Math.round(horasCero)} h)`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
