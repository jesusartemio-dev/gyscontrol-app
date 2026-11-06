import { prisma } from '../src/lib/prisma'
import { recalcularEdtPadre, recalcularFasePadre, recalcularPadresPostOperacion } from '../src/lib/utils/cronogramaRollup'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { siguienteMomentoLaborable, sumarHorasLaborables } from '../src/lib/services/cronogramaHoras'

// Mueve la actividad "Habilitación de Personal" del EDT Seguimiento de
// Seguridad (SSO, fase Gestión y Control) al EDT Planificación de Seguridad
// (SEG, fase Planificación) del mismo cronograma: la habilitación se hace en
// la planificación. Va al final de SEG, con Fin-Comienzo desde la última tarea
// de SEG (la que termina más tarde) a su primera tarea; sus tareas se
// reprograman en cadena por horas desde ahí (si alguna tiene horas/avance, no
// se cambian fechas). Las horas registradas en esas tareas pasan al EDT nuevo.
// Conserva ids, responsables, catálogo y dependencias internas.
// Por defecto simula; con --apply escribe.
//
//   npx dotenv -e .env.production -o -- npx tsx scripts/mover-habilitacion-personal-a-seg.ts <cronogramaId>... [--apply]

const APPLY = process.argv.includes('--apply')
const CRONOGRAMAS = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const EDT_SEG = '8f35cf6b-ae3f-4da0-aa08-a8795c9cb3eb'
const EDT_SSO = 'cmvagdkyl0001l8p4efjz8n4j'
const ACTIVIDAD = 'Habilitación de Personal'

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16).replace('T', ' ') : '-')

