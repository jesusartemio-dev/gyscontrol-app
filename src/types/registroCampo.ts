/**
 * Tipos para el sistema de Registro de Horas en Campo (Cuadrilla)
 */

import type { EstadoRegistroCampo } from '@prisma/client'

// =============================================
// Tipos base
// =============================================

export interface MiembroCuadrilla {
  usuarioId: string
  horas: number
  observaciones?: string
}

export interface MiembroCuadrillaConInfo extends MiembroCuadrilla {
  id: string
  registroHorasId?: string | null
  usuario: {
    id: string
    name: string | null
    email: string
    role: string
  }
}

// =============================================
// Payloads para APIs
// =============================================

export interface CrearRegistroCampoPayload {
  proyectoId: string
  proyectoEdtId?: string
  proyectoTareaId?: string
  fechaTrabajo: string // YYYY-MM-DD
  horasBase: number
  descripcion?: string
  ubicacion?: string
  miembros: MiembroCuadrilla[]
}

export interface RechazarRegistroCampoPayload {
  motivoRechazo: string
}

// =============================================
// Respuestas de APIs
// =============================================

export interface RegistroCampoResumen {
  id: string
  fechaTrabajo: Date
  horasBase: number
  descripcion: string | null
  ubicacion: string | null
  estado: EstadoRegistroCampo
  fechaAprobacion: Date | null
  motivoRechazo: string | null
  createdAt: Date
  proyecto: {
    id: string
    codigo: string
    nombre: string
  }
  proyectoEdt: {
    id: string
    nombre: string
  } | null
  proyectoTarea: {
    id: string
    nombre: string
  } | null
  supervisor: {
    id: string
    name: string | null
    email: string
  }
  aprobadoPor: {
    id: string
    name: string | null
    email: string
  } | null
  _count: {
    miembros: number
  }
  totalHoras: number
}

export interface RegistroCampoDetalle extends Omit<RegistroCampoResumen, '_count' | 'totalHoras'> {
  miembros: MiembroCuadrillaConInfo[]
}

// =============================================
// Estado del componente Wizard
// =============================================

export interface RegistroCampoWizardState {
  paso: number
  proyectoId: string | null
  proyectoEdtId: string | null
  proyectoTareaId: string | null
  fechaTrabajo: string
  horasBase: number
  descripcion: string
  ubicacion: string
  miembrosSeleccionados: MiembroCuadrilla[]
}

// =============================================
// Filtros para listados
// =============================================

export interface FiltrosRegistroCampo {
  proyectoId?: string
  supervisorId?: string
  estado?: EstadoRegistroCampo
  fechaDesde?: string
  fechaHasta?: string
}
