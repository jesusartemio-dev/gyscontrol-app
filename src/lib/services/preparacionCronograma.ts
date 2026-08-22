import { prisma } from '@/lib/prisma'

/**
 * Diagnóstico de si un proyecto está en condiciones de tener curva de avance.
 *
 * Existe porque el sistema es nuevo y buena parte de la cartera todavía no tiene el
 * cronograma armado. Sin este diagnóstico, un proyecto sin configurar y uno configurado
 * pero con el registro atrasado se ven exactamente igual: una curva vacía. Y son problemas
 * distintos — uno lo arregla el jefe de proyecto, el otro el supervisor de campo.
 *
 * Las dimensiones se miran por separado, NO en cascada: hay proyectos sin cronograma de
 * planificación que sí tienen uno de ejecución con tareas (los internos GYS.*), así que
 * "sin plan ⇒ sin ejecución ⇒ sin tareas" no es cierto.
 */

export type EstadoPreparacion =
  | 'listo'
  | 'centro_de_costo'
  | 'sin_cronograma'
  | 'sin_baseline'
  | 'sin_ejecucion'
  | 'ejecucion_vacia'
  | 'tareas_sin_fase'

export interface Preparacion {
  estado: EstadoPreparacion
  /** Proyecto interno: es un contenedor de horas de un centro de costo, no una obra. */
  esInterno: boolean
  /** true solo si se puede esperar una curva Real con sentido. */
  listo: boolean
  /** true si además puede dibujarse la línea Plan. */
  puedeCompararConPlan: boolean
  tienePlanificacion: boolean
  tieneBaseline: boolean
  tieneEjecucion: boolean
  tareasEjecucion: number
  tareasSinFase: number
  titulo: string
  detalle: string
  /** Qué hay que hacer, en el orden en que hay que hacerlo. */
  pasos: string[]
}

