/**
 * Aprobación del cliente en PRO (equipos e instrumentos):
 *  - Catálogo PRO (si faltan): "Recepción de Cotizaciones" (1 h), "Evaluación Técnica" (2 h)
 *    y "Aprobación del Cliente" (hito, etiqueta "Hito"), justo después de la Solicitud de
 *    Cotización. El generador los pone solo en familias de equipos/instrumentos
 *    (src/lib/cronogramaIA/aprobacionClientePro.ts).
 *  - --proyecto=COD --actividad="…" (repetible): en esas actividades de PRO de la Línea Base
 *    inserta Recepción (2 días) → Evaluación (1 día) → ◆ Aprobación por {CLIENTE} entre la
 *    Solicitud y la OC, con dependencias FC. No mueve el resto: después correr
 *    ajustar-cronograma-dependencias.ts para empujar las OC y lo que sigue.
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/aprobacion-cliente-pro.ts [--proyecto=CJM51 --actividad="…"] [--solo-proyecto] [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { finJornada, inicioJornada, siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { nombreHitoAprobacion, SERVICIO_APROBACION_CLIENTE, SERVICIO_EVALUACION_TECNICA, SERVICIO_RECEPCION_COTIZACIONES } from '../src/lib/cronogramaIA/aprobacionClientePro'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const SOLO_PROYECTO = args.includes('--solo-proyecto')
const PROYECTO = args.find(a => a.startsWith('--proyecto='))?.split('=')[1]
const ACTIVIDADES = args.filter(a => a.startsWith('--actividad=')).map(a => a.slice('--actividad='.length))
const f = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')

const NUEVOS = [
  { nombre: SERVICIO_RECEPCION_COTIZACIONES, horas: 1, tags: [] as string[], descripcion: 'Espera y recepción de las cotizaciones de proveedores (equipos e instrumentos).' },
  { nombre: SERVICIO_EVALUACION_TECNICA, horas: 2, tags: [] as string[], descripcion: 'Evaluación técnica de las ofertas antes de pedir la aprobación del cliente.' },
  { nombre: SERVICIO_APROBACION_CLIENTE, horas: 0, tags: ['Hito'], descripcion: '[Hito] Aprobación técnica del cliente del equipo/instrumento antes de emitir la OC. El generador lo nombra "Aprobación por {cliente}".' },
]

async function main() {
  // ── Catálogo ──
  const pro = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'PRO' }, include: { catalogoServicio: { orderBy: { orden: 'asc' } } } })
  const solicitud = pro.catalogoServicio.find(s => s.nombre === 'Solicitud de Cotización')!
  const faltan = NUEVOS.filter(n => !pro.catalogoServicio.some(s => s.nombre === n.nombre))
  console.log(SOLO_PROYECTO ? 'Catálogo: sin cambios (--solo-proyecto)' : faltan.length
    ? `+ Catálogo PRO tras "Solicitud de Cotización" (orden ${solicitud.orden}): ${faltan.map(n => n.nombre).join(', ')} · el resto se corre +${faltan.length}`
    : 'Catálogo PRO: ya tiene los 3 servicios')

  // ── Proyecto ──
  type Plan = { actividad: string; solicitudId: string; siguienteId: string | null; responsableId: string | null; ordenDesde: number; prefijo: string; tareas: { nombre: string; servicio: string; horas: number; inicio: Date; fin: Date; hito: boolean; id: string }[] }
  const planes: Plan[] = []
  let cron: { id: string; proyectoId: string } | null = null
  if (PROYECTO) {
    cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: PROYECTO } }, select: { id: true, proyectoId: true } })
    const proyecto = await prisma.proyecto.findUniqueOrThrow({ where: { id: cron.proyectoId }, select: { cliente: { select: { nombre: true } } } })
    const cal = await obtenerCalendarioProyecto(cron.proyectoId)
    const acts = await prisma.proyectoActividad.findMany({
      where: { proyectoCronogramaId: cron.id, nombre: { in: ACTIVIDADES }, proyectoEdt: { edt: { nombre: 'PRO' } } },
      include: { proyectoTarea: { orderBy: { orden: 'asc' } } },
    })
    const faltantes = ACTIVIDADES.filter(n => !acts.some(a => a.nombre === n))
    if (faltantes.length) throw new Error(`No existen en PRO: ${faltantes.join(', ')}`)
    for (const a of acts) {
      if (a.proyectoTarea.some(t => t.nombre.includes('Aprobación'))) throw new Error(`"${a.nombre}" ya tiene aprobación`)
      const iSol = a.proyectoTarea.findIndex(t => t.nombre.endsWith('Solicitud de Cotización'))
      if (iSol < 0) throw new Error(`"${a.nombre}" no tiene Solicitud de Cotización`)
      const sol = a.proyectoTarea[iSol]
      const prefijo = sol.nombre.slice(0, sol.nombre.length - 'Solicitud de Cotización'.length)
      // Recepción: 2 días laborables · Evaluación: 1 día · ◆ al terminar la evaluación.
      const d1 = siguienteMomentoLaborable(cal, sol.fechaFin)
      const recFin = finJornada(cal, siguienteMomentoLaborable(cal, finJornada(cal, d1)))
      const evaIni = siguienteMomentoLaborable(cal, recFin)
      const evaFin = finJornada(cal, evaIni)
      planes.push({
        actividad: a.nombre, solicitudId: sol.id, siguienteId: a.proyectoTarea[iSol + 1]?.id ?? null, responsableId: sol.responsableId,
        ordenDesde: sol.orden + 1, prefijo,
        tareas: [
          { nombre: `${prefijo}${SERVICIO_RECEPCION_COTIZACIONES}`, servicio: SERVICIO_RECEPCION_COTIZACIONES, horas: 1, inicio: inicioJornada(cal, d1), fin: recFin, hito: false, id: randomUUID() },
          { nombre: `${prefijo}${SERVICIO_EVALUACION_TECNICA}`, servicio: SERVICIO_EVALUACION_TECNICA, horas: 2, inicio: inicioJornada(cal, evaIni), fin: evaFin, hito: false, id: randomUUID() },
          { nombre: `${prefijo}${nombreHitoAprobacion(proyecto.cliente?.nombre)}`, servicio: SERVICIO_APROBACION_CLIENTE, horas: 0, inicio: evaFin, fin: evaFin, hito: true, id: randomUUID() },
        ],
      })
    }
    for (const p of planes) {
      console.log(`\n${PROYECTO} · ${p.actividad}`)
      for (const t of p.tareas) console.log(`  + ${t.hito ? '◆ ' : ''}${t.nombre.padEnd(60)} ${f(t.inicio)} → ${f(t.fin)}  ${t.horas} h`)
    }
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  if (!SOLO_PROYECTO && faltan.length) {
    await prisma.$transaction([
      ...pro.catalogoServicio.filter(s => (s.orden ?? 0) > (solicitud.orden ?? 0)).map(s =>
        prisma.catalogoServicio.update({ where: { id: s.id }, data: { orden: (s.orden ?? 0) + faltan.length, updatedAt: ahora } })),
      ...faltan.map((n, i) => prisma.catalogoServicio.create({ data: {
        id: randomUUID(), categoriaId: pro.id, unidadServicioId: solicitud.unidadServicioId, recursoId: solicitud.recursoId,
        nombre: n.nombre, descripcion: n.descripcion, horaBase: n.horas, horaRepetido: 0, orden: (solicitud.orden ?? 0) + 1 + i,
        cantidad: 1, nivelDificultad: 1, actividadTag: n.tags, filtroAlcance: 'general', updatedAt: ahora,
      } })),
    ])
  }
  if (cron && planes.length) {
    const servicios = await prisma.catalogoServicio.findMany({ where: { categoriaId: pro.id }, select: { id: true, nombre: true, recursoId: true } })
    fs.writeFileSync(`scripts/respaldo-aprobacion-${PROYECTO}-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(planes, null, 2))
    const actIds: string[] = []
    await prisma.$transaction(async tx => {
      for (const p of planes) {
        const act = await tx.proyectoActividad.findFirstOrThrow({ where: { proyectoCronogramaId: cron!.id, nombre: p.actividad }, select: { id: true, proyectoEdtId: true } })
        actIds.push(act.id)
        await tx.proyectoTarea.updateMany({ where: { proyectoActividadId: act.id, orden: { gte: p.ordenDesde } }, data: { orden: { increment: 3 } } })
        await tx.proyectoTarea.createMany({ data: p.tareas.map((t, i) => {
          const s = servicios.find(x => x.nombre === t.servicio)
          return {
            id: t.id, proyectoEdtId: act.proyectoEdtId, proyectoActividadId: act.id, proyectoCronogramaId: cron!.id, nombre: t.nombre,
            orden: p.ordenDesde + i, fechaInicio: t.inicio, fechaFin: t.fin, horasEstimadas: t.horas, esHito: t.hito,
            catalogoServicioId: s?.id ?? null, recursoId: s?.recursoId ?? null, responsableId: p.responsableId, updatedAt: ahora,
          }
        }) })
        if (p.siguienteId) await tx.proyectoDependenciasTarea.deleteMany({ where: { tareaOrigenId: p.solicitudId, tareaDependienteId: p.siguienteId } })
        const cadena = [p.solicitudId, ...p.tareas.map(t => t.id), ...(p.siguienteId ? [p.siguienteId] : [])]
        await tx.proyectoDependenciasTarea.createMany({
          data: cadena.slice(1).map((id, i) => ({ id: randomUUID(), tareaOrigenId: cadena[i], tareaDependienteId: id, tipo: 'finish_to_start' as const, lagMinutos: 0 })),
          skipDuplicates: true,
        })
      }
    })
    for (const id of actIds) await recalcularActividadPadre(id)
    const edt = await prisma.proyectoEdt.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, edt: { nombre: 'PRO' } }, select: { id: true, proyectoFaseId: true } })
    await recalcularEdtPadre(edt.id)
    if (edt.proyectoFaseId) await recalcularFasePadre(edt.proyectoFaseId)
  }
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
