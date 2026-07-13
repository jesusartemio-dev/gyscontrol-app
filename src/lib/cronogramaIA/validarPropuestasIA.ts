import type { ActividadPropuesta, CatalogoServicioParaWizard, NombreConAlias, TareaPropuesta } from '@/types/cronogramaIA'
import { construirTareaPropuesta, ordenarPorCatalogo } from './reglasActividades'
import { aplicarPrefijoDeActividad } from './aliasActividad'

export const MAX_REINTENTOS = 1

export interface GrupoPropuestoIA {
  nombre: string
  catalogoServicioIds: string[]
  /** Alias ya resuelto (Etapa B de CON/PRO, ver validarAsignacionEsquema) — si se omite, se deriva genéricamente del nombre (PLC/HMI). */
  alias?: string
}

export interface ResultadoValidacionGrupos {
  actividades: ActividadPropuesta[]
  tareaIdsNoAsignadas: string[]
  tareaIdsInventados: string[]
  advertencias: string[]
}

/**
 * Guardrail de membership (no de set exacto, a diferencia de
 * mergearDescripcionesEnEstructura en Plan de Trabajo) — la IA inventa
 * nombres de grupo libremente, pero cada tarea que asigna DEBE ser un id
 * real del catálogo ya filtrado por alcance que se le pasó en el prompt.
 * Ids inventados se descartan y quedan registrados; ids permitidos que la
 * IA no asignó a ningún grupo caen en un grupo "Sin agrupar" por defecto —
 * nunca se pierde una tarea silenciosamente.
 */
export function validarPropuestaGrupos(
  grupos: GrupoPropuestoIA[],
  serviciosPermitidos: CatalogoServicioParaWizard[],
  config: Parameters<typeof construirTareaPropuesta>[1],
  edtNombre: string
): ResultadoValidacionGrupos {
  const serviciosPorId = new Map(serviciosPermitidos.map(s => [s.id, s]))
  const idsAsignados = new Set<string>()
  const tareaIdsInventados: string[] = []
  const advertencias: string[] = []

  let actividades: ActividadPropuesta[] = []
  const aliasPropuestoPorNombre = new Map<string, string>()

  for (const grupo of grupos) {
    if (!grupo.nombre || grupo.nombre.trim().length === 0) continue

    const tareas: TareaPropuesta[] = []
    for (const id of grupo.catalogoServicioIds) {
      const servicio = serviciosPorId.get(id)
      if (!servicio) {
        tareaIdsInventados.push(id)
        continue
      }
      idsAsignados.add(id)
      tareas.push(construirTareaPropuesta(servicio, config))
    }

    if (tareas.length > 0) {
      const actividadNombre = grupo.nombre.trim()
      actividades.push({ edtNombre, actividadNombre, tareas: ordenarPorCatalogo(tareas), origen: 'ia' })
      if (grupo.alias) aliasPropuestoPorNombre.set(actividadNombre, grupo.alias)
    }
  }

  // Prefijo de tareas por alias de Actividad — ANTES de agregar "Sin
  // agrupar" (nunca se prefija: no es una instancia real, es un catch-all
  // temporal para que el usuario reasigne a mano).
  actividades = aplicarPrefijoDeActividad(actividades, aliasPropuestoPorNombre)

  const tareaIdsNoAsignadas = serviciosPermitidos.map(s => s.id).filter(id => !idsAsignados.has(id))
  if (tareaIdsNoAsignadas.length > 0) {
    const tareasSinAgrupar = ordenarPorCatalogo(tareaIdsNoAsignadas.map(id => construirTareaPropuesta(serviciosPorId.get(id)!, config)))
    actividades.push({ edtNombre, actividadNombre: 'Sin agrupar', tareas: tareasSinAgrupar, origen: 'determinista' })
    advertencias.push(`${edtNombre}: ${tareaIdsNoAsignadas.length} tarea(s) que la IA no agrupó se colocaron en "Sin agrupar".`)
  }

  if (tareaIdsInventados.length > 0) {
    advertencias.push(`${edtNombre}: la IA devolvió ${tareaIdsInventados.length} id(s) de tarea que no existen en el catálogo filtrado — se descartaron.`)
  }

  return { actividades, tareaIdsNoAsignadas, tareaIdsInventados, advertencias }
}

export interface AsignacionPropuestaIA {
  actividadNombre: string
  catalogoServicioIds: string[]
}

/**
 * Validación de la Etapa B del flujo de esquemas (CON/PRO) — los nombres de
 * Actividad ya están FIJOS (el usuario los eligió/editó en la Etapa A), a
 * diferencia de validarPropuestaGrupos donde la IA puede nombrar lo que
 * quiera. Cualquier asignación con un actividadNombre fuera de la lista
 * elegida se descarta igual que un id inventado — sus tareas caen en "Sin
 * agrupar" vía el mismo mecanismo de ids no asignados. Los nombres del
 * esquema elegido que terminan sin ninguna tarea asignada se preservan como
 * Actividad vacía, para que el usuario pueda mover tareas ahí manualmente
 * en vez de que la Actividad simplemente desaparezca.
 */
