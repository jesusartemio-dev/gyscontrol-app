import type { ActividadPropuesta, CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'
import { construirTareaPropuesta } from './reglasActividades'

export const MAX_REINTENTOS = 1

export interface GrupoPropuestoIA {
  nombre: string
  catalogoServicioIds: string[]
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
  const idsPermitidos = new Set(serviciosPermitidos.map(s => s.id))
  const idsAsignados = new Set<string>()
  const tareaIdsInventados: string[] = []
  const advertencias: string[] = []

  const actividades: ActividadPropuesta[] = []

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
      actividades.push({ edtNombre, actividadNombre: grupo.nombre.trim(), tareas, origen: 'ia' })
    }
  }

  const tareaIdsNoAsignadas = serviciosPermitidos.map(s => s.id).filter(id => !idsAsignados.has(id))
  if (tareaIdsNoAsignadas.length > 0) {
    const tareasSinAgrupar = tareaIdsNoAsignadas.map(id => construirTareaPropuesta(serviciosPorId.get(id)!, config))
    actividades.push({ edtNombre, actividadNombre: 'Sin agrupar', tareas: tareasSinAgrupar, origen: 'determinista' })
    advertencias.push(`${edtNombre}: ${tareaIdsNoAsignadas.length} tarea(s) que la IA no agrupó se colocaron en "Sin agrupar".`)
  }

  if (tareaIdsInventados.length > 0) {
    advertencias.push(`${edtNombre}: la IA devolvió ${tareaIdsInventados.length} id(s) de tarea que no existen en el catálogo filtrado — se descartaron.`)
  }

  return { actividades, tareaIdsNoAsignadas, tareaIdsInventados, advertencias }
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
