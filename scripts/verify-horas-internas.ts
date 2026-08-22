import { prisma } from '@/lib/prisma'

// Reproduce GET /api/gestion/horas-internas con la misma lógica. Read-only.

const mesDe = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

async function main() {
  const nMeses = Number(process.argv[2]) || 6
  const hoy = new Date()
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (nMeses - 1), 1))
  const meses: string[] = []
  for (let i = nMeses - 1; i >= 0; i--) {
    meses.push(mesDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1))))
  }

  const proyectos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    select: { id: true, codigo: true, centroCosto: { select: { id: true, nombre: true, tipo: true } } },
    orderBy: { codigo: 'asc' },
  })
  const ids = proyectos.map((p) => p.id)

  const [registros, miembros] = await Promise.all([
    prisma.registroHoras.findMany({
      where: { proyectoId: { in: ids }, fechaTrabajo: { gte: desde } },
      select: { proyectoId: true, fechaTrabajo: true, horasTrabajadas: true, usuarioId: true },
    }),
    prisma.registroHorasCampoMiembro.findMany({
      where: {
        registroHorasId: null,
        registroCampoTarea: {
          registroCampo: { proyectoId: { in: ids }, estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde } },
        },
      },
      select: {
        horas: true, usuarioId: true,
        registroCampoTarea: { select: { registroCampo: { select: { proyectoId: true, fechaTrabajo: true } } } },
      },
    }),
  ])

  const acc = new Map<string, { horas: number; personas: Set<string>; porMes: Map<string, number> }>()
  const suma = (pid: string, f: Date, h: number, u: string | null) => {
    const a = acc.get(pid) ?? { horas: 0, personas: new Set<string>(), porMes: new Map<string, number>() }
    a.horas += h
    if (u) a.personas.add(u)
    a.porMes.set(mesDe(f), (a.porMes.get(mesDe(f)) ?? 0) + h)
    acc.set(pid, a)
  }
  for (const r of registros) suma(r.proyectoId, r.fechaTrabajo, Number(r.horasTrabajadas) || 0, r.usuarioId)
  for (const m of miembros) {
    const j = m.registroCampoTarea.registroCampo
    suma(j.proyectoId, j.fechaTrabajo, m.horas || 0, m.usuarioId)
  }

  const grupos = new Map<string, { nombre: string; tipo: string; proyectos: string[]; personas: Set<string> }>()
  for (const p of proyectos) {
    const k = p.centroCosto?.id ?? '__sin__'
    const g = grupos.get(k) ?? {
      nombre: p.centroCosto?.nombre ?? 'Sin centro de costo',
      tipo: p.centroCosto?.tipo ?? '—', proyectos: [], personas: new Set<string>(),
    }
    g.proyectos.push(p.id)
    acc.get(p.id)?.personas.forEach((u) => g.personas.add(u))
    grupos.set(k, g)
  }

  const codigoDe = new Map(proyectos.map((p) => [p.id, p.codigo]))
  const filas = [...grupos.values()].map((g) => {
    const fila: Record<string, unknown> = {
      centroCosto: g.nombre,
      proyectos: g.proyectos.map((id) => codigoDe.get(id)).join(', '),
      personas: g.personas.size,
    }
    let total = 0
    for (const m of meses) {
      const h = g.proyectos.reduce((s, id) => s + (acc.get(id)?.porMes.get(m) ?? 0), 0)
      fila[m.slice(2)] = h ? Math.round(h) : ''
      total += h
    }
    fila.total = Math.round(total)
    return fila
  }).sort((a, b) => (b.total as number) - (a.total as number))

  console.log(`meses: ${meses.join(', ')}\n`)
  console.table(filas)
  const totalPersonas = new Set<string>()
  for (const a of acc.values()) a.personas.forEach((u) => totalPersonas.add(u))
  console.log(`\nTotal: ${filas.reduce((s, f) => s + (f.total as number), 0)} h · ${totalPersonas.size} personas`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
