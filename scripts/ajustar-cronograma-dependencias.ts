/**
 * "Ajustar sucesoras" de todo un cronograma, en orden topológico: cada tarea con
 * predecesoras se mueve a donde las exigen (tipo + desfase) si hoy empieza ANTES.
 * Nunca la adelanta. Conserva su duración en horas laborables; los días que se
 * volvieron feriado después (--feriados-nuevos) se descuentan del cálculo de la
 * duración original, así la tarea se alarga en vez de acortarse.
 * Tareas con avance real no se mueven (se avisa).
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/ajustar-cronograma-dependencias.ts CJM51 \
 *     [--feriados-nuevos=2026-12-08,2026-12-25] [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre, sumarHorasLaborables } from '../src/lib/services/cronogramaHoras'
import { fechasRequeridas, horasIncumplidas } from '../src/lib/services/cronogramaDependencias'
import { inferirDependencias } from '../src/lib/services/cronogramaInferirDependencias'
import { randomUUID } from 'crypto'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const args = process.argv.slice(2)
const CODIGO = args[0]
const APLICAR = args.includes('--aplicar')
const FERIADOS_NUEVOS = (args.find(a => a.startsWith('--feriados-nuevos='))?.split('=')[1] ?? '').split(',').filter(Boolean)
const f = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')

async function main() {
  if (!CODIGO) throw new Error('Uso: <codigo> [--aplicar]')
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: CODIGO } }, select: { id: true, proyectoId: true, bloqueado: true } })
  if (cron.bloqueado) throw new Error('Cronograma bloqueado')
  const cal = await obtenerCalendarioProyecto(cron.proyectoId)
  // Calendario "de antes" para medir la duración original de tareas que cruzan un feriado nuevo.
  const calAntes = { ...cal, excepcionCalendario: cal.excepcionCalendario.filter(e => !FERIADOS_NUEVOS.includes(new Date(e.fecha).toISOString().slice(0, 10))) }

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cron.id },
    select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, esHito: true, horasReales: true, porcentajeCompletado: true, proyectoActividadId: true, proyectoEdtId: true, proyectoEdt: { select: { edt: { select: { nombre: true } } } } },
  })
  const ids = new Set(tareas.map(t => t.id))
  const deps: { id?: string; tareaOrigenId: string; tareaDependienteId: string; tipo: string; lagMinutos: number }[] =
    (await prisma.proyectoDependenciasTarea.findMany({ where: { tareaDependienteId: { in: [...ids] } } })).filter(d => ids.has(d.tareaOrigenId))

  // ── Vínculos nuevos (antes de ajustar) ──
  const nuevas: typeof deps = []
  // --inferir=EJECUCION,CIERRE: "Generar dependencias desde fechas" en esas fases (se cumplen hoy, no mueven nada).
  const fasesInferir = (args.find(a => a.startsWith('--inferir='))?.split('=')[1] ?? '').split(',').filter(Boolean)
  for (const nombreFase of fasesInferir) {
    const fase = await prisma.proyectoFase.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: nombreFase } })
    const r = await inferirDependencias(cal, cron.id, { tipo: 'fase', id: fase.id })
    for (const p of r.propuestas) nuevas.push({ tareaOrigenId: p.origenId, tareaDependienteId: p.dependienteId, tipo: p.tipo, lagMinutos: p.lagMinutos })
    console.log(`Inferidas en ${nombreFase}: ${r.propuestas.length}${r.avisos.length ? ` · avisos: ${r.avisos.join(' | ')}` : ''}`)
  }
  // --enlace=CON>CMM: la tarea que termina último en CON → cada tarea de CMM sin predecesoras (FC).
  for (const e of args.filter(a => a.startsWith('--enlace=')).map(a => a.slice('--enlace='.length).split('>'))) {
    const [de, a] = e
    const deTareas = tareas.filter(t => t.proyectoEdt?.edt?.nombre === de)
    const ultima = deTareas.reduce((x, y) => (y.fechaFin > x.fechaFin ? y : x))
    const conPred = new Set([...deps, ...nuevas].map(d => d.tareaDependienteId))
    const destino = tareas.filter(t => t.proyectoEdt?.edt?.nombre === a && !conPred.has(t.id))
    for (const t of destino) nuevas.push({ tareaOrigenId: ultima.id, tareaDependienteId: t.id, tipo: 'finish_to_start', lagMinutos: 0 })
    console.log(`Enlace ${de}>${a}: "${ultima.nombre}" → ${destino.map(t => t.nombre).join(', ') || '(ninguna sin predecesoras)'}`)
  }
  deps.push(...nuevas)
  const porId = new Map(tareas.map(t => [t.id, { ...t, inicio: t.fechaInicio, fin: t.fechaFin }]))
  const predsDe = new Map<string, typeof deps>()
  for (const d of deps) predsDe.set(d.tareaDependienteId, [...(predsDe.get(d.tareaDependienteId) ?? []), d])

  // Orden topológico (Kahn)
  const grado = new Map(tareas.map(t => [t.id, 0]))
  for (const d of deps) grado.set(d.tareaDependienteId, grado.get(d.tareaDependienteId)! + 1)
  const cola = tareas.filter(t => grado.get(t.id) === 0).map(t => t.id)
  const sucDe = new Map<string, string[]>()
  for (const d of deps) sucDe.set(d.tareaOrigenId, [...(sucDe.get(d.tareaOrigenId) ?? []), d.tareaDependienteId])
  const orden: string[] = []
  while (cola.length) {
    const id = cola.shift()!
    orden.push(id)
    for (const s of sucDe.get(id) ?? []) { grado.set(s, grado.get(s)! - 1); if (grado.get(s) === 0) cola.push(s) }
  }
  if (orden.length !== tareas.length) throw new Error('Hay un ciclo de dependencias')

  const cambios: { id: string; nombre: string; edt: string; antes: [Date, Date]; despues: [Date, Date]; motivo: string }[] = []
  const bloqueadas: string[] = []
  for (const id of orden) {
    const t = porId.get(id)!
    const dur = t.esHito ? 0 : horasLaborablesEntre(calAntes, t.fechaInicio, t.fechaFin)
    let inicio = t.inicio
    let motivo = ''
    for (const d of predsDe.get(id) ?? []) {
      const p = porId.get(d.tareaOrigenId)!
      // Misma regla que el aviso "no se cumple": 18:30 de un día = 08:00 del siguiente.
      if (horasIncumplidas(cal, d, { inicio: p.inicio, fin: p.fin }, { inicio, fin: sumarHorasLaborables(cal, inicio, dur) }) > 0) {
        inicio = fechasRequeridas(cal, d, { inicio: p.inicio, fin: p.fin }, dur).inicio
        motivo = `← ${p.nombre}`
      }
    }
    const movida = inicio.getTime() !== t.fechaInicio.getTime()
    const cruzaFeriadoNuevo = !t.esHito && horasLaborablesEntre(cal, t.fechaInicio, t.fechaFin) < dur
    if (!movida && !cruzaFeriadoNuevo) continue
    const fin = t.esHito ? inicio : sumarHorasLaborables(cal, inicio, dur)
    {
      if (Number(t.horasReales) > 0 || t.porcentajeCompletado > 0) { bloqueadas.push(t.nombre); continue }
      t.inicio = inicio; t.fin = fin
      cambios.push({ id, nombre: t.nombre, edt: t.proyectoEdt?.edt?.nombre ?? '?', antes: [t.fechaInicio, t.fechaFin], despues: [inicio, fin], motivo: motivo || '(feriado en su rango)' })
    }
  }

  console.log(`${CODIGO}: ${tareas.length} tareas, ${deps.length} dependencias (${nuevas.length} nuevas) · se mueven ${cambios.length}`)
  for (const c of cambios) console.log(`  [${c.edt}] ${c.nombre.padEnd(52)} ${f(c.antes[0])} → ${f(c.despues[0])}  (fin ${f(c.antes[1])} → ${f(c.despues[1])})  ${c.motivo}`)
  if (bloqueadas.length) console.log(`⚠ Con avance, no se mueven: ${bloqueadas.join(', ')}`)
  // Tareas sin predecesoras que quedan antes del fin de la fase anterior (no se tocan: falta el vínculo).
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-ajuste-${CODIGO}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(cambios, null, 2))
  const ahora = new Date()
  await prisma.$transaction([
    prisma.proyectoDependenciasTarea.createMany({
      data: nuevas.map(d => ({ id: randomUUID(), tareaOrigenId: d.tareaOrigenId, tareaDependienteId: d.tareaDependienteId, tipo: d.tipo as 'finish_to_start', lagMinutos: d.lagMinutos })),
      skipDuplicates: true,
    }),
    ...cambios.map(c => prisma.proyectoTarea.update({ where: { id: c.id }, data: { fechaInicio: c.despues[0], fechaFin: c.despues[1], updatedAt: ahora } })),
  ], { timeout: 60_000 })
  const acts = new Set(tareas.map(t => t.proyectoActividadId).filter((x): x is string => !!x))
  for (const a of acts) await recalcularActividadPadre(a)
  const edts = await prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cron.id }, select: { id: true, proyectoFaseId: true } })
  for (const e of edts) await recalcularEdtPadre(e.id)
  for (const fid of new Set(edts.map(e => e.proyectoFaseId).filter((x): x is string => !!x))) await recalcularFasePadre(fid)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
