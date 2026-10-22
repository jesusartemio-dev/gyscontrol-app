/**
 * PRO "Suministro de Equipos": en vez de un "Traslado y Entrega en Sitio" por
 * familia, una actividad final "Seguimiento y Entrega en Obra" (como CJM50/CJM51):
 *   - Seguimiento a Proveedores (desde el inicio de PROCURA hasta la última recepción)
 *   - Entrega en Obra (1 día, después de todas las recepciones; sin hito aparte)
 * El gestor después la parte en "Entrega en Obra 1/2/3: …" por fecha de llegada si hace falta (CJM51).
 */
import type { ActividadPropuesta, TareaPropuesta } from '@/types/cronogramaIA'

export const ACTIVIDAD_ENTREGA_OBRA = 'Seguimiento y Entrega en Obra'
export const TAREA_SEGUIMIENTO_PROVEEDORES = 'Seguimiento a Proveedores'
export const TAREA_TRASLADO_OBRA = 'Entrega en Obra'
/** Horas de gestión del seguimiento a proveedores en toda la procura (CJM50 ≈ 7 h, CJM51 8 h). */
export const HORAS_SEGUIMIENTO_PROVEEDORES = 8

const SERVICIO_TRASLADO = 'Traslado y Entrega en Sitio'
const SERVICIO_EXPEDITING = 'Seguimiento de Compra (Expediting)'
/** Las tareas de PRO llevan el prefijo "{alias} - ": se reconocen por el final del nombre. */
const esServicio = (t: TareaPropuesta, servicio: string) => t.nombre === servicio || t.nombre.endsWith(` - ${servicio}`)

export function agregarEntregaEnObra(actividades: ActividadPropuesta[]): ActividadPropuesta[] {
  if (actividades.some(a => a.edtNombre === 'PRO' && a.actividadNombre === ACTIVIDAD_ENTREGA_OBRA)) return actividades
  const familias = actividades.filter(a => a.edtNombre === 'PRO')
  const traslado = familias.flatMap(a => a.tareas).find(t => esServicio(t, SERVICIO_TRASLADO))
  if (!traslado) return actividades
  const expediting = familias.flatMap(a => a.tareas).find(t => esServicio(t, SERVICIO_EXPEDITING))

  const sinTraslado = actividades.map(a =>
    a.edtNombre === 'PRO' ? { ...a, tareas: a.tareas.filter(t => !esServicio(t, SERVICIO_TRASLADO)) } : a,
  )
  const tareas: TareaPropuesta[] = [
    // Mismo servicio de catálogo que el expediting (recurso Gestor), con las horas de todo el seguimiento.
    ...(expediting
      ? [{
          ...expediting, nombre: TAREA_SEGUIMIENTO_PROVEEDORES, cantidad: 1, horaBase: HORAS_SEGUIMIENTO_PROVEEDORES, horaRepetido: 0,
          horasEstimadas: HORAS_SEGUIMIENTO_PROVEEDORES, incluida: true, motivoExclusion: undefined, orden: 0, cantidadSugeridaPorIA: false,
        }]
      : []),
    { ...traslado, nombre: TAREA_TRASLADO_OBRA, incluida: true, motivoExclusion: undefined, orden: 1 },
  ]
  return [...sinTraslado, { edtNombre: 'PRO', actividadNombre: ACTIVIDAD_ENTREGA_OBRA, origen: 'determinista', tareas }]
}
