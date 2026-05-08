// Tipos compartidos del módulo TDR
// Usados por CotizacionTdrAnalisis y ProyectoTdrAnalisis

export type Criticidad = 'alta' | 'media' | 'baja'
export type EstadoBloque = 'completo' | 'parcial' | 'vacio'

export interface Requerimiento {
  descripcion: string
  cantidad?: number
  especificacion?: string
  criticidad?: Criticidad
}

export interface EquipoIdentificado {
  nombre: string
  cantidad?: number
  especificacion?: string
  estimadoUsd?: number
  suministra?: 'contratista' | 'cliente'
  marcaSugerida?: string
}

export interface ServicioIdentificado {
  nombre: string
  descripcion?: string
  horasEstimadas?: number
}

export interface Ambiguedad {
  aspecto: string
  descripcion: string
  impacto?: string
}

export interface ConsultaCliente {
  categoria?: string
  pregunta: string
  prioridad?: Criticidad
  respondida?: boolean
}

export interface Supuesto {
  supuesto: string
  impactoSiIncorrecto?: string
}

export interface Exclusion {
  descripcion: string
}

export interface FaseCronograma {
  fase: string
  duracion?: string
  observaciones?: string
}

export interface PresupuestoEstimado {
  equipos?: number
  servicios?: number
  gastos?: number
  total?: number
}

export interface ResumenEjecutivoPunto {
  categoria: 'entregable' | 'ubicacion' | 'plazo' | 'condicion' | 'otro'
  texto: string
}

export interface PersonalRequerido {
  rol: string
  cantidad: number
  experienciaAnios?: number
  certificaciones?: string[]
  obligatorio: boolean
}

export interface NormaAplicable {
  codigo: string
  nombre: string
  categoria?: 'electrica' | 'mecanica' | 'ssoma' | 'calidad' | 'otro'
}

export interface DocumentoPrevio {
  nombre: string
  diasAnticipacion?: number
  responsable?: 'contratista' | 'cliente'
  obligatorio: boolean
}

export interface EntregableDossier {
  nombre: string
  formato?: 'fisico' | 'digital' | 'ambos'
  fase: 'ingenieria' | 'construccion' | 'cierre'
}

export interface RiesgoCritico {
  riesgo: string
  probabilidad?: Criticidad
  impacto?: Criticidad
  mitigacion?: string
}

export interface HitoContractual {
  nombre: string
  tipo: 'kom' | 'fat' | 'sat' | 'comisionamiento' | 'as-built' | 'otro'
  fechaEstimada?: string
  diasDesdeInicio?: number
  entregablesAsociados?: string[]
}

export interface Penalidad {
  causa: string
  tipo: 'porcentaje-diario' | 'monto-fijo' | 'porcentaje-total'
  valor: number
  topeMaximo?: number
}

export interface Garantias {
  fielCumplimiento?: { porcentaje: number; vigencia: string }
  adelanto?: { porcentaje: number; vigencia: string }
  responsabilidadCivil?: { monto: number; moneda: string }
  servicio?: { duracionMeses: number }
}

export type BloqueId =
  | 'identificacion'
  | 'alcance'
  | 'suministros'
  | 'personal'
  | 'plazos'
  | 'ssoma'
  | 'comercial'
  | 'entregables'

export type BloquesCompletitud = Record<BloqueId, EstadoBloque>

export interface TdrAnalisisCore {
  resumenTdr: string
  alcanceDetectado?: string | null
  resumenEjecutivoNarrativa?: string | null
  resumenEjecutivoPuntos?: ResumenEjecutivoPunto[] | null
  requerimientos?: Requerimiento[] | null
  equiposIdentificados?: EquipoIdentificado[] | null
  serviciosIdentificados?: ServicioIdentificado[] | null
  ambiguedades?: Ambiguedad[] | null
  consultasCliente?: ConsultaCliente[] | null
  supuestos?: Supuesto[] | null
  exclusiones?: Exclusion[] | null
  cronogramaEstimado?: FaseCronograma[] | null
  presupuestoEstimado?: PresupuestoEstimado | null
  personalRequerido?: PersonalRequerido[] | null
  normasAplicables?: NormaAplicable[] | null
  documentosPrevios?: DocumentoPrevio[] | null
  entregablesDossier?: EntregableDossier[] | null
  riesgosCriticos?: RiesgoCritico[] | null
  hitosContractuales?: HitoContractual[] | null
  penalidades?: Penalidad[] | null
  garantias?: Garantias | null
  nombreArchivo?: string | null
  paginasPdf?: number | null
  clienteDetectado?: string | null
  proyectoDetectado?: string | null
  ubicacionDetectada?: string | null
  bloquesCompletitud?: BloquesCompletitud | null
}

export interface CotizacionTdrAnalisis extends TdrAnalisisCore {
  id: string
  cotizacionId: string
  createdAt: string
  updatedAt: string
}

export interface ProyectoTdrAnalisis extends TdrAnalisisCore {
  id: string
  proyectoId: string
  cotizacionTdrOrigenId?: string | null
  desconectadoDeOrigen: boolean
  fechaSnapshot: string
  createdAt: string
  updatedAt: string
  // Incluido por el GET endpoint (se lee del proyecto, no del análisis)
  cotizacionId?: string | null
}
