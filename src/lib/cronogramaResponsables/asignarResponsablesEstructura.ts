import { randomUUID } from 'crypto'
import type { ActividadPropuesta } from '@/types/cronogramaIA'
import type { EstructuraReal, FilaActividad, FilaEdt, FilaTarea } from '@/lib/cronogramaIA/construirEstructuraReal'
import { calcularRolResponsable, ROL_RESPONSABLE_LABELS, type RolResponsable } from './reglasResponsable'
import type { ResolucionOrganigrama } from './resolverOrganigrama'

/**
 * Núcleo compartido de la cascada EDT -> Actividad -> Tarea. Ambos
 * llamadores (A: sobre la EstructuraReal ya construida con IDs reales, antes
 * de persistir; B: dry-run sobre el borrador en memoria del wizard, por
 * nombre, para el preview del Paso 2) delegan acá para que la lógica de
 * cascada exista en un solo lugar.
 *
 * Semántica: el rol base de un EDT nunca se desvía por excepción — la única
 * excepción hoy (CIE por actividadNombre: [Tecnico] -> supervisor, [Gestion]
 * -> gestor) solo aplica cuando calcularRolResponsable recibe ese contexto
 * adicional, así que basta pasar más o menos contexto para obtener el rol en
 * cada nivel de la cascada. Un rol sin persona en el organigrama de este
 * proyecto (o un EDT sin regla en la tabla) siempre resulta en
 * responsableId: null + advertencia — nunca un fallback a otra persona.
 */
export interface ResponsableResuelto {
  rol: RolResponsable | null
  userId: string | null
  nombre: string | null
}

/**
 * Resuelve el rol y la persona para un contexto EDT/Actividad/Tarea dado.
 * Exportada para reutilizar el mismo criterio de cascada fuera de este
 * módulo (ej. la ruta de re-sincronización, que opera sobre filas ya
 * persistidas en vez de la EstructuraReal en memoria).
 */
export function resolverResponsableTarea(
  ctx: { edtCodigo: string; actividadNombre?: string; tareaNombre?: string },
  organigramaResuelto: ResolucionOrganigrama['porRol']
): ResponsableResuelto {
  const rol = calcularRolResponsable(ctx)
  if (!rol) return { rol: null, userId: null, nombre: null }
  const persona = organigramaResuelto.get(rol) ?? null
  return { rol, userId: persona?.userId ?? null, nombre: persona?.nombre ?? null }
}

function advertenciaDe(edtLabel: string, resuelto: ResponsableResuelto): string | null {
  if (!resuelto.rol) return `EDT "${edtLabel}" no tiene una regla de responsable definida — queda sin asignar.`
  if (!resuelto.userId) {
    return `Rol ${ROL_RESPONSABLE_LABELS[resuelto.rol]} (requerido por "${edtLabel}") no tiene persona asignada en el organigrama de este proyecto.`
  }
  return null
}

export interface ResponsablePreviewDesglose {
  rol: RolResponsable
  responsableUserId: string | null
  responsableNombre: string | null
  tareasCount: number
}

export interface ResponsablePreviewEdt {
  proyectoEdtId?: string
  edtNombre: string
  edtCodigo: string
  desglose: ResponsablePreviewDesglose[]
  advertencia: string | null
}

// --- Llamador A: sobre la EstructuraReal ya construida (IDs reales) ---

export interface AsignacionResponsableTarea {
  proyectoTareaId: string
  edtCodigo: string
  responsableIdAsignado: string
}

export interface ResultadoAsignacionEstructura {
  edts: FilaEdt[]
  actividades: FilaActividad[]
  tareas: FilaTarea[]
  asignaciones: AsignacionResponsableTarea[]
  preview: ResponsablePreviewEdt[]
  advertencias: string[]
}

