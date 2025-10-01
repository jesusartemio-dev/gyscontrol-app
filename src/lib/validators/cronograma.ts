/**
 * 📋 VALIDADORES DE NEGOCIO PARA SISTEMA EDT
 * 
 * Validadores Zod para el sistema de Estructura de Desglose de Trabajo (EDT)
 * Incluye validaciones de negocio específicas y esquemas para formularios
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { z } from 'zod'
import type { EstadoEdt, PrioridadEdt, OrigenTrabajo, ProyectoEstado } from '@/types/modelos'

// ✅ CUID validation schema (Prisma uses cuid() by default)
const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'ID debe ser un CUID válido')

// ===================================================
// 🔧 VALIDADORES BASE PARA EDT
// ===================================================

// ✅ Validador para fechas (formato ISO)
const fechaSchema = z.string().datetime({ message: 'Formato de fecha inválido' }).optional()

// ✅ Validador para porcentaje (0-100)
const porcentajeSchema = z.number()
  .min(0, 'El porcentaje no puede ser menor a 0')
  .max(100, 'El porcentaje no puede ser mayor a 100')
  .optional()

// ✅ Validador para horas (positivo)
const horasSchema = z.number()
  .min(0, 'Las horas no pueden ser negativas')
  .max(10000, 'Las horas no pueden exceder 10,000')

// ✅ Validador para zona (texto opcional)
const zonaSchema = z.string()
  .min(1, 'La zona no puede estar vacía')
  .max(100, 'La zona no puede exceder 100 caracteres')
  .optional()

// ===================================================
// 📋 ESQUEMAS PRINCIPALES EDT
// ===================================================

// 🔧 Esquema para crear ProyectoEdt
export const crearProyectoEdtSchema = z.object({
  proyectoId: cuidSchema,
  categoriaServicioId: cuidSchema,
  zona: zonaSchema,
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  fechaInicioReal: fechaSchema,
  fechaFinReal: fechaSchema,
  horasEstimadas: horasSchema,
  horasReales: horasSchema.optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'detenido', 'cancelado']).optional().default('planificado'),
  responsableId: cuidSchema.optional(),
  porcentajeAvance: porcentajeSchema.default(0),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media')
})
.refine((data) => {
  // 🔁 Validación: fechaFin debe ser posterior a fechaInicio
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['fechaFin']
})
.refine((data) => {
  // 🔁 Validación: fechaFinReal debe ser posterior a fechaInicioReal
  if (data.fechaInicioReal && data.fechaFinReal) {
    return new Date(data.fechaFinReal) >= new Date(data.fechaInicioReal)
  }
  return true
}, {
  message: 'La fecha de fin real debe ser posterior o igual a la fecha de inicio real',
  path: ['fechaFinReal']
})
.refine((data) => {
  // 🔁 Validación: horasReales no pueden exceder horasEstimadas * 1.5
  if (data.horasReales && data.horasEstimadas) {
    return data.horasReales <= (data.horasEstimadas * 1.5)
  }
  return true
}, {
  message: 'Las horas reales no pueden exceder 150% de las horas estimadas',
  path: ['horasReales']
})

// 🔧 Esquema base para ProyectoEdt (sin refinements)
const proyectoEdtBaseSchema = z.object({
  proyectoId: cuidSchema,
  categoriaServicioId: cuidSchema,
  zona: zonaSchema,
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  fechaInicioReal: fechaSchema,
  fechaFinReal: fechaSchema,
  horasEstimadas: horasSchema,
  horasReales: horasSchema.optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'detenido', 'cancelado']).optional().default('planificado'),
  responsableId: cuidSchema.optional(),
  porcentajeAvance: porcentajeSchema.default(0),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media')
})

// 🔧 Esquema para actualizar ProyectoEdt
export const actualizarProyectoEdtSchema = proyectoEdtBaseSchema.partial().extend({
  id: z.string().uuid('ID de EDT inválido').optional()
})

// 📊 Esquema para filtros de búsqueda EDT
export const edtFiltrosSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  proyectoId: z.string().uuid().optional(),
  categoriaServicioId: z.string().uuid().optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'detenido', 'cancelado']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  responsableId: z.string().uuid().optional(),
  zona: z.string().optional(),
  fechaDesde: fechaSchema,
  fechaHasta: fechaSchema,
  porcentajeAvanceMin: z.number().min(0).max(100).optional(),
  porcentajeAvanceMax: z.number().min(0).max(100).optional(),
  horasEstimadasMin: z.number().min(0).optional(),
  horasEstimadasMax: z.number().min(0).optional()
})
.refine((data) => {
  // 🔁 Validación: fechaHasta debe ser posterior a fechaDesde
  if (data.fechaDesde && data.fechaHasta) {
    return new Date(data.fechaHasta) >= new Date(data.fechaDesde)
  }
  return true
}, {
  message: 'La fecha hasta debe ser posterior o igual a la fecha desde',
  path: ['fechaHasta']
})
.refine((data) => {
  // 🔁 Validación: porcentajeAvanceMax debe ser mayor a porcentajeAvanceMin
  if (data.porcentajeAvanceMin !== undefined && data.porcentajeAvanceMax !== undefined) {
    return data.porcentajeAvanceMax >= data.porcentajeAvanceMin
  }
  return true
}, {
  message: 'El porcentaje máximo debe ser mayor o igual al mínimo',
  path: ['porcentajeAvanceMax']
})
.refine((data) => {
  // 🔁 Validación: horasEstimadasMax debe ser mayor a horasEstimadasMin
  if (data.horasEstimadasMin !== undefined && data.horasEstimadasMax !== undefined) {
    return data.horasEstimadasMax >= data.horasEstimadasMin
  }
  return true
}, {
  message: 'Las horas máximas deben ser mayores o iguales a las mínimas',
  path: ['horasEstimadasMax']
})

// ===================================================
// 📈 ESQUEMAS PARA MÉTRICAS Y REPORTES
// ===================================================

// 📈 Esquema para métricas EDT
export const metricasEdtSchema = z.object({
  proyectoId: z.string().uuid().optional(),
  categoriaServicioId: z.string().uuid().optional(),
  responsableId: z.string().uuid().optional(),
  fechaInicio: fechaSchema,
  fechaFin: fechaSchema,
  incluirDetalles: z.boolean().optional().default(false)
})
.refine((data) => {
  // 🔁 Validación: fechaFin debe ser posterior a fechaInicio
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['fechaFin']
})

// 🎯 Esquema para resumen EDT por proyecto
export const resumenEdtProyectoSchema = z.object({
  proyectoIds: z.array(z.string().uuid()).optional(),
  incluirResponsables: z.boolean().optional().default(true),
  incluirMetricas: z.boolean().optional().default(true),
  fechaCorte: fechaSchema
})

// 📊 Esquema para reportes EDT
export const reporteEdtSchema = z.object({
  tipo: z.enum(['resumen', 'detallado', 'metricas', 'progreso']),
  filtros: z.object({
    proyectoId: z.string().uuid().optional(),
    categoriaServicioId: z.string().uuid().optional(),
    estado: z.array(z.enum(['planificado', 'en_progreso', 'completado', 'detenido', 'cancelado'])).optional(),
    prioridad: z.array(z.enum(['baja', 'media', 'alta', 'critica'])).optional(),
    responsableId: z.string().uuid().optional(),
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema,
    zona: z.string().optional()
  }),
  formato: z.enum(['pdf', 'excel', 'csv']),
  incluirGraficos: z.boolean().optional().default(true),
  incluirDetalleHoras: z.boolean().optional().default(false)
})
.refine((data) => {
  // 🔁 Validación: fechaFin debe ser posterior a fechaInicio en filtros
  if (data.filtros.fechaInicio && data.filtros.fechaFin) {
    return new Date(data.filtros.fechaFin) >= new Date(data.filtros.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['filtros', 'fechaFin']
})

// ===================================================
// 🔄 ESQUEMAS PARA OPERACIONES MASIVAS
// ===================================================

// 📋 Esquema para actualización masiva de EDT
export const edtBulkUpdateSchema = z.object({
  edtIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un EDT'),
  updates: z.object({
    estado: z.enum(['planificado', 'en_progreso', 'completado', 'detenido', 'cancelado']).optional(),
    prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
    responsableId: z.string().uuid().optional(),
    porcentajeAvance: porcentajeSchema,
    fechaInicio: fechaSchema,
    fechaFin: fechaSchema
  }).refine((data) => {
    // 🔁 Validación: fechaFin debe ser posterior a fechaInicio
    if (data.fechaInicio && data.fechaFin) {
      return new Date(data.fechaFin) >= new Date(data.fechaInicio)
    }
    return true
  }, {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
    path: ['fechaFin']
  })
})

// 🔄 Esquema para transferir EDT entre responsables
export const edtTransferSchema = z.object({
  edtIds: z.array(z.string().uuid()).min(1, 'Debe seleccionar al menos un EDT'),
  nuevoResponsableId: z.string().uuid('ID de responsable inválido'),
  motivo: z.string()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .optional(),
  notificarResponsables: z.boolean().optional().default(true)
})

// ===================================================
// 🎨 ESQUEMAS PARA CONFIGURACIÓN
// ===================================================

// 🎨 Esquema para configuración de vista EDT
export const edtViewConfigSchema = z.object({
  usuarioId: z.string().uuid('ID de usuario inválido'),
  configuracion: z.object({
    columnas: z.array(z.string()).min(1, 'Debe seleccionar al menos una columna'),
    filtrosPredeterminados: edtFiltrosSchema.optional(),
    ordenamiento: z.object({
      campo: z.string(),
      direccion: z.enum(['asc', 'desc'])
    }).optional(),
    agrupamiento: z.enum(['proyecto', 'categoria', 'responsable', 'estado', 'prioridad']).optional(),
    mostrarMetricas: z.boolean().optional().default(true)
  })
})

// ===================================================
// 📡 TIPOS INFERIDOS PARA TYPESCRIPT
// ===================================================

// 🔧 Tipos inferidos de los esquemas
export type CrearProyectoEdtInput = z.infer<typeof crearProyectoEdtSchema>
export type ActualizarProyectoEdtInput = z.infer<typeof actualizarProyectoEdtSchema>
export type EdtFiltrosInput = z.infer<typeof edtFiltrosSchema>
export type MetricasEdtInput = z.infer<typeof metricasEdtSchema>
export type ResumenEdtProyectoInput = z.infer<typeof resumenEdtProyectoSchema>
export type ReporteEdtInput = z.infer<typeof reporteEdtSchema>
export type EdtBulkUpdateInput = z.infer<typeof edtBulkUpdateSchema>
export type EdtTransferInput = z.infer<typeof edtTransferSchema>
export type EdtViewConfigInput = z.infer<typeof edtViewConfigSchema>

// ===================================================
// 🛡️ VALIDADORES DE REGLAS DE NEGOCIO ESPECÍFICAS
// ===================================================

/**
 * 🔍 Valida si un EDT puede cambiar de estado
 * @param estadoActual Estado actual del EDT
 * @param nuevoEstado Nuevo estado propuesto
 * @returns boolean
 */
