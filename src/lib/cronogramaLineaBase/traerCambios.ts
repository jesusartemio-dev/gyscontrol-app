// "Traer cambios de la línea base": lleva al cronograma de ejecución lo que se
// agregó o cambió en la línea base (planificación) después de crearlo.
//
// Nunca borra ni recrea nada en ejecución: de cada tarea cuelgan horas
// registradas, jornadas de campo y avance, y se perderían. Por eso:
// - Lo nuevo en la línea base (actividades, tareas, dependencias) se crea.
// - Lo modificado se muestra campo por campo y solo se aplica si se marca. En
//   tareas con horas o avance solo se aplican nombre, descripción y responsable;
//   fechas, horas y recurso de ejecución quedan como están (pueden estar
//   reprogramadas en obra a propósito).
// - Lo que ya no está en la línea base solo se informa; borrarlo es a mano.
//
// Cada actividad/tarea de ejecución recuerda de cuál de la línea base salió
// (origenActividadId / origenTareaId). Las que no lo tienen (ejecuciones
// creadas antes de existir el vínculo, o agregadas a mano en ejecución) se
// emparejan por nombre dentro del mismo EDT/actividad, y al aplicar ese
// vínculo queda guardado.

import { prisma } from '@/lib/prisma'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '@/lib/utils/cronogramaRollup'

type Valor = string | number | boolean | null

export interface CampoCambio {
  campo: string
  antes: Valor
  despues: Valor
  /** Se puede aplicar aunque la tarea tenga horas o avance (no toca la programación). */
  seguro: boolean
}

export interface ItemNuevo {
  clave: string
  tipo: 'actividad' | 'tarea'
  nombre: string
  /** "EDT › Actividad" donde se creará. */
  ubicacion: string
  inicio: string | null
  fin: string | null
  horas: number
  /** Si es actividad: sus tareas. */
  tareas: { nombre: string; inicio: string | null; fin: string | null; horas: number }[]
  /** EDT o fase que no existe en ejecución y se creará con la actividad. */
  creaEdt?: string
  creaFase?: string
  /**
   * En ejecución ya hay algo con este mismo nombre en el mismo sitio, pero no
   * se pudo emparejar porque el nombre está repetido en la línea base y no hay
   * forma de saber cuál es cuál. Traerlo DUPLICARÍA el que ya existe, así que
   * llega sin marcar y con aviso.
   */
  homonimoEnEjecucion?: boolean
}

export interface ItemModificado {
  clave: string
  tipo: 'actividad' | 'tarea'
  nombre: string
  ubicacion: string
  campos: CampoCambio[]
  /** Motivo por el que solo se aplican los campos seguros. */
  protegido?: string
}

export interface ItemQuitado {
  tipo: 'actividad' | 'tarea'
  nombre: string
  ubicacion: string
  conAvance: boolean
}

export interface ItemDependencia {
  clave: string
  origenNombre: string
  dependienteNombre: string
  tipo: string
  lagMinutos: number
  antes?: { tipo: string; lagMinutos: number }
}

export interface CambiosLineaBase {
  lineaBase: { id: string; nombre: string }
  ejecucionId: string
  /** Pares emparejados por nombre (sin vínculo guardado todavía). */
  vinculadasPorNombre: number
  nuevos: ItemNuevo[]
  modificados: ItemModificado[]
  quitados: ItemQuitado[]
  dependencias: ItemDependencia[]
  advertencias: string[]
  /** true si no se puede aplicar (ver advertencias[0]). */
  bloqueado: boolean
}

const MIN = 60000
const mismoInstante = (a: Date | null, b: Date | null) =>
  (!a && !b) || (!!a && !!b && Math.abs(a.getTime() - b.getTime()) < MIN)
const fechaTxt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : null)
const r2 = (n: number) => Math.round(n * 100) / 100
const txt = (s: string | null | undefined) => (s ?? '').trim()

