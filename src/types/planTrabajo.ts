import type { PlanTrabajo, PlanTrabajoGeneracion } from '@prisma/client'

// ============================================
// SECCIONES ESTRUCTURADAS (campos Json)
// ============================================

// ─── Alcance detallado ───
export interface PlanAlcanceItem {
  numero: string
  nombre: string
  descripcion: string
  ubicacion?: string
  tieneRiesgoAltura: boolean
  tieneRiesgoCaliente: boolean
  tieneRiesgoElectrico: boolean
  tieneRiesgoEspacioConfinado: boolean
  servicioCotizadoRefId?: string
  edtRefId?: string
}

// ─── EPP ───
export interface PlanEPPItem {
  nombre: string
  norma?: string
  observaciones?: string
}

export interface PlanEPP {
  basico: PlanEPPItem[]
  bioseguridad: PlanEPPItem[]
  riesgoEspecifico: PlanEPPItem[]
}

// ─── Herramientas y equipos ───
export interface PlanItemRecurso {
  nombre: string
  cantidad?: number
  unidad?: string
  observaciones?: string
}

export interface PlanHerramientasYEquipos {
  equipos: PlanItemRecurso[]
  herramientas: PlanItemRecurso[]
  materiales: PlanItemRecurso[]
}

// ─── Restricciones ───
export interface PlanRestriccion {
  texto: string
  categoria?: string
}

// ─── Personal ───
export interface PlanPersonal {
  nombre: string
  cargo: string
  empresa?: string
  siglas?: string
  cip?: string
  email?: string
  telefono?: string
  proyectoOrgNodoRefId?: string
}

// ─── Matriz RACI ───
export type PlanRaciRol = 'R' | 'A' | 'C' | 'I'

export interface PlanRaciAsignacion {
  siglas: string
  rol: PlanRaciRol
}

export interface PlanRaciFila {
  edt: string
  asignaciones: PlanRaciAsignacion[]
}

export interface PlanRaci {
  filas: PlanRaciFila[]
}

// ─── Histogramas ───
export interface PlanHistogramaFila {
  etiqueta: string
  valoresPorMes: number[]
  total: number
}

export interface PlanHistogramas {
  meses: string[]
  equipoTrabajo: PlanHistogramaFila[]
  horasHombre: PlanHistogramaFila[]
}

// ─── Cronograma resumen ───
export interface PlanCronogramaFila {
  fase: string
  edt: string
  actividad?: string
  fechaInicio: string
  fechaFin: string
  horasPlan: number
}

export interface PlanCronograma {
  filas: PlanCronogramaFila[]
}

// ─── Responsabilidades ───
export interface PlanResponsabilidades {
  gerenteGeneral: string[]
  supervisor: string[]
  operario: string[]
  supervisorSeguridad: string[]
}

// ─── Referencias ───
export interface PlanReferencia {
  codigoDocumento?: string
  titulo: string
  origen: 'TDR' | 'COTIZACION' | 'NORMATIVA' | 'MANUAL'
}

// ─── Sección regenerable ───
export type SeccionRegenerable =
  | 'objetivo'
  | 'alcanceGeneral'
  | 'alcanceDetallado'
  | 'eppRequeridos'
  | 'herramientasYEquipos'
  | 'restricciones'
  | 'personalAsignado'
  | 'matrizRaci'
  | 'histogramas'
  | 'cronogramaResumen'
  | 'responsabilidades'
  | 'referencias'

// ─── Bloques de completitud ───
export interface PlanBloquesCompletitud {
  objetivo: boolean
  alcanceGeneral: boolean
  alcanceDetallado: boolean
  eppRequeridos: boolean
  herramientasYEquipos: boolean
  restricciones: boolean
  personalAsignado: boolean
  matrizRaci: boolean
  histogramas: boolean
  cronogramaResumen: boolean
  responsabilidades: boolean
  referencias: boolean
}

// ============================================
// PRE-REQUISITOS
// ============================================

export interface PlanPrerrequisitos {
  // Bloqueantes (impiden generar)
  cotizacionAprobada: boolean
  organigramaCreado: boolean
  cronogramaPlanificacionExiste: boolean
  clienteCargado: boolean
  // Advertencias (no bloquean)
  matrizComunicacionCreada: boolean
  serviciosCotizados: boolean
  equiposCotizados: boolean
  // Opcionales
  tdrAnalizado: boolean
  // Computados
  puedeGenerar: boolean
  bloqueantesFaltantes: string[]
  advertencias: string[]
}

