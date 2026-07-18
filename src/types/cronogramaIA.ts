import type { FiltroAlcanceServicio } from '@prisma/client'

export interface CatalogoServicioParaWizard {
  id: string
  nombre: string
  descripcion: string
  edtNombre: string
  actividadTag: string[]
  filtroAlcance: FiltroAlcanceServicio
  notaCantidad: string | null
  horaBase: number | null
  horaRepetido: number | null
  cantidad: number | null
  nivelDificultad: number | null
  orden: number | null
  unidadNombre: string
  recursoNombre: string
}

export interface ConfiguracionWizardPaso1 {
  edtsSeleccionados: string[]
  brownfield: boolean
  ingenieriaDetalle: boolean
  tableros: { nombre: string }[]
  plcs: { nombre: string }[]
  hmiCantidad: number
  scada: boolean
  nValorizaciones: number
  duracionSemanas: number
  nPersonas: number
  nPets: number
  alcanceLibre: string
}

export interface TareaPropuesta {
  /** null solo cuando esPropuestaIA es true — una tarea IA sin respaldo de catálogo (ver validarTareasNuevasPropuestas). */
  catalogoServicioId: string | null
  nombre: string
  cantidad: number
  nivelDificultad: number
  horaBase: number
  horaRepetido: number
  horasEstimadas: number
  incluida: boolean
  motivoExclusion?: string
  /**
   * Clave de la regla de sub-alcance que decidió el estado inicial de
   * `incluida` (ej. "cmm.instrumentacion", "ing.control") — ausente si la
   * tarea no está regida por ninguna regla (siempre incluida por defecto) o
   * si ya venía excluida por otro mecanismo (ej. filtroAlcance) antes de que
   * esta regla pudiera evaluarla.
   */
  reglaClave?: string
  /**
   * Snapshot de lo que decidió `reglaClave` en el momento en que se evaluó
   * — a diferencia de `incluida` (que el usuario puede tocar libremente en
   * el Paso 2/3), este valor nunca se vuelve a escribir. Al aplicar el
   * cronograma, `incluida !== incluidaPorRegla` significa que el usuario
   * forzó la decisión de la regla (ver CronogramaIATareaDecision).
   */
  incluidaPorRegla?: boolean
  orden: number
  /** true si esta tarea fue propuesta por la IA (Etapa B de CON/PRO) sin respaldo de catálogo — nunca tiene catalogoServicioId. */
  esPropuestaIA?: boolean
  /** Justificación de 1 línea dada por la IA al proponerla — solo presente si esPropuestaIA es true. */
  justificacion?: string
  /** Nombre de la unidad de medida del servicio (ej. "Metro", "Punto") — CatalogoServicio.unidadServicio.nombre, para mostrar junto al input de cantidad en el Paso 2. */
  unidadNombre?: string
  /** CatalogoServicio.notaCantidad (ej. "metros de cable") — solo para decidir si vale la pena pedirle a la IA una sugerencia de cantidad; nunca se muestra al usuario. */
  notaCantidad?: string | null
  /** true si `cantidad` fue resuelta por el mapeo determinístico o sugerida por IA (ver sugerirCantidadesReales) — false/ausente si es el default "1" del catálogo, o si el usuario ya la editó a mano en el Paso 2. Solo para mostrar un badge de aviso, nunca cambia el cálculo. */
  cantidadSugeridaPorIA?: boolean
}

export interface ActividadPropuesta {
  edtNombre: string
  actividadNombre: string
  tareas: TareaPropuesta[]
  origen: 'determinista' | 'ia'
}

export interface ResultadoActividadesDeterministas {
  actividades: ActividadPropuesta[]
  advertencias: string[]
}

/** Nombre de Actividad de un esquema junto con su alias corto (ver aliasActividad.ts) usado para prefijar las tareas repetidas entre Actividades. */
export interface NombreConAlias {
  nombre: string
  alias: string
  /** Solo relevante para familias de PRO — true si el nombre no está en NOMBRE_FAMILIA_OFICIAL_PRO (ver vocabularioFamiliasPro.ts). Corregido en código, nunca confiado al LLM. */
  fueraDeVocabulario?: boolean
  /** Justificación de 1 línea citando evidencia del alcance — presente cuando fueraDeVocabulario es true. */
  justificacion?: string
}

/** Uno de los 2-3 esquemas alternativos de agrupación que la IA propone en la Etapa A (CON/PRO), antes de asignar ninguna tarea. */
export interface EsquemaAgrupacionPropuesto {
  criterio: string
  nombres: NombreConAlias[]
  /** Aclaración opcional para el usuario — ej. cuando el esquema "Por zona" de CON usa placeholders genéricos por falta de contexto geográfico. */
  nota?: string
}

/** Esquema con el que el usuario confirmó la Etapa B — nombres/alias ya posiblemente editados (renombrados/agregados/quitados) respecto al propuesto. */
export interface EsquemaElegido {
  nombres: NombreConAlias[]
  criterioOriginal: string | null
  indiceOriginal: number | null
}