export function puedecambiarEstado(estadoActual: EstadoEdt, nuevoEstado: EstadoEdt): boolean {
  const transicionesPermitidas: Record<EstadoEdt, EstadoEdt[]> = {
    'planificado': ['en_progreso', 'cancelado'],
    'en_progreso': ['completado', 'detenido', 'cancelado'],
    'detenido': ['en_progreso', 'cancelado'],
    'completado': [], // No se puede cambiar desde completado
    'cancelado': ['planificado'] // Solo se puede reactivar
  }

  return transicionesPermitidas[estadoActual]?.includes(nuevoEstado) ?? false
}

/**
 * 🎯 Valida si un porcentaje de avance es coherente con el estado
 * @param estado Estado del EDT
 * @param porcentajeAvance Porcentaje de avance (0-100)
 * @returns boolean
 */
export function esCoherentePorcentajeConEstado(estado: EstadoEdt, porcentajeAvance: number): boolean {
  switch (estado) {
    case 'planificado':
      return porcentajeAvance === 0
    case 'en_progreso':
      return porcentajeAvance > 0 && porcentajeAvance < 100
    case 'detenido':
      return porcentajeAvance >= 0 && porcentajeAvance < 100
    case 'completado':
      return porcentajeAvance === 100
    case 'cancelado':
      return true // Cualquier porcentaje es válido para cancelado
    default:
      return false
  }
}

