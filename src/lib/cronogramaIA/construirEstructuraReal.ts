import { randomUUID } from 'crypto'
import { ajustarFechaADiaLaborable, calcularFechaFinConCalendario } from '@/lib/utils/calendarioLaboral'
import { agruparYOrdenarPorEstructura, type GrupoEdtOrdenado, type InfoOrdenEdt } from './agruparYOrdenarPorEstructura'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

// Re-exportado por compatibilidad — la implementación real vive en
// agruparYOrdenarPorEstructura.ts (sin esta ruta, un import desde acá
// arrastra calendarioLaboral.ts -> prisma.ts -> `pg`, que rompe el build
// si algo del lado del cliente lo importa, ej. el wizard).
export { agruparYOrdenarPorEstructura, type GrupoEdtOrdenado, type InfoOrdenEdt, type ResultadoOrdenEstructura } from './agruparYOrdenarPorEstructura'

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
  /** Cantidad real usada para calcular horasEstimadas (ej. 45 metros de cable) — trazabilidad, null si el servicio no maneja cantidad variable. */
  cantidad?: number | null
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

/** Fase cuyas EDTs corren en PARALELO entre sí (todas arrancan el mismo día
 * que la Fase) y cuyo propio fin nunca gatilla la fase siguiente — sigue
 * activa en paralelo con el resto del proyecto (gestión/procura no son un
 * bloque previo que "se cierra"). Ver EDT_GATILLO_SIGUIENTE_FASE para qué SÍ
 * gatilla el avance a la siguiente fase. */
const FASE_PARALELA_CONTINUA = 'PLANIFICACION'

/** Código corto del EDT (catálogo), dentro de FASE_PARALELA_CONTINUA, cuyo
 * fin gatilla el inicio de la fase siguiente — ej. Ingeniería no arranca sin
 * que Seguridad (inducciones/permisos) esté lista, no cuando termina TODA
 * Planificación (que sigue corriendo en paralelo). Si el EDT no está
 * incluido en esta generación, se cae al fin real de la fase. */
