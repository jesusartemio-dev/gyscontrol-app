import { randomUUID } from 'crypto'
import { ajustarFechaADiaLaborable, calcularFechaFinConCalendario } from '@/lib/utils/calendarioLaboral'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

export interface EdtCatalogoInfo {
  id: string
  /** Código corto del catálogo (ej. "CON") — uso interno (reglas de tags/dependencias), nunca se muestra. */
  nombre: string
  /** Nombre real del catálogo de EDTs (ej. "Construccion") — esto es lo que se escribe en ProyectoEdt.nombre. */
  descripcionEdt: string
  faseNombre: string
  faseOrden: number
  /**
   * Orden de secuencia constructiva DENTRO de la Fase (Edt.orden real del
   * catálogo — ej. en EJECUCION: Preparativos < Tableros < Construcción <
   * Comisionamiento). Sin esto, el orden de EDTs dependía de en qué orden
   * llegaban en el array `actividades` (deterministas primero, IA después),
   * lo que podía dar fechas físicamente imposibles (Comisionamiento antes
   * de que exista Construcción).
   */
  edtOrden: number
}

export interface FilaFase {
  id: string
  proyectoId: string
  proyectoCronogramaId: string
  nombre: string
  descripcion: string | null
  orden: number
  fechaInicioPlan: Date
  fechaFinPlan: Date
  updatedAt: Date
}

export interface FilaEdt {
  id: string
  proyectoId: string
  proyectoCronogramaId: string
  proyectoFaseId: string
  edtId: string
  nombre: string
  descripcion: string | null
  orden: number
  horasPlan: number
  fechaInicioPlan: Date
  fechaFinPlan: Date
  updatedAt: Date
  /** Resuelto luego por asignarResponsablesEstructura (tabla EDT->rol + organigrama del proyecto) — null si aún no se asignó. */
  responsableId: string | null
}

export interface FilaActividad {
  id: string
  proyectoEdtId: string
  proyectoCronogramaId: string
  nombre: string
  orden: number
  horasPlan: number
  fechaInicioPlan: Date
  fechaFinPlan: Date
  updatedAt: Date
  /** Resuelto luego por asignarResponsablesEstructura (tabla EDT->rol + organigrama del proyecto) — null si aún no se asignó. */
  responsableId: string | null
}

export interface FilaTarea {
  id: string
  proyectoEdtId: string
  proyectoActividadId: string
  proyectoCronogramaId: string
  nombre: string
  orden: number
  fechaInicio: Date
  fechaFin: Date
  horasEstimadas: number
  updatedAt: Date
  /** Servicio de catálogo de origen — se necesita para propagar Recurso y para retroalimentación futura de HH reales vs. catálogo. null solo si esPropuestaIA es true. */
  catalogoServicioId: string | null
  /** CatalogoServicio.recursoId del servicio de origen — precarga de la columna Recurso, editable después como cualquier campo. */
  recursoId: string | null
  /** Resuelto luego por asignarResponsablesEstructura (tabla EDT->rol + organigrama del proyecto, con excepciones por tarea) — null si aún no se asignó. */
  responsableId: string | null
  /** true si esta tarea fue propuesta por la IA (Etapa B de CON/PRO) sin respaldo de catálogo. */
  esPropuestaIA?: boolean
  /** Justificación de 1 línea dada por la IA al proponerla — ausente salvo cuando esPropuestaIA es true. */
  justificacionIA?: string | null
}

export interface EstructuraReal {
  fases: FilaFase[]
  edts: FilaEdt[]
  actividades: FilaActividad[]
  tareas: FilaTarea[]
  advertencias: string[]
  /** proyectoEdtId -> código corto del catálogo (ej. "CON") — uso interno (reglas de dependencias), no se persiste. */
  edtIdACodigo: Map<string, string>
}

/** Lo mínimo que agruparYOrdenarPorEstructura necesita de un EDT — EdtCatalogoInfo lo satisface, y también un objeto liviano sin id/descripcionEdt (ver el preview del Paso 2 del wizard). */
export interface InfoOrdenEdt {
  nombre: string
  faseNombre: string
  faseOrden: number
  edtOrden: number
}

/** Un EDT del catálogo real (con su Fase/orden ya resueltos) junto con las Actividades que le tocaron, en su orden natural de llegada. */
export interface GrupoEdtOrdenado<T extends InfoOrdenEdt = EdtCatalogoInfo> {
  edtInfo: T
  actividades: ActividadPropuesta[]
}

export interface ResultadoOrdenEstructura<T extends InfoOrdenEdt = EdtCatalogoInfo> {
  gruposOrdenados: GrupoEdtOrdenado<T>[]
  advertencias: string[]
}