/**
 * ⏰ Valida si las fechas reales son coherentes con el estado
 * @param estado Estado del EDT
 * @param fechaInicioReal Fecha de inicio real
 * @param fechaFinReal Fecha de fin real
 * @returns boolean
 */
export function sonCoherentesFechasRealesConEstado(
  estado: EstadoEdt,
  fechaInicioReal?: string,
  fechaFinReal?: string
): boolean {
  switch (estado) {
    case 'planificado':
      return !fechaInicioReal && !fechaFinReal
    case 'en_progreso':
    case 'detenido':
      return !!fechaInicioReal && !fechaFinReal
    case 'completado':
      return !!fechaInicioReal && !!fechaFinReal
    case 'cancelado':
      return true // Cualquier combinación es válida para cancelado
    default:
      return false
  }
}

/**
 * 🏗️ Valida si un proyecto puede tener más EDTs
 * @param estadoProyecto Estado del proyecto
 * @param cantidadEdtsActuales Cantidad actual de EDTs
 * @returns boolean
 */
export function puedeAgregarEdt(estadoProyecto: ProyectoEstado, cantidadEdtsActuales: number): boolean {
  const maxEdtsPorProyecto = 100 // Límite configurable
  
  if (cantidadEdtsActuales >= maxEdtsPorProyecto) {
    return false
  }

  // Solo se pueden agregar EDTs en proyectos activos o en progreso
  return ['en_ejecucion', 'en_planificacion'].includes(estadoProyecto)
}

