// "Ajustar tareas a sus predecesoras" — un solo motor para todos los alcances:
// actividad, EDT, fase, todo el cronograma y la programación automática (las
// tareas que dependen de las que se acaban de cambiar).
//
// Compacta (como MS Project en automático): cada tarea con predecesoras va
// exactamente a donde la exigen TODAS (manda la más exigente), con su desfase
// (+5d / −7d). Se recorren en orden de dependencias, así un cambio se propaga
// en cascada. No se mueven:
//   - las tareas sin predecesoras (son anclas),
//   - las tareas con 📌 fecha fija (fechaFija), aunque tengan predecesoras.
// Conserva la duración en horas laborables. Las tareas fuera del alcance
// cuentan como predecesoras, pero no se tocan.

import { prisma } from '@/lib/prisma'
import { obtenerCalendarioProyecto } from '@/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre } from '@/lib/services/cronogramaHoras'
import { fechasPorPredecesoras } from '@/lib/services/cronogramaDependencias'
import { recalcularFechasPadresDeTarea } from '@/lib/services/cronogramaRollupFechas'

export type AlcanceAjuste =
  | { tipo: 'actividad'; id: string }
  | { tipo: 'edt'; id: string }
  | { tipo: 'fase'; id: string }
  | { tipo: 'cronograma'; id: string }
  /** Las tareas que dependen (en cascada) de estas — sin incluirlas a ellas. */
  | { tipo: 'sucesoras'; tareaIds: string[]; incluirPropias?: boolean }

export interface CambioFecha {
  id: string
  nombre: string
  actividadId: string | null
  antes: { inicio: Date; fin: Date }
  despues: { inicio: Date; fin: Date }
}

export interface ResultadoAjuste {
  cronogramaId: string | null
  totalTareas: number
  cambios: CambioFecha[]
  /** Fin más tardío del alcance antes y después. */
  finAntes: Date | null
  finDespues: Date | null
  /** Mayor atraso (horas laborables, +) y mayor adelanto (−) de una tarea. */
  maxAtrasoHoras: number
  maxAdelantoHoras: number
  /** Tareas fijas (📌) del alcance que no cumplen sus predecesoras (solo se avisan). */
  fijasIncumplidas: number
}

const SELECT = {
  id: true, nombre: true, fechaInicio: true, fechaFin: true, esHito: true, fechaFija: true,
  proyectoActividadId: true, proyectoCronogramaId: true,
  dependenciasComoDependiente: {
    select: { tipo: true, lagMinutos: true, tareaOrigenId: true, tareaOrigen: { select: { fechaInicio: true, fechaFin: true } } },
  },
} as const

async function tareasDelAlcance(proyectoId: string, a: AlcanceAjuste) {
  const orden = [{ proyectoEdt: { orden: 'asc' as const } }, { proyectoActividad: { orden: 'asc' as const } }, { orden: 'asc' as const }]
  switch (a.tipo) {
    case 'actividad':
      return prisma.proyectoTarea.findMany({ where: { proyectoActividadId: a.id, proyectoEdt: { proyectoId } }, orderBy: { orden: 'asc' }, select: SELECT })
    case 'edt':
      return prisma.proyectoTarea.findMany({ where: { proyectoEdtId: a.id, proyectoEdt: { proyectoId } }, orderBy: orden, select: SELECT })
    case 'fase':
      return prisma.proyectoTarea.findMany({ where: { proyectoEdt: { proyectoFaseId: a.id, proyectoId } }, orderBy: orden, select: SELECT })
    case 'cronograma':
      return prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: a.id, proyectoEdt: { proyectoId } }, orderBy: orden, select: SELECT })
    case 'sucesoras': {
      if (!a.tareaIds.length) return []
      const base = await prisma.proyectoTarea.findFirst({ where: { id: a.tareaIds[0] }, select: { proyectoCronogramaId: true } })
      if (!base) return []
      // Grafo de dependencias del cronograma → sucesoras en cascada.
      const deps = await prisma.proyectoDependenciasTarea.findMany({
        where: { tareaOrigen: { proyectoCronogramaId: base.proyectoCronogramaId } },
        select: { tareaOrigenId: true, tareaDependienteId: true },
      })
      const hijos = new Map<string, string[]>()
      for (const d of deps) hijos.set(d.tareaOrigenId, [...(hijos.get(d.tareaOrigenId) ?? []), d.tareaDependienteId])
      const vistas = new Set<string>(a.incluirPropias ? a.tareaIds : [])
      const cola = [...a.tareaIds]
      while (cola.length) {
        for (const h of hijos.get(cola.shift()!) ?? []) if (!vistas.has(h)) { vistas.add(h); cola.push(h) }
      }
      if (!a.incluirPropias) for (const id of a.tareaIds) vistas.delete(id)
      if (!vistas.size) return []
      return prisma.proyectoTarea.findMany({ where: { id: { in: [...vistas] }, proyectoEdt: { proyectoId } }, orderBy: orden, select: SELECT })
    }
  }
}