async function cargarCronograma(cronogramaId: string) {
  const [fases, edts, actividades, tareas] = await Promise.all([
    prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' } }),
    prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' } }),
    prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' } }),
    prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronogramaId },
      orderBy: { orden: 'asc' },
      include: { _count: { select: { registroHoras: true, registrosCampoTarea: true, registrosAvance: true, avances: true } } },
    }),
  ])
  const ids = tareas.map((t) => t.id)
  const deps = ids.length
    ? await prisma.proyectoDependenciasTarea.findMany({
        where: { tareaOrigenId: { in: ids }, tareaDependienteId: { in: ids } },
        select: { id: true, tareaOrigenId: true, tareaDependienteId: true, tipo: true, lagMinutos: true },
      })
    : []
  return { fases, edts, actividades, tareas, deps }
}

type Datos = Awaited<ReturnType<typeof cargarCronograma>>
type Tarea = Datos['tareas'][number]

function motivoProtegida(t: Tarea): string | undefined {
  if (t._count.registroHoras + t._count.registrosCampoTarea > 0 || Number(t.horasReales) > 0) return 'tiene horas registradas'
  if (t._count.registrosAvance + t._count.avances > 0 || t.porcentajeCompletado > 0) return 'tiene avance registrado'
  if (t.estado !== 'pendiente') return `está ${t.estado.replace('_', ' ')}`
  return undefined
}