export function validarAsignacionEsquema(
  asignaciones: AsignacionPropuestaIA[],
  nombresActividades: NombreConAlias[],
  serviciosPermitidos: CatalogoServicioParaWizard[],
  config: Parameters<typeof construirTareaPropuesta>[1],
  edtNombre: string
): ResultadoValidacionGrupos {
  const aliasPorNombre = new Map(nombresActividades.map(n => [n.nombre.trim(), n.alias]))
  const nombresPermitidos = new Set(nombresActividades.map(n => n.nombre.trim()))
  const gruposValidos: GrupoPropuestoIA[] = []
  let tareasConNombreInvalido = 0

  for (const a of asignaciones) {
    const nombre = (a.actividadNombre ?? '').trim()
    if (nombresPermitidos.has(nombre)) {
      gruposValidos.push({ nombre, catalogoServicioIds: a.catalogoServicioIds, alias: aliasPorNombre.get(nombre) })
    } else {
      tareasConNombreInvalido += a.catalogoServicioIds.length
    }
  }

  const resultado = validarPropuestaGrupos(gruposValidos, serviciosPermitidos, config, edtNombre)

  if (tareasConNombreInvalido > 0) {
    resultado.advertencias.push(
      `${edtNombre}: la IA asignó ${tareasConNombreInvalido} tarea(s) a un nombre de Actividad que no estaba en el esquema elegido — cayeron en "Sin agrupar".`
    )
  }

  const nombresConActividad = new Set(resultado.actividades.map(a => a.actividadNombre))
  for (const { nombre } of nombresActividades) {
    if (!nombresConActividad.has(nombre)) {
      resultado.actividades.push({ edtNombre, actividadNombre: nombre, tareas: [], origen: 'ia' })
    }
  }

  return resultado
}

export interface SugerenciaCantidadIA {
  catalogoServicioId: string
  cantidad: number
}

export interface ResultadoValidacionCantidades {
  cantidades: Map<string, number>
  advertencias: string[]
}

const CANTIDAD_MAXIMA_ANTIALUCINACION = 500

/**
 * Sin retry (a diferencia de validarPropuestaGrupos) — es una sugerencia
 * simple, no una estructura; cualquier valor descartado cae al fallback
 * determinista (servicio.cantidad ?? 1) en el llamador, nunca queda sin
 * cantidad asignada.
 */
export function validarSugerenciasCantidad(
  sugerencias: SugerenciaCantidadIA[],
  idsPermitidos: Set<string>
): ResultadoValidacionCantidades {
  const cantidades = new Map<string, number>()
  const advertencias: string[] = []
  let descartadas = 0

  for (const s of sugerencias) {
    if (!idsPermitidos.has(s.catalogoServicioId)) {
      descartadas++
      continue
    }
    if (!Number.isFinite(s.cantidad) || s.cantidad <= 0) {
      descartadas++
      continue
    }
    const cantidad = Math.min(s.cantidad, CANTIDAD_MAXIMA_ANTIALUCINACION)
    cantidades.set(s.catalogoServicioId, cantidad)
  }

  if (descartadas > 0) {
    advertencias.push(`${descartadas} sugerencia(s) de cantidad inválida(s) o con id desconocido se descartaron.`)
  }

  return { cantidades, advertencias }
}

export interface PrellenadoPaso1IA {
  edtsSeleccionados: string[]
  brownfield: boolean
  ingenieriaDetalle: boolean
  tableros: { nombre: string }[]
  plcs: { nombre: string }[]
  hmiCantidad: number
  scada: boolean
}

export interface ResultadoValidacionPrellenado {
  sugerencia: PrellenadoPaso1IA
  advertencias: string[]
}

const HMI_CANTIDAD_MAXIMA_ANTIALUCINACION = 50

/**
 * Sin retry — es una sugerencia de conveniencia para prellenar el Paso 1,
 * el usuario revisa y edita todo antes de continuar. Ids de EDT inventados
 * se descartan; nombres de tablero/PLC vacíos o duplicados se limpian.
 */
export function validarPrellenadoPaso1(
  raw: Partial<PrellenadoPaso1IA> & Record<string, unknown>,
  edtsPermitidos: Set<string>
): ResultadoValidacionPrellenado {
  const advertencias: string[] = []

  const edtsCrudos = Array.isArray(raw.edtsSeleccionados) ? (raw.edtsSeleccionados as unknown[]) : []
  const edtsSeleccionados = edtsCrudos.filter((id): id is string => typeof id === 'string' && edtsPermitidos.has(id))
  if (edtsCrudos.length > edtsSeleccionados.length) {
    advertencias.push(`La IA sugirió ${edtsCrudos.length - edtsSeleccionados.length} EDT(s) que no existen en el catálogo — se descartaron.`)
  }

  function limpiarNombres(valor: unknown): { nombre: string }[] {
    if (!Array.isArray(valor)) return []
    const nombres = valor
      .map(v => (v && typeof v === 'object' && 'nombre' in v ? String((v as { nombre: unknown }).nombre ?? '').trim() : ''))
      .filter(n => n.length > 0)
    return Array.from(new Set(nombres)).map(nombre => ({ nombre }))
  }

  const hmiCruda = typeof raw.hmiCantidad === 'number' ? raw.hmiCantidad : 0
  const hmiCantidad = Number.isFinite(hmiCruda) && hmiCruda > 0 ? Math.min(Math.round(hmiCruda), HMI_CANTIDAD_MAXIMA_ANTIALUCINACION) : 0

  const sugerencia: PrellenadoPaso1IA = {
    edtsSeleccionados,
    brownfield: raw.brownfield === true,
    ingenieriaDetalle: raw.ingenieriaDetalle === true,
    tableros: limpiarNombres(raw.tableros),
    plcs: limpiarNombres(raw.plcs),
    hmiCantidad,
    scada: raw.scada === true,
  }

  return { sugerencia, advertencias }
}
