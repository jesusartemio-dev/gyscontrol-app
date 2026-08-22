import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '—')

async function main() {
  console.log('=== DESFASE fechaTrabajo -> fechaCierre (cuando se llenó el %) ===')
  const js = await prisma.registroHorasCampo.findMany({
    where: { fechaCierre: { not: null } },
    select: { fechaTrabajo: true, fechaCierre: true, estado: true, proyecto: { select: { codigo: true } } },
    orderBy: { fechaTrabajo: 'desc' },
  })
  const lags = js.map(j => Math.round((j.fechaCierre!.getTime() - j.fechaTrabajo.getTime()) / 86400000))
  const buckets: Record<string, number> = {}
  for (const l of lags) {
    const k = l <= 0 ? 'mismo día' : l === 1 ? '1 día' : l <= 3 ? '2-3 días' : l <= 7 ? '4-7 días' : l <= 30 ? '8-30 días' : '+30 días'
    buckets[k] = (buckets[k] ?? 0) + 1
  }
  console.table(Object.entries(buckets).map(([k, v]) => ({ desfase: k, jornadas: v })))
  console.log(`n=${lags.length} | máx=${Math.max(...lags)} días | ${lags.filter(l => l > 1).length} jornadas cerradas +1 día después`)

  console.log('\n=== JORNADAS ABIERTAS (estado iniciado) — avance aún no capturado ===')
  const abiertas = await prisma.registroHorasCampo.findMany({
    where: { estado: 'iniciado' },
    select: {
      fechaTrabajo: true, createdAt: true, proyecto: { select: { codigo: true } },
      tareas: { select: { proyectoTareaId: true, porcentajeFinal: true } },
    },
    orderBy: { fechaTrabajo: 'asc' },
  })
  console.table(abiertas.map(j => ({
    proy: j.proyecto.codigo, fechaTrabajo: dia(j.fechaTrabajo),
    diasAbierta: Math.round((Date.now() - j.fechaTrabajo.getTime()) / 86400000),
    tareas: j.tareas.length,
    ligadas: j.tareas.filter(t => t.proyectoTareaId).length,
    conPct: j.tareas.filter(t => t.porcentajeFinal != null).length,
  })))

  console.log('\n=== COLISIONES: misma tarea, misma fecha, dos orígenes ===')
  // El @@unique([proyectoTareaId, fecha]) hace que un upsert pise al otro.
  const av = await prisma.proyectoTareaAvance.findMany({
    select: { proyectoTareaId: true, fecha: true, origen: true, createdAt: true },
  })
  const porTarea = new Map<string, typeof av>()
  for (const a of av) {
    const k = a.proyectoTareaId
    if (!porTarea.has(k)) porTarea.set(k, [])
    porTarea.get(k)!.push(a)
  }
  let retro = 0, mismasFechas = 0
  for (const [, filas] of porTarea) {
    const ordenPorFecha = [...filas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    const ordenPorCaptura = [...filas].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    if (ordenPorFecha.map(f => f.fecha.getTime()).join() !== ordenPorCaptura.map(f => f.fecha.getTime()).join()) retro++
    const set = new Set(filas.map(f => dia(f.fecha)))
    if (set.size < filas.length) mismasFechas++
  }
  console.log(`tareas con histórico: ${porTarea.size}`)
  console.log(`tareas donde el orden de CAPTURA != orden de FECHA (avance retro-fechado): ${retro}`)

  console.log('\n=== ORIGEN vs fecha: ¿el avance de campo usa fechaTrabajo? ===')
  const campo = await prisma.proyectoTareaAvance.findMany({
    where: { origen: 'campo' },
    select: { fecha: true, createdAt: true, proyectoTarea: { select: { nombre: true } } },
    orderBy: { fecha: 'asc' }, take: 15,
  })
  console.table(campo.map(c => ({
    fechaEfecto: dia(c.fecha), fechaCaptura: dia(c.createdAt),
    desfaseDias: Math.round((c.createdAt.getTime() - c.fecha.getTime()) / 86400000),
  })))

  const oficina = await prisma.proyectoTareaAvance.findMany({
    where: { origen: 'oficina' },
    select: { fecha: true, createdAt: true },
    orderBy: { fecha: 'asc' }, take: 10,
  })
  console.log('\n=== origen oficina: fecha efecto vs captura (debería ser SIEMPRE 0 = hoy) ===')
  console.table(oficina.map(c => ({
    fechaEfecto: dia(c.fecha), fechaCaptura: dia(c.createdAt),
    desfaseDias: Math.round((c.createdAt.getTime() - c.fecha.getTime()) / 86400000),
  })))
}

main().finally(() => prisma.$disconnect())
