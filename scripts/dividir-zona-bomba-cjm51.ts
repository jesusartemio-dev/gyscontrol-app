/**
 * CJM51 — CON: divide "Zona de Bomba en Tanques" en dos actividades:
 *   Previos - Zona de Bomba (con andamio pedestal):
 *     Armado de Andamios → Fabricación de soportes → Montaje de soportes → Bandejas y conduit
 *     → Tendido de Cables → Desmontaje de Andamios (→ Pedestal - Desmovilización)
 *   Zona de Bomba (al final; sin andamio):
 *     Instalación de instrumentos (← fin de Previos, ← Traslado 3: En Obra, ← ◆ Bomba instalada)
 *     → Conexionado (← también Tendido) → Etiquetado (→ Comisionamiento)
 * + ◆ "Bomba instalada (contrata del cliente)" en CTL › Hitos del Cliente, fecha provisional
 *   al fin de Previos (el gestor pone la real).
 * No mueve fechas: después correr ajustar-cronograma-dependencias.ts.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/dividir-zona-bomba-cjm51.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre, siguienteMomentoLaborable, sumarHorasLaborables } from '../src/lib/services/cronogramaHoras'

const f = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')
const APLICAR = process.argv.includes('--aplicar')
const ACTUAL = 'Zona de Bomba en Tanques'
const HITO = 'Bomba instalada (contrata del cliente)'
const PREVIOS = ['Armado de Andamios', 'Fabricación de soportes en taller', 'Montaje de soportes y estructuras', 'Instalación de bandejas y tuberías conduit', 'Tendido de Cables', 'Desmontaje de Andamios']
const ZONA = ['Instalación de instrumentos de campo', 'Conexionado de conductores y dispositivos', 'Etiquetado de cables y equipos']

async function main() {
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: 'CJM51' } }, select: { id: true } })
  const act = await prisma.proyectoActividad.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: ACTUAL }, include: { proyectoTarea: true } })
  const t = (n: string) => {
    const x = act.proyectoTarea.find(y => y.nombre === `Bomba - ${n}`)
    if (!x) throw new Error(`Falta "Bomba - ${n}"`)
    return x
  }
  const ids = act.proyectoTarea.map(x => x.id)
  const deps = await prisma.proyectoDependenciasTarea.findMany({
    where: { OR: [{ tareaOrigenId: { in: ids } }, { tareaDependienteId: { in: ids } }] },
    include: { tareaOrigen: { select: { nombre: true } }, tareaDependiente: { select: { nombre: true } } },
  })
  const hitosCliente = await prisma.proyectoActividad.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'Hitos del Cliente' }, include: { proyectoTarea: true } })
  if (hitosCliente.proyectoTarea.some(x => x.nombre === HITO)) throw new Error('El hito ya existe')
  const precom = await prisma.proyectoTarea.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'Pruebas Eléctricas de Precomisionamiento' }, select: { id: true, nombre: true } })

  const quitar = [
    [t('Instalación de instrumentos de campo'), t('Tendido de Cables')],
    [t('Etiquetado de cables y equipos'), t('Desmontaje de Andamios')],
  ]
  const hitoId = randomUUID()
  const agregar: [string, string, string, string][] = [
    [t('Instalación de bandejas y tuberías conduit').id, t('Tendido de Cables').id, 'Bandejas y conduit', 'Tendido de Cables'],
    [t('Tendido de Cables').id, t('Desmontaje de Andamios').id, 'Tendido de Cables', 'Desmontaje de Andamios'],
    [t('Desmontaje de Andamios').id, t('Instalación de instrumentos de campo').id, 'fin de Previos (Desmontaje)', 'Instalación de instrumentos'],
    [hitoId, t('Instalación de instrumentos de campo').id, `◆ ${HITO}`, 'Instalación de instrumentos'],
    [t('Instalación de instrumentos de campo').id, t('Conexionado de conductores y dispositivos').id, 'Instalación de instrumentos', 'Conexionado'],
    [t('Etiquetado de cables y equipos').id, precom.id, 'Etiquetado', precom.nombre],
  ]
  // Reprogramación en cadena (FC) de las dos actividades, conservando la duración de cada tarea:
  // Previos desde el armado de hoy; Zona de Bomba al terminar Previos y con los instrumentos en obra.
  const cal = await obtenerCalendarioProyecto((await prisma.proyectoCronograma.findUniqueOrThrow({ where: { id: cron.id }, select: { proyectoId: true } })).proyectoId)
  const traslado3 = await prisma.proyectoTarea.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'Traslado 3: En Obra' }, select: { fechaFin: true } })
  const nuevasFechas = new Map<string, { inicio: Date; fin: Date }>()
  let cursor = t(PREVIOS[0]).fechaInicio
  for (const [i, n] of [...PREVIOS, ...ZONA].entries()) {
    const x = t(n)
    const dur = horasLaborablesEntre(cal, x.fechaInicio, x.fechaFin)
    if (i > 0) cursor = siguienteMomentoLaborable(cal, cursor)
    if (n === ZONA[0] && traslado3.fechaFin > cursor) cursor = siguienteMomentoLaborable(cal, traslado3.fechaFin)
    const fin = sumarHorasLaborables(cal, cursor, dur)
    nuevasFechas.set(x.id, { inicio: cursor, fin })
    cursor = fin
  }
  const fechaHito = nuevasFechas.get(t('Desmontaje de Andamios').id)!.fin
  for (const n of [...PREVIOS, ...ZONA]) {
    const x = t(n); const nf = nuevasFechas.get(x.id)!
    console.log(`  ${(PREVIOS.includes(n) ? 'Previos' : 'Zona   ')} ${x.nombre.padEnd(52)} ${f(x.fechaInicio)} → ${f(nf.inicio)}   (fin ${f(nf.fin)})`)
  }

  console.log(`CJM51 CON: "${ACTUAL}" →`)
  console.log(`  "Previos - Zona de Bomba": ${PREVIOS.join(' → ')}`)
  console.log(`  "Zona de Bomba":           ${ZONA.join(' → ')}`)
  console.log(`+ ◆ ${HITO} en Hitos del Cliente (provisional ${fechaHito.toISOString().slice(0, 16)})`)
  console.log('− Enlaces:'); for (const [a, b] of quitar) console.log(`    ${a.nombre} → ${b.nombre}`)
  console.log('+ Enlaces:'); for (const [, , a, b] of agregar) console.log(`    ${a} → ${b}`)
  console.log(`= Se mantienen: ${deps.filter(d => !quitar.some(([a, b]) => a.id === d.tareaOrigenId && b.id === d.tareaDependienteId)).map(d => `${d.tareaOrigen.nombre} → ${d.tareaDependiente.nombre}`).join(' | ')}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-zona-bomba-CJM51-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ act, deps }, null, 2))
  const zonaId = randomUUID()
  await prisma.$transaction(async tx => {
    await tx.proyectoActividad.update({ where: { id: act.id }, data: { nombre: 'Previos - Zona de Bomba', updatedAt: ahora } })
    await tx.proyectoActividad.updateMany({ where: { proyectoEdtId: act.proyectoEdtId, orden: { gt: act.orden } }, data: { orden: { increment: 1 } } })
    await tx.proyectoActividad.create({ data: {
      id: zonaId, proyectoEdtId: act.proyectoEdtId, proyectoCronogramaId: cron.id, nombre: 'Zona de Bomba', orden: act.orden + 1,
      responsableId: act.responsableId, fechaInicioPlan: t(ZONA[0]).fechaInicio, fechaFinPlan: t(ZONA[2]).fechaFin, horasPlan: 0, updatedAt: ahora,
    } })
    for (const [i, n] of PREVIOS.entries()) {
      const nf = nuevasFechas.get(t(n).id)!
      await tx.proyectoTarea.update({ where: { id: t(n).id }, data: { orden: i, fechaInicio: nf.inicio, fechaFin: nf.fin, updatedAt: ahora } })
    }
    for (const [i, n] of ZONA.entries()) {
      const nf = nuevasFechas.get(t(n).id)!
      await tx.proyectoTarea.update({ where: { id: t(n).id }, data: { proyectoActividadId: zonaId, orden: i, fechaInicio: nf.inicio, fechaFin: nf.fin, updatedAt: ahora } })
    }
    // El pedestal se devuelve al terminar Previos (su desmontaje), no al final de toda la zona.
    await tx.proyectoTarea.updateMany({ where: { proyectoCronogramaId: cron.id, nombre: 'Pedestal - Desmovilización' }, data: { fechaInicio: fechaHito, fechaFin: fechaHito, updatedAt: ahora } })
    await tx.proyectoTarea.create({ data: {
      id: hitoId, proyectoEdtId: hitosCliente.proyectoEdtId, proyectoActividadId: hitosCliente.id, proyectoCronogramaId: cron.id, nombre: HITO,
      orden: hitosCliente.proyectoTarea.length, fechaInicio: fechaHito, fechaFin: fechaHito, horasEstimadas: 0, esHito: true,
      responsableId: hitosCliente.proyectoTarea[0]?.responsableId ?? hitosCliente.responsableId, recursoId: hitosCliente.proyectoTarea[0]?.recursoId ?? null, updatedAt: ahora,
    } })
    for (const [a, b] of quitar) await tx.proyectoDependenciasTarea.deleteMany({ where: { tareaOrigenId: a.id, tareaDependienteId: b.id } })
    await tx.proyectoDependenciasTarea.createMany({
      data: agregar.map(([a, b]) => ({ id: randomUUID(), tareaOrigenId: a, tareaDependienteId: b, tipo: 'finish_to_start' as const, lagMinutos: 0 })),
      skipDuplicates: true,
    })
  })
  for (const id of [act.id, zonaId, hitosCliente.id]) await recalcularActividadPadre(id)
  const edts = await prisma.proyectoEdt.findMany({ where: { id: { in: [act.proyectoEdtId, hitosCliente.proyectoEdtId] } }, select: { id: true, proyectoFaseId: true } })
  for (const e of edts) await recalcularEdtPadre(e.id)
  for (const e of edts) if (e.proyectoFaseId) await recalcularFasePadre(e.proyectoFaseId)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