/**
 * 📊 Calcula el porcentaje de avance basado en horas
 * @param horasReales Horas reales trabajadas
 * @param horasEstimadas Horas estimadas
 * @returns number Porcentaje de avance (0-100)
 */
export function calcularPorcentajeAvancePorHoras(horasReales: number, horasEstimadas: number): number {
  if (horasEstimadas <= 0) return 0
  
  const porcentaje = Math.round((horasReales / horasEstimadas) * 100)
  return Math.min(porcentaje, 100) // No puede exceder 100%
}

/**
 * 🚨 Determina si un EDT está en riesgo de retraso
 * @param fechaFin Fecha de fin planificada
 * @param porcentajeAvance Porcentaje de avance actual
 * @param diasAnticipacion Días de anticipación para la alerta
 * @returns boolean
 */
export function estaEnRiesgoDeRetraso(
  fechaFin: string,
  porcentajeAvance: number,
  diasAnticipacion: number = 7
): boolean {
  const fechaFinDate = new Date(fechaFin)
  const fechaActual = new Date()
  const fechaAlerta = new Date(fechaFinDate.getTime() - (diasAnticipacion * 24 * 60 * 60 * 1000))
  
  // Si ya pasó la fecha de fin y no está completado
  if (fechaActual > fechaFinDate && porcentajeAvance < 100) {
    return true
  }
  
  // Si estamos en el período de alerta y el avance es insuficiente
  if (fechaActual >= fechaAlerta && fechaActual <= fechaFinDate) {
    const diasRestantes = Math.ceil((fechaFinDate.getTime() - fechaActual.getTime()) / (24 * 60 * 60 * 1000))
    const diasTotales = Math.ceil((fechaFinDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    const porcentajeEsperado = ((diasTotales - diasRestantes) / diasTotales) * 100
    
    return porcentajeAvance < (porcentajeEsperado * 0.8) // 80% del avance esperado
  }
  
  return false
}

/**
 * ✅ Validador para registro de horas en EDT
 * @param data Datos del registro de horas
 * @returns Promise<string[]> Array de errores de validación
 */
export async function validarRegistroHorasEdt(data: {
  proyectoEdtId: string;
  usuarioId: string;
  fecha: string;
  horasTrabajadas: number;
}): Promise<string[]> {
  const errores: string[] = [];
  
  // Validar que las horas no excedan las 24 horas del día
  if (data.horasTrabajadas > 24) {
    errores.push('Las horas trabajadas no pueden exceder 24 horas por día');
  }
  
  // Validar que las horas sean positivas
  if (data.horasTrabajadas <= 0) {
    errores.push('Las horas trabajadas deben ser mayor a 0');
  }
  
  // Validar formato de fecha
  const fecha = new Date(data.fecha);
  if (isNaN(fecha.getTime())) {
    errores.push('Formato de fecha inválido');
  }
  
  // Validar que la fecha no sea futura
  if (fecha > new Date()) {
    errores.push('No se pueden registrar horas en fechas futuras');
  }
  
  return errores;
}

// ✅ Validador de fechas para EDT
export function validarFechasEdt(fechaInicio?: string, fechaFin?: string): string[] {
  const errores: string[] = [];
  
  if (fechaInicio && fechaFin) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (isNaN(inicio.getTime())) {
      errores.push('Fecha de inicio inválida');
    }
    
    if (isNaN(fin.getTime())) {
      errores.push('Fecha de fin inválida');
    }
    
    if (inicio >= fin) {
      errores.push('La fecha de inicio debe ser anterior a la fecha de fin');
    }
  }
  
  return errores;
}

// ✅ Validador de estado para EDT
export function validarEstadoEdt(estado: string): boolean {
  const estadosValidos = ['pendiente', 'en_progreso', 'completado', 'pausado', 'cancelado'];
  return estadosValidos.includes(estado);
}

// ===================================================
// 📋 VALIDADORES PARA CRONOGRAMA COMERCIAL
// ===================================================

// ✅ Esquema base para CotizacionEdt (sin refinaciones)
const cotizacionEdtBaseSchema = z.object({
  categoriaServicioId: cuidSchema,
  zona: zonaSchema,
  fechaInicioCom: fechaSchema,
  fechaFinCom: fechaSchema,
  horasCom: horasSchema,
  responsableId: cuidSchema.optional(),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media')
})

// ✅ Esquema para crear CotizacionEdt
export const crearCotizacionEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
  categoriaServicioId: cuidSchema,
  zona: zonaSchema,
  fechaInicioCom: fechaSchema,
  fechaFinCom: fechaSchema,
  horasCom: horasSchema,
  responsableId: cuidSchema.optional(),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media'),
  cotizacionFaseId: cuidSchema.optional()
})
.refine((data) => {
  // 🔁 Validación: fechaFin debe ser posterior a fechaInicio
  if (data.fechaInicioCom && data.fechaFinCom) {
    return new Date(data.fechaFinCom) >= new Date(data.fechaInicioCom)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['fechaFinCom']
})

// ✅ Esquema para actualizar CotizacionEdt
export const actualizarCotizacionEdtSchema = cotizacionEdtBaseSchema.partial().extend({
  id: cuidSchema.optional()
})

// ✅ Esquema base para CotizacionTarea (sin refinaciones)
const cotizacionTareaBaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
  fechaInicioCom: fechaSchema,
  fechaFinCom: fechaSchema,
  horasCom: horasSchema,
  dependenciaDeId: cuidSchema.optional(),
  descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media'),
  responsableId: cuidSchema.optional(),
  cotizacionServicioItemId: cuidSchema.optional() // ✅ Nueva relación opcional
})