async function procesar(cronogramaId: string) {
  const cron = await prisma.proyectoCronograma.findUniqueOrThrow({ where: { id: cronogramaId }, include: { proyecto: { select: { codigo: true } } } })
  console.log(`\n=== ${cron.proyecto.codigo} · ${cron.tipo} (${cron.id}) ===`)
  const act = await prisma.proyectoActividad.findFirst({
    where: { proyectoCronogramaId: cronogramaId, nombre: ACTIVIDAD },
    include: {
      proyectoEdt: true,
      proyectoTarea: { orderBy: { orden: 'asc' }, include: { _count: { select: { registroHoras: true, registrosCampoTarea: true, avances: true, registrosAvance: true } } } },
    },
  })
  if (!act) throw new Error('No está la actividad')
  if (act.proyectoEdt.edtId !== EDT_SSO) { console.log(`Ya está en "${act.proyectoEdt.nombre}": nada que hacer`); return }
  const destino = await prisma.proyectoEdt.findFirst({
    where: { proyectoCronogramaId: cronogramaId, edtId: EDT_SEG },
    include: { proyectoActividad: { orderBy: { orden: 'asc' }, include: { proyectoTarea: true } } },
  })
  if (!destino) throw new Error('El cronograma no tiene EDT de Planificación de Seguridad')

  const tareas = act.proyectoTarea
  const ids = tareas.map((t) => t.id)
  const campo = tareas.reduce((s, t) => s + t._count.registrosCampoTarea, 0)
  if (campo) throw new Error(`${campo} registros de jornada de campo en sus tareas: revisar a mano`)
  const conAvance = tareas.filter((t) => t._count.registroHoras + t._count.avances + t._count.registrosAvance > 0)
  const nHoras = tareas.reduce((s, t) => s + t._count.registroHoras, 0)

  const delDestino = destino.proyectoActividad.flatMap((a) => a.proyectoTarea)
  if (!delDestino.length) throw new Error('El EDT destino no tiene tareas')
  const ancla = delDestino.reduce((a, b) => (b.fechaFin >= a.fechaFin ? b : a))
  const primera = tareas[0]
  const yaDep = await prisma.proyectoDependenciasTarea.findFirst({ where: { tareaOrigenId: ancla.id, tareaDependienteId: primera.id } })
  const externas = await prisma.proyectoDependenciasTarea.findMany({
    where: { OR: [{ tareaOrigenId: { in: ids }, tareaDependienteId: { notIn: ids } }, { tareaDependienteId: { in: ids }, tareaOrigenId: { notIn: ids } }] },
    include: { tareaOrigen: { select: { nombre: true } }, tareaDependiente: { select: { nombre: true } } },
  })
  for (const x of externas) console.log(`(se conserva) ${x.tareaOrigen.nombre} → ${x.tareaDependiente.nombre}`)

  const cal = await obtenerCalendarioProyecto(cron.proyectoId)
  const fechas = new Map<string, { ini: Date; fin: Date }>()
  if (!conAvance.length) {
    let cursor = ancla.fechaFin
    for (const t of tareas) {
      const ini = siguienteMomentoLaborable(cal, cursor)
      const fin = t.esHito ? ini : sumarHorasLaborables(cal, ini, Number(t.horasEstimadas ?? 0))
      fechas.set(t.id, { ini, fin })
      cursor = fin
    }
  }

  console.log(`"${act.nombre}": ${act.proyectoEdt.nombre} → ${destino.nombre} (después de "${destino.proyectoActividad.at(-1)?.nombre}")`)
  console.log(`Enlace: ${ancla.nombre} (fin ${d(ancla.fechaFin)}) → ${primera.nombre}${yaDep ? ' (ya existe)' : ''}`)
  for (const t of tareas) {
    const f = fechas.get(t.id)
    console.log(`  ${t.nombre} | ${d(t.fechaInicio)} → ${d(t.fechaFin)}${f ? `  ⇒  ${d(f.ini)} → ${d(f.fin)}` : '  (fechas sin cambio)'} | reg ${t._count.registroHoras}/${t._count.avances + t._count.registrosAvance}`)
  }
  if (conAvance.length) console.log(`Con horas/avance: ${conAvance.map((t) => t.nombre).join(' | ')} → no se reprograma; ${nHoras} registros de horas pasan al EDT nuevo`)

  if (!APPLY) return

  const ahora = new Date()
  const ordenDestino = Math.max(-1, ...destino.proyectoActividad.map((a) => a.orden)) + 1
  await prisma.$transaction(async (tx) => {
    await tx.proyectoActividad.update({ where: { id: act.id }, data: { proyectoEdtId: destino.id, orden: ordenDestino, updatedAt: ahora } })
    for (const t of tareas) {
      const f = fechas.get(t.id)
      await tx.proyectoTarea.update({ where: { id: t.id }, data: { proyectoEdtId: destino.id, ...(f && { fechaInicio: f.ini, fechaFin: f.fin }), updatedAt: ahora } })
    }
    if (nHoras) await tx.registroHoras.updateMany({ where: { proyectoTareaId: { in: ids } }, data: { proyectoEdtId: destino.id, edtId: EDT_SEG, updatedAt: ahora } })
    if (!yaDep) await tx.proyectoDependenciasTarea.create({ data: { id: crypto.randomUUID(), tareaOrigenId: ancla.id, tareaDependienteId: primera.id, tipo: 'finish_to_start', lagMinutos: 0 } })
  })
  // Origen: el EDT y su fase se recalculan sin la actividad; destino: hacia arriba desde la tarea.
  await recalcularEdtPadre(act.proyectoEdtId)
  await recalcularFasePadre(act.proyectoEdt.proyectoFaseId)
  await recalcularPadresPostOperacion(cron.proyectoId, 'tarea', primera.id)
  const [o, n] = await Promise.all([
    prisma.proyectoEdt.findUniqueOrThrow({ where: { id: act.proyectoEdtId } }),
    prisma.proyectoEdt.findUniqueOrThrow({ where: { id: destino.id } }),
  ])
  console.log(`OK · ${n.nombre}: ${d(n.fechaInicioPlan)} → ${d(n.fechaFinPlan)} · ${o.nombre}: ${d(o.fechaInicioPlan)} → ${d(o.fechaFinPlan)}`)
}

async function main() {
  console.log(APPLY ? '*** MODO APPLY ***' : '--- simulación (usar --apply para escribir) ---')
  console.log('DB:', process.env.DATABASE_URL?.slice(0, 40))
  if (!CRONOGRAMAS.length) throw new Error('Indica los ids de cronograma')
  for (const c of CRONOGRAMAS) await procesar(c)
  if (!APPLY) console.log('\nSimulación: no se escribió nada.')
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
