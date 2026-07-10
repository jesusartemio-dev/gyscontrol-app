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
