import { randomUUID } from 'crypto'
import { ajustarFechaADiaLaborable, calcularFechaFinConCalendario } from '@/lib/utils/calendarioLaboral'
import { agruparYOrdenarPorEstructura, type GrupoEdtOrdenado, type InfoOrdenEdt } from './agruparYOrdenarPorEstructura'
import type { ActividadPropuesta, TareaPropuesta } from '@/types/cronogramaIA'
import { type CalendarioHoras, desplazarHorasLaborables, horasPorDiaCalendario, siguienteMomentoLaborable, sumarHorasLaborables } from '@/lib/services/cronogramaHoras'
import { ACTIVIDAD_POR_CICLO, RECURRENCIA_ACTIVIDAD } from './reglasActividades'
import { ACTIVIDAD_ENTREGA_OBRA, HITO_MATERIALES_EN_OBRA, TAREA_SEGUIMIENTO_PROVEEDORES, TAREA_TRASLADO_OBRA } from './entregaEnObraPro'

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
  /** Hito ◆ (Milestone): un solo día, sin horas. Los agrega el wizard (inicio/fin de proyecto). */
  esHito?: boolean
  /** Fecha comprometida del hito (Deadline de MS Project). */
  fechaLimite?: Date | null
}

export interface EstructuraReal {
  fases: FilaFase[]
  edts: FilaEdt[]
  actividades: FilaActividad[]
  tareas: FilaTarea[]
  advertencias: string[]
  /** proyectoEdtId -> código corto del catálogo (ej. "CON") — uso interno (reglas de dependencias), no se persiste. */
  edtIdACodigo: Map<string, string>
  /** Fin-Comienzo entre las tareas de cada ciclo de GESTION Y CONTROL (con desfase para los hitos de espera). */
  dependenciasCiclos: { tareaOrigenId: string; tareaDependienteId: string; tipo: 'finish_to_start'; lagMinutos: number }[]
}

/** Fase cuyas EDTs corren en PARALELO entre sí (todas arrancan el mismo día
 * que la Fase) y cuyo propio fin nunca gatilla la fase siguiente — sigue
 * activa en paralelo con el resto del proyecto (gestión/procura no son un
 * bloque previo que "se cierra"). Ver EDT_GATILLO_SIGUIENTE_FASE para qué SÍ
 * gatilla el avance a la siguiente fase. */
const FASE_PARALELA_CONTINUA = 'PLANIFICACION'
/** Fases cuyas EDTs arrancan juntas (en paralelo) en vez de encadenarse: Planificación (GES/SEG) y Procura (PRO/SER). */
const FASES_EDTS_EN_PARALELO = new Set([FASE_PARALELA_CONTINUA, 'PROCURA'])

/** Código corto del EDT (catálogo), dentro de FASE_PARALELA_CONTINUA, cuyo
 * fin gatilla el inicio de la fase siguiente: Ingeniería arranca al terminar
 * GES (plan del proyecto aprobado), no cuando termina TODA Planificación.
 * Seguridad (SEG) corre en paralelo y no frena a Ingeniería (antes estaba
 * como gatillo por error). Si el EDT no está incluido en esta generación, se
 * cae al fin real de la fase. */
const EDT_GATILLO_SIGUIENTE_FASE: Record<string, string> = { PLANIFICACION: 'GES' }

/**
 * Fases que corren en paralelo con la cadena principal (Planificación →
 * Ingeniería → Ejecución → Cierre): tienen su propio inicio y NO empujan el
 * inicio de la fase siguiente.
 * - GESTION Y CONTROL (EDT CTL): empieza al terminar GES (plan aprobado) y se
 *   estira hasta el fin de Ejecución — ver estirarFaseHasta más abajo.
 * - PROCURA (EDT PRO): empieza al terminar toda Planificación (GES y SEG). La
 *   espera de materiales la cubre la dependencia PRO "Recepción en Almacén" →
 *   CON "Preparación y Traslado", no el inicio de Ejecución.
 */
const FASE_GESTION_CONTROL = 'GESTION Y CONTROL'
const FASE_PROCURA = 'PROCURA'
const FASE_EJECUCION = 'EJECUCION'
/** "Gestión y Control" → "GESTION Y CONTROL" (los nombres de fase vienen del catálogo). */
const claveFase = (nombre: string) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

