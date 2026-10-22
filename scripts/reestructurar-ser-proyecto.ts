/**
 * Pasa a SER "Servicios y Alquileres" los alquileres/subcontratos de un proyecto
 * que hoy están dentro de PRO. Crea (si falta) el EDT SER en la fase PROCURA y
 * una actividad por ítem con los pasos de su tipo (catálogo de SER), encadenados
 * día a día desde `--desde` (o el inicio de la actividad que se reemplaza), con
 * dependencias Fin-Comienzo. Quita la actividad de PRO indicada (sin horas ni avance).
 * Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/reestructurar-ser-proyecto.ts CJM50 \
 *     --quitar="Equipos de Elevación y Acceso" \
 *     --item="Andamios:alquiler" --item="Andamios Multicuerpo:subcontrato" --item="Manlift:alquiler" [--aplicar]
 * Opcional, para que el alquiler acompañe a la obra en vez de ir encadenado desde PROCURA:
 *   --movilizar-antes="Armado de Andamios"      Movilización el día laborable previo a la primera
 *                                               tarea de CON que contiene ese texto (FC hacia todas).
 *   --desmovilizar-despues="Desmontaje de Andamios"  Desmovilización el día siguiente a la última (FC desde todas).
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { finJornada, inicioJornada, siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { resolverAliasParaNombres, prefijarNombreTarea } from '../src/lib/cronogramaIA/aliasActividad'
import { esServicioObsoleto } from '../src/lib/cronogramaIA/reglasActividades'
import { resolverOrganigramaProyecto } from '../src/lib/cronogramaResponsables/resolverOrganigrama'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'

const args = process.argv.slice(2)
const codigo = args[0]
const APLICAR = args.includes('--aplicar')
const quitar = args.find(a => a.startsWith('--quitar='))?.split('=')[1]
// --item="Nombre:tipo[:alias]" — el alias (una palabra) prefija sus tareas; si falta se deduce del nombre.
const items = args.filter(a => a.startsWith('--item=')).map(a => {
  const [nombre, tipo, alias] = a.slice('--item='.length).split(':')
  if (tipo !== 'alquiler' && tipo !== 'subcontrato') throw new Error(`Tipo inválido en ${a}`)
  return { nombre, tipo, alias }
})
const movilizarAntes = args.find(a => a.startsWith('--movilizar-antes='))?.split('=')[1]
const desmovilizarDespues = args.find(a => a.startsWith('--desmovilizar-despues='))?.split('=')[1]
const f = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-')

async function main() {
  if (!codigo || !items.length) throw new Error('Uso: <codigo> --item="Nombre:alquiler|subcontrato" [--quitar="Actividad de PRO"]')
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo } }, select: { id: true, proyectoId: true, bloqueado: true } })
  if (cron.bloqueado) throw new Error('Cronograma bloqueado')
  const cal = await obtenerCalendarioProyecto(cron.proyectoId)
  const edts = await prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cron.id }, include: { edt: true, proyectoActividad: { include: { proyectoTarea: true } } } })
  const pro = edts.find(e => e.edt.nombre === 'PRO')
  const serProy = edts.find(e => e.edt.nombre === 'SER')
  const actQuitar = quitar ? pro?.proyectoActividad.find(a => a.nombre === quitar) : undefined
  if (quitar && !actQuitar) throw new Error(`No existe la actividad "${quitar}" en PRO`)
  const conAvance = (actQuitar?.proyectoTarea ?? []).filter(t => Number(t.horasReales) > 0 || t.porcentajeCompletado > 0)
  if (conAvance.length) throw new Error(`Tienen horas o avance: ${conAvance.map(t => t.nombre).join(', ')}`)
  if (serProy?.proyectoActividad.some(a => items.some(i => i.nombre === a.nombre))) throw new Error('SER ya tiene actividades con esos nombres')

  const faseProcura = await prisma.proyectoFase.findFirstOrThrow({ where: { proyectoCronogramaId: cron.id, nombre: 'PROCURA' } })
  const serCat = await prisma.edt.findUniqueOrThrow({ where: { nombre: 'SER' }, include: { catalogoServicio: { orderBy: { orden: 'asc' } } } })
  const servicios = serCat.catalogoServicio.filter(s => !esServicioObsoleto(s))
  const org = resolverOrganigramaProyecto(await prisma.proyectoOrgNodo.findMany({ where: { proyectoId: cron.proyectoId }, select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } } }))
  const gestor = org.porRol.get('gestor')?.userId ?? null
  const desde = siguienteMomentoLaborable(cal, actQuitar?.fechaInicioPlan ?? faseProcura.fechaInicioPlan ?? new Date())
  const alias = resolverAliasParaNombres(items.map(i => ({ nombre: i.nombre, aliasPropuesto: i.alias })))

  // Tareas de obra que marcan cuándo llega y se va el alquiler (opcional).
  const tareasCon = edts.filter(e => e.edt.nombre === 'CON').flatMap(e => e.proyectoActividad.flatMap(a => a.proyectoTarea))
  const anclaMov = movilizarAntes ? tareasCon.filter(t => t.nombre.includes(movilizarAntes)) : []
  const anclaDesmov = desmovilizarDespues ? tareasCon.filter(t => t.nombre.includes(desmovilizarDespues)) : []
  if (movilizarAntes && !anclaMov.length) throw new Error(`No hay tareas de CON con "${movilizarAntes}"`)
  if (desmovilizarDespues && !anclaDesmov.length) throw new Error(`No hay tareas de CON con "${desmovilizarDespues}"`)
  const diaAnteriorLaborable = (t: Date) => {
    let d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - 864e5)
    while (finJornada(cal, d).getTime() === inicioJornada(cal, d).getTime() || siguienteMomentoLaborable(cal, inicioJornada(cal, d)).getTime() !== inicioJornada(cal, d).getTime()) d = new Date(d.getTime() - 864e5)
    return d
  }

  // Plan: cada ítem es una actividad; cada paso, un día laborable (como el asistente), en cadena.
  const serId = serProy?.id ?? randomUUID()
  const ordenBase = serProy?.proyectoActividad.length ?? 0
  const plan = items.map((it, k) => {
    const pasos = servicios.filter(s => s.actividadTag.some(t => t.toLowerCase() === it.tipo))
    let dia = desde
    const tareas = pasos.map((s, i) => {
      let base = dia
      const esMov = s.nombre === 'Movilización a Obra' && anclaMov.length
      const esDesmov = s.nombre === 'Desmovilización' && anclaDesmov.length
      if (esMov) {
        const primera = anclaMov.reduce((a, b) => (b.fechaInicio < a.fechaInicio ? b : a))
        base = diaAnteriorLaborable(siguienteMomentoLaborable(cal, primera.fechaInicio))
      }
      if (esDesmov) base = siguienteMomentoLaborable(cal, anclaDesmov.reduce((a, b) => (b.fechaFin > a.fechaFin ? b : a)).fechaFin)
      const inicio = inicioJornada(cal, base)
      const fin = finJornada(cal, base)
      dia = siguienteMomentoLaborable(cal, fin)
      return { id: randomUUID(), nombre: prefijarNombreTarea(alias.get(it.nombre)!, s.nombre), orden: i, fechaInicio: inicio, fechaFin: fin, horas: s.horaBase ?? 0, servicioId: s.id, recursoId: s.recursoId, esMov: !!esMov, esDesmov: !!esDesmov }
    })
    return { id: randomUUID(), nombre: it.nombre, tipo: it.tipo, orden: ordenBase + k, tareas }
  })

  console.log(`${codigo}: SER ${serProy ? 'existente' : 'NUEVO'} en PROCURA, desde ${f(desde)} · responsable ${gestor ? 'Gestor' : 'SIN ASIGNAR'}`)
  if (actQuitar) console.log(`QUITAR de PRO "${actQuitar.nombre}" (${actQuitar.proyectoTarea.length} tareas: ${actQuitar.proyectoTarea.map(t => t.nombre).join(' | ')})`)
  for (const a of plan) {
    console.log(`+ ${a.nombre} (${a.tipo})`)
    for (const t of a.tareas) console.log(`    ${t.nombre.padEnd(46)} ${f(t.fechaInicio)} → ${f(t.fechaFin).slice(11)}  ${t.horas} h${t.esMov ? `  → antes de: ${anclaMov.map(x => x.nombre).join(', ')}` : ''}${t.esDesmov ? `  ← después de: ${anclaDesmov.map(x => x.nombre).join(', ')}` : ''}`)
  }
  const idsQuitar = new Set((actQuitar?.proyectoTarea ?? []).map(t => t.id))
  const externas = idsQuitar.size ? (await prisma.proyectoDependenciasTarea.findMany({
    where: { OR: [{ tareaOrigenId: { in: [...idsQuitar] } }, { tareaDependienteId: { in: [...idsQuitar] } }] },
    include: { tareaOrigen: { select: { nombre: true } }, tareaDependiente: { select: { nombre: true } } },
  })).filter(d => !idsQuitar.has(d.tareaOrigenId) || !idsQuitar.has(d.tareaDependienteId)) : []
  if (externas.length) console.log(`⚠ Se pierden ${externas.length} dependencias con otras tareas: ${externas.map(d => `${d.tareaOrigen.nombre} → ${d.tareaDependiente.nombre}`).join(' | ')}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-ser-${codigo}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ actQuitar, externas }, null, 2))
  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    if (actQuitar) {
      await tx.proyectoTarea.deleteMany({ where: { id: { in: [...idsQuitar] } } })
      await tx.proyectoActividad.delete({ where: { id: actQuitar.id } })
    }
    if (!serProy) {
      await tx.proyectoEdt.create({ data: {
        id: serId, proyectoId: cron.proyectoId, proyectoCronogramaId: cron.id, proyectoFaseId: faseProcura.id, edtId: serCat.id,
        nombre: serCat.descripcion ?? 'Servicios y Alquileres', orden: 1, responsableId: gestor, updatedAt: ahora,
        fechaInicioPlan: desde, fechaFinPlan: desde, horasPlan: 0,
      } })
    }
    for (const a of plan) {
      await tx.proyectoActividad.create({ data: {
        id: a.id, proyectoEdtId: serId, proyectoCronogramaId: cron.id, nombre: a.nombre, orden: a.orden, responsableId: gestor, updatedAt: ahora,
        fechaInicioPlan: a.tareas[0].fechaInicio, fechaFinPlan: a.tareas[a.tareas.length - 1].fechaFin, horasPlan: a.tareas.reduce((s, t) => s + t.horas, 0),
      } })
      await tx.proyectoTarea.createMany({ data: a.tareas.map(t => ({
        id: t.id, proyectoEdtId: serId, proyectoActividadId: a.id, proyectoCronogramaId: cron.id, nombre: t.nombre, orden: t.orden,
        fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, horasEstimadas: t.horas, catalogoServicioId: t.servicioId, recursoId: t.recursoId,
        responsableId: gestor, updatedAt: ahora,
      })) })
      await tx.proyectoDependenciasTarea.createMany({ data: [
        ...a.tareas.slice(1).map((t, i) => ({
          id: randomUUID(), tareaOrigenId: a.tareas[i].id, tareaDependienteId: t.id, tipo: 'finish_to_start' as const, lagMinutos: 0,
        })),
        // Alquiler ↔ obra: Movilización antes del armado; Desmovilización después del desmontaje.
        ...a.tareas.filter(t => t.esMov).flatMap(t => anclaMov.map(x => ({ id: randomUUID(), tareaOrigenId: t.id, tareaDependienteId: x.id, tipo: 'finish_to_start' as const, lagMinutos: 0 }))),
        ...a.tareas.filter(t => t.esDesmov).flatMap(t => anclaDesmov.map(x => ({ id: randomUUID(), tareaOrigenId: x.id, tareaDependienteId: t.id, tipo: 'finish_to_start' as const, lagMinutos: 0 }))),
      ], skipDuplicates: true })
    }
  })
  if (pro) await recalcularEdtPadre(pro.id)
  for (const a of plan) await recalcularActividadPadre(a.id)
  await recalcularEdtPadre(serId)
  await recalcularFasePadre(faseProcura.id)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
