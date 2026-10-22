/**
 * Alquiler de equipos (andamios, manlift…): GYS lo usa/arma, así que lleva OC y
 * solo lo que importa para el cronograma. Distinto de un subcontrato (servicio de
 * un tercero), que sigue con su flujo completo y Orden de Servicio.
 *
 *  - Catálogo SER, pasos de ALQUILER:
 *      Solicitud y Evaluación de Cotizaciones (3 h) → Emisión de Orden de Compra (1 h)
 *      → ◆ Movilización a Obra → ◆ Desmovilización
 *    Los pasos largos (Solicitud, Recepción, Evaluación, Orden de Servicio, Desmovilización 1 h)
 *    quedan solo para SUBCONTRATO.
 *  - --proyecto=COD --actividad="Nombre": reemplaza TODAS las actividades de alquiler de SER
 *    del proyecto por una sola con esos 4 pasos. Los hitos se anclan a CON: Movilización al
 *    inicio del primer "Armado de Andamios", Desmovilización al fin del último "Desmontaje".
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/alquileres-ser.ts [--proyecto=CJM51 --actividad="Alquiler de Andamios (…)"] [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { finJornada, inicioJornada, siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const PROYECTO = args.find(a => a.startsWith('--proyecto='))?.split('=')[1]
const ACTIVIDAD = args.find(a => a.startsWith('--actividad='))?.slice('--actividad='.length)
const f = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')
const sinAlquiler = (tags: string[]) => tags.filter(t => t.toLowerCase() !== 'alquiler')

async function main() {
  // ── Catálogo SER ──
  const ser = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'SER' }, include: { catalogoServicio: { orderBy: { orden: 'asc' } } } })
  const porNombre = (n: string) => ser.catalogoServicio.filter(s => s.nombre === n)
  const solicitud = porNombre('Solicitud de Cotización')[0]
  const ordenServicio = porNombre('Emisión de Orden de Servicio')[0]
  const movilizacion = porNombre('Movilización a Obra')[0]
  const desmovSub = porNombre('Desmovilización').find(s => !s.actividadTag.includes('Hito'))!
  const yaMigrado = porNombre('Solicitud y Evaluación de Cotizaciones').length > 0
  const quitarAlquiler = ser.catalogoServicio.filter(s => s.id !== movilizacion.id && s.actividadTag.some(t => t.toLowerCase() === 'alquiler') && !yaMigrado)
  console.log(yaMigrado ? 'Catálogo SER: ya tiene el flujo corto de alquiler' : [
    'Catálogo SER (alquiler):',
    `  − solo Subcontrato: ${quitarAlquiler.map(s => s.nombre).join(', ')}`,
    '  + Solicitud y Evaluación de Cotizaciones (3 h) · Emisión de Orden de Compra (1 h) · Desmovilización (hito)',
    '  ~ Movilización a Obra pasa a hito (0 h)',
  ].join('\n'))

  // ── Proyecto ──
  let plan: null | {
    cron: { id: string; proyectoId: string }; serEdt: { id: string; proyectoFaseId: string | null; responsableId: string | null }
    quitar: { id: string; nombre: string; tareas: string[] }[]; inicio: Date
    mov: Date; desmov: Date; armados: { id: string; nombre: string }[]; desmontajes: { id: string; nombre: string }[]
  } = null
  if (PROYECTO) {
    if (!ACTIVIDAD) throw new Error('Falta --actividad="Nombre"')
    const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: PROYECTO } }, select: { id: true, proyectoId: true } })
    const cal = await obtenerCalendarioProyecto(cron.proyectoId)
    const serEdt = await prisma.proyectoEdt.findFirstOrThrow({
      where: { proyectoCronogramaId: cron.id, edt: { nombre: 'SER' } },
      select: { id: true, proyectoFaseId: true, responsableId: true, proyectoActividad: { include: { proyectoTarea: true } } },
    })
    const quitar = serEdt.proyectoActividad.filter(a => a.proyectoTarea.some(t => /Movilizaci/.test(t.nombre)))
    const conAvance = quitar.flatMap(a => a.proyectoTarea).filter(t => Number(t.horasReales) > 0 || t.porcentajeCompletado > 0)
    if (conAvance.length) throw new Error(`Con horas o avance: ${conAvance.map(t => t.nombre).join(', ')}`)
    const con = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: cron.id, proyectoEdt: { edt: { nombre: 'CON' } } }, select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } })
    const armados = con.filter(t => /Armado de Andamios/i.test(t.nombre))
    const desmontajes = con.filter(t => /Desmontaje de Andamios/i.test(t.nombre))
    if (!armados.length || !desmontajes.length) throw new Error('CON no tiene Armado/Desmontaje de Andamios')
    const inicio = inicioJornada(cal, siguienteMomentoLaborable(cal, quitar.flatMap(a => a.proyectoTarea).reduce((a, b) => (b.fechaInicio < a.fechaInicio ? b : a)).fechaInicio))
    plan = {
      cron, serEdt, quitar: quitar.map(a => ({ id: a.id, nombre: a.nombre, tareas: a.proyectoTarea.map(t => t.id) })), inicio,
      mov: armados.reduce((a, b) => (b.fechaInicio < a.fechaInicio ? b : a)).fechaInicio,
      desmov: desmontajes.reduce((a, b) => (b.fechaFin > a.fechaFin ? b : a)).fechaFin,
      armados, desmontajes,
    }
    const ocIni = inicioJornada(cal, siguienteMomentoLaborable(cal, finJornada(cal, inicio)))
    console.log(`\n${PROYECTO}: quitar ${quitar.map(a => `${a.nombre} (${a.proyectoTarea.length})`).join(', ')}`)
    console.log(`+ ${ACTIVIDAD}`)
    console.log(`    Solicitud y Evaluación de Cotizaciones   ${f(inicio)} → ${f(finJornada(cal, inicio))}  3 h`)
    console.log(`    Emisión de Orden de Compra               ${f(ocIni)} → ${f(finJornada(cal, ocIni))}  1 h`)
    console.log(`    ◆ Movilización a Obra                    ${f(plan.mov)}  → antes de: ${armados.map(t => t.nombre).join(', ')}`)
    console.log(`    ◆ Desmovilización                        ${f(plan.desmov)}  ← después de: ${desmontajes.map(t => t.nombre).join(', ')}`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  let ids = { solEval: '', oc: '', mov: movilizacion.id, desmov: '' }
  if (!yaMigrado) {
    ids = { solEval: randomUUID(), oc: randomUUID(), mov: movilizacion.id, desmov: randomUUID() }
    const base = { categoriaId: ser.id, unidadServicioId: solicitud.unidadServicioId, recursoId: solicitud.recursoId, horaRepetido: 0, cantidad: 1, nivelDificultad: 1, filtroAlcance: 'general' as const, updatedAt: ahora }
    await prisma.$transaction([
      ...quitarAlquiler.map(s => prisma.catalogoServicio.update({ where: { id: s.id }, data: { actividadTag: sinAlquiler(s.actividadTag), updatedAt: ahora } })),
      prisma.catalogoServicio.update({ where: { id: movilizacion.id }, data: { actividadTag: ['Alquiler', 'Hito'], horaBase: 0, updatedAt: ahora } }),
      prisma.catalogoServicio.create({ data: { ...base, id: ids.solEval, nombre: 'Solicitud y Evaluación de Cotizaciones', horaBase: 3, orden: solicitud.orden, actividadTag: ['Alquiler'], descripcion: 'Alquiler de equipos: pedir, recibir y evaluar cotizaciones en un solo paso.' } }),
      prisma.catalogoServicio.create({ data: { ...base, id: ids.oc, nombre: 'Emisión de Orden de Compra', horaBase: 1, orden: ordenServicio.orden, actividadTag: ['Alquiler'], descripcion: 'Alquiler de equipos: OC al proveedor (no es servicio de terceros).' } }),
      prisma.catalogoServicio.create({ data: { ...base, id: ids.desmov, nombre: 'Desmovilización', horaBase: 0, orden: desmovSub.orden, actividadTag: ['Alquiler', 'Hito'], descripcion: '[Hito] Devolución del equipo alquilado; se ancla al fin del último desmontaje en obra.' } }),
    ])
  } else {
    ids.solEval = porNombre('Solicitud y Evaluación de Cotizaciones')[0].id
    ids.oc = porNombre('Emisión de Orden de Compra')[0].id
    ids.desmov = porNombre('Desmovilización').find(s => s.actividadTag.includes('Hito'))!.id
  }

  if (plan) {
    const p = plan
    const cal = await obtenerCalendarioProyecto(p.cron.proyectoId)
    fs.writeFileSync(`scripts/respaldo-alquileres-${PROYECTO}-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(p, null, 2))
    const actId = randomUUID()
    const t = { sol: randomUUID(), oc: randomUUID(), mov: randomUUID(), desmov: randomUUID() }
    const ocIni = inicioJornada(cal, siguienteMomentoLaborable(cal, finJornada(cal, p.inicio)))
    const recursoGestor = (await prisma.catalogoServicio.findUniqueOrThrow({ where: { id: ids.oc }, select: { recursoId: true } })).recursoId
    await prisma.$transaction(async tx => {
      await tx.proyectoTarea.deleteMany({ where: { id: { in: p.quitar.flatMap(a => a.tareas) } } })
      await tx.proyectoActividad.deleteMany({ where: { id: { in: p.quitar.map(a => a.id) } } })
      await tx.proyectoActividad.create({ data: {
        id: actId, proyectoEdtId: p.serEdt.id, proyectoCronogramaId: p.cron.id, nombre: ACTIVIDAD!, orden: 0, responsableId: p.serEdt.responsableId,
        fechaInicioPlan: p.inicio, fechaFinPlan: p.desmov, horasPlan: 4, updatedAt: ahora,
      } })
      const fila = (id: string, nombre: string, orden: number, ini: Date, fin: Date, horas: number, servicio: string, hito = false) => ({
        id, proyectoEdtId: p.serEdt.id, proyectoActividadId: actId, proyectoCronogramaId: p.cron.id, nombre, orden, fechaInicio: ini, fechaFin: fin,
        horasEstimadas: horas, esHito: hito, catalogoServicioId: servicio, recursoId: hito ? null : recursoGestor, responsableId: p.serEdt.responsableId, updatedAt: ahora,
      })
      await tx.proyectoTarea.createMany({ data: [
        fila(t.sol, 'Solicitud y Evaluación de Cotizaciones', 0, p.inicio, finJornada(cal, p.inicio), 3, ids.solEval),
        fila(t.oc, 'Emisión de Orden de Compra', 1, ocIni, finJornada(cal, ocIni), 1, ids.oc),
        fila(t.mov, 'Movilización a Obra', 2, p.mov, p.mov, 0, ids.mov, true),
        fila(t.desmov, 'Desmovilización', 3, p.desmov, p.desmov, 0, ids.desmov, true),
      ] })
      const fc = (a: string, b: string) => ({ id: randomUUID(), tareaOrigenId: a, tareaDependienteId: b, tipo: 'finish_to_start' as const, lagMinutos: 0 })
      await tx.proyectoDependenciasTarea.createMany({ data: [
        fc(t.sol, t.oc), fc(t.oc, t.mov),
        ...p.armados.map(a => fc(t.mov, a.id)),
        ...p.desmontajes.map(d => fc(d.id, t.desmov)),
      ] })
    })
    await recalcularActividadPadre(actId)
    await recalcularEdtPadre(p.serEdt.id)
    if (p.serEdt.proyectoFaseId) await recalcularFasePadre(p.serEdt.proyectoFaseId)
  }
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
