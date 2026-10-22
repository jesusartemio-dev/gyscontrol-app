/**
 * CJM51 — SER: separa "Alquiler de Andamios (1 y 2 cuerpos, pedestal)" en dos alquileres,
 * cada uno anclado a la zona donde se usa:
 *   - Alquiler de Andamios (1 y 2 cuerpos) → Recorrido Eléctrico (MCC a Tanques)
 *   - Alquiler de Andamio Pedestal         → Zona de Bomba
 * Movilización: al inicio del "Armado de Andamios" de su zona (FC hacia él).
 * Desmovilización: al fin del "Desmontaje de Andamios" de su zona (FC desde él).
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/separar-alquiler-andamios-cjm51.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const APLICAR = process.argv.includes('--aplicar')
const ACTUAL = 'Alquiler de Andamios (1 y 2 cuerpos, pedestal)'
const f = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')

const ALQUILERES = [
  { nombre: 'Alquiler de Andamios (1 y 2 cuerpos)', alias: 'Andamios', zona: 'Recorrido' },
  { nombre: 'Alquiler de Andamio Pedestal', alias: 'Pedestal', zona: 'Bomba' },
]

async function main() {
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: 'CJM51' } }, select: { id: true } })
  const act = await prisma.proyectoActividad.findFirstOrThrow({
    where: { proyectoCronogramaId: cron.id, nombre: ACTUAL },
    include: { proyectoTarea: { orderBy: { orden: 'asc' } }, proyectoEdt: { select: { id: true, proyectoFaseId: true } } },
  })
  const con = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: cron.id, proyectoEdt: { edt: { nombre: 'CON' } } }, select: { id: true, nombre: true, fechaInicio: true, fechaFin: true } })
  const tareaCon = (zona: string, que: string) => {
    const t = con.find(x => x.nombre === `${zona} - ${que} de Andamios`)
    if (!t) throw new Error(`Falta "${zona} - ${que} de Andamios" en CON`)
    return t
  }
  const viejas = act.proyectoTarea
  const deps = await prisma.proyectoDependenciasTarea.findMany({ where: { OR: [{ tareaOrigenId: { in: viejas.map(t => t.id) } }, { tareaDependienteId: { in: viejas.map(t => t.id) } }] } })

  const plan = ALQUILERES.map((a, i) => {
    const armado = tareaCon(a.zona, 'Armado')
    const desmontaje = tareaCon(a.zona, 'Desmontaje')
    const tareas = viejas.map(v => {
      const esMov = /Movilizaci/.test(v.nombre)
      const esDesmov = /Desmovilizaci/.test(v.nombre)
      const fecha = esMov ? armado.fechaInicio : esDesmov ? desmontaje.fechaFin : null
      return { ...v, id: randomUUID(), nombre: `${a.alias} - ${v.nombre}`, fechaInicio: fecha ?? v.fechaInicio, fechaFin: fecha ?? v.fechaFin, esMov, esDesmov }
    })
    return { ...a, id: randomUUID(), orden: act.orden + i, armado, desmontaje, tareas }
  })

  console.log(`CJM51 SER: "${ACTUAL}" → 2 alquileres`)
  for (const p of plan) {
    console.log(`+ ${p.nombre}`)
    for (const t of p.tareas) console.log(`    ${t.esHito ? '◆ ' : ''}${t.nombre.padEnd(52)} ${f(t.fechaInicio)}${t.esMov ? `  → ${p.armado.nombre}` : t.esDesmov ? `  ← ${p.desmontaje.nombre}` : ''}`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-alquiler-andamios-CJM51-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ act, deps }, null, 2))
  await prisma.$transaction(async tx => {
    await tx.proyectoTarea.deleteMany({ where: { id: { in: viejas.map(t => t.id) } } })
    await tx.proyectoActividad.delete({ where: { id: act.id } })
    await tx.proyectoActividad.updateMany({ where: { proyectoEdtId: act.proyectoEdtId, orden: { gt: act.orden } }, data: { orden: { increment: 1 } } })
    for (const p of plan) {
      await tx.proyectoActividad.create({ data: {
        id: p.id, proyectoEdtId: act.proyectoEdtId, proyectoCronogramaId: cron.id, nombre: p.nombre, orden: p.orden, responsableId: act.responsableId,
        fechaInicioPlan: p.tareas[0].fechaInicio, fechaFinPlan: p.desmontaje.fechaFin, horasPlan: act.horasPlan, updatedAt: ahora,
      } })
      await tx.proyectoTarea.createMany({ data: p.tareas.map(t => ({
        id: t.id, proyectoEdtId: t.proyectoEdtId, proyectoActividadId: p.id, proyectoCronogramaId: cron.id, nombre: t.nombre, orden: t.orden,
        fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, horasEstimadas: t.horasEstimadas, esHito: t.esHito,
        catalogoServicioId: t.catalogoServicioId, recursoId: t.recursoId, responsableId: t.responsableId, updatedAt: ahora,
      })) })
      const fc = (a: string, b: string) => ({ id: randomUUID(), tareaOrigenId: a, tareaDependienteId: b, tipo: 'finish_to_start' as const, lagMinutos: 0 })
      const mov = p.tareas.find(t => t.esMov)!
      const desmov = p.tareas.find(t => t.esDesmov)!
      await tx.proyectoDependenciasTarea.createMany({ data: [
        ...p.tareas.slice(1).filter(t => !t.esDesmov).map((t, k) => fc(p.tareas[k].id, t.id)), // Solicitud → OC → Movilización
        fc(mov.id, p.armado.id),
        fc(p.desmontaje.id, desmov.id),
      ] })
    }
  })
  for (const p of plan) await recalcularActividadPadre(p.id)
  await recalcularEdtPadre(act.proyectoEdtId)
  if (act.proyectoEdt.proyectoFaseId) await recalcularFasePadre(act.proyectoEdt.proyectoFaseId)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
