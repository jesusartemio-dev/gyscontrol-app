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
}

/**
 * Convierte el árbol de propuesta (Fase implícita por Edt.faseDefaultId →
 * EDT → Actividad → Tarea) en filas reales listas para insertar, con fechas
 * secuenciales calculadas con el calendario laboral real del proyecto.
 * Puro respecto a la DB (recibe el calendario y el catálogo ya resueltos) —
 * la única dependencia externa es el reloj de calendario laboral.
 */
export function construirEstructuraReal(opciones: ConstruirEstructuraOpciones): EstructuraReal {
  const { actividades, edtsCatalogo, proyectoId, proyectoCronogramaId, fechaInicioProyecto, calendarioLaboral } = opciones
  const advertencias: string[] = []
  const horasPorDia = calendarioLaboral.horasPorDia

  const porEdt = new Map<string, ActividadPropuesta[]>()
  for (const a of actividades) {
    if (!porEdt.has(a.edtNombre)) porEdt.set(a.edtNombre, [])
    porEdt.get(a.edtNombre)!.push(a)
  }

  const edtsOrdenados: EdtCatalogoInfo[] = []
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

  const fases: FilaFase[] = []
  const edts: FilaEdt[] = []
  const actividadesFilas: FilaActividad[] = []
  const tareas: FilaTarea[] = []
  const edtIdACodigo = new Map<string, string>()

  let cursorFase = ajustarFechaADiaLaborable(fechaInicioProyecto, calendarioLaboral)

  for (const faseInfo of fasesEnOrden) {
    const edtsDeFase = edtsOrdenados.filter(e => e.faseNombre === faseInfo.nombre)

    const horasFase = edtsDeFase.reduce((acc, e) => {
      const acts = porEdt.get(e.nombre) ?? []
      return acc + acts.reduce((a2, act) => a2 + act.tareas.reduce((a3, t) => a3 + t.horasEstimadas, 0), 0)
    }, 0)

    const faseId = randomUUID()
    const fechaInicioFase = cursorFase
    const fechaFinFase = calcularFechaFinConCalendario(fechaInicioFase, duracionDiasDesdeHoras(horasFase, horasPorDia) * horasPorDia, calendarioLaboral)

    fases.push({
      id: faseId,
      proyectoId,
      proyectoCronogramaId,
      nombre: faseInfo.nombre,
      descripcion: null,
      orden: faseInfo.orden,
      fechaInicioPlan: fechaInicioFase,
      fechaFinPlan: fechaFinFase,
      updatedAt: new Date(),
    })

    let cursorEdt = fechaInicioFase
    let ordenEdt = 0

    for (const edtInfo of edtsDeFase) {
      const actsDelEdt = porEdt.get(edtInfo.nombre) ?? []
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