const EDT_GATILLO_SIGUIENTE_FASE: Record<string, string> = { PLANIFICACION: 'SEG' }

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
  const fasesAgrupadas: { faseNombre: string; faseOrden: number; grupos: GrupoEdtOrdenado<EdtCatalogoInfo>[] }[] = []
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
    // Fase paralela (PLANIFICACION): todas sus EDTs arrancan el mismo día
    // (fechaInicioFase), nunca encadenadas entre sí — ver FASE_PARALELA_CONTINUA.
    const esFaseParalela = faseInfo.faseNombre === FASE_PARALELA_CONTINUA
    // Fallback si la Fase no tuviera EDTs (no debería ocurrir en la práctica) —
    // se sobreescribe abajo con el fin REAL del último EDT (secuencial) o el
    // MÁXIMO entre EDTs (paralela). En paralela el fallback NO puede basarse
    // en la suma de horas de todas las EDTs (asume secuencial, siempre da un
    // número mayor a cualquier EDT individual) — ganaría siempre la
    // comparación de máximo y la fase nunca reflejaría su fin real.
    let fechaFinFase = esFaseParalela
      ? fechaInicioFase
      : calcularFechaFinConCalendario(fechaInicioFase, duracionDiasDesdeHoras(horasFase, horasPorDia) * horasPorDia, calendarioLaboral)
    const edtGatillo = EDT_GATILLO_SIGUIENTE_FASE[faseInfo.faseNombre]
    // Fin del EDT gatillo (ej. Seguridad) — si está configurado y presente en
    // esta generación, determina cuándo puede arrancar la FASE siguiente, en
    // vez del fin de TODA esta fase (que en una fase paralela puede seguir
    // corriendo después). Ver el cursorFase más abajo.
    let fechaGatilloSiguienteFase: Date | null = null

    let cursorEdt = fechaInicioFase
    let ordenEdt = 0

    for (const { edtInfo, actividades: actsDelEdt } of faseInfo.grupos) {
      const horasEdt = actsDelEdt.reduce((a2, act) => a2 + act.tareas.reduce((a3, t) => a3 + t.horasEstimadas, 0), 0)

      const edtId = randomUUID()
      const fechaInicioEdt = esFaseParalela ? fechaInicioFase : cursorEdt
      // Fallback si el EDT no tuviera actividades (no debería ocurrir en la
      // práctica — agruparYOrdenarPorEstructura no emite EDTs vacíos) — se
      // sobreescribe abajo con el fin REAL de la última actividad.
      let fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, duracionDiasDesdeHoras(horasEdt, horasPorDia) * horasPorDia, calendarioLaboral)
      edtIdACodigo.set(edtId, edtInfo.nombre)

      // Horas acumuladas (ya redondeadas a días completos) desde el inicio
      // FIJO del EDT — cada Actividad se ubica en ese acumulado, nunca
      // encadenando el Date crudo de la Actividad anterior. Encadenar el
      // Date crudo era el bug: `calcularFechaFinConCalendario` ignora la
      // hora-del-día de su `fechaInicio` y le da a cada llamada el
      // presupuesto COMPLETO del día, así que una Actividad que "empezaba"
      // a las 17:00 del día 1 igual recibía las 9.5h enteras del día 1 —
      // todo quedaba apilado en el primer día sin importar cuántas
      // Actividades/Tareas hubiera. Anclar siempre a `fechaInicioEdt` +
      // acumulado evita eso: cada llamada recorre los días desde el mismo
      // origen fijo, así que el acumulado sí "gasta" los días ya usados.
      let horasAcumEdt = 0
      let ordenActividad = 0

      for (const actividad of actsDelEdt) {
        const horasActividad = actividad.tareas.reduce((a, t) => a + t.horasEstimadas, 0)
        const horasActividadRedondeadas = duracionDiasDesdeHoras(horasActividad, horasPorDia) * horasPorDia
        const actividadId = randomUUID()
        const fechaInicioActividad = calcularFechaFinConCalendario(fechaInicioEdt, horasAcumEdt, calendarioLaboral)
        horasAcumEdt += horasActividadRedondeadas
        const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioEdt, horasAcumEdt, calendarioLaboral)
        fechaFinEdt = fechaFinActividad

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

        // Mismo mecanismo, un nivel abajo: horas acumuladas desde el inicio
        // FIJO de la Actividad, nunca encadenando el Date crudo de la Tarea
        // anterior.
        let horasAcumActividad = 0
        let ordenTarea = 0

        for (const tarea of actividad.tareas) {
          const horasTareaRedondeadas = duracionDiasDesdeHoras(tarea.horasEstimadas, horasPorDia) * horasPorDia
          const tareaId = randomUUID()
          const fechaInicioTarea = calcularFechaFinConCalendario(fechaInicioActividad, horasAcumActividad, calendarioLaboral)
          horasAcumActividad += horasTareaRedondeadas
          const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioActividad, horasAcumActividad, calendarioLaboral)

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
            cantidad: tarea.cantidad ?? null,
          })
        }
      }

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

      // Secuencial (default): la última EDT procesada define el fin de la
      // Fase, como siempre. Paralela: el fin de la Fase es el MÁXIMO entre
      // todas sus EDTs, no el de la última — cada una puede durar distinto.
      if (esFaseParalela) {
        if (fechaFinEdt.getTime() > fechaFinFase.getTime()) fechaFinFase = fechaFinEdt
      } else {
        fechaFinFase = fechaFinEdt
      }
      if (edtGatillo && edtInfo.nombre === edtGatillo) fechaGatilloSiguienteFase = fechaFinEdt

      if (!esFaseParalela) cursorEdt = avanzarSiguienteInicio(fechaFinEdt, calendarioLaboral)
    }

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

    // Si esta Fase tiene un EDT gatillo configurado y presente en la
    // generación (ej. Seguridad dentro de Planificación), la fase siguiente
    // arranca justo después de ESE EDT, no del fin de toda esta fase — que en
    // una fase paralela puede seguir corriendo. Sin gatillo configurado (el
    // caso de todas las demás fases hoy), cae exactamente al comportamiento
    // de siempre: fin real de la fase.
    const fechaBaseSiguienteFase = fechaGatilloSiguienteFase ?? fechaFinFase
    cursorFase = avanzarSiguienteInicio(fechaBaseSiguienteFase, calendarioLaboral)
  }

  return { fases, edts, actividades: actividadesFilas, tareas, advertencias, edtIdACodigo }
}
