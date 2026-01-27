// ===================================================
// 📁 Archivo: index.ts
// 📌 Ubicación: src/lib/services/crm/index.ts
// 🔧 Descripción: Exportaciones centralizadas de servicios CRM
// ✅ Punto único de importación para todos los servicios CRM
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

// Servicios de oportunidades
export * from './oportunidades'

// Servicios de actividades
export * from './actividades'

// Servicios de competidores
export * from './competidores'

// Servicios de contactos
export * from './contactos'

// Tipos comunes del CRM
export interface CrmBaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CrmPaginationParams {
  page?: number
  limit?: number
}

export interface CrmFilters {
  fechaDesde?: string
  fechaHasta?: string
  search?: string
}

export interface CrmResponse<T> {
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  estadisticas?: Record<string, any>
}

// Constantes de estados CRM
// Flujo: Inicio → Contacto → Propuesta (V.Técnica / V.Comercial) → Negociación → [Seg.Proyecto / Feedback]
export const CRM_ESTADOS_OPORTUNIDAD = {
  INICIO: 'inicio',
  CONTACTO_CLIENTE: 'contacto_cliente',
  VALIDACION_TECNICA: 'validacion_tecnica',    // Propuesta: alcance y recursos
  VALIDACION_COMERCIAL: 'validacion_comercial', // Propuesta: costeo, margen, condiciones
  NEGOCIACION: 'negociacion',                   // Post-envío de cotización
  SEGUIMIENTO_PROYECTO: 'seguimiento_proyecto', // Ganada
  FEEDBACK_MEJORA: 'feedback_mejora',           // Perdida
  CERRADA_GANADA: 'cerrada_ganada',             // Legacy
  CERRADA_PERDIDA: 'cerrada_perdida'            // Legacy
} as const

// Estados activos (no cerrados)
export const CRM_ESTADOS_ACTIVOS = [
  'inicio',
  'contacto_cliente',
  'validacion_tecnica',
  'validacion_comercial',
  'negociacion'
] as const

// Estados cerrados (incluye legacy y nuevos)
export const CRM_ESTADOS_CERRADOS = [
  'seguimiento_proyecto',   // Ganada
  'feedback_mejora',        // Perdida
  'cerrada_ganada',         // Legacy
  'cerrada_perdida'         // Legacy
] as const

// Motivos de pérdida predefinidos
export const CRM_MOTIVOS_PERDIDA = [
  { value: 'precio', label: 'Precio más alto que competencia' },
  { value: 'tiempo', label: 'Tiempo de entrega' },
  { value: 'tecnico', label: 'Especificaciones técnicas' },
  { value: 'relacion', label: 'Relación con cliente' },
  { value: 'competidor', label: 'Mejor propuesta de competidor' },
  { value: 'presupuesto', label: 'Cliente sin presupuesto' },
  { value: 'cancelado', label: 'Proyecto cancelado por cliente' },
  { value: 'otro', label: 'Otro motivo' }
] as const

export const CRM_PRIORIDADES = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'critica'
} as const

export const CRM_FUENTES = {
  LICITACION: 'licitación',
  REFERIDO: 'referido',
  PROSPECCION: 'prospección',
  WEB: 'web',
  REDES_SOCIALES: 'redes_sociales',
  EVENTO: 'evento'
} as const