/**
 * EDTs cuyas actividades arrancan juntas (al inicio del EDT) en vez de
 * encadenarse: cada familia de compra/alquiler es un proveedor distinto y se
 * gestiona en paralelo. La actividad "Seguimiento y Entrega en Obra" de PRO va
 * aparte: el seguimiento cubre toda la procura y el traslado va después de la
 * última recepción (ver entregaEnObraPro.ts).
 */
const EDTS_ACTIVIDADES_EN_PARALELO = new Set(['PRO', 'SER'])

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
  // Fines ya calculados, para las fases con inicio propio (ver FASE_GESTION_CONTROL).
  const finPorEdtCodigo = new Map<string, Date>()
  const finPorFase = new Map<string, Date>()
  // Propuesta original de cada tarea (horas por vez para los ciclos de Gestión y Control).
  const propuestaPorTareaId = new Map<string, TareaPropuesta>()
  // Fin-Comienzo de procura: cadena de cada familia → traslado → hito (ver programarEntregaEnObra).
  const dependenciasProcura: EstructuraReal['dependenciasCiclos'] = []

  for (const faseInfo of fasesAgrupadas) {
    const horasFase = faseInfo.grupos.reduce((acc, g) => acc + g.actividades.reduce((a2, act) => a2 + act.tareas.reduce((a3, t) => a3 + t.horasEstimadas, 0), 0), 0)

    const faseId = randomUUID()
    const clave = claveFase(faseInfo.faseNombre)
    const finPlanificacion = finPorFase.get(FASE_PARALELA_CONTINUA)
    // Inicio propio (no sigue la cadena): Gestión y Control tras GES; Procura tras Planificación.
    const inicioPropio =
      clave === FASE_GESTION_CONTROL ? (finPorEdtCodigo.get('GES') ?? finPlanificacion)
      : clave === FASE_PROCURA ? finPlanificacion
      : undefined
    const corrEnParalelo = clave === FASE_GESTION_CONTROL || clave === FASE_PROCURA
    const fechaInicioFase = inicioPropio ? avanzarSiguienteInicio(inicioPropio, calendarioLaboral) : cursorFase
    // Fase paralela (PLANIFICACION): todas sus EDTs arrancan el mismo día
    // (fechaInicioFase), nunca encadenadas entre sí — ver FASE_PARALELA_CONTINUA.
    const esFaseParalela = FASES_EDTS_EN_PARALELO.has(claveFase(faseInfo.faseNombre))
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
      const actividadesEnParalelo = EDTS_ACTIVIDADES_EN_PARALELO.has(edtInfo.nombre)
      if (actividadesEnParalelo) fechaFinEdt = fechaInicioEdt
      // Familias de PRO creadas en este EDT: la entrega en obra va después de todas.
      const tareasFamiliasPro: { actividadId: string; tareas: FilaTarea[] }[] = []

      // La entrega en obra siempre al final: necesita las fechas de todas las familias.
      const actsOrdenadas = [
        ...actsDelEdt.filter(a => a.actividadNombre !== ACTIVIDAD_ENTREGA_OBRA),
        ...actsDelEdt.filter(a => a.actividadNombre === ACTIVIDAD_ENTREGA_OBRA),
      ]
      for (const actividad of actsOrdenadas) {
        const horasActividad = actividad.tareas.reduce((a, t) => a + t.horasEstimadas, 0)
        const horasActividadRedondeadas = duracionDiasDesdeHoras(horasActividad, horasPorDia) * horasPorDia
        const actividadId = randomUUID()
        const esEntregaObra = edtInfo.nombre === 'PRO' && actividad.actividadNombre === ACTIVIDAD_ENTREGA_OBRA
        if (esEntregaObra) {
          const r = programarEntregaEnObra({
            actividad, actividadId, edtId, proyectoCronogramaId, fechaInicioEdt, familias: tareasFamiliasPro,
            cal: calendarioHoras(calendarioLaboral), recursoPorServicio, orden: ordenActividad++,
          })
          actividadesFilas.push(r.actividad)
          tareas.push(...r.tareas)
          dependenciasProcura.push(...r.dependencias)
          for (const t of r.tareas) propuestaPorTareaId.set(t.id, actividad.tareas.find(p => p.nombre === t.nombre) ?? actividad.tareas[0])
          if (r.actividad.fechaFinPlan.getTime() > fechaFinEdt.getTime()) fechaFinEdt = r.actividad.fechaFinPlan
          continue
        }
        const fechaInicioActividad = actividadesEnParalelo
          ? fechaInicioEdt
          : calcularFechaFinConCalendario(fechaInicioEdt, horasAcumEdt, calendarioLaboral)
        if (!actividadesEnParalelo) horasAcumEdt += horasActividadRedondeadas
        const fechaFinActividad = actividadesEnParalelo
          ? calcularFechaFinConCalendario(fechaInicioEdt, horasActividadRedondeadas, calendarioLaboral)
          : calcularFechaFinConCalendario(fechaInicioEdt, horasAcumEdt, calendarioLaboral)
        if (!actividadesEnParalelo || fechaFinActividad.getTime() > fechaFinEdt.getTime()) fechaFinEdt = fechaFinActividad

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
        const primeraTareaDeActividad = tareas.length

        for (const tarea of actividad.tareas) {
          const horasTareaRedondeadas = duracionDiasDesdeHoras(tarea.horasEstimadas, horasPorDia) * horasPorDia
          const tareaId = randomUUID()
          propuestaPorTareaId.set(tareaId, tarea)
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
        if (edtInfo.nombre === 'PRO') tareasFamiliasPro.push({ actividadId, tareas: tareas.slice(primeraTareaDeActividad) })
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
      finPorEdtCodigo.set(edtInfo.nombre, fechaFinEdt)

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
    finPorFase.set(clave, fechaFinFase)
    // Las fases en paralelo (Gestión y Control, Procura) no mueven la cadena principal.
    if (!corrEnParalelo) {
      const fechaBaseSiguienteFase = fechaGatilloSiguienteFase ?? fechaFinFase
      cursorFase = avanzarSiguienteInicio(fechaBaseSiguienteFase, calendarioLaboral)
    }
  }

  // Gestión y Control es transversal: va del fin de GES al fin de Ejecución.
  // Sus actividades recurrentes se repiten numeradas en esa ventana (reportes
  // cada viernes, valorizaciones cada día 20) y las de una sola vez
  // (habilitación de personal) van al inicio.
  const dependenciasCiclos: EstructuraReal['dependenciasCiclos'] = []
  const faseGC = fases.find(f => claveFase(f.nombre) === FASE_GESTION_CONTROL)
  if (faseGC) {
    const otrasFases = fases.filter(f => f.id !== faseGC.id)
    const finVentana = finPorFase.get(FASE_EJECUCION)
      ?? (otrasFases.length ? new Date(Math.max(...otrasFases.map(f => f.fechaFinPlan.getTime()))) : faseGC.fechaFinPlan)
    const nuevas = programarGestionYControl({
      cal: calendarioHoras(calendarioLaboral),
      faseGC, finVentana, edts, actividades: actividadesFilas, tareas, propuestaPorTareaId,
      inicioEjecucion: fases.find(f => claveFase(f.nombre) === FASE_EJECUCION)?.fechaInicioPlan,
    })
    for (const t of nuevas.tareas) {
      if (propuestaPorTareaId.get(t.id)?.hitoSinFecha) {
        advertencias.push(`"${t.nombre}" quedó provisionalmente al inicio de Ejecución: pon su fecha real y vincula las tareas que dependen de ella.`)
      }
    }
    tareas.splice(0, tareas.length, ...nuevas.tareas)
    dependenciasCiclos.push(...nuevas.dependencias)
  }

  dependenciasCiclos.push(...dependenciasProcura)
  return { fases, edts, actividades: actividadesFilas, tareas, advertencias, edtIdACodigo, dependenciasCiclos }
}

/**
 * "Seguimiento y Entrega en Obra" de PRO, ya conocidas las fechas de las familias:
 *  - Seguimiento a Proveedores: del inicio del EDT al fin de la última recepción.
 *  - Traslado a Obra: el día laborable siguiente (duración por sus horas).
 *  - ◆ Materiales en Obra: hito al terminar el traslado.
 * Dependencias FC: cadena de cada familia, última tarea de cada familia → traslado → hito.
 */
function programarEntregaEnObra(o: {
  actividad: ActividadPropuesta
  actividadId: string
  edtId: string
  proyectoCronogramaId: string
  fechaInicioEdt: Date
  familias: { actividadId: string; tareas: FilaTarea[] }[]
  cal: CalendarioHoras
  recursoPorServicio: Map<string, string>
  orden: number
}): { actividad: FilaActividad; tareas: FilaTarea[]; dependencias: EstructuraReal['dependenciasCiclos'] } {
  const { actividad, actividadId, edtId, proyectoCronogramaId, fechaInicioEdt, familias, cal, recursoPorServicio } = o
  const ultimas = familias.map(f => f.tareas[f.tareas.length - 1]).filter((t): t is FilaTarea => !!t)
  const finRecepciones = ultimas.length ? new Date(Math.max(...ultimas.map(t => t.fechaFin.getTime()))) : fechaInicioEdt
  const fila = (p: TareaPropuesta, i: number, inicio: Date, fin: Date): FilaTarea => ({
    id: randomUUID(), proyectoEdtId: edtId, proyectoActividadId: actividadId, proyectoCronogramaId,
    nombre: p.nombre, orden: i, fechaInicio: inicio, fechaFin: fin, horasEstimadas: p.horasEstimadas, updatedAt: new Date(),
    catalogoServicioId: p.catalogoServicioId, recursoId: p.catalogoServicioId ? recursoPorServicio.get(p.catalogoServicioId) ?? null : null,
    responsableId: null, esPropuestaIA: p.esPropuestaIA ?? false, justificacionIA: p.justificacion ?? null, cantidad: p.cantidad ?? null,
  })

  const filas: FilaTarea[] = []
  let traslado: FilaTarea | undefined
  actividad.tareas.forEach((p, i) => {
    if (p.nombre === TAREA_SEGUIMIENTO_PROVEEDORES) {
      filas.push(fila(p, i, fechaInicioEdt, finRecepciones))
    } else if (p.nombre === TAREA_TRASLADO_OBRA) {
      const inicio = siguienteMomentoLaborable(cal, finRecepciones)
      const dias = duracionDiasDesdeHoras(p.horasEstimadas, horasPorDiaCalendario(cal))
      traslado = fila(p, i, inicio, sumarHorasLaborables(cal, inicio, dias * horasPorDiaCalendario(cal)))
      filas.push(traslado)
    } else {
      // Tarea agregada a mano en el asistente: después de las recepciones, 1 día.
      const inicio = siguienteMomentoLaborable(cal, finRecepciones)
      filas.push(fila(p, i, inicio, sumarHorasLaborables(cal, inicio, horasPorDiaCalendario(cal))))
    }
  })
  const dependencias: EstructuraReal['dependenciasCiclos'] = []
  const fc = (a: FilaTarea, b: FilaTarea) => dependencias.push({ tareaOrigenId: a.id, tareaDependienteId: b.id, tipo: 'finish_to_start', lagMinutos: 0 })
  for (const f of familias) f.tareas.slice(1).forEach((t, i) => fc(f.tareas[i], t))
  if (traslado) {
    for (const u of ultimas) fc(u, traslado)
    const hito: FilaTarea = {
      ...fila({ ...actividad.tareas[0], nombre: HITO_MATERIALES_EN_OBRA, horasEstimadas: 0, catalogoServicioId: null }, filas.length, traslado.fechaFin, traslado.fechaFin),
      esHito: true,
    }
    filas.push(hito)
    fc(traslado, hito)
  }
  const inicio = new Date(Math.min(...filas.map(t => t.fechaInicio.getTime())))
  const fin = new Date(Math.max(...filas.map(t => t.fechaFin.getTime())))
  return {
    actividad: {
      id: actividadId, proyectoEdtId: edtId, proyectoCronogramaId, nombre: actividad.actividadNombre, orden: o.orden,
      horasPlan: filas.reduce((s, t) => s + t.horasEstimadas, 0), fechaInicioPlan: inicio, fechaFinPlan: fin, updatedAt: new Date(), responsableId: null,
    },
    tareas: filas,
    dependencias,
  }
}

/** Calendario del generador → calendario por horas (con valores por defecto si faltan). */
export function calendarioHoras(cal: unknown): CalendarioHoras {
  const c = (cal ?? {}) as Partial<CalendarioHoras>
  return {
    ...c,
    diasLaborables: c.diasLaborables ?? ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
    diaCalendario: c.diaCalendario ?? [],
    excepcionCalendario: c.excepcionCalendario ?? [],
  } as CalendarioHoras
}

const DIA_MS = 86400000
const inicioDiaUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

/** Días de cada ciclo dentro de la ventana: viernes (semanal) o día 20 (mensual). Al menos uno. */
function diasDeCiclo(tipo: 'semanal' | 'mensual', desde: Date, hasta: Date): Date[] {
  const ini = inicioDiaUTC(desde).getTime()
  const fin = hasta.getTime()
  const dias: Date[] = []
  if (tipo === 'semanal') {
    for (let t = ini; t <= fin; t += DIA_MS) if (new Date(t).getUTCDay() === 5) dias.push(new Date(t))
  } else {
    const d0 = new Date(ini)
    for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth(); Date.UTC(y, m, 1) <= fin; m === 11 ? (y++, m = 0) : m++) {
      const t = Date.UTC(y, m, 20)
      if (t >= ini && t <= fin) dias.push(new Date(t))
    }
  }
  return dias.length ? dias : [new Date(ini)]
}

