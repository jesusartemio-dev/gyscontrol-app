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
  catalogoServicioId: string
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

/** Uno de los 2-3 esquemas alternativos de agrupación que la IA propone en la Etapa A (CON/PRO), antes de asignar ninguna tarea. */
export interface EsquemaAgrupacionPropuesto {
  criterio: string
  nombres: string[]
}

/** Esquema con el que el usuario confirmó la Etapa B — nombres ya posiblemente editados (renombrados/agregados/quitados) respecto al propuesto. */
export interface EsquemaElegido {
  nombres: string[]
  criterioOriginal: string | null
  indiceOriginal: number | null
}
