// Agrega a la LÍNEA BASE de un proyecto existente las actividades fijas de CON
// que hoy arma el generador (generalesCon.ts):
//   "Generales - Movilización y Obras Preliminares" → termina el día laborable
//      anterior al inicio de la primera zona (no mueve las zonas)
//   "Generales - Desmovilización" → arranca el día laborable siguiente al fin
//      de la última zona
// Tareas "GEN - …" con las horas, recursos y dependencias FC del catálogo
// (etiquetas Paralelo / Andamios; "el Cliente" → nombre del cliente). Si el
// catálogo aún no tiene esos servicios, usa scripts/datos/generales-con.ts sin
// vincular el servicio. Idempotente: si la actividad ya existe, no la crea.
//   npx tsx scripts/aplicar-con-generales-proyecto.ts CJM52           (muestra)
//   npx tsx scripts/aplicar-con-generales-proyecto.ts CJM52 --apply   (guarda)
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { finJornada, horasPorDiaCalendario, restarHorasLaborables, siguienteMomentoLaborable, sumarHorasLaborables } from '../src/lib/services/cronogramaHoras'
import { recalcularFechasPadresDeTarea } from '../src/lib/services/cronogramaRollupFechas'
import { ACTIVIDAD_DESMOVILIZACION, ACTIVIDAD_MOVILIZACION, PREFIJO_GENERALES, nombreConCliente } from '../src/lib/cronogramaIA/generalesCon'
import { SERVICIOS_GENERALES_CON } from './datos/generales-con'

const codigo = process.argv[2]
const APLICAR = process.argv.includes('--apply')
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const tiene = (tags: string[], t: string) => tags.some(x => norm(x) === norm(t))
const f = (d: Date) => d.toISOString().slice(5, 16).replace('T', ' ')

interface Servicio { nombre: string; horas: number; recursoId: string | null; recurso: string; tags: string[]; orden: number; catalogoServicioId: string | null }