// ============================================
// RESPONSE DEL ENDPOINT /contexto
// ============================================

export interface PlanTrabajoContexto {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    descripcion: string | null
    numeroContrato: string | null
    ordenCompraCliente: string | null
    fechaFirmaContrato: Date | null
    fechaInicio: Date
    fechaFin: Date | null
    estado: string
    cliente: {
      id: string
      codigo: string
      nombre: string
      ruc: string | null
      direccion: string | null
    } | null
    gestor: { id: string; name: string | null; email: string }
    supervisor: { id: string; name: string | null; email: string } | null
    lider: { id: string; name: string | null; email: string } | null
  }

  planTrabajo: (PlanTrabajo & {
    generaciones: PlanTrabajoGeneracion[]
  }) | null

  cotizacion: {
    aprobada: boolean
    equipos: EquipoCotizadoContexto[]
    servicios: ServicioCotizadoContexto[]
    gastos: GastoCotizadoContexto[]
  }

  cronograma: {
    cronogramaSeleccionado: CronogramaContexto | null
    tipoUsado: 'planificacion' | 'comercial' | null
    advertenciaPlanificacionFaltante: boolean
  }

  organigrama: OrgNodoContexto[]
  matriz: MatrizContexto | null
  tdr: TdrContexto | null

  prerrequisitos: PlanPrerrequisitos

  iaPlanTrabajoHabilitada: boolean
}

// ─── Sub-tipos del contexto ───

export interface EquipoCotizadoContexto {
  id: string
  nombre: string
  descripcion: string | null
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    codigo: string
    descripcion: string
    categoria: string
    cantidad: number
    precioInterno: number
    precioCliente: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface ServicioCotizadoContexto {
  id: string
  nombre: string
  edtId: string
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    nombre: string
    edtId: string
    cantidadHoras: number
    costoHoraInterno: number
    costoHoraCliente: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface GastoCotizadoContexto {
  id: string
  nombre: string
  descripcion: string | null
  subtotalInterno: number
  subtotalCliente: number
  items: {
    id: string
    nombre: string
    cantidad: number
    precioUnitario: number
    costoInterno: number
    costoCliente: number
  }[]
}

export interface CronogramaContexto {
  id: string
  tipo: string
  nombre: string
  esBaseline: boolean
  fases: {
    id: string
    nombre: string
    orden: number
    estado: string
    edts: {
      id: string
      nombre: string
      edtId: string
      orden: number
      fechaInicioPlan: Date | null
      fechaFinPlan: Date | null
      horasPlan: number | null
      estado: string
      prioridad: string
      descripcion: string | null
      proyectoFaseId: string | null
      actividades: {
        id: string
        nombre: string
        orden: number
        fechaInicioPlan: Date
        fechaFinPlan: Date
        horasPlan: number | null
        estado: string
        prioridad: string
        descripcion: string | null
        tareas: {
          id: string
          nombre: string
          orden: number
          fechaInicio: Date
          fechaFin: Date
          horasEstimadas: number | null
          personasEstimadas: number
          estado: string
          prioridad: string
        }[]
      }[]
    }[]
  }[]
}

export interface OrgNodoContexto {
  id: string
  parentId: string | null
  orden: number
  cargoLabel: string
  esFijoGys: boolean
  empresaOverride: string | null
  telefonoOverride: string | null
  cipOverride: string | null
  user: {
    id: string
    name: string | null
    email: string
    empleado: { cip: string | null; telefono: string | null } | null
  } | null
}

export interface MatrizContexto {
  id: string
  version: string
  generadoConIA: boolean
  filas: {
    id: string
    orden: number
    informacion: string
    emisor: string
    receptores: string
    medio: string
    frecuencia: string
  }[]
}

export interface TdrContexto {
  id: string
  resumenTdr: string
  alcanceDetectado: string | null
  equiposIdentificados: unknown
  serviciosIdentificados: unknown
  personalRequerido: unknown
  normasAplicables: unknown
  hitosContractuales: unknown
  cronogramaEstimado: unknown
  riesgosCriticos: unknown
  bloquesCompletitud: unknown
}

// Re-exports
export type { PlanTrabajo, PlanTrabajoGeneracion }
