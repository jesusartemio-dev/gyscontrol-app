/**
 * "Hitos del Cliente" (CTL, primera actividad): hitos sin fecha conocida, como
 * las paradas de planta, para colgarles dependencias.
 *  - Catálogo: servicio "Parada de Planta" (CTL, 0 h, etiqueta HitosCliente, orden 0).
 *    El asistente lo genera como hito al inicio de Ejecución (provisional).
 *  - --proyecto=COD --hito="Nombre" [--hito="…"]: agrega la actividad al CTL de la
 *    Línea Base del proyecto con esos hitos, al inicio de Ejecución, primera de CTL.
 * Idempotente. Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/hitos-del-cliente.ts [--proyecto=CJM50 --hito="…"] [--solo-proyecto] [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { resolverOrganigramaProyecto } from '../src/lib/cronogramaResponsables/resolverOrganigrama'
import { recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const PROYECTO = args.find(a => a.startsWith('--proyecto='))?.split('=')[1]
// --solo-proyecto: no toca el catálogo (p. ej. antes de desplegar el generador que lo usa).
const SOLO_PROYECTO = args.includes('--solo-proyecto')
const HITOS = args.filter(a => a.startsWith('--hito=')).map(a => a.slice('--hito='.length))
const ACTIVIDAD = 'Hitos del Cliente'
const f = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-')

async function main() {
  // 1. Catálogo
  const ctl = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'CTL' }, select: { id: true } })
  const existe = await prisma.catalogoServicio.findFirst({ where: { categoriaId: ctl.id, nombre: 'Parada de Planta' }, select: { id: true } })
  console.log(SOLO_PROYECTO ? 'Catálogo: sin cambios (--solo-proyecto)' : existe ? 'Catálogo: "Parada de Planta" ya existe en CTL' : '+ Catálogo: "Parada de Planta" en CTL (hito, 0 h, HitosCliente, orden 0)')

  // 2. Proyecto
  // Los hitos llevan el recurso Gestor, como el servicio del catálogo.
  const gestorRec = await prisma.recurso.findFirstOrThrow({ where: { nombre: 'Gestor' }, select: { id: true } })
  let plan: { cron: { id: string; proyectoId: string }; ctlProy: { id: string; proyectoFaseId: string | null }; fecha: Date; gestor: string | null; actsCtl: { id: string; orden: number }[] } | null = null
  if (PROYECTO) {
    const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo: PROYECTO } }, select: { id: true, proyectoId: true } })
    const ctlProy = await prisma.proyectoEdt.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, edt: { nombre: 'CTL' } }, select: { id: true, proyectoFaseId: true, proyectoActividad: { select: { id: true, nombre: true, orden: true } } } })
    const yaExiste = ctlProy.proyectoActividad.find(a => a.nombre === ACTIVIDAD)
    if (yaExiste) {
      // Ya agregada: solo completa el recurso de los hitos que no lo tengan.
      const sinRecurso = await prisma.proyectoTarea.findMany({ where: { proyectoActividadId: yaExiste.id, recursoId: null }, select: { id: true, nombre: true } })
      console.log(`${PROYECTO} ya tiene "${ACTIVIDAD}": ${sinRecurso.length} hito(s) sin recurso`)
      for (const t of sinRecurso) console.log(`    + recurso Gestor → ${t.nombre}`)
      if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }
      if (sinRecurso.length) {
        await prisma.proyectoTarea.updateMany({ where: { id: { in: sinRecurso.map(t => t.id) } }, data: { recursoId: gestorRec.id, updatedAt: new Date() } })
      }
      console.log('\nAplicado.')
      return
    }
    if (!HITOS.length) throw new Error('Indica al menos un --hito="Nombre"')
    const eje = await prisma.proyectoFase.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'EJECUCION' }, select: { fechaInicioPlan: true } })
    const cal = await obtenerCalendarioProyecto(cron.proyectoId)
    const fecha = siguienteMomentoLaborable(cal, eje.fechaInicioPlan ?? new Date())
    const org = resolverOrganigramaProyecto(await prisma.proyectoOrgNodo.findMany({ where: { proyectoId: cron.proyectoId }, select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } } }))
    plan = { cron, ctlProy, fecha, gestor: org.porRol.get('gestor')?.userId ?? null, actsCtl: ctlProy.proyectoActividad }
    console.log(`${PROYECTO}: + "${ACTIVIDAD}" primera en CTL (las otras ${ctlProy.proyectoActividad.length} se corren un lugar)`)
    for (const h of HITOS) console.log(`    ◆ ${h}  ${f(fecha)} (provisional: inicio de Ejecución)`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  if (!existe && !SOLO_PROYECTO) {
    const unidad = await prisma.unidadServicio.findFirstOrThrow({ where: { nombre: 'Evento' }, select: { id: true } })
    await prisma.catalogoServicio.create({ data: {
      id: randomUUID(), categoriaId: ctl.id, unidadServicioId: unidad.id, recursoId: gestorRec.id,
      nombre: 'Parada de Planta', descripcion: '[HitosCliente] Hito del cliente sin fecha al generar: se ubica al inicio de Ejecución; poner la fecha real y vincular las tareas que dependen de la parada.',
      horaBase: 0, horaRepetido: 0, orden: 0, cantidad: 1, nivelDificultad: 1, actividadTag: ['HitosCliente'], filtroAlcance: 'general', notaCantidad: null, updatedAt: ahora,
    } })
  }
  if (plan) {
    fs.writeFileSync(`scripts/respaldo-hitos-cliente-${PROYECTO}-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(plan.actsCtl, null, 2))
    const actId = randomUUID()
    await prisma.$transaction([
      ...plan.actsCtl.map(a => prisma.proyectoActividad.update({ where: { id: a.id }, data: { orden: a.orden + 1, updatedAt: ahora } })),
      prisma.proyectoActividad.create({ data: {
        id: actId, proyectoEdtId: plan.ctlProy.id, proyectoCronogramaId: plan.cron.id, nombre: ACTIVIDAD, orden: 0,
        fechaInicioPlan: plan.fecha, fechaFinPlan: plan.fecha, horasPlan: 0, responsableId: plan.gestor, updatedAt: ahora,
      } }),
      prisma.proyectoTarea.createMany({ data: HITOS.map((nombre, i) => ({
        id: randomUUID(), proyectoEdtId: plan!.ctlProy.id, proyectoActividadId: actId, proyectoCronogramaId: plan!.cron.id,
        nombre, orden: i, fechaInicio: plan!.fecha, fechaFin: plan!.fecha, horasEstimadas: 0, esHito: true,
        responsableId: plan!.gestor, recursoId: gestorRec.id, updatedAt: ahora,
      })) }),
    ])
    await recalcularEdtPadre(plan.ctlProy.id)
    if (plan.ctlProy.proyectoFaseId) await recalcularFasePadre(plan.ctlProy.proyectoFaseId)
  }
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
