import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('=== TimesheetAprobacion: ¿se usa el cierre semanal? ===')
  const t = await prisma.timesheetAprobacion.groupBy({ by: ['estado'], _count: { _all: true } })
  console.table(t.map(x => ({ estado: x.estado, n: x._count._all })))

  const porSemana = await prisma.timesheetAprobacion.groupBy({
    by: ['semana', 'estado'], _count: { _all: true }, orderBy: { semana: 'asc' },
  })
  const mapa = new Map<string, Record<string, number>>()
  for (const p of porSemana) {
    const r = mapa.get(p.semana) ?? {}
    r[p.estado] = p._count._all
    mapa.set(p.semana, r)
  }
  console.table([...mapa.entries()].map(([semana, r]) => ({ semana, ...r })))

  const usuarios = await prisma.timesheetAprobacion.groupBy({ by: ['usuarioId'], _count: { _all: true } })
  const totalUsuariosActivos = await prisma.user.count()
  console.log(`usuarios que han enviado alguna vez: ${usuarios.length} | usuarios activos: ${totalUsuariosActivos}`)

  console.log('\n=== Retraso de envío: fechaEnvio vs fin de la semana declarada ===')
  const envs = await prisma.timesheetAprobacion.findMany({
    where: { fechaEnvio: { not: null } },
    select: { semana: true, fechaEnvio: true, estado: true, fechaResolucion: true },
    orderBy: { semana: 'asc' },
  })
  function domingo(semana: string) {
    const [y, w] = semana.split('-W').map(Number)
    const jan4 = new Date(Date.UTC(y, 0, 4))
    const d = jan4.getUTCDay() || 7
    const m1 = new Date(jan4); m1.setUTCDate(jan4.getUTCDate() - d + 1)
    const ini = new Date(m1); ini.setUTCDate(m1.getUTCDate() + (w - 1) * 7)
    const fin = new Date(ini); fin.setUTCDate(ini.getUTCDate() + 6)
    return fin
  }
  const rows = envs.map(e => ({
    semana: e.semana, estado: e.estado,
    envio: e.fechaEnvio!.toISOString().slice(0, 10),
    diasTrasDomingo: Math.round((e.fechaEnvio!.getTime() - domingo(e.semana).getTime()) / 86400000),
    resolucion: e.fechaResolucion ? e.fechaResolucion.toISOString().slice(0, 10) : '—',
  }))
  console.table(rows.slice(0, 25))
  const lags = rows.map(r => r.diasTrasDomingo)
  if (lags.length) console.log(`n=${lags.length} | mediana=${lags.sort((a,b)=>a-b)[Math.floor(lags.length/2)]} días | máx=${Math.max(...lags)}`)

  console.log('\n=== Jornadas: días entre cierre y aprobación ===')
  const ap = await prisma.registroHorasCampo.findMany({
    where: { estado: 'aprobado', fechaCierre: { not: null }, fechaAprobacion: { not: null } },
    select: { fechaTrabajo: true, fechaCierre: true, fechaAprobacion: true },
  })
  const b: Record<string, number> = {}
  for (const j of ap) {
    const l = Math.round((j.fechaAprobacion!.getTime() - j.fechaTrabajo.getTime()) / 86400000)
    const k = l <= 1 ? '0-1 día' : l <= 3 ? '2-3' : l <= 7 ? '4-7' : l <= 14 ? '8-14' : l <= 30 ? '15-30' : '+30'
    b[k] = (b[k] ?? 0) + 1
  }
  console.log('desfase fechaTrabajo -> fechaAprobacion:')
  console.table(Object.entries(b).map(([k, v]) => ({ desfase: k, jornadas: v })))
}

main().finally(() => prisma.$disconnect())
