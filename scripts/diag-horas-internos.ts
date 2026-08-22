import { prisma } from '@/lib/prisma'

// ¿Cómo se imputan las horas a los proyectos internos? Read-only.

async function main() {
  const internos = await prisma.proyecto.findMany({
    where: { esInterno: true },
    select: { id: true, codigo: true, centroCosto: { select: { nombre: true, tipo: true } } },
    orderBy: { codigo: 'asc' },
  })
  const ids = internos.map((p) => p.id)

  // Fuente 1: RegistroHoras (timesheet + jornadas aprobadas)
  const rh = await prisma.registroHoras.findMany({
    where: { proyectoId: { in: ids } },
    select: { proyectoId: true, fechaTrabajo: true, horasTrabajadas: true, usuarioId: true, origen: true },
  })
  // Fuente 2: miembros de jornadas cerradas aún sin convertir
  const miembros = await prisma.registroHorasCampoMiembro.findMany({
    where: {
      registroHorasId: null,
      registroCampoTarea: { registroCampo: { proyectoId: { in: ids }, estado: { not: 'iniciado' } } },
    },
    select: {
      horas: true, usuarioId: true,
      registroCampoTarea: { select: { registroCampo: { select: { proyectoId: true, fechaTrabajo: true } } } },
    },
  })

  console.log(`RegistroHoras en proyectos internos: ${rh.length}`)
  console.log(`Miembros de jornada sin convertir  : ${miembros.length}`)

  const porOrigen: Record<string, number> = {}
  for (const r of rh) porOrigen[r.origen ?? '(sin origen)'] = (porOrigen[r.origen ?? '(sin origen)'] ?? 0) + Number(r.horasTrabajadas)
  console.log('\nHoras por origen del registro:')
  console.table(Object.entries(porOrigen).map(([o, h]) => ({ origen: o, horas: Math.round(h) })))

  const mesDe = (d: Date) => d.toISOString().slice(0, 7)
  const acc = new Map<string, { horas: number; personas: Set<string>; porMes: Map<string, number> }>()
  const suma = (proyectoId: string, fecha: Date, horas: number, usuarioId: string | null) => {
    const a = acc.get(proyectoId) ?? { horas: 0, personas: new Set<string>(), porMes: new Map<string, number>() }
    a.horas += horas
    if (usuarioId) a.personas.add(usuarioId)
    const m = mesDe(fecha)
    a.porMes.set(m, (a.porMes.get(m) ?? 0) + horas)
    acc.set(proyectoId, a)
  }
  for (const r of rh) suma(r.proyectoId, r.fechaTrabajo, Number(r.horasTrabajadas), r.usuarioId)
  for (const m of miembros) {
    const j = m.registroCampoTarea.registroCampo
    suma(j.proyectoId, j.fechaTrabajo, m.horas, m.usuarioId)
  }

  const meses = [...new Set([...acc.values()].flatMap((a) => [...a.porMes.keys()]))].sort()
  console.log(`\nMeses con datos: ${meses.join(', ')}`)

  console.log('\n=== HORAS POR PROYECTO INTERNO ===')
  console.table(internos.map((p) => {
    const a = acc.get(p.id)
    const fila: Record<string, unknown> = {
      proyecto: p.codigo,
      centroCosto: p.centroCosto?.nombre ?? '—',
      horas: a ? Math.round(a.horas) : 0,
      personas: a ? a.personas.size : 0,
    }
    for (const m of meses.slice(-4)) fila[m.slice(2)] = a?.porMes.get(m) ? Math.round(a.porMes.get(m)!) : ''
    return fila
  }))

  console.log('\n=== AGRUPADO POR CENTRO DE COSTO ===')
  const porCC = new Map<string, { horas: number; personas: Set<string>; proyectos: string[] }>()
  for (const p of internos) {
    const cc = p.centroCosto?.nombre ?? '(sin centro)'
    const a = acc.get(p.id)
    const g = porCC.get(cc) ?? { horas: 0, personas: new Set<string>(), proyectos: [] }
    g.horas += a?.horas ?? 0
    a?.personas.forEach((u) => g.personas.add(u))
    g.proyectos.push(p.codigo)
    porCC.set(cc, g)
  }
  console.table([...porCC.entries()].map(([cc, g]) => ({
    centroCosto: cc, proyectos: g.proyectos.join(', '),
    horas: Math.round(g.horas), personas: g.personas.size,
  })))
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