export function asignarResponsablesEstructura(
  estructura: Pick<EstructuraReal, 'edts' | 'actividades' | 'tareas' | 'edtIdACodigo'>,
  organigramaResuelto: ResolucionOrganigrama['porRol']
): ResultadoAsignacionEstructura {
  const advertencias: string[] = []
  const asignaciones: AsignacionResponsableTarea[] = []
  const preview: ResponsablePreviewEdt[] = []

  const actividadPorId = new Map(estructura.actividades.map(a => [a.id, a]))

  const edts = estructura.edts.map((edt): FilaEdt => {
    const edtCodigo = estructura.edtIdACodigo.get(edt.id) ?? ''
    const resuelto = resolverResponsableTarea({ edtCodigo }, organigramaResuelto)
    const advertencia = advertenciaDe(edt.nombre, resuelto)
    if (advertencia) advertencias.push(advertencia)

    const desgloseMap = new Map<RolResponsable, ResponsablePreviewDesglose>()
    const tareasDelEdt = estructura.tareas.filter(t => t.proyectoEdtId === edt.id)
    for (const tarea of tareasDelEdt) {
      const actividad = actividadPorId.get(tarea.proyectoActividadId)
      const resueltoTarea = resolverResponsableTarea(
        { edtCodigo, actividadNombre: actividad?.nombre, tareaNombre: tarea.nombre },
        organigramaResuelto
      )
      if (resueltoTarea.rol) {
        const acc = desgloseMap.get(resueltoTarea.rol) ?? {
          rol: resueltoTarea.rol,
          responsableUserId: resueltoTarea.userId,
          responsableNombre: resueltoTarea.nombre,
          tareasCount: 0,
        }
        acc.tareasCount++
        desgloseMap.set(resueltoTarea.rol, acc)
      }
    }

    preview.push({
      proyectoEdtId: edt.id,
      edtNombre: edt.nombre,
      edtCodigo,
      desglose: [...desgloseMap.values()],
      advertencia,
    })

    return { ...edt, responsableId: resuelto.userId }
  })

  const actividades = estructura.actividades.map((actividad): FilaActividad => {
    const edtCodigo = estructura.edtIdACodigo.get(actividad.proyectoEdtId) ?? ''
    const resuelto = resolverResponsableTarea({ edtCodigo, actividadNombre: actividad.nombre }, organigramaResuelto)
    return { ...actividad, responsableId: resuelto.userId }
  })

  const tareas = estructura.tareas.map((tarea): FilaTarea => {
    const edtCodigo = estructura.edtIdACodigo.get(tarea.proyectoEdtId) ?? ''
    const actividad = actividadPorId.get(tarea.proyectoActividadId)
    const resuelto = resolverResponsableTarea(
      { edtCodigo, actividadNombre: actividad?.nombre, tareaNombre: tarea.nombre },
      organigramaResuelto
    )
    if (resuelto.userId) {
      asignaciones.push({ proyectoTareaId: tarea.id, edtCodigo, responsableIdAsignado: resuelto.userId })
    }
    return { ...tarea, responsableId: resuelto.userId }
  })

  return { edts, actividades, tareas, asignaciones, preview, advertencias }
}

// --- Llamador B: dry-run por nombre, sobre el borrador en memoria del wizard (Paso 2, sin IDs reales) ---

export function previsualizarResponsablesDesdeNombres(
  actividadesPropuestas: ActividadPropuesta[],
  organigramaResuelto: ResolucionOrganigrama['porRol'],
  edtDescripcionPorCodigo?: Map<string, string>
): { preview: ResponsablePreviewEdt[]; advertencias: string[] } {
  const advertencias: string[] = []
  const preview: ResponsablePreviewEdt[] = []

  const porEdt = new Map<string, ActividadPropuesta[]>()
  for (const a of actividadesPropuestas) {
    if (!porEdt.has(a.edtNombre)) porEdt.set(a.edtNombre, [])
    porEdt.get(a.edtNombre)!.push(a)
  }

  for (const [edtCodigo, actividadesDelEdt] of porEdt) {
    const edtLabel = edtDescripcionPorCodigo?.get(edtCodigo) ?? edtCodigo
    const resuelto = resolverResponsableTarea({ edtCodigo }, organigramaResuelto)
    const advertencia = advertenciaDe(edtLabel, resuelto)
    if (advertencia) advertencias.push(advertencia)

    const desgloseMap = new Map<RolResponsable, ResponsablePreviewDesglose>()
    for (const actividad of actividadesDelEdt) {
      for (const tarea of actividad.tareas) {
        if (!tarea.incluida) continue
        const resueltoTarea = resolverResponsableTarea(
          { edtCodigo, actividadNombre: actividad.actividadNombre, tareaNombre: tarea.nombre },
          organigramaResuelto
        )
        if (!resueltoTarea.rol) continue
        const acc = desgloseMap.get(resueltoTarea.rol) ?? {
          rol: resueltoTarea.rol,
          responsableUserId: resueltoTarea.userId,
          responsableNombre: resueltoTarea.nombre,
          tareasCount: 0,
        }
        acc.tareasCount++
        desgloseMap.set(resueltoTarea.rol, acc)
      }
    }

    preview.push({ edtNombre: edtLabel, edtCodigo, desglose: [...desgloseMap.values()], advertencia })
  }

  return { preview, advertencias }
}

/** Genera los datos listos para `proyectoTareaResponsableAsignacion.createMany` — sin matrizFilaId, codigoOrigen fijo "regla". */
export function construirFilasAsignacionAuditoria(
  proyectoId: string,
  asignadoPorId: string,
  asignaciones: AsignacionResponsableTarea[]
) {
  return asignaciones.map(a => ({
    id: randomUUID(),
    proyectoTareaId: a.proyectoTareaId,
    proyectoId,
    matrizFilaId: null,
    edtCodigo: a.edtCodigo,
    responsableIdAsignado: a.responsableIdAsignado,
    codigoOrigen: 'regla',
    asignadoPorId,
  }))
}
