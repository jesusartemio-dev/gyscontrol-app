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

// Constantes comunes
export const CRM_ESTADOS_OPORTUNIDAD = {
  INICIO: 'inicio',
  CONTACTO_CLIENTE: 'contacto_cliente',
  VALIDACION_TECNICA: 'validacion_tecnica',
  CONSOLIDACION_PRECIOS: 'consolidacion_precios',
  VALIDACION_COMERCIAL: 'validacion_comercial',
  SEGUIMIENTO_CLIENTE: 'seguimiento_cliente',
  NEGOCIACION: 'negociacion',
  SEGUIMIENTO_PROYECTO: 'seguimiento_proyecto',
  CERRADA_GANADA: 'cerrada_ganada',
  CERRADA_PERDIDA: 'cerrada_perdida'
} as const

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
