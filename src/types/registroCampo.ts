/**
 * Tipos para el sistema de Registro de Horas en Campo (Cuadrilla)
 *
 * Estructura: 1 Registro = 1 Proyecto + 1 EDT + N Tareas
 * Cada Tarea tiene su propio personal con horas independientes
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

// Tarea con sus miembros para crear un registro
export interface TareaCuadrilla {
  proyectoTareaId?: string | null
  nombreTareaExtra?: string | null
  descripcion?: string
  miembros: MiembroCuadrilla[]
}

// Tarea con información completa (para mostrar)
export interface TareaCuadrillaConInfo {
  id: string
  proyectoTareaId: string | null
  nombreTareaExtra: string | null
  descripcion: string | null
  proyectoTarea: {
    id: string
    nombre: string
    proyectoActividad?: {
      id: string
      nombre: string
    } | null
  } | null
  miembros: MiembroCuadrillaConInfo[]
  totalHoras: number
}

// =============================================
// Payloads para APIs
// =============================================

export interface CrearRegistroCampoPayload {
  proyectoId: string
  proyectoEdtId?: string
  fechaTrabajo: string // YYYY-MM-DD
  descripcion?: string
  ubicacion?: string
  tareas: TareaCuadrilla[]
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
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
}

export interface RegistroCampoDetalle extends Omit<RegistroCampoResumen, 'cantidadTareas' | 'cantidadMiembros' | 'totalHoras'> {
  tareas: TareaCuadrillaConInfo[]
}

// =============================================
// Estado del componente Wizard
// =============================================

// Tarea en el wizard (editable)
export interface TareaWizard {
  id: string // ID temporal para UI
  proyectoTareaId: string | null
  nombreTareaExtra: string | null
  descripcion: string
  miembros: MiembroCuadrilla[]
}

export interface RegistroCampoWizardState {
  paso: number
  proyectoId: string | null
  proyectoEdtId: string | null
  fechaTrabajo: string
  descripcion: string
  ubicacion: string
  tareas: TareaWizard[]
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