/** Empareja línea base ↔ ejecución y arma la lista de diferencias. */
async function analizar(proyectoId: string) {
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { proyectoId, OR: [{ tipo: 'ejecucion' }, { tipo: 'planificacion', esBaseline: true }] },
    select: { id: true, tipo: true, nombre: true },
  })
  const base = cronos.find((c) => c.tipo === 'planificacion')
  const ejecucion = cronos.find((c) => c.tipo === 'ejecucion')
  if (!base) throw new Error('El proyecto no tiene una línea base (cronograma de planificación marcado como baseline)')
  if (!ejecucion) throw new Error('El proyecto no tiene cronograma de ejecución')

  const [P, E] = await Promise.all([cargarCronograma(base.id), cargarCronograma(ejecucion.id)])

  const res: CambiosLineaBase = {
    lineaBase: { id: base.id, nombre: base.nombre },
    ejecucionId: ejecucion.id,
    vinculadasPorNombre: 0,
    nuevos: [], modificados: [], quitados: [], dependencias: [], advertencias: [], bloqueado: false,
  }

  const pEdt = new Map(P.edts.map((e) => [e.id, e]))
  const pFase = new Map(P.fases.map((f) => [f.id, f]))
  const pAct = new Map(P.actividades.map((a) => [a.id, a]))
  const pTar = new Map(P.tareas.map((t) => [t.id, t]))
  const eEdt = new Map(E.edts.map((e) => [e.id, e]))
  const eAct = new Map(E.actividades.map((a) => [a.id, a]))
  const eEdtPorNombre = new Map(E.edts.map((e) => [e.nombre, e]))
  const eFasePorNombre = new Map(E.fases.map((f) => [f.nombre, f]))

  // Si la ejecución tiene vínculos pero ninguno apunta a esta línea base, se
  // marcó otra línea base después de crearla: comparar daría todo "nuevo".
  const vinculos = [...E.actividades.map((a) => a.origenActividadId), ...E.tareas.map((t) => t.origenTareaId)].filter(Boolean) as string[]
  if (vinculos.length > 0 && !vinculos.some((id) => pAct.has(id) || pTar.has(id))) {
    res.bloqueado = true
    res.advertencias.push('El cronograma de ejecución se creó desde otra línea base. Ninguna de sus actividades o tareas sale de la línea base actual, así que no se puede comparar.')
    return { res, P, E, base, ejecucion, actMap: new Map<string, string>(), tarMap: new Map<string, string>(), porNombre: { act: [], tar: [] } as { act: [string, string][]; tar: [string, string][] } }
  }

  // ── Emparejar actividades: vínculo guardado, si no por nombre dentro del EDT ──
  const actMap = new Map<string, string>() // plan → ejecución
  for (const a of E.actividades) if (a.origenActividadId && pAct.has(a.origenActividadId)) actMap.set(a.origenActividadId, a.id)
  const actUsadas = new Set(actMap.values())
  const porNombre = { act: [] as [string, string][], tar: [] as [string, string][] }
  for (const pa of P.actividades) {
    if (actMap.has(pa.id)) continue
    const edtE = eEdtPorNombre.get(pEdt.get(pa.proyectoEdtId)?.nombre ?? '')
    if (!edtE) continue
    const cand = E.actividades.filter((a) => a.proyectoEdtId === edtE.id && !a.origenActividadId && !actUsadas.has(a.id) && txt(a.nombre) === txt(pa.nombre))
    const rivales = P.actividades.filter((x) => x.proyectoEdtId === pa.proyectoEdtId && !actMap.has(x.id) && txt(x.nombre) === txt(pa.nombre))
    if (cand.length === 1 && rivales.length === 1) {
      actMap.set(pa.id, cand[0].id); actUsadas.add(cand[0].id); porNombre.act.push([cand[0].id, pa.id])
    }
  }

  // ── Emparejar tareas: vínculo guardado, si no por nombre dentro de la actividad ──
  const tarMap = new Map<string, string>()
  for (const t of E.tareas) if (t.origenTareaId && pTar.has(t.origenTareaId)) tarMap.set(t.origenTareaId, t.id)
  const tarUsadas = new Set(tarMap.values())
  for (const pt of P.tareas) {
    if (tarMap.has(pt.id) || !pt.proyectoActividadId) continue
    const actE = actMap.get(pt.proyectoActividadId)
    if (!actE) continue
    const cand = E.tareas.filter((t) => t.proyectoActividadId === actE && !t.origenTareaId && !tarUsadas.has(t.id) && txt(t.nombre) === txt(pt.nombre))
    const rivales = P.tareas.filter((x) => x.proyectoActividadId === pt.proyectoActividadId && !tarMap.has(x.id) && txt(x.nombre) === txt(pt.nombre))
    if (cand.length === 1 && rivales.length === 1) {
      tarMap.set(pt.id, cand[0].id); tarUsadas.add(cand[0].id); porNombre.tar.push([cand[0].id, pt.id])
    }
  }
  res.vinculadasPorNombre = porNombre.act.length + porNombre.tar.length

  // Nombres para mostrar responsables y recursos.
  const userIds = new Set<string>()
  const recursoIds = new Set<string>()
  for (const x of [...P.actividades, ...E.actividades, ...P.tareas, ...E.tareas]) if (x.responsableId) userIds.add(x.responsableId)
  for (const t of [...P.tareas, ...E.tareas]) if (t.recursoId) recursoIds.add(t.recursoId)
  const [users, recursos] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } }),
    prisma.recurso.findMany({ where: { id: { in: [...recursoIds] } }, select: { id: true, nombre: true } }),
  ])
  const nomUser = new Map(users.map((u) => [u.id, u.name ?? u.id]))
  const nomRecurso = new Map(recursos.map((r) => [r.id, r.nombre]))
  const u = (id: string | null) => (id ? nomUser.get(id) ?? id : null)
  const rec = (id: string | null) => (id ? nomRecurso.get(id) ?? id : null)
  const ubicP = (edtId: string, actId?: string | null) => [pEdt.get(edtId)?.nombre, actId ? pAct.get(actId)?.nombre : null].filter(Boolean).join(' › ')
  const ubicE = (edtId: string, actId?: string | null) => [eEdt.get(edtId)?.nombre, actId ? eAct.get(actId)?.nombre : null].filter(Boolean).join(' › ')

  // ── Nuevos ──
  for (const pa of P.actividades) {
    if (actMap.has(pa.id)) continue
    const edtP = pEdt.get(pa.proyectoEdtId)!
    const edtE = eEdtPorNombre.get(edtP.nombre)
    const faseP = edtP.proyectoFaseId ? pFase.get(edtP.proyectoFaseId) : undefined
    const tareas = P.tareas.filter((t) => t.proyectoActividadId === pa.id)
    res.nuevos.push({
      clave: `act:${pa.id}`, tipo: 'actividad', nombre: pa.nombre, ubicacion: edtP.nombre,
      inicio: fechaTxt(pa.fechaInicioPlan), fin: fechaTxt(pa.fechaFinPlan),
      horas: r2(tareas.reduce((s, t) => s + Number(t.horasEstimadas ?? 0), 0)),
      tareas: tareas.map((t) => ({ nombre: t.nombre, inicio: fechaTxt(t.fechaInicio), fin: fechaTxt(t.fechaFin), horas: Number(t.horasEstimadas ?? 0) })),
      ...(edtE ? {} : { creaEdt: edtP.nombre, ...(faseP && !eFasePorNombre.has(faseP.nombre) ? { creaFase: faseP.nombre } : {}) }),
      ...(edtE && E.actividades.some((a) => a.proyectoEdtId === edtE.id && txt(a.nombre) === txt(pa.nombre))
        ? { homonimoEnEjecucion: true }
        : {}),
    })
  }
  for (const pt of P.tareas) {
    if (tarMap.has(pt.id) || !pt.proyectoActividadId || !actMap.has(pt.proyectoActividadId)) continue
    const actE = actMap.get(pt.proyectoActividadId)!
    res.nuevos.push({
      clave: `tar:${pt.id}`, tipo: 'tarea', nombre: pt.nombre,
      ubicacion: ubicE(eAct.get(actE)!.proyectoEdtId, actE),
      inicio: fechaTxt(pt.fechaInicio), fin: fechaTxt(pt.fechaFin), horas: Number(pt.horasEstimadas ?? 0), tareas: [],
      ...(E.tareas.some((t) => t.proyectoActividadId === actE && txt(t.nombre) === txt(pt.nombre))
        ? { homonimoEnEjecucion: true }
        : {}),
    })
  }
  const sinActividad = P.tareas.filter((t) => !t.proyectoActividadId && !tarMap.has(t.id)).length
  if (sinActividad) res.advertencias.push(`${sinActividad} tarea(s) de la línea base no cuelgan de ninguna actividad; no se traen.`)

  const homonimos = res.nuevos.filter((n) => n.homonimoEnEjecucion).length
  if (homonimos) {
    res.advertencias.push(
      `${homonimos} elemento(s) figuran como nuevos solo porque su nombre está repetido en la línea base y no se puede saber a cuál de ejecución corresponden. Llegan sin marcar: traerlos duplicaría el que ya existe. Lo limpio es darles nombres distintos en la línea base y volver a comparar.`
    )
  }

  // ── Modificados ──
  for (const [pId, eId] of actMap) {
    const p = pAct.get(pId)!; const e = eAct.get(eId)!
    const campos: CampoCambio[] = []
    if (txt(p.nombre) !== txt(e.nombre)) campos.push({ campo: 'Nombre', antes: e.nombre, despues: p.nombre, seguro: true })
    if (txt(p.descripcion) !== txt(e.descripcion)) campos.push({ campo: 'Descripción', antes: e.descripcion, despues: p.descripcion, seguro: true })
    if (p.responsableId !== e.responsableId) campos.push({ campo: 'Responsable', antes: u(e.responsableId), despues: u(p.responsableId), seguro: true })
    if (campos.length) res.modificados.push({ clave: `mod-act:${eId}`, tipo: 'actividad', nombre: p.nombre, ubicacion: ubicE(e.proyectoEdtId), campos })
    const edtPNombre = pEdt.get(p.proyectoEdtId)?.nombre
    if (edtPNombre && eEdt.get(e.proyectoEdtId)?.nombre !== edtPNombre) {
      res.advertencias.push(`La actividad "${p.nombre}" está en el EDT "${edtPNombre}" en la línea base y en "${eEdt.get(e.proyectoEdtId)?.nombre}" en ejecución; moverla es a mano.`)
    }
  }
  const eTar = new Map(E.tareas.map((t) => [t.id, t]))
  for (const [pId, eId] of tarMap) {
    const p = pTar.get(pId)!; const e = eTar.get(eId)!
    const campos: CampoCambio[] = []
    if (txt(p.nombre) !== txt(e.nombre)) campos.push({ campo: 'Nombre', antes: e.nombre, despues: p.nombre, seguro: true })
    if (txt(p.descripcion) !== txt(e.descripcion)) campos.push({ campo: 'Descripción', antes: e.descripcion, despues: p.descripcion, seguro: true })
    if (p.responsableId !== e.responsableId) campos.push({ campo: 'Responsable', antes: u(e.responsableId), despues: u(p.responsableId), seguro: true })
    if (!mismoInstante(p.fechaInicio, e.fechaInicio)) campos.push({ campo: 'Inicio', antes: fechaTxt(e.fechaInicio), despues: fechaTxt(p.fechaInicio), seguro: false })
    if (!mismoInstante(p.fechaFin, e.fechaFin)) campos.push({ campo: 'Fin', antes: fechaTxt(e.fechaFin), despues: fechaTxt(p.fechaFin), seguro: false })
    if (Math.abs(Number(p.horasEstimadas ?? 0) - Number(e.horasEstimadas ?? 0)) > 0.01) campos.push({ campo: 'Horas', antes: Number(e.horasEstimadas ?? 0), despues: Number(p.horasEstimadas ?? 0), seguro: false })
    if (p.personasEstimadas !== e.personasEstimadas) campos.push({ campo: 'Personas', antes: e.personasEstimadas, despues: p.personasEstimadas, seguro: false })
    if (p.recursoId !== e.recursoId) campos.push({ campo: 'Recurso', antes: rec(e.recursoId), despues: rec(p.recursoId), seguro: false })
    if (p.esHito !== e.esHito) campos.push({ campo: 'Hito', antes: e.esHito, despues: p.esHito, seguro: false })
    if (!mismoInstante(p.fechaLimite, e.fechaLimite)) campos.push({ campo: 'Fecha límite', antes: fechaTxt(e.fechaLimite), despues: fechaTxt(p.fechaLimite), seguro: false })
    if (campos.length) {
      res.modificados.push({ clave: `mod-tar:${eId}`, tipo: 'tarea', nombre: p.nombre, ubicacion: ubicE(e.proyectoEdtId, e.proyectoActividadId), campos, protegido: motivoProtegida(e) })
    }
    if (p.proyectoActividadId && e.proyectoActividadId !== actMap.get(p.proyectoActividadId)) {
      res.advertencias.push(`La tarea "${p.nombre}" está en otra actividad en la línea base ("${ubicP(p.proyectoEdtId, p.proyectoActividadId)}"); moverla en ejecución es a mano.`)
    }
  }

  // ── Ya no están en la línea base (solo informativo) ──
  for (const a of E.actividades) {
    if (a.origenActividadId && !pAct.has(a.origenActividadId)) {
      const conAvance = E.tareas.some((t) => t.proyectoActividadId === a.id && motivoProtegida(t))
      res.quitados.push({ tipo: 'actividad', nombre: a.nombre, ubicacion: ubicE(a.proyectoEdtId), conAvance })
    }
  }
  const actQuitadas = new Set(E.actividades.filter((a) => a.origenActividadId && !pAct.has(a.origenActividadId)).map((a) => a.id))
  for (const t of E.tareas) {
    if (t.origenTareaId && !pTar.has(t.origenTareaId) && !(t.proyectoActividadId && actQuitadas.has(t.proyectoActividadId))) {
      res.quitados.push({ tipo: 'tarea', nombre: t.nombre, ubicacion: ubicE(t.proyectoEdtId, t.proyectoActividadId), conAvance: !!motivoProtegida(t) })
    }
  }

  // ── Dependencias entre tareas que ya existen en ambos ──
  // (las de tareas nuevas se crean junto con ellas)
  const eDep = new Map(E.deps.map((d) => [`${d.tareaOrigenId}|${d.tareaDependienteId}`, d]))
  for (const d of P.deps) {
    const o = tarMap.get(d.tareaOrigenId); const de = tarMap.get(d.tareaDependienteId)
    if (!o || !de) continue
    const actual = eDep.get(`${o}|${de}`)
    if (actual && actual.tipo === d.tipo && actual.lagMinutos === d.lagMinutos) continue
    res.dependencias.push({
      clave: `dep:${d.tareaOrigenId}|${d.tareaDependienteId}`,
      origenNombre: pTar.get(d.tareaOrigenId)!.nombre, dependienteNombre: pTar.get(d.tareaDependienteId)!.nombre,
      tipo: d.tipo, lagMinutos: d.lagMinutos,
      ...(actual ? { antes: { tipo: actual.tipo, lagMinutos: actual.lagMinutos } } : {}),
    })
  }

  return { res, P, E, base, ejecucion, actMap, tarMap, porNombre }
}

