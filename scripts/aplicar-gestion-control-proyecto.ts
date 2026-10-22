/**
 * Aplica la fase GESTION Y CONTROL (CTL + SSO con sus ciclos) a la Línea Base de
 * un proyecto existente, igual que lo haría el asistente de generación:
 *  - CTL "Control": Reporte Avance Semanal (viernes) y Valorizaciones (día 20).
 *  - SSO "Gestión de Seguridad": Habilitación de Personal (una vez) y Reporte
 *    Semanal de Seguridad (viernes). Ventana: del fin de GES al fin de EJECUCION.
 *  - "Envío y Aprobación de Documentos" vuelve a GES › Documentos de Gestión.
 *  - Se reemplazan las tareas anteriores (Control y Seguimiento en CTL y la
 *    Habilitación HSE de Personal de SEG) — solo si no tienen horas ni avance.
 *  - Orden de las fases según el catálogo. Responsables: Gestor (CTL), SSOMA (SSO).
 * No toca el resto del cronograma.
 * --rehacer: si ya se aplicó, borra y reconstruye CTL y SSO (sin horas ni avance)
 * con el catálogo vigente.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/aplicar-gestion-control-proyecto.ts CJM50 [--rehacer] [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'
import { programarGestionYControl, type FilaFase, type FilaEdt, type FilaActividad, type FilaTarea } from '../src/lib/cronogramaIA/construirEstructuraReal'
import { esServicioObsoleto, diasHitoDeEtiquetas, ACTIVIDAD_REPORTE_AVANCE, ACTIVIDAD_VALORIZACIONES, ACTIVIDAD_HABILITACION, ACTIVIDAD_REPORTE_SEGURIDAD } from '../src/lib/cronogramaIA/reglasActividades'
import { resolverOrganigramaProyecto } from '../src/lib/cronogramaResponsables/resolverOrganigrama'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '../src/lib/utils/cronogramaRollup'
import type { TareaPropuesta } from '../src/types/cronogramaIA'

const codigo = process.argv[2]
const APLICAR = process.argv.includes('--aplicar')
const REHACER = process.argv.includes('--rehacer')
const ACTIVIDAD_POR_TAG: Record<string, string> = {
  ReporteAvance: ACTIVIDAD_REPORTE_AVANCE, Valorizaciones: ACTIVIDAD_VALORIZACIONES,
  Habilitacion: ACTIVIDAD_HABILITACION, ReporteSeguridad: ACTIVIDAD_REPORTE_SEGURIDAD,
}
const QUEDA_EN_GES = 'Envío y Aprobación de Documentos'
const REEMPLAZADAS = ['Reunión y Reporte Semanal de Avance', 'Valorizaciones y Conformidad HES', 'Elaboración de Reporte Semanal', 'Habilitación HSE de Personal']
const f = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-')

async function main() {
  if (!codigo) throw new Error('Indica el código del proyecto')
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({ where: { tipo: 'planificacion', proyecto: { codigo } }, select: { id: true, proyectoId: true, bloqueado: true } })
  if (cron.bloqueado) throw new Error('El cronograma está bloqueado')
  const cal = await obtenerCalendarioProyecto(cron.proyectoId)

  const fases = await prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cron.id }, include: { proyectoEdt: { include: { edt: true, proyectoActividad: { include: { proyectoTarea: true } } } } } })
  const faseGC = fases.find(x => x.nombre === 'GESTION Y CONTROL')
  const faseEje = fases.find(x => x.nombre === 'EJECUCION')
  if (!faseGC || !faseEje?.fechaFinPlan) throw new Error('Faltan las fases GESTION Y CONTROL o EJECUCION')
  const edtsProy = fases.flatMap(x => x.proyectoEdt)
  const ges = edtsProy.find(e => e.edt.nombre === 'GES')!
  const seg = edtsProy.find(e => e.edt.nombre === 'SEG')
  const ctl = edtsProy.find(e => e.edt.nombre === 'CTL')
  const sso = edtsProy.find(e => e.edt.nombre === 'SSO')
  if (sso && !REHACER) throw new Error('El proyecto ya tiene SSO: no se vuelve a aplicar (usa --rehacer para reconstruir CTL y SSO)')
  const docsGestion = ges.proyectoActividad.find(a => a.nombre === 'Documentos de Gestión')!

  // "Hitos del Cliente" (paradas de planta, fechas puestas a mano) no se reconstruye: se conserva tal cual.
  const conservar = (a: { nombre: string }) => a.nombre === 'Hitos del Cliente'
  if (ctl) ctl.proyectoActividad = ctl.proyectoActividad.filter(a => !conservar(a))
  // Tareas a mover / reemplazar
  const tareasCtl = (ctl?.proyectoActividad ?? []).flatMap(a => a.proyectoTarea)
  const envioDocs = tareasCtl.find(t => t.nombre === QUEDA_EN_GES)
  const tareasSso = (sso?.proyectoActividad ?? []).flatMap(a => a.proyectoTarea)
  const reemplazar = [
    ...tareasCtl.filter(t => t.id !== envioDocs?.id),
    ...tareasSso,
    ...(seg?.proyectoActividad ?? []).flatMap(a => a.proyectoTarea).filter(t => REEMPLAZADAS.includes(t.nombre)),
  ]
  const conAvance = reemplazar.filter(t => Number(t.horasReales) > 0 || t.porcentajeCompletado > 0)
  if (conAvance.length) throw new Error(`Tienen horas o avance, no se reemplazan: ${conAvance.map(t => t.nombre).join(', ')}`)
  const actividadesAEliminar = [
    ...(ctl?.proyectoActividad ?? []),
    ...(sso?.proyectoActividad ?? []),
    ...(seg?.proyectoActividad ?? []).filter(a => a.proyectoTarea.length > 0 && a.proyectoTarea.every(t => REEMPLAZADAS.includes(t.nombre))),
  ]

  // Ventana: del fin de GES (con el Envío de documentos de vuelta) al fin de Ejecución
  const finGes = new Date(Math.max(...ges.proyectoActividad.flatMap(a => a.proyectoTarea).concat(envioDocs ? [envioDocs] : []).map(t => t.fechaFin.getTime())))
  const inicioVentana = siguienteMomentoLaborable(cal, finGes)

  // Catálogo vigente de CTL y SSO
  const edtsCat = await prisma.edt.findMany({ where: { nombre: { in: ['CTL', 'SSO'] } }, include: { catalogoServicio: { orderBy: { orden: 'asc' } } } })
  const org = resolverOrganigramaProyecto(await prisma.proyectoOrgNodo.findMany({ where: { proyectoId: cron.proyectoId }, select: { id: true, userId: true, cargoLabel: true, orden: true, user: { select: { name: true } } } }))
  const responsable = { CTL: org.porRol.get('gestor')?.userId ?? null, SSO: org.porRol.get('ssoma')?.userId ?? null }

  // Estructura de la fase como la arma el asistente
  const filaFase: FilaFase = { id: faseGC.id, proyectoId: cron.proyectoId, proyectoCronogramaId: cron.id, nombre: faseGC.nombre, descripcion: null, orden: faseGC.orden, fechaInicioPlan: inicioVentana, fechaFinPlan: inicioVentana, updatedAt: new Date() }
  const filasEdt: FilaEdt[] = []
  const filasAct: FilaActividad[] = []
  const filasTarea: FilaTarea[] = []
  const propuesta = new Map<string, TareaPropuesta>()
  for (const cod of ['CTL', 'SSO'] as const) {
    const cat = edtsCat.find(e => e.nombre === cod)!
    const existente = cod === 'CTL' ? ctl : sso
    const edtId = existente ? existente.id : randomUUID()
    filasEdt.push({ id: edtId, proyectoId: cron.proyectoId, proyectoCronogramaId: cron.id, proyectoFaseId: faseGC.id, edtId: cat.id, nombre: cat.descripcion ?? cod, descripcion: null, orden: cod === 'CTL' ? 0 : 1, horasPlan: 0, fechaInicioPlan: inicioVentana, fechaFinPlan: inicioVentana, updatedAt: new Date(), responsableId: responsable[cod] })
    const actPorNombre = new Map<string, FilaActividad>()
    for (const s of cat.catalogoServicio.filter(x => !esServicioObsoleto(x))) {
      const nombreAct = ACTIVIDAD_POR_TAG[s.actividadTag.find(t => ACTIVIDAD_POR_TAG[t]) ?? '']
      if (!nombreAct) continue
      let act = actPorNombre.get(nombreAct)
      if (!act) {
        act = { id: randomUUID(), proyectoEdtId: edtId, proyectoCronogramaId: cron.id, nombre: nombreAct, orden: actPorNombre.size, horasPlan: 0, fechaInicioPlan: inicioVentana, fechaFinPlan: inicioVentana, updatedAt: new Date(), responsableId: responsable[cod] }
        actPorNombre.set(nombreAct, act)
        filasAct.push(act)
      }
      const id = randomUUID()
      const hitoDias = diasHitoDeEtiquetas(s.actividadTag)
      propuesta.set(id, { catalogoServicioId: s.id, nombre: s.nombre, cantidad: 1, nivelDificultad: 1, horaBase: s.horaBase ?? 0, horaRepetido: s.horaRepetido ?? 0, horasEstimadas: s.horaBase ?? 0, incluida: true, orden: s.orden ?? 0, ...(hitoDias !== undefined && { hitoDiasDespues: hitoDias }) })
      filasTarea.push({ id, proyectoEdtId: edtId, proyectoActividadId: act.id, proyectoCronogramaId: cron.id, nombre: s.nombre, orden: s.orden ?? 0, fechaInicio: inicioVentana, fechaFin: inicioVentana, horasEstimadas: s.horaBase ?? 0, updatedAt: new Date(), catalogoServicioId: s.id, recursoId: s.recursoId, responsableId: responsable[cod], esPropuestaIA: false, justificacionIA: null, cantidad: null })
    }
  }
  const r = programarGestionYControl({ cal, faseGC: filaFase, finVentana: faseEje.fechaFinPlan, edts: filasEdt, actividades: filasAct, tareas: filasTarea, propuestaPorTareaId: propuesta })

  // Vista previa
  console.log(`${codigo}: ventana ${f(inicioVentana)} → ${f(faseEje.fechaFinPlan)}`)
  if (envioDocs) console.log(`MOVER  "${QUEDA_EN_GES}" → GES › Documentos de Gestión (${f(envioDocs.fechaInicio)})`)
  console.log(`QUITAR ${reemplazar.length} tareas: ${reemplazar.map(t => t.nombre).join(' | ')}`)
  console.log(`QUITAR actividades: ${actividadesAEliminar.map(a => a.nombre).join(' | ')}`)
  for (const e of filasEdt) {
    console.log(`${e.id === ctl?.id || e.id === sso?.id ? 'EDT' : '+EDT'} ${e.nombre} (responsable: ${e.responsableId ? 'sí' : 'NO'})`)
    for (const a of filasAct.filter(x => x.proyectoEdtId === e.id)) {
      const ts = r.tareas.filter(t => t.proyectoActividadId === a.id)
      console.log(`  + ${a.nombre}: ${ts.length} tareas, ${f(a.fechaInicioPlan)} → ${f(a.fechaFinPlan)}`)
      for (const t of ts.slice(0, 4)) console.log(`      ${t.esHito ? '◆ ' : ''}${t.nombre} ${f(t.fechaInicio)} (${t.horasEstimadas} h)`)
      if (ts.length > 4) console.log(`      … hasta ${ts[ts.length - 1].nombre} ${f(ts[ts.length - 1].fechaInicio)}`)
    }
  }
  console.log(`+ ${r.dependencias.length} dependencias FC de los ciclos`)
  // Dependencias con tareas de fuera que se perderían al borrar las tareas reemplazadas
  const idsReemplazo = new Set(reemplazar.map(t => t.id))
  const externas = (await prisma.proyectoDependenciasTarea.findMany({
    where: { OR: [{ tareaOrigenId: { in: [...idsReemplazo] } }, { tareaDependienteId: { in: [...idsReemplazo] } }] },
    include: { tareaOrigen: { select: { nombre: true } }, tareaDependiente: { select: { nombre: true } } },
  })).filter(d => !idsReemplazo.has(d.tareaOrigenId) || !idsReemplazo.has(d.tareaDependienteId))
  if (externas.length) console.log(`⚠ Se pierden ${externas.length} dependencias con otras tareas: ${externas.map(d => `${d.tareaOrigen.nombre} → ${d.tareaDependiente.nombre}`).join(' | ')}`)
  const ordenCat = new Map((await prisma.faseDefault.findMany()).map(x => [x.nombre, x.orden]))
  const reordenar = fases.filter(x => ordenCat.has(x.nombre) && ordenCat.get(x.nombre) !== x.orden)
  console.log(`ORDEN de fases: ${reordenar.map(x => `${x.nombre} ${x.orden}→${ordenCat.get(x.nombre)}`).join(', ') || 'sin cambio'}`)
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const deps = await prisma.proyectoDependenciasTarea.findMany({ where: { OR: [{ tareaOrigenId: { in: reemplazar.map(t => t.id) } }, { tareaDependienteId: { in: reemplazar.map(t => t.id) } }] } })
  fs.writeFileSync(`scripts/respaldo-gestion-control-${codigo}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    JSON.stringify({ envioDocs, reemplazar, actividadesAEliminar: actividadesAEliminar.map(({ proyectoTarea, ...a }) => a), deps, ctl: ctl && { ...ctl, proyectoActividad: undefined }, fases: fases.map(({ proyectoEdt, ...x }) => x) }, null, 2))

  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    if (envioDocs) {
      const maxOrden = Math.max(0, ...docsGestion.proyectoTarea.map(t => t.orden))
      await tx.proyectoTarea.update({ where: { id: envioDocs.id }, data: { proyectoActividadId: docsGestion.id, proyectoEdtId: ges.id, orden: maxOrden + 1, updatedAt: ahora } })
    }
    await tx.proyectoTarea.deleteMany({ where: { id: { in: reemplazar.map(t => t.id) } } })
    await tx.proyectoActividad.deleteMany({ where: { id: { in: actividadesAEliminar.map(a => a.id) } } })
    for (const e of filasEdt.filter(x => x.id === ctl?.id || x.id === sso?.id)) {
      await tx.proyectoEdt.update({ where: { id: e.id }, data: { responsableId: e.responsableId, nombre: e.nombre, updatedAt: ahora } })
    }
    await tx.proyectoEdt.createMany({ data: filasEdt.filter(e => e.id !== ctl?.id && e.id !== sso?.id) })
    await tx.proyectoActividad.createMany({ data: filasAct })
    await tx.proyectoTarea.createMany({ data: r.tareas })
    await tx.proyectoDependenciasTarea.createMany({ data: r.dependencias.map(d => ({ id: randomUUID(), ...d })) })
    for (const x of reordenar) await tx.proyectoFase.update({ where: { id: x.id }, data: { orden: ordenCat.get(x.nombre)!, updatedAt: ahora } })
  }, { timeout: 60000 })

  // Fechas y horas hacia arriba
  await recalcularActividadPadre(docsGestion.id)
  for (const e of [ges.id, ...(seg ? [seg.id] : []), ...filasEdt.map(x => x.id)]) await recalcularEdtPadre(e)
  for (const fa of fases) await recalcularFasePadre(fa.id)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
