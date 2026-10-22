/**
 * Tareas (no hito) con trabajo > 0 y 0 horas laborables entre inicio y fin:
 * Inicio = Fin, o p. ej. 18:30 de un día → 08:00 del siguiente. En el modelo por
 * días eran "de un día"; con duración por horas valen 0 h (DUR "0d") y MS Project
 * las estira según el trabajo.
 *  - por defecto: un día completo en esa fecha (jornada del calendario).
 *  - --duracion-horas: duración = horasEstimadas (3 h → 08:00–11:00), desde el
 *    primer momento laborable de su inicio.
 * Solo cronogramas de planificación y ejecución. Recalcula fechas de los padres.
 * Después conviene correr ajustar-cronograma-dependencias.ts para empujar sucesoras.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/fix-tareas-duracion-cero.ts [--proyecto=CJM51] [--duracion-horas] [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'
import { inicioJornada, finJornada, horasLaborablesEntre, siguienteMomentoLaborable, sumarHorasLaborables, type CalendarioHoras } from '../src/lib/services/cronogramaHoras'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'

const APLICAR = process.argv.includes('--aplicar')
const DURACION_HORAS = process.argv.includes('--duracion-horas')
const PROYECTO = process.argv.find(a => a.startsWith('--proyecto='))?.split('=')[1]
const hm = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')

async function main() {
  const candidatas = await prisma.proyectoTarea.findMany({
    where: {
      esHito: false, horasEstimadas: { gt: 0 },
      proyectoCronograma: { tipo: { in: ['planificacion', 'ejecucion'] }, ...(PROYECTO && { proyecto: { codigo: PROYECTO } }) },
    },
    select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, horasEstimadas: true, proyectoActividadId: true,
      proyectoCronograma: { select: { tipo: true, proyecto: { select: { id: true, codigo: true } } } } },
  })

  const cals = new Map<string, CalendarioHoras>()
  const tareas = []
  for (const t of candidatas) {
    const pid = t.proyectoCronograma.proyecto.id
    if (!cals.has(pid)) cals.set(pid, await obtenerCalendarioProyecto(pid))
    if (horasLaborablesEntre(cals.get(pid)!, t.fechaInicio, t.fechaFin) === 0) tareas.push(t)
  }

  const cambios = []
  for (const t of tareas) {
    const cal = cals.get(t.proyectoCronograma.proyecto.id)!
    const desde = siguienteMomentoLaborable(cal, t.fechaInicio)
    const inicio = DURACION_HORAS ? desde : inicioJornada(cal, desde)
    const fin = DURACION_HORAS ? sumarHorasLaborables(cal, desde, Number(t.horasEstimadas)) : finJornada(cal, desde)
    const h = horasLaborablesEntre(cal, inicio, fin)
    cambios.push({ id: t.id, nombre: t.nombre, codigo: t.proyectoCronograma.proyecto.codigo, tipo: t.proyectoCronograma.tipo,
      actividadId: t.proyectoActividadId, antes: { inicio: t.fechaInicio, fin: t.fechaFin }, despues: { inicio, fin } })
    console.log(`${t.proyectoCronograma.proyecto.codigo} ${t.proyectoCronograma.tipo.slice(0, 4)} | ${t.nombre.slice(0, 45).padEnd(45)} | ${hm(t.fechaInicio)} → ${hm(t.fechaFin)} (0h)  ⇒  ${hm(inicio)} → ${hm(fin)} (${h}h)${h === 0 ? '  ⚠ día no laborable' : ''}`)
  }
  console.log(`\n${cambios.length} tareas`)
  if (!APLICAR) { console.log('Vista previa. Para aplicar: --aplicar'); return }

  const respaldo = `scripts/respaldo-fix-duracion-cero-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  fs.writeFileSync(respaldo, JSON.stringify(cambios, null, 2))
  console.log(`Respaldo: ${respaldo}`)
  const ahora = new Date()
  await prisma.$transaction(cambios.map(c => prisma.proyectoTarea.update({
    where: { id: c.id }, data: { fechaInicio: c.despues.inicio, fechaFin: c.despues.fin, updatedAt: ahora } })))

  // Rollup de fechas (mín/máx) actividad → EDT → fase, como la API
  const edts = new Set<string>(), fases = new Set<string>()
  for (const id of new Set(cambios.map(c => c.actividadId).filter(Boolean) as string[])) {
    const ts = await prisma.proyectoTarea.findMany({ where: { proyectoActividadId: id }, select: { fechaInicio: true, fechaFin: true } })
    const a = await prisma.proyectoActividad.update({ where: { id }, data: {
      fechaInicioPlan: new Date(Math.min(...ts.map(t => t.fechaInicio.getTime()))),
      fechaFinPlan: new Date(Math.max(...ts.map(t => t.fechaFin.getTime()))), updatedAt: ahora }, select: { proyectoEdtId: true } })
    edts.add(a.proyectoEdtId)
  }
  for (const id of edts) {
    const as = (await prisma.proyectoActividad.findMany({ where: { proyectoEdtId: id }, select: { fechaInicioPlan: true, fechaFinPlan: true } })).filter(a => a.fechaInicioPlan && a.fechaFinPlan)
    if (!as.length) continue
    const e = await prisma.proyectoEdt.update({ where: { id }, data: {
      fechaInicioPlan: new Date(Math.min(...as.map(a => a.fechaInicioPlan!.getTime()))),
      fechaFinPlan: new Date(Math.max(...as.map(a => a.fechaFinPlan!.getTime()))), updatedAt: ahora }, select: { proyectoFaseId: true } })
    if (e.proyectoFaseId) fases.add(e.proyectoFaseId)
  }
  for (const id of fases) {
    const es = (await prisma.proyectoEdt.findMany({ where: { proyectoFaseId: id }, select: { fechaInicioPlan: true, fechaFinPlan: true } })).filter(e => e.fechaInicioPlan && e.fechaFinPlan)
    if (!es.length) continue
    await prisma.proyectoFase.update({ where: { id }, data: {
      fechaInicioPlan: new Date(Math.min(...es.map(e => e.fechaInicioPlan!.getTime()))),
      fechaFinPlan: new Date(Math.max(...es.map(e => e.fechaFinPlan!.getTime()))), updatedAt: ahora } })
  }
  console.log(`Aplicado. Padres: ${edts.size} EDT, ${fases.size} fases.`)
}
main().finally(() => prisma.$disconnect())