async function main() {
  if (!codigo) throw new Error('Uso: npx tsx scripts/aplicar-con-generales-proyecto.ts <codigo> [--apply]')
  const proyecto = await prisma.proyecto.findFirst({ where: { codigo }, select: { id: true, codigo: true, nombre: true, cliente: { select: { nombre: true } } } })
  if (!proyecto) throw new Error(`No existe el proyecto ${codigo}`)
  const cron = await prisma.proyectoCronograma.findFirst({ where: { proyectoId: proyecto.id, tipo: 'planificacion' }, select: { id: true } })
  if (!cron) throw new Error('El proyecto no tiene línea base')
  const edt = await prisma.proyectoEdt.findFirst({
    where: { proyectoId: proyecto.id, proyectoCronogramaId: cron.id, edt: { nombre: 'CON' } },
    select: { id: true, nombre: true, responsableId: true },
  })
  if (!edt) throw new Error('La línea base no tiene EDT CON')

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: edt.id },
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, orden: true, fechaInicioPlan: true, fechaFinPlan: true, proyectoTarea: { orderBy: { orden: 'asc' }, select: { nombre: true, responsableId: true } } },
  })
  const zonas = actividades.filter(a => !a.nombre.startsWith('Generales - '))
  if (!zonas.length) throw new Error('CON no tiene zonas')
  const hayAndamios = zonas.some(z => z.proyectoTarea.some(t => /armado de andamios/i.test(t.nombre)))
  const responsableId = zonas[0].proyectoTarea.find(t => t.responsableId)?.responsableId ?? edt.responsableId

  // Servicios: del catálogo si ya están; si no, de la lista del script.
  const delCatalogo = await prisma.catalogoServicio.findMany({
    where: { edt: { nombre: 'CON' }, OR: [{ actividadTag: { has: 'Movilizacion' } }, { actividadTag: { has: 'Desmovilizacion' } }] },
    select: { id: true, nombre: true, horaBase: true, orden: true, actividadTag: true, recursoId: true, recurso: { select: { nombre: true } } },
  })
  const recursos = new Map((await prisma.recurso.findMany({ select: { id: true, nombre: true } })).map(r => [r.nombre, r.id]))
  const servicios: Servicio[] = delCatalogo.length
    ? delCatalogo.filter(s => !tiene(s.actividadTag, 'Obsoleto')).map(s => ({ nombre: s.nombre, horas: s.horaBase ?? 0, recursoId: s.recursoId, recurso: s.recurso.nombre, tags: s.actividadTag, orden: s.orden ?? 0, catalogoServicioId: s.id }))
    : SERVICIOS_GENERALES_CON.map(s => ({ nombre: s.nombre, horas: s.horas, recursoId: recursos.get(s.recurso) ?? null, recurso: s.recurso, tags: s.tags, orden: s.orden, catalogoServicioId: null }))

  const cal = await obtenerCalendarioProyecto(proyecto.id)
  const jornada = horasPorDiaCalendario(cal)
  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${proyecto.codigo} · línea base · ${edt.nombre} · ${zonas.length} zonas${hayAndamios ? ' (con andamios)' : ''} · servicios ${delCatalogo.length ? 'del catálogo' : 'de la lista del script (catálogo aún sin aplicar)'}\n`)

  /** Arma las tareas de una actividad: fechas (desde `inicio`) y predecesoras como en el generador. */
  const armar = (tag: string, inicio: Date) => {
    const lista = servicios.filter(s => tiene(s.tags, tag) && (hayAndamios || !tiene(s.tags, 'Andamios'))).sort((a, b) => a.orden - b.orden)
    let acum = 0, inicioAnterior = 0
    let anterior: number | null = null, predAnterior: number | null = null
    const tareas = lista.map((s, i) => {
      const paralela = tiene(s.tags, 'Paralelo') && anterior !== null
      const h0 = paralela ? inicioAnterior : acum
      const dur = Math.max(1, Math.ceil(s.horas / jornada)) * jornada
      acum = Math.max(acum, h0 + dur)
      const pred: number | null = paralela ? predAnterior : anterior
      inicioAnterior = h0; predAnterior = pred; anterior = i
      return {
        ...s, id: randomUUID(), pred,
        nombre: `${PREFIJO_GENERALES}${nombreConCliente(s.nombre, proyecto.cliente?.nombre)}`,
        fechaInicio: h0 === 0 ? inicio : siguienteMomentoLaborable(cal, sumarHorasLaborables(cal, inicio, h0)),
        fechaFin: sumarHorasLaborables(cal, inicio, h0 + dur),
      }
    })
    return { tareas, horasSpan: acum }
  }

  const planes: { nombre: string; orden: number; tareas: ReturnType<typeof armar>['tareas'] }[] = []
  if (!actividades.some(a => a.nombre === ACTIVIDAD_MOVILIZACION)) {
    // Primero se calcula cuánto dura, para que termine justo antes de la primera zona.
    const span = armar('Movilizacion', zonas[0].fechaInicioPlan).horasSpan
    const inicio = restarHorasLaborables(cal, zonas[0].fechaInicioPlan, span)
    planes.push({ nombre: ACTIVIDAD_MOVILIZACION, orden: 0, tareas: armar('Movilizacion', inicio).tareas })
  } else console.log(`= ya existe: ${ACTIVIDAD_MOVILIZACION}`)
  if (!actividades.some(a => a.nombre === ACTIVIDAD_DESMOVILIZACION)) {
    const ultima = zonas[zonas.length - 1]
    const inicio = siguienteMomentoLaborable(cal, finJornada(cal, ultima.fechaFinPlan))
    planes.push({ nombre: ACTIVIDAD_DESMOVILIZACION, orden: Math.max(...actividades.map(a => a.orden)) + 2, tareas: armar('Desmovilizacion', inicio).tareas })
  } else console.log(`= ya existe: ${ACTIVIDAD_DESMOVILIZACION}`)

  for (const p of planes) {
    console.log(`■ ${p.nombre}  (${f(p.tareas[0].fechaInicio)} → ${f(p.tareas[p.tareas.length - 1].fechaFin)})`)
    p.tareas.forEach((t, i) => console.log(`  ${i + 1}. ${t.nombre} · ${t.recurso} · ${t.horas} h · ${f(t.fechaInicio)}→${f(t.fechaFin)}${t.pred !== null ? ` · pred ${t.pred + 1}` : ''}`))
    console.log('')
  }
  console.log(`Zonas: ${zonas[0].nombre} empieza ${f(zonas[0].fechaInicioPlan)}; ${zonas[zonas.length - 1].nombre} termina ${f(zonas[zonas.length - 1].fechaFinPlan)} (no se mueven).`)
  if (!APLICAR) { console.log('\nNada guardado. Correr con --apply para aplicar.'); return }
  if (!planes.length) return

  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    // La movilización va primera: las demás actividades se corren un lugar.
    if (planes.some(p => p.nombre === ACTIVIDAD_MOVILIZACION)) {
      for (const a of actividades) await tx.proyectoActividad.update({ where: { id: a.id }, data: { orden: a.orden + 1, updatedAt: ahora } })
    }
    for (const p of planes) {
      const actividadId = randomUUID()
      await tx.proyectoActividad.create({
        data: {
          id: actividadId, proyectoEdtId: edt.id, proyectoCronogramaId: cron.id, nombre: p.nombre, orden: p.orden, responsableId,
          fechaInicioPlan: p.tareas[0].fechaInicio, fechaFinPlan: new Date(Math.max(...p.tareas.map(t => t.fechaFin.getTime()))),
          horasPlan: p.tareas.reduce((s, t) => s + t.horas, 0), updatedAt: ahora,
        },
      })
      for (const [i, t] of p.tareas.entries()) {
        await tx.proyectoTarea.create({
          data: {
            id: t.id, proyectoEdtId: edt.id, proyectoCronogramaId: cron.id, proyectoActividadId: actividadId, nombre: t.nombre, orden: i,
            fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, horasEstimadas: t.horas, responsableId, recursoId: t.recursoId,
            catalogoServicioId: t.catalogoServicioId, updatedAt: ahora,
          },
        })
      }
      for (const t of p.tareas) {
        if (t.pred === null) continue
        await tx.proyectoDependenciasTarea.create({
          data: { id: randomUUID(), tareaOrigenId: p.tareas[t.pred].id, tareaDependienteId: t.id, tipo: 'finish_to_start', lagMinutos: 0, updatedAt: ahora },
        })
      }
    }
  }, { timeout: 60_000 })
  // Fechas hacia arriba (EDT CON y fase).
  for (const p of planes) await recalcularFechasPadresDeTarea(p.tareas[0].id)
  console.log(`✓ ${planes.length} actividad(es) creada(s) en ${proyecto.codigo}.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