/** Calcula qué se movería (no guarda nada). */
export async function calcularAjuste(proyectoId: string, alcance: AlcanceAjuste): Promise<ResultadoAjuste | { error: string }> {
  const tareas = await tareasDelAlcance(proyectoId, alcance)
  const cal = await obtenerCalendarioProyecto(proyectoId)
  const propias = new Set(tareas.map(t => t.id))
  const fechas = new Map(tareas.map(t => [t.id, { inicio: t.fechaInicio, fin: t.fechaFin }]))
  const cambios: CambioFecha[] = []
  let fijasIncumplidas = 0

  const pendientes = [...tareas]
  while (pendientes.length) {
    const i = pendientes.findIndex(t =>
      t.dependenciasComoDependiente.every(d => !propias.has(d.tareaOrigenId) || !pendientes.some(p => p.id === d.tareaOrigenId)))
    if (i < 0) return { error: 'Hay un ciclo de dependencias entre las tareas' }
    const t = pendientes.splice(i, 1)[0]
    if (!t.dependenciasComoDependiente.length) continue
    const actual = fechas.get(t.id)!
    const duracion = t.esHito ? 0 : horasLaborablesEntre(cal, actual.inicio, actual.fin)
    const req = fechasPorPredecesoras(cal, t.dependenciasComoDependiente.map(d => ({
      tipo: d.tipo, lagMinutos: d.lagMinutos,
      pred: fechas.get(d.tareaOrigenId) ?? { inicio: d.tareaOrigen.fechaInicio, fin: d.tareaOrigen.fechaFin },
    })), duracion)
    if (t.fechaFija) {
      // 📌 No se mueve; solo se cuenta si su predecesora la alcanza.
      if (req.inicio.getTime() > actual.inicio.getTime()) fijasIncumplidas++
      continue
    }
    if (req.inicio.getTime() === actual.inicio.getTime() && req.fin.getTime() === actual.fin.getTime()) continue
    fechas.set(t.id, { inicio: req.inicio, fin: req.fin })
    cambios.push({ id: t.id, nombre: t.nombre, actividadId: t.proyectoActividadId, antes: actual, despues: { inicio: req.inicio, fin: req.fin } })
  }

  const maxFin = (xs: Date[]) => (xs.length ? new Date(Math.max(...xs.map(d => d.getTime()))) : null)
  let maxAtrasoHoras = 0, maxAdelantoHoras = 0
  for (const c of cambios) {
    const h = c.despues.inicio > c.antes.inicio
      ? horasLaborablesEntre(cal, c.antes.inicio, c.despues.inicio)
      : -horasLaborablesEntre(cal, c.despues.inicio, c.antes.inicio)
    maxAtrasoHoras = Math.max(maxAtrasoHoras, h)
    maxAdelantoHoras = Math.min(maxAdelantoHoras, h)
  }
  return {
    cronogramaId: tareas[0]?.proyectoCronogramaId ?? null,
    totalTareas: tareas.length,
    cambios,
    finAntes: maxFin(tareas.map(t => t.fechaFin)),
    finDespues: maxFin([...fechas.values()].map(f => f.fin)),
    maxAtrasoHoras: Math.round(maxAtrasoHoras * 100) / 100,
    maxAdelantoHoras: Math.round(maxAdelantoHoras * 100) / 100,
    fijasIncumplidas,
  }
}

/** Guarda fechas de tareas y recalcula actividad / EDT / fase de las tocadas. */
export async function guardarFechas(cambios: { id: string; actividadId: string | null; inicio: Date; fin: Date }[]) {
  if (!cambios.length) return
  const ahora = new Date()
  await prisma.$transaction(cambios.map(c => prisma.proyectoTarea.update({
    where: { id: c.id },
    data: { fechaInicio: c.inicio, fechaFin: c.fin, updatedAt: ahora },
  })))
  const porActividad = new Map(cambios.map(c => [c.actividadId ?? c.id, c.id]))
  for (const tareaId of porActividad.values()) await recalcularFechasPadresDeTarea(tareaId)
}

/** Para "Deshacer": las fechas anteriores de lo que se movió. */
export const paraDeshacer = (r: ResultadoAjuste) =>
  r.cambios.map(c => ({ id: c.id, actividadId: c.actividadId, inicio: c.antes.inicio.toISOString(), fin: c.antes.fin.toISOString() }))

export async function aplicarAjuste(r: ResultadoAjuste) {
  await guardarFechas(r.cambios.map(c => ({ id: c.id, actividadId: c.actividadId, inicio: c.despues.inicio, fin: c.despues.fin })))
}

/**
 * Programación automática: si el cronograma la tiene encendida, ajusta las
 * tareas que dependen (en cascada) de las indicadas. `incluirPropias` para
 * cuando cambió una dependencia de esas tareas (ellas también se ubican).
 * Devuelve lo hecho (para el aviso con "Deshacer") o null si no aplica.
 */
export async function propagarSiAutomatico(proyectoId: string, tareaIds: string[], incluirPropias = false) {
  if (!tareaIds.length) return null
  const t = await prisma.proyectoTarea.findFirst({
    where: { id: tareaIds[0] },
    select: { proyectoCronograma: { select: { programacionAutomatica: true } } },
  })
  if (!t?.proyectoCronograma.programacionAutomatica) return null
  const r = await calcularAjuste(proyectoId, { tipo: 'sucesoras', tareaIds, incluirPropias })
  if ('error' in r || !r.cambios.length) return null
  await aplicarAjuste(r)
  return {
    tareasAjustadas: r.cambios.length,
    finAntes: r.finAntes,
    finDespues: r.finDespues,
    deshacer: paraDeshacer(r),
  }
}
