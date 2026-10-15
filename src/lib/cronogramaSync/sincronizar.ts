// Sincronización de un cronograma de GYS con lo que vuelve de MS Project.
//
// A diferencia de la importación que reemplaza todo, aquí cada elemento se
// reconoce por su GYS ID (Text1) y solo se cambia lo que cambió en MS Project.
// Así se conservan horas registradas, avance, responsables y el vínculo con el
// catálogo. Primero se calcula un plan (vista previa, sin escribir nada) y solo
// se aplica cuando el usuario lo confirma.
//
// Alcance:
// - Tareas: nombre, inicio/fin (hora de obra), hito, fecha límite, trabajo
//   (HH → horas por persona según el recurso), notas, recurso (por nombre),
//   actividad padre y orden.
// - Actividades: nombre, EDT padre y orden. Sus fechas salen de sus tareas.
// - Fases y EDTs: nombre. No se crean ni borran desde MS Project (el EDT va
//   ligado al catálogo); si aparecen o faltan, se avisa.
// - Nuevas actividades y tareas creadas en MS Project se crean en GYS.
// - Faltantes en el archivo: se proponen para eliminar; las que tienen horas
//   registradas o avance quedan protegidas y no se borran.
// - Dependencias entre tareas: se agregan, quitan o actualizan (tipo, desfase).

import { prisma } from '@/lib/prisma'
import { recalcularActividadPadre, recalcularEdtPadre, recalcularFasePadre } from '@/lib/utils/cronogramaRollup'
import type { FilaImportada, TipoVinculo } from './leerArchivoMsProject'

type TipoNodo = 'fase' | 'edt' | 'actividad' | 'tarea'

export interface CambioCampo { campo: string; antes: string | number | boolean | null; despues: string | number | boolean | null }
export interface CambioElemento { gysId: string; tipo: TipoNodo; nombre: string; campos: CambioCampo[] }
export interface ElementoNuevo { fila: number; tipo: 'actividad' | 'tarea'; nombre: string; padre: string; inicio: string | null; fin: string | null }
export interface ElementoEliminado { gysId: string; tipo: 'actividad' | 'tarea'; nombre: string; protegido: boolean; motivo?: string }
export interface DependenciaPlan { origen: string; dependiente: string; origenNombre: string; dependienteNombre: string; tipo: TipoVinculo; lagMinutos: number; antes?: { tipo: string; lagMinutos: number } }

export interface PlanSincronizacion {
  totalFilas: number
  coincidencias: number
  cambios: CambioElemento[]
  nuevos: ElementoNuevo[]
  eliminados: ElementoEliminado[]
  dependencias: { agregar: DependenciaPlan[]; quitar: DependenciaPlan[]; cambiar: DependenciaPlan[] }
  advertencias: string[]
  /** true si el archivo no corresponde a este cronograma (no se permite aplicar). */
  bloqueado: boolean
}

const MIN = 60000
const mismoInstante = (a: Date | null, b: Date | null) =>
  (!a && !b) || (!!a && !!b && Math.abs(a.getTime() - b.getTime()) < MIN)
const r2 = (n: number) => Math.round(n * 100) / 100
const fechaTxt = (d: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : null)

async function cargarCronograma(cronogramaId: string) {
  const [fases, edts, actividades, tareas, recursos] = await Promise.all([
    prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true, nombre: true } }),
    prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true, nombre: true, proyectoFaseId: true } }),
    prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true, nombre: true, proyectoEdtId: true, orden: true } }),
    prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronogramaId },
      select: {
        id: true, nombre: true, proyectoActividadId: true, proyectoEdtId: true, fechaInicio: true, fechaFin: true,
        horasEstimadas: true, esHito: true, fechaLimite: true, descripcion: true, recursoId: true, orden: true,
        esExtra: true, porcentajeCompletado: true,
        recurso: { select: { nombre: true, tipo: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } },
        _count: { select: { registroHoras: true, registrosCampoTarea: true, registrosAvance: true } },
      },
    }),
    prisma.recurso.findMany({ select: { id: true, nombre: true, tipo: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } }),
  ])
  const tareaIds = tareas.map((t) => t.id)
  const deps = tareaIds.length
    ? await prisma.proyectoDependenciasTarea.findMany({
        where: { tareaOrigenId: { in: tareaIds }, tareaDependienteId: { in: tareaIds } },
        select: { id: true, tareaOrigenId: true, tareaDependienteId: true, tipo: true, lagMinutos: true },
      })
    : []
  return { fases, edts, actividades, tareas, recursos, deps }
}