/**
 * Agrupa `actividades` por EDT y las ordena en el orden final del
 * cronograma: Fase (por faseOrden) -> EDT dentro de la Fase (por edtOrden,
 * el mismo campo con drag&drop del catálogo) -> Actividades en su orden de
 * llegada dentro del EDT (orden natural: GES por tag fijo, esquema elegido
 * de CON/PRO, captura de tableros/PLCs...). Única fuente de verdad de este
 * criterio — la usa tanto `construirEstructuraReal` (aplicar de verdad,
 * con fechas/horas) como el preview del Paso 2 del wizard (mismo orden,
 * sin fechas ni ids) — nunca se duplica el criterio en dos lugares. Genérica
 * sobre `T` (mínimo `InfoOrdenEdt`) para que el wizard no tenga que fabricar
 * un `EdtCatalogoInfo` completo con campos (id/descripcionEdt) que no tiene.
 */
export function agruparYOrdenarPorEstructura<T extends InfoOrdenEdt>(
  actividades: ActividadPropuesta[],
  edtsCatalogo: Map<string, T>
): ResultadoOrdenEstructura<T> {
  const advertencias: string[] = []

  const porEdt = new Map<string, ActividadPropuesta[]>()
  for (const a of actividades) {
    if (!porEdt.has(a.edtNombre)) porEdt.set(a.edtNombre, [])
    porEdt.get(a.edtNombre)!.push(a)
  }

  const edtsOrdenados: T[] = []
  for (const edtNombre of porEdt.keys()) {
    const info = edtsCatalogo.get(edtNombre)
    if (!info) {
      advertencias.push(`EDT "${edtNombre}" no se encontró en el catálogo real — se omitió del cronograma.`)
      continue
    }
    edtsOrdenados.push(info)
  }

  const fasesUnicas = new Map<string, { nombre: string; orden: number }>()
  for (const e of edtsOrdenados) {
    if (!fasesUnicas.has(e.faseNombre)) fasesUnicas.set(e.faseNombre, { nombre: e.faseNombre, orden: e.faseOrden })
  }
  const fasesEnOrden = Array.from(fasesUnicas.values()).sort((a, b) => a.orden - b.orden)

  const gruposOrdenados: GrupoEdtOrdenado<T>[] = []
  for (const faseInfo of fasesEnOrden) {
    // Orden real del catálogo (Edt.orden) — NUNCA el orden de llegada del
    // array `actividades`, que no refleja secuencia constructiva alguna.
    const edtsDeFase = edtsOrdenados.filter(e => e.faseNombre === faseInfo.nombre).sort((a, b) => a.edtOrden - b.edtOrden)
    for (const edtInfo of edtsDeFase) {
      gruposOrdenados.push({ edtInfo, actividades: porEdt.get(edtInfo.nombre) ?? [] })
    }
  }

  return { gruposOrdenados, advertencias }
}

const DURACION_MINIMA_DIAS = 1

function duracionDiasDesdeHoras(horas: number, horasPorDia: number): number {
  return Math.max(DURACION_MINIMA_DIAS, Math.ceil(horas / horasPorDia))
}

function avanzarSiguienteInicio(fechaFin: Date, calendario: unknown): Date {
  const siguiente = new Date(fechaFin)
  siguiente.setDate(siguiente.getDate() + 1)
  return ajustarFechaADiaLaborable(siguiente, calendario)
}

interface ConstruirEstructuraOpciones {
  actividades: ActividadPropuesta[]
  edtsCatalogo: Map<string, EdtCatalogoInfo>
  proyectoId: string
  proyectoCronogramaId: string
  fechaInicioProyecto: Date
  calendarioLaboral: { horasPorDia: number }
  /** CatalogoServicio.id -> CatalogoServicio.recursoId, resuelto por el caller antes de construir la estructura. */
  recursoPorServicio: Map<string, string>
}

/**
 * Convierte el árbol de propuesta (Fase implícita por Edt.faseDefaultId →
 * EDT → Actividad → Tarea) en filas reales listas para insertar, con fechas
 * secuenciales calculadas con el calendario laboral real del proyecto.
 * Puro respecto a la DB (recibe el calendario y el catálogo ya resueltos) —
 * la única dependencia externa es el reloj de calendario laboral.
 */