// ✅ Esquema para crear CotizacionTarea
export const crearCotizacionTareaSchema = cotizacionTareaBaseSchema
.refine((data) => {
  // 🔁 Validación: fechaFin debe ser posterior a fechaInicio
  if (data.fechaInicioCom && data.fechaFinCom) {
    return new Date(data.fechaFinCom) >= new Date(data.fechaInicioCom)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  path: ['fechaFinCom']
})

// ✅ Esquema para actualizar CotizacionTarea
export const actualizarCotizacionTareaSchema = cotizacionTareaBaseSchema.partial().extend({
  id: cuidSchema.optional()
})

// ✅ Esquema para filtros de cronograma comercial
export const filtrosCotizacionCronogramaSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  categoriaServicioId: cuidSchema.optional(),
  responsableId: cuidSchema.optional(),
  zona: z.string().optional(),
  fechaDesde: fechaSchema,
  fechaHasta: fechaSchema,
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  horasMin: z.number().min(0).optional(),
  horasMax: z.number().min(0).optional()
})
.refine((data) => {
  // 🔁 Validación: fechaHasta debe ser posterior a fechaDesde
  if (data.fechaDesde && data.fechaHasta) {
    return new Date(data.fechaHasta) >= new Date(data.fechaDesde)
  }
  return true
}, {
  message: 'La fecha hasta debe ser posterior o igual a la fecha desde',
  path: ['fechaHasta']
})
.refine((data) => {
  // 🔁 Validación: horasMax debe ser mayor a horasMin
  if (data.horasMin !== undefined && data.horasMax !== undefined) {
    return data.horasMax >= data.horasMin
  }
  return true
}, {
  message: 'Las horas máximas deben ser mayores o iguales a las mínimas',
  path: ['horasMax']
})

// ===================================================
// 📡 TIPOS INFERIDOS PARA CRONOGRAMA COMERCIAL
// ===================================================

// 🔧 Tipos inferidos de los esquemas
export type CrearCotizacionEdtInput = z.infer<typeof crearCotizacionEdtSchema>
export type ActualizarCotizacionEdtInput = z.infer<typeof actualizarCotizacionEdtSchema>
export type CrearCotizacionTareaInput = z.infer<typeof crearCotizacionTareaSchema>
export type ActualizarCotizacionTareaInput = z.infer<typeof actualizarCotizacionTareaSchema>
export type FiltrosCotizacionCronogramaInput = z.infer<typeof filtrosCotizacionCronogramaSchema>