/**
 * Personas del recurso, igual que las HH del árbol (calcularHHRealDeTarea):
 * individual = 1; cuadrilla = suma de sus perfiles activos.
 */
const personasDe = (r: { tipo: string; perfiles: { cantidad: number }[] } | null | undefined) =>
  !r || r.tipo === 'individual' ? 1 : r.perfiles.reduce((s, c) => s + c.cantidad, 0)

export async function calcularPlanSincronizacion(cronogramaId: string, filas: FilaImportada[]): Promise<PlanSincronizacion> {
  const datos = await cargarCronograma(cronogramaId)
  const plan: PlanSincronizacion = {
    totalFilas: filas.length, coincidencias: 0, cambios: [], nuevos: [], eliminados: [],
    dependencias: { agregar: [], quitar: [], cambiar: [] }, advertencias: [], bloqueado: false,
  }

  const existentes = new Map<string, { tipo: TipoNodo; nombre: string }>()
  datos.fases.forEach((f) => existentes.set(`fase-${f.id}`, { tipo: 'fase', nombre: f.nombre }))
  datos.edts.forEach((e) => existentes.set(`edt-${e.id}`, { tipo: 'edt', nombre: e.nombre }))
  datos.actividades.forEach((a) => existentes.set(`actividad-${a.id}`, { tipo: 'actividad', nombre: a.nombre }))
  datos.tareas.forEach((t) => existentes.set(`tarea-${t.id}`, { tipo: 'tarea', nombre: t.nombre }))
  const tareaPorId = new Map(datos.tareas.map((t) => [t.id, t]))
  const actividadPorId = new Map(datos.actividades.map((a) => [a.id, a]))
  const recursoPorNombre = new Map(datos.recursos.map((r) => [r.nombre.trim().toLowerCase(), r]))

  // Jerarquía del archivo: padre = la fila anterior más cercana con menor nivel.
  const padreDe = new Map<number, FilaImportada | null>()
  const pila: FilaImportada[] = []
  for (const f of filas) {
    while (pila.length && pila[pila.length - 1].nivel >= f.nivel) pila.pop()
    padreDe.set(f.fila, pila[pila.length - 1] ?? null)
    pila.push(f)
  }

  // Tipo y referencia (GYS ID o "nuevo-<fila>") de cada fila.
  const tipoDe = new Map<number, TipoNodo | null>()
  const refDe = new Map<number, string>()
  const vistos = new Set<string>()
  const SIGUIENTE: Record<string, TipoNodo | null> = { fase: 'edt', edt: 'actividad', actividad: 'tarea', tarea: null }

  for (const f of filas) {
    const existe = f.gysId ? existentes.get(f.gysId) : undefined
    if (f.gysId && existe && !vistos.has(f.gysId)) {
      vistos.add(f.gysId)
      plan.coincidencias++
      tipoDe.set(f.fila, existe.tipo)
      refDe.set(f.fila, f.gysId)
      continue
    }
    if (f.gysId && !existe) plan.advertencias.push(`"${f.nombre}" trae un GYS ID que no es de este cronograma: se trata como nueva.`)
    const padre = padreDe.get(f.fila)
    const tipoPadre = padre ? tipoDe.get(padre.fila) ?? null : null
    const tipo = padre ? (tipoPadre ? SIGUIENTE[tipoPadre] : null) : 'fase'
    if (tipo === 'actividad' || tipo === 'tarea') {
      tipoDe.set(f.fila, tipo)
      refDe.set(f.fila, `nuevo-${f.fila}`)
      plan.nuevos.push({ fila: f.fila, tipo, nombre: f.nombre, padre: padre!.nombre, inicio: f.inicio, fin: f.fin })
    } else {
      tipoDe.set(f.fila, null)
      const motivo = tipo === 'fase' || tipo === 'edt'
        ? `es un${tipo === 'edt' ? ' EDT' : 'a fase'} nuevo: créalo en GYS (va ligado al catálogo) y vuelve a importar`
        : tipoPadre === 'tarea' ? 'está debajo de una tarea, y en GYS las tareas no tienen subtareas'
        : 'su elemento padre no se puede crear'
      plan.advertencias.push(`"${f.nombre}" no se importa: ${motivo}.`)
    }
  }

  if (plan.coincidencias === 0 && existentes.size > 0) {
    plan.bloqueado = true
    plan.advertencias.unshift('Ningún elemento del archivo coincide con este cronograma (sin GYS ID o de otro cronograma). Exporta desde este cronograma, edítalo en MS Project y vuelve a importar.')
  }

  // Cambios en elementos existentes.
  for (const f of filas) {
    const ref = refDe.get(f.fila)
    if (!ref || ref.startsWith('nuevo-')) continue
    const tipo = tipoDe.get(f.fila)!
    const id = ref.replace(/^(fase|edt|actividad|tarea)-/, '')
    const campos: CambioCampo[] = []
    const nombreActual = existentes.get(ref)!.nombre
    if (f.nombre.trim() !== nombreActual.trim()) campos.push({ campo: 'Nombre', antes: nombreActual, despues: f.nombre })

    const padre = padreDe.get(f.fila)
    const padreRef = padre ? refDe.get(padre.fila) : undefined

    if (tipo === 'tarea') {
      const t = tareaPorId.get(id)!
      if (f.esResumen) plan.advertencias.push(`"${f.nombre}" tiene filas debajo en MS Project; en GYS una tarea no tiene subtareas, se ignoran.`)
      const ini = f.inicio ? new Date(f.inicio) : null
      const fin = f.esHito ? ini : f.fin ? new Date(f.fin) : null
      if (ini && !mismoInstante(ini, t.fechaInicio)) campos.push({ campo: 'Inicio', antes: fechaTxt(t.fechaInicio), despues: fechaTxt(ini) })
      if (fin && !mismoInstante(fin, t.fechaFin)) campos.push({ campo: 'Fin', antes: fechaTxt(t.fechaFin), despues: fechaTxt(fin) })
      if (f.esHito !== t.esHito) {
        campos.push({ campo: 'Hito', antes: t.esHito, despues: f.esHito })
        // Una tarea con duración que llega como hito pierde su duración: avisar
        // (pasaba con XML viejos, que MS Project abría con trabajo 0 como hitos).
        if (f.esHito && t.fechaFin.getTime() > t.fechaInicio.getTime()) {
          plan.advertencias.push(`"${t.nombre}" pasaría a hito y perdería su duración. Si no la marcaste como hito en MS Project, no apliques: vuelve a exportar el XML desde GYS y edita esa copia.`)
        }
      }
      const limiteActual = t.fechaLimite ? t.fechaLimite.toISOString().slice(0, 10) : null
      const limiteNuevo = f.esHito ? f.fechaLimite : null
      if ((limiteNuevo ?? null) !== limiteActual) campos.push({ campo: 'Fecha límite', antes: limiteActual, despues: limiteNuevo })
      // Recurso por nombre (solo si el archivo lo trae y existe en GYS).
      let recursoNuevo = t.recurso
      if (f.recursoNombre && f.recursoNombre.trim().toLowerCase() !== (t.recurso?.nombre ?? '').trim().toLowerCase()) {
        const r = recursoPorNombre.get(f.recursoNombre.trim().toLowerCase())
        if (r) { campos.push({ campo: 'Recurso', antes: t.recurso?.nombre ?? null, despues: r.nombre }); recursoNuevo = r }
        else plan.advertencias.push(`"${f.nombre}": el recurso "${f.recursoNombre}" no existe en GYS; se mantiene ${t.recurso?.nombre ?? 'sin recurso'}.`)
      }
      // Trabajo (HH) → horas por persona según el recurso. Sin recurso no se toca:
      // en GYS sus HH son 0 y MS Project tampoco le asigna trabajo, así que el 0
      // del archivo no significa que se hayan quitado las horas.
      // Igual con una cuadrilla sin perfiles activos (0 personas → HH 0 en GYS).
      if (f.trabajoHoras !== null && !f.esHito && recursoNuevo && personasDe(recursoNuevo) > 0) {
        const horasNuevas = r2(f.trabajoHoras / personasDe(recursoNuevo))
        if (Math.abs(horasNuevas - Number(t.horasEstimadas ?? 0)) > 0.01) {
          campos.push({ campo: 'Trabajo (h por persona)', antes: r2(Number(t.horasEstimadas ?? 0)), despues: horasNuevas })
        }
      }
      if (f.notas && f.notas.trim() !== (t.descripcion ?? '').trim()) campos.push({ campo: 'Notas', antes: t.descripcion ?? null, despues: f.notas })
      if (padreRef && padreRef.startsWith('actividad-') && padreRef !== `actividad-${t.proyectoActividadId}`) {
        campos.push({ campo: 'Actividad', antes: actividadPorId.get(t.proyectoActividadId ?? '')?.nombre ?? null, despues: padre!.nombre })
      } else if (padreRef?.startsWith('nuevo-')) {
        campos.push({ campo: 'Actividad', antes: actividadPorId.get(t.proyectoActividadId ?? '')?.nombre ?? null, despues: `${padre!.nombre} (nueva)` })
      }
    } else if (tipo === 'actividad') {
      const a = actividadPorId.get(id)!
      if (padreRef && padreRef.startsWith('edt-') && padreRef !== `edt-${a.proyectoEdtId}`) {
        campos.push({ campo: 'EDT', antes: datos.edts.find((e) => e.id === a.proyectoEdtId)?.nombre ?? null, despues: padre!.nombre })
      }
    }
    if (campos.length) plan.cambios.push({ gysId: ref, tipo, nombre: f.nombre, campos })
  }

  // Faltantes en el archivo (no extras: esas no se exportan).
  const enArchivo = new Set([...refDe.values()])
  const protegerTarea = (t: (typeof datos.tareas)[number]) => {
    if (t._count.registroHoras + t._count.registrosCampoTarea > 0) return 'tiene horas registradas'
    if (t._count.registrosAvance > 0 || t.porcentajeCompletado > 0) return 'tiene avance registrado'
    return undefined
  }
  for (const a of datos.actividades) {
    if (enArchivo.has(`actividad-${a.id}`)) continue
    const suyas = datos.tareas.filter((t) => t.proyectoActividadId === a.id && !t.esExtra)
    const motivo = suyas.map(protegerTarea).find(Boolean)
    plan.eliminados.push({ gysId: `actividad-${a.id}`, tipo: 'actividad', nombre: a.nombre, protegido: !!motivo, motivo: motivo ? `una de sus tareas ${motivo}` : undefined })
  }
  for (const t of datos.tareas) {
    // Extras y tareas sueltas (sin actividad) no se exportan: no se proponen para borrar.
    if (t.esExtra || !t.proyectoActividadId || enArchivo.has(`tarea-${t.id}`)) continue
    const motivo = protegerTarea(t)
    plan.eliminados.push({ gysId: `tarea-${t.id}`, tipo: 'tarea', nombre: t.nombre, protegido: !!motivo, motivo })
  }
  for (const f of datos.fases) if (!enArchivo.has(`fase-${f.id}`)) plan.advertencias.push(`La fase "${f.nombre}" no está en el archivo; no se borra (hazlo en GYS si corresponde).`)
  for (const e of datos.edts) if (!enArchivo.has(`edt-${e.id}`)) plan.advertencias.push(`El EDT "${e.nombre}" no está en el archivo; no se borra (hazlo en GYS si corresponde).`)

  // Dependencias entre tareas (las de tareas no importadas se ignoran).
  const refPorFila = new Map<number, string>()
  for (const f of filas) { const ref = refDe.get(f.fila); if (ref && tipoDe.get(f.fila) === 'tarea') refPorFila.set(f.fila, ref) }
  const nombrePorRef = new Map<string, string>()
  for (const f of filas) { const ref = refDe.get(f.fila); if (ref) nombrePorRef.set(ref, f.nombre) }
  const deseadas = new Map<string, DependenciaPlan>()
  for (const f of filas) {
    const dep = refPorFila.get(f.fila); if (!dep) continue
    for (const p of f.predecesoras) {
      const ori = refPorFila.get(p.fila); if (!ori || ori === dep) continue
      deseadas.set(`${ori}|${dep}`, { origen: ori, dependiente: dep, origenNombre: nombrePorRef.get(ori) ?? '', dependienteNombre: nombrePorRef.get(dep) ?? '', tipo: p.tipo, lagMinutos: p.lagMinutos })
    }
  }
  for (const d of datos.deps) {
    const clave = `tarea-${d.tareaOrigenId}|tarea-${d.tareaDependienteId}`
    const quiero = deseadas.get(clave)
    // Si alguna de las dos tareas no vino en el archivo, la dependencia se resuelve con su eliminación.
    if (!enArchivo.has(`tarea-${d.tareaOrigenId}`) || !enArchivo.has(`tarea-${d.tareaDependienteId}`)) continue
    if (!quiero) {
      plan.dependencias.quitar.push({ origen: `tarea-${d.tareaOrigenId}`, dependiente: `tarea-${d.tareaDependienteId}`, origenNombre: tareaPorId.get(d.tareaOrigenId)!.nombre, dependienteNombre: tareaPorId.get(d.tareaDependienteId)!.nombre, tipo: d.tipo as TipoVinculo, lagMinutos: d.lagMinutos })
    } else if (quiero.tipo !== d.tipo || quiero.lagMinutos !== d.lagMinutos) {
      plan.dependencias.cambiar.push({ ...quiero, antes: { tipo: d.tipo, lagMinutos: d.lagMinutos } })
    }
    deseadas.delete(clave)
  }
  plan.dependencias.agregar = [...deseadas.values()]
  return plan
}