export function construirEstructuraReal(opciones: ConstruirEstructuraOpciones): EstructuraReal {
  const { actividades, edtsCatalogo, proyectoId, proyectoCronogramaId, fechaInicioProyecto, calendarioLaboral, recursoPorServicio } = opciones
  const horasPorDia = calendarioLaboral.horasPorDia

  const { gruposOrdenados, advertencias } = agruparYOrdenarPorEstructura(actividades, edtsCatalogo)

  // Re-agrupa los grupos EDT (ya en orden final) por Fase, preservando el
  // orden — gruposOrdenados viene ordenado por (faseOrden, edtOrden), así
  // que los grupos de una misma Fase siempre quedan adyacentes.
  const fasesAgrupadas: { faseNombre: string; faseOrden: number; grupos: GrupoEdtOrdenado[] }[] = []
  for (const grupo of gruposOrdenados) {
    const ultima = fasesAgrupadas[fasesAgrupadas.length - 1]
    if (ultima && ultima.faseNombre === grupo.edtInfo.faseNombre) {
      ultima.grupos.push(grupo)
    } else {
      fasesAgrupadas.push({ faseNombre: grupo.edtInfo.faseNombre, faseOrden: grupo.edtInfo.faseOrden, grupos: [grupo] })
    }
  }

  const fases: FilaFase[] = []
  const edts: FilaEdt[] = []
  const actividadesFilas: FilaActividad[] = []
  const tareas: FilaTarea[] = []
  const edtIdACodigo = new Map<string, string>()

  let cursorFase = ajustarFechaADiaLaborable(fechaInicioProyecto, calendarioLaboral)

  for (const faseInfo of fasesAgrupadas) {
    const horasFase = faseInfo.grupos.reduce((acc, g) => acc + g.actividades.reduce((a2, act) => a2 + act.tareas.reduce((a3, t) => a3 + t.horasEstimadas, 0), 0), 0)

    const faseId = randomUUID()
    const fechaInicioFase = cursorFase
    const fechaFinFase = calcularFechaFinConCalendario(fechaInicioFase, duracionDiasDesdeHoras(horasFase, horasPorDia) * horasPorDia, calendarioLaboral)

    fases.push({
      id: faseId,
      proyectoId,
      proyectoCronogramaId,
      nombre: faseInfo.faseNombre,
      descripcion: null,
      orden: faseInfo.faseOrden,
      fechaInicioPlan: fechaInicioFase,
      fechaFinPlan: fechaFinFase,
      updatedAt: new Date(),
    })

    let cursorEdt = fechaInicioFase
    let ordenEdt = 0

    for (const { edtInfo, actividades: actsDelEdt } of faseInfo.grupos) {
      const horasEdt = actsDelEdt.reduce((a2, act) => a2 + act.tareas.reduce((a3, t) => a3 + t.horasEstimadas, 0), 0)

      const edtId = randomUUID()
      const fechaInicioEdt = cursorEdt
      const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, duracionDiasDesdeHoras(horasEdt, horasPorDia) * horasPorDia, calendarioLaboral)

      edts.push({
        id: edtId,
        proyectoId,
        proyectoCronogramaId,
        proyectoFaseId: faseId,
        edtId: edtInfo.id,
        nombre: edtInfo.descripcionEdt,
        descripcion: null,
        orden: ordenEdt++,
        horasPlan: horasEdt,
        fechaInicioPlan: fechaInicioEdt,
        fechaFinPlan: fechaFinEdt,
        updatedAt: new Date(),
        responsableId: null,
      })
      edtIdACodigo.set(edtId, edtInfo.nombre)

      let cursorActividad = fechaInicioEdt
      let ordenActividad = 0

      for (const actividad of actsDelEdt) {
        const horasActividad = actividad.tareas.reduce((a, t) => a + t.horasEstimadas, 0)
        const actividadId = randomUUID()
        const fechaInicioActividad = cursorActividad
        const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, duracionDiasDesdeHoras(horasActividad, horasPorDia) * horasPorDia, calendarioLaboral)

        actividadesFilas.push({
          id: actividadId,
          proyectoEdtId: edtId,
          proyectoCronogramaId,
          nombre: actividad.actividadNombre,
          orden: ordenActividad++,
          horasPlan: horasActividad,
          fechaInicioPlan: fechaInicioActividad,
          fechaFinPlan: fechaFinActividad,
          updatedAt: new Date(),
          responsableId: null,
        })

        let cursorTarea = fechaInicioActividad
        let ordenTarea = 0

        for (const tarea of actividad.tareas) {
          const tareaId = randomUUID()
          const fechaInicioTarea = cursorTarea
          const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, duracionDiasDesdeHoras(tarea.horasEstimadas, horasPorDia) * horasPorDia, calendarioLaboral)

          tareas.push({
            id: tareaId,
            proyectoEdtId: edtId,
            proyectoActividadId: actividadId,
            proyectoCronogramaId,
            nombre: tarea.nombre,
            orden: ordenTarea++,
            fechaInicio: fechaInicioTarea,
            fechaFin: fechaFinTarea,
            horasEstimadas: tarea.horasEstimadas,
            updatedAt: new Date(),
            catalogoServicioId: tarea.catalogoServicioId,
            recursoId: tarea.catalogoServicioId ? recursoPorServicio.get(tarea.catalogoServicioId) ?? null : null,
            responsableId: null,
            esPropuestaIA: tarea.esPropuestaIA ?? false,
            justificacionIA: tarea.justificacion ?? null,
          })

          cursorTarea = fechaFinTarea
        }

        cursorActividad = fechaFinActividad
      }

      cursorEdt = avanzarSiguienteInicio(fechaFinEdt, calendarioLaboral)
    }

    cursorFase = avanzarSiguienteInicio(fechaFinFase, calendarioLaboral)
  }

  return { fases, edts, actividades: actividadesFilas, tareas, advertencias, edtIdACodigo }
}