// ===================================================
// 🛡️ VALIDADORES DE REGLAS DE NEGOCIO PARA CRONOGRAMA COMERCIAL
// ===================================================

/**
 * 🔍 Valida si un EDT comercial puede cambiar de estado
 * @param estadoActual Estado actual del EDT comercial
 * @param nuevoEstado Nuevo estado propuesto
 * @returns boolean
 */
export function puedecambiarEstadoCotizacionEdt(estadoActual: EstadoEdt, nuevoEstado: EstadoEdt): boolean {
  const transicionesPermitidas: Record<EstadoEdt, EstadoEdt[]> = {
    'planificado': ['en_progreso', 'cancelado'],
    'en_progreso': ['completado', 'detenido', 'cancelado'],
    'detenido': ['en_progreso', 'cancelado'],
    'completado': [], // No se puede cambiar desde completado
    'cancelado': ['planificado'] // Solo se puede reactivar
  }

  return transicionesPermitidas[estadoActual]?.includes(nuevoEstado) ?? false
}

/**
 * ⏰ Valida si las fechas comerciales son coherentes
 * @param fechaInicioCom Fecha de inicio comercial
 * @param fechaFinCom Fecha de fin comercial
 * @returns boolean
 */
export function fechasComercialesCoherentes(fechaInicioCom?: string, fechaFinCom?: string): boolean {
  if (!fechaInicioCom || !fechaFinCom) return true
  return new Date(fechaFinCom) >= new Date(fechaInicioCom)
}

/**
 * 📊 Calcula el porcentaje de avance basado en horas comerciales
 * @param horasReales Horas reales trabajadas
 * @param horasCom Horas comerciales estimadas
 * @returns number Porcentaje de avance (0-100)
 */
export function calcularPorcentajeAvanceComercial(horasReales: number, horasCom: number): number {
  if (horasCom <= 0) return 0

  const porcentaje = Math.round((horasReales / horasCom) * 100)
  return Math.min(porcentaje, 100) // No puede exceder 100%
}

/**
 * 🚨 Determina si un EDT comercial está en riesgo de retraso
 * @param fechaFinCom Fecha de fin comercial
 * @param diasAnticipacion Días de anticipación para la alerta
 * @returns boolean
 */
export function estaEnRiesgoDeRetrasoComercial(fechaFinCom: string, diasAnticipacion: number = 7): boolean {
  const fechaFinDate = new Date(fechaFinCom)
  const fechaActual = new Date()
  const fechaAlerta = new Date(fechaFinDate.getTime() - (diasAnticipacion * 24 * 60 * 60 * 1000))

  // Si ya pasó la fecha de fin
  return fechaActual > fechaFinDate
}

/**
 * ✅ Validador para registro de horas en EDT comercial
 * @param data Datos del registro de horas
 * @returns Promise<string[]> Array de errores de validación
 */
export async function validarRegistroHorasCotizacionEdt(data: {
  cotizacionEdtId: string;
  usuarioId: string;
  fecha: string;
  horasTrabajadas: number;
}): Promise<string[]> {
  const errores: string[] = []

  // Validar que las horas no excedan las 24 horas del día
  if (data.horasTrabajadas > 24) {
    errores.push('Las horas trabajadas no pueden exceder 24 horas por día')
  }

  // Validar que las horas sean positivas
  if (data.horasTrabajadas <= 0) {
    errores.push('Las horas trabajadas deben ser mayor a 0')
  }

  // Validar formato de fecha
  const fecha = new Date(data.fecha)
  if (isNaN(fecha.getTime())) {
    errores.push('Formato de fecha inválido')
  }

  // Validar que la fecha no sea futura
  if (fecha > new Date()) {
    errores.push('No se pueden registrar horas en fechas futuras')
  }

  return errores
}

// ✅ Validador para orden (número positivo)
const ordenSchema = z.number()
  .int('El orden debe ser un número entero')
  .min(0, 'El orden no puede ser negativo')
  .max(999999, 'El orden no puede exceder 999,999')