export async function calcularCambiosLineaBase(proyectoId: string): Promise<CambiosLineaBase> {
  return (await analizar(proyectoId)).res
}

/**
 * Aplica lo marcado (`seleccion` = claves de nuevos, modificados y
 * dependencias). La comparación se rehace aquí, no se confía en la del
 * navegador. Los vínculos por nombre se guardan siempre.
 */
export async function aplicarCambiosLineaBase(proyectoId: string, seleccion: string[]) {
  const { res, P, E, ejecucion, actMap, tarMap, porNombre } = await analizar(proyectoId)
  if (res.bloqueado) throw new Error(res.advertencias[0])
  const sel = new Set(seleccion)
  const ahora = new Date()
  const resumen = { creados: 0, actualizados: 0, dependencias: 0, vinculados: res.vinculadasPorNombre }
  const actividadesTocadas = new Set<string>()

  const pEdt = new Map(P.edts.map((e) => [e.id, e]))
  const pFase = new Map(P.fases.map((f) => [f.id, f]))
  const pAct = new Map(P.actividades.map((a) => [a.id, a]))
  const pTar = new Map(P.tareas.map((t) => [t.id, t]))
  const eTar = new Map(E.tareas.map((t) => [t.id, t]))
  const eAct = new Map(E.actividades.map((a) => [a.id, a]))
  const eEdtPorNombre = new Map(E.edts.map((e) => [e.nombre, e.id]))
  const eFasePorNombre = new Map(E.fases.map((f) => [f.nombre, f.id]))
  const nuevasTareas = new Map<string, string>() // plan → ejecución recién creada

  // Siguiente orden libre (al final) por EDT para actividades y por actividad para tareas.
  const ordenAct = new Map<string, number>()
  for (const a of E.actividades) ordenAct.set(a.proyectoEdtId, Math.max(ordenAct.get(a.proyectoEdtId) ?? -1, a.orden))
  const ordenTar = new Map<string, number>()
  for (const t of E.tareas) if (t.proyectoActividadId) ordenTar.set(t.proyectoActividadId, Math.max(ordenTar.get(t.proyectoActividadId) ?? -1, t.orden))
  const siguiente = (m: Map<string, number>, k: string) => { const n = (m.get(k) ?? -1) + 1; m.set(k, n); return n }

  const datosTarea = (p: Tarea) => ({
    nombre: p.nombre, descripcion: p.descripcion,
    fechaInicio: p.fechaInicio, fechaFin: p.fechaFin,
    horasEstimadas: p.horasEstimadas, personasEstimadas: p.personasEstimadas, cantidad: p.cantidad,
    prioridad: p.prioridad, responsableId: p.responsableId, creadoPorId: p.creadoPorId,
    recursoId: p.recursoId, catalogoServicioId: p.catalogoServicioId,
    esExtra: p.esExtra, esPropuestaIA: p.esPropuestaIA, justificacionIA: p.justificacionIA,
    esHito: p.esHito, fechaLimite: p.fechaLimite,
    origenTareaId: p.id, updatedAt: ahora,
  })

  await prisma.$transaction(async (tx) => {
    // Vínculos por nombre: se guardan para no depender del nombre la próxima vez.
    for (const [eId, pId] of porNombre.act) await tx.proyectoActividad.update({ where: { id: eId }, data: { origenActividadId: pId } })
    for (const [eId, pId] of porNombre.tar) await tx.proyectoTarea.update({ where: { id: eId }, data: { origenTareaId: pId } })

    for (const item of res.nuevos) {
      if (!sel.has(item.clave)) continue

      if (item.tipo === 'actividad') {
        const pa = pAct.get(item.clave.slice(4))!
        const edtP = pEdt.get(pa.proyectoEdtId)!
        let edtId = eEdtPorNombre.get(edtP.nombre)
        if (!edtId) {
          let faseId: string | null = null
          const faseP = edtP.proyectoFaseId ? pFase.get(edtP.proyectoFaseId) : undefined
          if (faseP) {
            faseId = eFasePorNombre.get(faseP.nombre) ?? null
            if (!faseId) {
              faseId = crypto.randomUUID()
              await tx.proyectoFase.create({ data: {
                id: faseId, proyectoId, proyectoCronogramaId: ejecucion.id, nombre: faseP.nombre, descripcion: faseP.descripcion,
                orden: faseP.orden, fechaInicioPlan: faseP.fechaInicioPlan, fechaFinPlan: faseP.fechaFinPlan, updatedAt: ahora,
              } })
              eFasePorNombre.set(faseP.nombre, faseId)
            }
          }
          edtId = crypto.randomUUID()
          await tx.proyectoEdt.create({ data: {
            id: edtId, proyectoId, proyectoCronogramaId: ejecucion.id, proyectoFaseId: faseId, edtId: edtP.edtId,
            nombre: edtP.nombre, descripcion: edtP.descripcion, orden: edtP.orden, prioridad: edtP.prioridad,
            responsableId: edtP.responsableId, fechaInicioPlan: edtP.fechaInicioPlan, fechaFinPlan: edtP.fechaFinPlan,
            horasPlan: edtP.horasPlan, updatedAt: ahora,
          } })
          eEdtPorNombre.set(edtP.nombre, edtId)
        }
        const actId = crypto.randomUUID()
        await tx.proyectoActividad.create({ data: {
          id: actId, proyectoEdtId: edtId, proyectoCronogramaId: ejecucion.id, nombre: pa.nombre,
          orden: siguiente(ordenAct, edtId), responsableId: pa.responsableId, descripcion: pa.descripcion, prioridad: pa.prioridad,
          fechaInicioPlan: pa.fechaInicioPlan, fechaFinPlan: pa.fechaFinPlan, horasPlan: pa.horasPlan,
          origenActividadId: pa.id, updatedAt: ahora,
        } })
        for (const pt of P.tareas.filter((t) => t.proyectoActividadId === pa.id)) {
          const id = crypto.randomUUID()
          await tx.proyectoTarea.create({ data: {
            ...datosTarea(pt), id, proyectoEdtId: edtId, proyectoCronogramaId: ejecucion.id, proyectoActividadId: actId, orden: pt.orden,
          } })
          nuevasTareas.set(pt.id, id)
        }
        actividadesTocadas.add(actId)
        resumen.creados++
      } else {
        const pt = pTar.get(item.clave.slice(4))!
        const actId = actMap.get(pt.proyectoActividadId!)!
        const id = crypto.randomUUID()
        await tx.proyectoTarea.create({ data: {
          ...datosTarea(pt), id, proyectoEdtId: eAct.get(actId)!.proyectoEdtId, proyectoCronogramaId: ejecucion.id,
          proyectoActividadId: actId, orden: siguiente(ordenTar, actId),
        } })
        nuevasTareas.set(pt.id, id)
        actividadesTocadas.add(actId)
        resumen.creados++
      }
    }

    for (const item of res.modificados) {
      if (!sel.has(item.clave)) continue
      if (item.tipo === 'actividad') {
        const eId = item.clave.slice(8)
        const pa = pAct.get([...actMap].find(([, e]) => e === eId)![0])!
        await tx.proyectoActividad.update({ where: { id: eId }, data: {
          nombre: pa.nombre, descripcion: pa.descripcion, responsableId: pa.responsableId, updatedAt: ahora,
        } })
      } else {
        const eId = item.clave.slice(8)
        const p = pTar.get([...tarMap].find(([, e]) => e === eId)![0])!
        await tx.proyectoTarea.update({ where: { id: eId }, data: {
          nombre: p.nombre, descripcion: p.descripcion, responsableId: p.responsableId,
          ...(item.protegido ? {} : {
            fechaInicio: p.fechaInicio, fechaFin: p.fechaFin, horasEstimadas: p.horasEstimadas,
            personasEstimadas: p.personasEstimadas, recursoId: p.recursoId, esHito: p.esHito, fechaLimite: p.fechaLimite,
          }),
          updatedAt: ahora,
        } })
        if (!item.protegido) { const a = eTar.get(eId)!.proyectoActividadId; if (a) actividadesTocadas.add(a) }
      }
      resumen.actualizados++
    }

    // Dependencias: las de tareas recién creadas van solas; entre existentes, solo las marcadas.
    const existentes = new Map(E.deps.map((d) => [`${d.tareaOrigenId}|${d.tareaDependienteId}`, d]))
    for (const d of P.deps) {
      const o = nuevasTareas.get(d.tareaOrigenId) ?? tarMap.get(d.tareaOrigenId)
      const de = nuevasTareas.get(d.tareaDependienteId) ?? tarMap.get(d.tareaDependienteId)
      if (!o || !de) continue
      const tocaNueva = nuevasTareas.has(d.tareaOrigenId) || nuevasTareas.has(d.tareaDependienteId)
      if (!tocaNueva && !sel.has(`dep:${d.tareaOrigenId}|${d.tareaDependienteId}`)) continue
      const actual = existentes.get(`${o}|${de}`)
      if (actual) {
        if (actual.tipo === d.tipo && actual.lagMinutos === d.lagMinutos) continue
        await tx.proyectoDependenciasTarea.update({ where: { id: actual.id }, data: { tipo: d.tipo, lagMinutos: d.lagMinutos } })
      } else {
        await tx.proyectoDependenciasTarea.create({ data: { id: crypto.randomUUID(), tareaOrigenId: o, tareaDependienteId: de, tipo: d.tipo, lagMinutos: d.lagMinutos } })
      }
      resumen.dependencias++
    }
  }, { timeout: 120000 })

  // Fechas y horas hacia arriba, solo de lo tocado.
  const edts = new Set<string>()
  for (const a of actividadesTocadas) {
    await recalcularActividadPadre(a)
    const act = await prisma.proyectoActividad.findUnique({ where: { id: a }, select: { proyectoEdtId: true } })
    if (act) edts.add(act.proyectoEdtId)
  }
  const fases = new Set<string>()
  for (const e of edts) {
    await recalcularEdtPadre(e)
    const edt = await prisma.proyectoEdt.findUnique({ where: { id: e }, select: { proyectoFaseId: true } })
    if (edt?.proyectoFaseId) fases.add(edt.proyectoFaseId)
  }
  for (const f of fases) await recalcularFasePadre(f)

  return resumen
}