export async function diagnosticarPreparacion(proyectoId: string): Promise<Preparacion> {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { esInterno: true, centroCosto: { select: { nombre: true } } },
  })
  const esInterno = proyecto?.esInterno ?? false

  const cronos = await prisma.proyectoCronograma.findMany({
    where: { proyectoId },
    select: { id: true, tipo: true, esBaseline: true },
  })
  const plan = cronos.filter((c) => c.tipo === 'planificacion')
  const baseline = plan.filter((c) => c.esBaseline)
  const ejec = cronos.filter((c) => c.tipo === 'ejecucion')

  let tareasEjecucion = 0
  let tareasSinFase = 0
  if (ejec.length > 0) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: ejec[0].id },
      select: { proyectoEdt: { select: { proyectoFaseId: true } } },
    })
    tareasEjecucion = tareas.length
    tareasSinFase = tareas.filter((t) => !t.proyectoEdt?.proyectoFaseId).length
  }

  const base = {
    esInterno,
    tienePlanificacion: plan.length > 0,
    tieneBaseline: baseline.length > 0,
    tieneEjecucion: ejec.length > 0,
    tareasEjecucion,
    tareasSinFase,
    puedeCompararConPlan: baseline.length > 0,
  }

  // Un proyecto interno es un cubo de horas de un centro de costo: no tiene alcance que
  // medir, así que "le falta cronograma" no es un diagnóstico útil sino ruido. Solo se
  // considera una obra de verdad si alguien le armó fases con tareas.
  if (esInterno && (ejec.length === 0 || tareasEjecucion === 0 || tareasSinFase === tareasEjecucion)) {
    return {
      ...base, estado: 'centro_de_costo', listo: false, puedeCompararConPlan: false,
      titulo: 'Centro de costo, no un proyecto de obra',
      detalle:
        `Sirve para imputar horas${proyecto?.centroCosto?.nombre ? ` al centro de costo ${proyecto.centroCosto.nombre}` : ''}. ` +
        'No tiene alcance planificado, así que no le corresponde curva de avance: lo que sí ' +
        'tiene sentido mirar aquí son las horas consumidas.',
      pasos: [],
    }
  }

  const SIN_TAREAS =
    'Sin tareas en el cronograma de ejecución no hay nada que imputar en las jornadas de ' +
    'campo ni en el timesheet, así que tampoco puede haber avance que graficar.'

  if (ejec.length === 0 && plan.length === 0) {
    return {
      ...base, estado: 'sin_cronograma', listo: false,
      titulo: 'Este proyecto todavía no tiene cronograma',
      detalle: `No hay cronograma de planificación ni de ejecución. ${SIN_TAREAS}`,
      pasos: [
        'Crear el cronograma de planificación y marcarlo como línea base',
        'Generar desde él el cronograma de ejecución',
        'Repartir las tareas en fases y asignar responsables',
      ],
    }
  }

  if (ejec.length === 0) {
    return {
      ...base,
      estado: baseline.length === 0 ? 'sin_baseline' : 'sin_ejecucion',
      listo: false,
      titulo: baseline.length === 0
        ? 'Hay planificación, pero ninguna marcada como línea base'
        : 'Falta generar el cronograma de ejecución',
      detalle: baseline.length === 0
        ? `Hay ${plan.length} cronograma(s) de planificación pero ninguno es la línea base, así que no se generó el de ejecución. ${SIN_TAREAS}`
        : `La línea base está, pero todavía no se generó el cronograma de ejecución. ${SIN_TAREAS}`,
      pasos: baseline.length === 0
        ? ['Marcar como línea base el cronograma de planificación correcto', 'Generar desde él el cronograma de ejecución']
        : ['Generar el cronograma de ejecución desde la línea base'],
    }
  }

  if (tareasEjecucion === 0) {
    return {
      ...base, estado: 'ejecucion_vacia', listo: false,
      titulo: 'El cronograma de ejecución está vacío',
      detalle: `Existe el cronograma pero no tiene ninguna tarea. ${SIN_TAREAS}`,
      pasos: ['Cargar las tareas del cronograma de ejecución, agrupadas en fases'],
    }
  }

  if (tareasSinFase === tareasEjecucion) {
    return {
      ...base, estado: 'tareas_sin_fase', listo: false,
      titulo: 'Las tareas no cuelgan de ninguna fase',
      detalle:
        `Las ${tareasEjecucion} tareas del cronograma no están asignadas a una fase. El avance ` +
        'se pondera por el peso de cada fase, así que estas tareas no suman nada aunque se ' +
        'completen: el proyecto se quedará en 0 %.' +
        (plan.length === 0 ? ' Tampoco hay línea base con la que comparar.' : ''),
      pasos: [
        'Crear las fases del cronograma de ejecución',
        'Reasignar los EDT a su fase correspondiente',
        ...(plan.length === 0 ? ['Crear un cronograma de planificación y marcarlo como línea base'] : []),
      ],
    }
  }

  // Hay tareas útiles: la curva Real funciona. Lo que puede faltar es con qué compararla.
  if (baseline.length === 0) {
    return {
      ...base, estado: plan.length === 0 ? 'sin_cronograma' : 'sin_baseline', listo: true,
      titulo: 'Sin línea base con la que comparar',
      detalle:
        plan.length === 0
          ? `Hay ${tareasEjecucion} tareas en ejecución, así que la curva Real sí se dibuja, pero no hay cronograma de planificación: la línea Plan no aparece y no se puede medir desviación.`
          : 'Hay cronograma de planificación pero ninguno marcado como línea base, así que la línea Plan no se dibuja.',
      pasos: plan.length === 0
        ? ['Crear el cronograma de planificación y marcarlo como línea base']
        : ['Marcar como línea base el cronograma de planificación correcto'],
    }
  }

  return {
    ...base, estado: 'listo', listo: true,
    titulo: 'Cronograma completo',
    detalle: tareasSinFase > 0
      ? `${tareasSinFase} de ${tareasEjecucion} tareas no cuelgan de ninguna fase y no puntúan en el avance.`
      : '',
    pasos: tareasSinFase > 0 ? ['Asignar a una fase los EDT de las tareas que quedaron sueltas'] : [],
  }
}