// ✅ Esquema para validar dependencias de tareas
export const dependenciaTareaSchema = z.object({
  fromTaskIndex: z.number().int().min(0),
  toTaskIndex: z.number().int().min(0),
  type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])
})
.refine((data) => data.fromTaskIndex !== data.toTaskIndex, {
  message: 'Una tarea no puede depender de sí misma',
  path: ['toTaskIndex']
})

// ✅ Esquema para batch import de tareas con validaciones avanzadas
export const batchImportTareasSchema = z.object({
  tasks: z.array(z.object({
    servicioItemId: cuidSchema,
    nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede exceder 255 caracteres'),
    descripcion: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
    fechaInicio: z.string().datetime('Formato de fecha de inicio inválido'),
    fechaFin: z.string().datetime('Formato de fecha de fin inválido'),
    horasEstimadas: horasSchema,
    prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional().default('media'),
    responsableId: cuidSchema.optional(),
    orden: ordenSchema.optional()
  })).min(1, 'Debe incluir al menos una tarea').max(50, 'No puede incluir más de 50 tareas'),
  dependencies: z.array(dependenciaTareaSchema).optional().default([])
})
.refine((data) => {
  // Validar que las fechas de cada tarea sean coherentes
  for (const task of data.tasks) {
    if (new Date(task.fechaInicio) >= new Date(task.fechaFin)) {
      return false
    }
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio en todas las tareas',
  path: ['tasks']
})
.refine((data) => {
  // Validar que los índices de dependencias sean válidos
  if (data.dependencies) {
    for (const dep of data.dependencies) {
      if (dep.fromTaskIndex >= data.tasks.length || dep.toTaskIndex >= data.tasks.length) {
        return false
      }
    }
  }
  return true
}, {
  message: 'Los índices de dependencias deben corresponder a tareas existentes',
  path: ['dependencies']
})

/**
 * 🔄 Validador de ciclos en dependencias de tareas
 * @param dependencies Array de dependencias
 * @returns string[] Array de errores de validación
 */
export function validarCiclosDependencias(dependencies: Array<{
  fromTaskIndex: number;
  toTaskIndex: number;
  type: string;
}>): string[] {
  const errores: string[] = []

  // Construir grafo de dependencias
  const graph: { [key: number]: number[] } = {}
  dependencies.forEach(dep => {
    if (!graph[dep.fromTaskIndex]) graph[dep.fromTaskIndex] = []
    graph[dep.fromTaskIndex].push(dep.toTaskIndex)
  })

  // DFS para detectar ciclos
  const visited = new Set<number>()
  const recStack = new Set<number>()

  const hasCycleDFS = (node: number): boolean => {
    if (recStack.has(node)) return true
    if (visited.has(node)) return false

    visited.add(node)
    recStack.add(node)

    const neighbors = graph[node] || []
    for (const neighbor of neighbors) {
      if (hasCycleDFS(neighbor)) return true
    }

    recStack.delete(node)
    return false
  }

  // Verificar ciclos desde todos los nodos
  const allNodes = new Set([...Object.keys(graph).map(Number), ...dependencies.map(d => d.toTaskIndex)])
  for (const node of allNodes) {
    if (hasCycleDFS(node)) {
      errores.push('Se detectó un ciclo en las dependencias de tareas. Revise las relaciones de dependencia.')
      break
    }
  }

  return errores
}

/**
 * 📋 Validador completo para importación masiva de tareas
 * @param data Datos de importación masiva
 * @returns Promise<string[]> Array de errores de validación
 */
export async function validarBatchImportTareas(data: {
  tasks: Array<{
    servicioItemId: string;
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin: string;
    horasEstimadas: number;
    prioridad?: string;
    responsableId?: string;
    orden?: number;
  }>;
  dependencies?: Array<{
    fromTaskIndex: number;
    toTaskIndex: number;
    type: string;
  }>;
}): Promise<string[]> {
  const errores: string[] = []

  try {
    // Validar esquema básico
    batchImportTareasSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      errores.push(...error.errors.map(e => e.message))
    }
  }

  // Validar ciclos en dependencias
  if (data.dependencies) {
    errores.push(...validarCiclosDependencias(data.dependencies))
  }

  // Validar unicidad de órdenes si se proporcionan
  if (data.tasks.some(t => t.orden !== undefined)) {
    const ordenes = data.tasks.map(t => t.orden).filter(o => o !== undefined)
    if (ordenes.length !== new Set(ordenes).size) {
      errores.push('Los valores de orden deben ser únicos')
    }
  }

  return errores
}