/**
 * Aplica la sincronización. El plan se recalcula aquí (no se confía en el del
 * navegador). `eliminar`: GYS IDs que el usuario confirmó borrar; los
 * protegidos nunca se borran.
 */
export async function aplicarSincronizacion(cronogramaId: string, filas: FilaImportada[], eliminar: string[]) {
  const plan = await calcularPlanSincronizacion(cronogramaId, filas)
  if (plan.bloqueado) throw new Error('El archivo no corresponde a este cronograma')
  const datos = await cargarCronograma(cronogramaId)
  const tareaPorId = new Map(datos.tareas.map((t) => [t.id, t]))
  const recursoPorNombre = new Map(datos.recursos.map((r) => [r.nombre.trim().toLowerCase(), r]))
  const ahora = () => new Date()

  // Jerarquía y referencias (igual que en el plan).
  const padreDe = new Map<number, FilaImportada | null>()
  const pila: FilaImportada[] = []
  for (const f of filas) {
    while (pila.length && pila[pila.length - 1].nivel >= f.nivel) pila.pop()
    padreDe.set(f.fila, pila[pila.length - 1] ?? null)
    pila.push(f)
  }
  const nuevosPorFila = new Map(plan.nuevos.map((n) => [n.fila, n]))
  const idPorFila = new Map<number, string>() // fila → "tipo-uuid" real (existente o recién creado)
  for (const f of filas) if (f.gysId && !nuevosPorFila.has(f.fila)) idPorFila.set(f.fila, f.gysId)

  const resumen = { actualizados: 0, creados: 0, eliminados: 0, dependencias: 0 }
  // Solo se escribe lo que cambió (más el orden, si en MS Project se movió la fila).
  const conCambios = new Set(plan.cambios.map((c) => c.gysId))
  const ordenPorPadre = new Map<string, number>()
  const siguienteOrden = (padre: string) => { const n = ordenPorPadre.get(padre) ?? 0; ordenPorPadre.set(padre, n + 1); return n }

  await prisma.$transaction(async (tx) => {
    for (const f of filas) {
      const padre = padreDe.get(f.fila)
      const padreRef = padre ? idPorFila.get(padre.fila) : undefined
      const nuevo = nuevosPorFila.get(f.fila)

      if (nuevo) {
        if (!padreRef) continue
        if (nuevo.tipo === 'actividad' && padreRef.startsWith('edt-')) {
          const id = crypto.randomUUID()
          const ini = f.inicio ? new Date(f.inicio) : new Date()
          await tx.proyectoActividad.create({ data: {
            id, proyectoEdtId: padreRef.slice(4), proyectoCronogramaId: cronogramaId, nombre: f.nombre,
            orden: siguienteOrden(padreRef), fechaInicioPlan: ini, fechaFinPlan: f.fin ? new Date(f.fin) : ini, updatedAt: ahora(),
          } })
          idPorFila.set(f.fila, `actividad-${id}`); resumen.creados++
        } else if (nuevo.tipo === 'tarea' && padreRef.startsWith('actividad-')) {
          const act = await tx.proyectoActividad.findUnique({ where: { id: padreRef.slice(10) }, select: { proyectoEdtId: true } })
          if (!act) continue
          const id = crypto.randomUUID()
          const ini = f.inicio ? new Date(f.inicio) : new Date()
          const r = f.recursoNombre ? recursoPorNombre.get(f.recursoNombre.trim().toLowerCase()) : undefined
          await tx.proyectoTarea.create({ data: {
            id, proyectoActividadId: padreRef.slice(10), proyectoEdtId: act.proyectoEdtId, proyectoCronogramaId: cronogramaId,
            nombre: f.nombre, descripcion: f.notas, orden: siguienteOrden(padreRef),
            fechaInicio: ini, fechaFin: f.esHito ? ini : f.fin ? new Date(f.fin) : ini,
            horasEstimadas: f.esHito ? 0 : r2((f.trabajoHoras ?? 0) / Math.max(1, personasDe(r))),
            esHito: f.esHito, fechaLimite: f.esHito && f.fechaLimite ? new Date(`${f.fechaLimite}T00:00:00Z`) : null,
            recursoId: r?.id ?? null, esExtra: false, updatedAt: ahora(),
          } })
          idPorFila.set(f.fila, `tarea-${id}`); resumen.creados++
        }
        continue
      }

      const ref = idPorFila.get(f.fila)
      if (!ref) continue
      if (ref.startsWith('tarea-')) {
        const t = tareaPorId.get(ref.slice(6)); if (!t) continue
        const ini = f.inicio ? new Date(f.inicio) : t.fechaInicio
        const r = f.recursoNombre ? recursoPorNombre.get(f.recursoNombre.trim().toLowerCase()) ?? t.recurso : t.recurso
        const recursoId = f.recursoNombre && recursoPorNombre.get(f.recursoNombre.trim().toLowerCase())
          ? recursoPorNombre.get(f.recursoNombre.trim().toLowerCase())!.id : t.recursoId
        const nuevaActividad = padreRef?.startsWith('actividad-') ? padreRef.slice(10) : t.proyectoActividadId
        const ordenNuevo = nuevaActividad ? siguienteOrden(`actividad-${nuevaActividad}`) : t.orden
        if (!conCambios.has(ref) && ordenNuevo === t.orden) continue
        let edtId = t.proyectoEdtId
        if (nuevaActividad && nuevaActividad !== t.proyectoActividadId) {
          edtId = (await tx.proyectoActividad.findUnique({ where: { id: nuevaActividad }, select: { proyectoEdtId: true } }))?.proyectoEdtId ?? edtId
        }
        await tx.proyectoTarea.update({ where: { id: t.id }, data: {
          nombre: f.nombre,
          fechaInicio: ini,
          fechaFin: f.esHito ? ini : f.fin ? new Date(f.fin) : t.fechaFin,
          esHito: f.esHito,
          fechaLimite: f.esHito ? (f.fechaLimite ? new Date(`${f.fechaLimite}T00:00:00Z`) : null) : null,
          ...(f.esHito ? { horasEstimadas: 0 } : f.trabajoHoras !== null && r && personasDe(r) > 0 ? { horasEstimadas: r2(f.trabajoHoras / personasDe(r)) } : {}),
          ...(f.notas ? { descripcion: f.notas } : {}),
          recursoId,
          proyectoActividadId: nuevaActividad,
          proyectoEdtId: edtId,
          orden: ordenNuevo,
          updatedAt: ahora(),
        } })
        if (conCambios.has(ref)) resumen.actualizados++
      } else if (ref.startsWith('actividad-')) {
        if (!conCambios.has(ref)) continue
        const nuevoEdt = padreRef?.startsWith('edt-') ? padreRef.slice(4) : undefined
        await tx.proyectoActividad.update({ where: { id: ref.slice(10) }, data: {
          nombre: f.nombre,
          ...(nuevoEdt ? { proyectoEdtId: nuevoEdt, orden: siguienteOrden(padreRef!) } : {}),
          updatedAt: ahora(),
        } })
        // Las tareas de una actividad que cambió de EDT van con ella.
        if (nuevoEdt) await tx.proyectoTarea.updateMany({ where: { proyectoActividadId: ref.slice(10) }, data: { proyectoEdtId: nuevoEdt } })
        resumen.actualizados++
      } else if (ref.startsWith('edt-')) {
        if (!conCambios.has(ref)) continue
        await tx.proyectoEdt.update({ where: { id: ref.slice(4) }, data: { nombre: f.nombre, updatedAt: ahora() } })
      } else if (ref.startsWith('fase-')) {
        if (!conCambios.has(ref)) continue
        await tx.proyectoFase.update({ where: { id: ref.slice(5) }, data: { nombre: f.nombre, updatedAt: ahora() } })
      }
    }

    // Dependencias: referencias "nuevo-<fila>" → id real recién creado.
    const real = (ref: string) => (ref.startsWith('nuevo-') ? idPorFila.get(Number(ref.slice(6))) : ref)?.replace(/^tarea-/, '')
    for (const d of plan.dependencias.quitar) {
      await tx.proyectoDependenciasTarea.deleteMany({ where: { tareaOrigenId: real(d.origen), tareaDependienteId: real(d.dependiente) } })
      resumen.dependencias++
    }
    for (const d of plan.dependencias.cambiar) {
      await tx.proyectoDependenciasTarea.updateMany({ where: { tareaOrigenId: real(d.origen), tareaDependienteId: real(d.dependiente) }, data: { tipo: d.tipo, lagMinutos: d.lagMinutos } })
      resumen.dependencias++
    }
    for (const d of plan.dependencias.agregar) {
      const o = real(d.origen); const de = real(d.dependiente)
      if (!o || !de) continue
      await tx.proyectoDependenciasTarea.create({ data: { id: crypto.randomUUID(), tareaOrigenId: o, tareaDependienteId: de, tipo: d.tipo, lagMinutos: d.lagMinutos } })
      resumen.dependencias++
    }

    // Eliminaciones confirmadas y no protegidas.
    const confirmadas = new Set(eliminar)
    for (const e of plan.eliminados) {
      if (e.protegido || !confirmadas.has(e.gysId)) continue
      if (e.tipo === 'tarea') {
        await tx.proyectoTarea.delete({ where: { id: e.gysId.slice(6) } })
      } else {
        await tx.proyectoTarea.deleteMany({ where: { proyectoActividadId: e.gysId.slice(10) } })
        await tx.proyectoActividad.delete({ where: { id: e.gysId.slice(10) } })
      }
      resumen.eliminados++
    }
  }, { timeout: 120000 })

  // Fechas y horas de actividades, EDTs y fases desde sus tareas.
  const [acts, edts, fases] = await Promise.all([
    prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
    prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
    prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
  ])
  for (const a of acts) await recalcularActividadPadre(a.id)
  for (const e of edts) await recalcularEdtPadre(e.id)
  for (const f of fases) await recalcularFasePadre(f.id)
  return resumen
}