/**
 * Programa la fase GESTION Y CONTROL. Cada actividad recurrente (ver
 * RECURRENCIA_ACTIVIDAD) se repite por ciclo con sus tareas en cadena el mismo
 * día, numeradas "01", "02"… (1.ª vez horaBase, siguientes horaRepetido). Las
 * demás actividades (una sola vez) encadenan sus tareas desde el inicio de la
 * ventana. Recalcula fechas de actividades, EDTs y la fase.
 */
export function programarGestionYControl(o: {
  cal: CalendarioHoras
  faseGC: FilaFase
  finVentana: Date
  edts: FilaEdt[]
  actividades: FilaActividad[]
  tareas: FilaTarea[]
  propuestaPorTareaId: Map<string, TareaPropuesta>
  /** Dónde ubicar los hitos del cliente sin fecha (p. ej. Parada de Planta). */
  inicioEjecucion?: Date
}): { tareas: FilaTarea[]; dependencias: EstructuraReal['dependenciasCiclos'] } {
  const { cal, faseGC, finVentana } = o
  const edtsGC = o.edts.filter(e => e.proyectoFaseId === faseGC.id)
  const idsEdt = new Set(edtsGC.map(e => e.id))
  const actsGC = o.actividades.filter(a => idsEdt.has(a.proyectoEdtId))
  const idsAct = new Set(actsGC.map(a => a.id))
  const resto = o.tareas.filter(t => !idsAct.has(t.proyectoActividadId))
  const nuevas: FilaTarea[] = []
  const dependencias: EstructuraReal['dependenciasCiclos'] = []
  const inicioVentana = siguienteMomentoLaborable(cal, inicioDiaUTC(faseGC.fechaInicioPlan))

  const hpd = horasPorDiaCalendario(cal)
  /**
   * Encadena tareas desde `desde`: cada una empieza cuando termina la anterior.
   * Un hito de espera (hitoDiasDespues) cae N días hábiles después de la última
   * tarea con trabajo, sin horas y sin mover la cadena (FC con ese desfase).
   */
  const encadenar = (base: FilaTarea[], desde: Date, horasDe: (t: FilaTarea) => number, sufijo: string, actividadId?: string) => {
    let cursor = siguienteMomentoLaborable(cal, desde)
    let anterior: FilaTarea | null = null
    for (const t of base) {
      const id = sufijo ? randomUUID() : t.id
      const nombre = sufijo ? `${t.nombre} ${sufijo}` : t.nombre
      // Hito del cliente sin fecha: provisional al inicio de Ejecución, suelto (sin cadena).
      if (o.propuestaPorTareaId.get(t.id)?.hitoSinFecha) {
        const fecha = siguienteMomentoLaborable(cal, o.inicioEjecucion ?? inicioVentana)
        nuevas.push({ ...t, id, nombre, proyectoActividadId: actividadId ?? t.proyectoActividadId, fechaInicio: fecha, fechaFin: fecha, horasEstimadas: 0, esHito: true })
        continue
      }
      const dias = o.propuestaPorTareaId.get(t.id)?.hitoDiasDespues
      if (dias !== undefined && anterior) {
        const lagMinutos = Math.round(dias * hpd * 60)
        const fecha = desplazarHorasLaborables(cal, anterior.fechaFin, lagMinutos / 60, 'fin')
        nuevas.push({ ...t, id, nombre, proyectoActividadId: actividadId ?? t.proyectoActividadId, fechaInicio: fecha, fechaFin: fecha, horasEstimadas: 0, esHito: true })
        dependencias.push({ tareaOrigenId: anterior.id, tareaDependienteId: id, tipo: 'finish_to_start', lagMinutos })
        continue
      }
      const horas = Math.max(0, horasDe(t))
      const fin = sumarHorasLaborables(cal, cursor, horas)
      const fila: FilaTarea = { ...t, id, nombre, proyectoActividadId: actividadId ?? t.proyectoActividadId, fechaInicio: cursor, fechaFin: fin, horasEstimadas: horas }
      nuevas.push(fila)
      if (anterior) dependencias.push({ tareaOrigenId: anterior.id, tareaDependienteId: fila.id, tipo: 'finish_to_start', lagMinutos: 0 })
      anterior = fila
      cursor = siguienteMomentoLaborable(cal, fin)
    }
  }

  /** Fechas y horas de una actividad a partir de sus tareas. */
  const resumirActividad = (act: FilaActividad, delAct: FilaTarea[]) => {
    delAct.forEach((t, i) => { t.orden = i })
    act.fechaInicioPlan = new Date(Math.min(...delAct.map(t => t.fechaInicio.getTime())))
    act.fechaFinPlan = new Date(Math.max(...delAct.map(t => t.fechaFin.getTime())))
    act.horasPlan = delAct.reduce((s, t) => s + t.horasEstimadas, 0)
  }

  for (const act of [...actsGC]) {
    const base = o.tareas.filter(t => t.proyectoActividadId === act.id).sort((a, b) => a.orden - b.orden)
    if (!base.length) continue
    const recurrencia = RECURRENCIA_ACTIVIDAD[act.nombre]
    const horasCiclo = (k: number) => (t: FilaTarea) => {
      const p = o.propuestaPorTareaId.get(t.id)
      if (!p) return t.horasEstimadas
      return k === 0 ? p.horaBase : (p.horaRepetido || p.horaBase)
    }
    const nombreCiclo = ACTIVIDAD_POR_CICLO[act.nombre]
    if (recurrencia && nombreCiclo) {
      // Una actividad por ciclo ("Valorización 01", "Valorización 02"…) en lugar de la original.
      const dias = diasDeCiclo(recurrencia, inicioVentana, finVentana)
      const ciclos = dias.map((dia, k) => {
        const nn = String(k + 1).padStart(2, '0')
        const actCiclo: FilaActividad = { ...act, id: randomUUID(), nombre: `${nombreCiclo} ${nn}`, orden: act.orden + k }
        const desdeIdx = nuevas.length
        encadenar(base, dia, horasCiclo(k), nn, actCiclo.id)
        resumirActividad(actCiclo, nuevas.slice(desdeIdx))
        return actCiclo
      })
      // Reemplaza la actividad original por las de cada ciclo y corre el orden de las siguientes.
      const idxAll = o.actividades.indexOf(act)
      o.actividades.splice(idxAll, 1, ...ciclos)
      actsGC.splice(actsGC.indexOf(act), 1, ...ciclos)
      for (const a of actsGC) if (a.proyectoEdtId === act.proyectoEdtId && !ciclos.includes(a) && a.orden > act.orden) a.orden += ciclos.length - 1
      continue
    }
    const desdeIdx = nuevas.length
    if (recurrencia) {
      diasDeCiclo(recurrencia, inicioVentana, finVentana).forEach((dia, k) => {
        encadenar(base, dia, horasCiclo(k), String(k + 1).padStart(2, '0'))
      })
    } else {
      encadenar(base, inicioVentana, t => t.horasEstimadas, '')
    }
    resumirActividad(act, nuevas.slice(desdeIdx))
  }

  for (const e of edtsGC) {
    const acts = actsGC.filter(a => a.proyectoEdtId === e.id)
    if (!acts.length) continue
    e.fechaInicioPlan = new Date(Math.min(...acts.map(a => a.fechaInicioPlan.getTime())))
    e.fechaFinPlan = new Date(Math.max(...acts.map(a => a.fechaFinPlan.getTime())))
    e.horasPlan = acts.reduce((s, a) => s + a.horasPlan, 0)
  }
  if (edtsGC.length) {
    faseGC.fechaInicioPlan = new Date(Math.min(...edtsGC.map(e => e.fechaInicioPlan.getTime())))
    faseGC.fechaFinPlan = new Date(Math.max(...edtsGC.map(e => e.fechaFinPlan.getTime())))
  }
  return { tareas: [...resto, ...nuevas], dependencias }
}
