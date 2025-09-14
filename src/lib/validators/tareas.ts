// ===================================================
// 📁 Archivo: tareas.ts
// 📌 Ubicación: src/lib/validators/
// 🔧 Descripción: Esquemas de validación Zod para sistema de tareas
//    Funciones: Validación de payloads, transformaciones, mensajes de error
//
// 🧠 Funcionalidades:
//    - Esquemas Zod para todas las entidades
//    - Validaciones personalizadas
//    - Mensajes de error en español
//    - Transformaciones de datos
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

import { z } from 'zod'

// 🔧 Mensajes de error personalizados en español
const errorMessages = {
  required: 'Este campo es requerido',
  string: 'Debe ser un texto válido',
  number: 'Debe ser un número válido',
  date: 'Debe ser una fecha válida',
  email: 'Debe ser un email válido',
  min: (min: number) => `Debe tener al menos ${min} caracteres`,
  max: (max: number) => `No debe exceder ${max} caracteres`,
  positive: 'Debe ser un número positivo',
  nonNegative: 'No puede ser negativo',
  integer: 'Debe ser un número entero',
  uuid: 'Debe ser un ID válido'
}

// 🔧 Esquemas base reutilizables
const uuidSchema = z.string().uuid({ message: errorMessages.uuid })
const dateStringSchema = z.string().datetime({ message: errorMessages.date })
const positiveNumberSchema = z.number().positive({ message: errorMessages.positive })
const nonNegativeNumberSchema = z.number().min(0, { message: errorMessages.nonNegative })

// 📋 Enums de validación
export const EstadoTareaSchema = z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada'], {
  errorMap: () => ({ message: 'Estado debe ser: pendiente, en_progreso, completada, cancelada o pausada' })
})

export const PrioridadTareaSchema = z.enum(['baja', 'media', 'alta', 'critica'], {
  errorMap: () => ({ message: 'Prioridad debe ser: baja, media, alta o critica' })
})

export const TipoRecursoSchema = z.enum(['humano', 'material', 'equipo', 'software'], {
  errorMap: () => ({ message: 'Tipo de recurso debe ser: humano, material, equipo o software' })
})

export const TipoDependenciaSchema = z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'], {
  errorMap: () => ({ message: 'Tipo de dependencia debe ser: finish_to_start, start_to_start, finish_to_finish o start_to_finish' })
})

// 📋 Schema para crear Tarea
export const TareaCreateSchema = z.object({
  proyectoServicioId: uuidSchema,
  nombre: z.string()
    .min(1, { message: errorMessages.required })
    .max(200, { message: errorMessages.max(200) })
    .trim(),
  descripcion: z.string()
    .max(1000, { message: errorMessages.max(1000) })
    .optional(),
  estado: EstadoTareaSchema.default('pendiente'),
  prioridad: PrioridadTareaSchema.default('media'),
  orden: z.number()
    .int({ message: errorMessages.integer })
    .positive({ message: errorMessages.positive }),
  fechaInicio: dateStringSchema.optional(),
  fechaFin: dateStringSchema.optional(),
  horasEstimadas: nonNegativeNumberSchema.optional(),
  horasReales: nonNegativeNumberSchema.default(0),
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' })
    .default(0),
  asignadoId: uuidSchema.optional()
}).refine((data) => {
  // Validar que fechaFin sea posterior a fechaInicio
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) > new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFin']
})

// 📋 Schema para actualizar Tarea
export const TareaUpdateSchema = z.object({
  nombre: z.string()
    .min(1, { message: errorMessages.required })
    .max(200, { message: errorMessages.max(200) })
    .trim()
    .optional(),
  descripcion: z.string()
    .max(1000, { message: errorMessages.max(1000) })
    .optional(),
  estado: EstadoTareaSchema.optional(),
  prioridad: PrioridadTareaSchema.optional(),
  orden: z.number()
    .int({ message: errorMessages.integer })
    .positive({ message: errorMessages.positive })
    .optional(),
  fechaInicio: dateStringSchema.optional(),
  fechaFin: dateStringSchema.optional(),
  horasEstimadas: nonNegativeNumberSchema.optional(),
  horasReales: nonNegativeNumberSchema.optional(),
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' })
    .optional(),
  asignadoId: uuidSchema.optional().nullable()
}).refine((data) => {
  // Validar que fechaFin sea posterior a fechaInicio si ambas están presentes
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) > new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFin']
})

// 📋 Schema para crear Subtarea
export const SubtareaCreateSchema = z.object({
  tareaId: uuidSchema,
  nombre: z.string()
    .min(1, { message: errorMessages.required })
    .max(200, { message: errorMessages.max(200) })
    .trim(),
  descripcion: z.string()
    .max(1000, { message: errorMessages.max(1000) })
    .optional(),
  estado: EstadoTareaSchema.default('pendiente'),
  orden: z.number()
    .int({ message: errorMessages.integer })
    .positive({ message: errorMessages.positive }),
  fechaInicio: dateStringSchema.optional(),
  fechaFin: dateStringSchema.optional(),
  horasEstimadas: nonNegativeNumberSchema.optional(),
  horasReales: nonNegativeNumberSchema.default(0),
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' })
    .default(0),
  asignadoId: uuidSchema.optional()
}).refine((data) => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) > new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFin']
})

// 📋 Schema para actualizar Subtarea
export const SubtareaUpdateSchema = z.object({
  nombre: z.string()
    .min(1, { message: errorMessages.required })
    .max(200, { message: errorMessages.max(200) })
    .trim()
    .optional(),
  descripcion: z.string()
    .max(1000, { message: errorMessages.max(1000) })
    .optional(),
  estado: EstadoTareaSchema.optional(),
  orden: z.number()
    .int({ message: errorMessages.integer })
    .positive({ message: errorMessages.positive })
    .optional(),
  fechaInicio: dateStringSchema.optional(),
  fechaFin: dateStringSchema.optional(),
  horasEstimadas: nonNegativeNumberSchema.optional(),
  horasReales: nonNegativeNumberSchema.optional(),
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' })
    .optional(),
  asignadoId: uuidSchema.optional().nullable()
}).refine((data) => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) > new Date(data.fechaInicio)
  }
  return true
}, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['fechaFin']
})

// 📋 Schema para crear Dependencia
export const DependenciaCreateSchema = z.object({
  tareaOrigenId: uuidSchema,
  tareaDestinoId: uuidSchema,
  tipo: TipoDependenciaSchema.default('finish_to_start')
}).refine((data) => {
  // Una tarea no puede depender de sí misma
  return data.tareaOrigenId !== data.tareaDestinoId
}, {
  message: 'Una tarea no puede depender de sí misma',
  path: ['tareaDestinoId']
})

// 📋 Schema para crear Asignación de Recurso
export const AsignacionRecursoCreateSchema = z.object({
  tareaId: uuidSchema,
  tipoRecurso: TipoRecursoSchema,
  nombreRecurso: z.string()
    .min(1, { message: errorMessages.required })
    .max(100, { message: errorMessages.max(100) })
    .trim(),
  cantidad: positiveNumberSchema,
  unidad: z.string()
    .min(1, { message: errorMessages.required })
    .max(50, { message: errorMessages.max(50) })
    .trim(),
  costoUnitario: nonNegativeNumberSchema.optional(),
  fechaAsignacion: dateStringSchema.optional(),
  notas: z.string()
    .max(500, { message: errorMessages.max(500) })
    .optional()
})

// 📋 Schema para actualizar Asignación de Recurso
export const AsignacionRecursoUpdateSchema = z.object({
  tipoRecurso: TipoRecursoSchema.optional(),
  nombreRecurso: z.string()
    .min(1, { message: errorMessages.required })
    .max(100, { message: errorMessages.max(100) })
    .trim()
    .optional(),
  cantidad: positiveNumberSchema.optional(),
  unidad: z.string()
    .min(1, { message: errorMessages.required })
    .max(50, { message: errorMessages.max(50) })
    .trim()
    .optional(),
  costoUnitario: nonNegativeNumberSchema.optional(),
  fechaAsignacion: dateStringSchema.optional(),
  notas: z.string()
    .max(500, { message: errorMessages.max(500) })
    .optional()
})

// 📋 Schema para crear Registro de Progreso
export const RegistroProgresoCreateSchema = z.object({
  tareaId: uuidSchema,
  usuarioId: uuidSchema,
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' }),
  horasTrabajadas: nonNegativeNumberSchema.optional(),
  descripcion: z.string()
    .max(1000, { message: errorMessages.max(1000) })
    .optional(),
  fecha: dateStringSchema.optional()
})

// 📋 Schemas para parámetros de consulta
export const TareaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  proyectoServicioId: uuidSchema.optional(),
  asignadoId: uuidSchema.optional(),
  estado: EstadoTareaSchema.optional(),
  prioridad: PrioridadTareaSchema.optional(),
  fechaInicio: dateStringSchema.optional(),
  fechaFin: dateStringSchema.optional(),
  sortBy: z.enum(['nombre', 'estado', 'prioridad', 'orden', 'fechaInicio', 'fechaFin', 'progreso']).default('orden'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const SubtareaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  tareaId: uuidSchema.optional(),
  asignadoId: uuidSchema.optional(),
  estado: EstadoTareaSchema.optional(),
  sortBy: z.enum(['nombre', 'estado', 'orden', 'fechaInicio', 'fechaFin', 'progreso']).default('orden'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export const DependenciaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  proyectoServicioId: uuidSchema.optional(),
  tareaOrigenId: uuidSchema.optional(),
  tareaDestinoId: uuidSchema.optional(),
  tipo: TipoDependenciaSchema.optional(),
  sortBy: z.enum(['tipo', 'retrasoHoras', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

// 📋 Schema para validar IDs de parámetros de ruta
export const ParamIdSchema = z.object({
  id: uuidSchema
})

export const ProyectoServicioIdSchema = z.object({
  proyectoServicioId: uuidSchema
})

// 📋 Schemas para operaciones especiales
export const CambiarEstadoTareaSchema = z.object({
  estado: EstadoTareaSchema
})

export const ActualizarProgresoSchema = z.object({
  progreso: z.number()
    .min(0, { message: 'El progreso no puede ser menor a 0' })
    .max(100, { message: 'El progreso no puede ser mayor a 100' })
})

export const RegistrarHorasSchema = z.object({
  horas: positiveNumberSchema,
  descripcion: z.string()
    .max(500, { message: errorMessages.max(500) })
    .optional()
})

export const ReordenarTareasSchema = z.object({
  tareas: z.array(z.object({
    id: uuidSchema,
    orden: z.number().int().positive()
  })).min(1, { message: 'Debe proporcionar al menos una tarea' })
}).refine((data) => {
  // Validar que todos los órdenes sean únicos
  const ordenes = data.tareas.map(t => t.orden)
  const ordenesUnicos = new Set(ordenes)
  return ordenes.length === ordenesUnicos.size
}, {
  message: 'Los órdenes deben ser únicos',
  path: ['tareas']
})

// 📋 Schema para duplicar tarea
export const DuplicarTareaSchema = z.object({
  incluirSubtareas: z.boolean().default(false),
  incluirDependencias: z.boolean().default(false),
  nuevoNombre: z.string()
    .min(1, { message: errorMessages.required })
    .max(200, { message: errorMessages.max(200) })
    .trim()
    .optional()
})

// 📋 Tipos TypeScript derivados de los schemas
export type TareaCreateInput = z.infer<typeof TareaCreateSchema>
export type TareaUpdateInput = z.infer<typeof TareaUpdateSchema>
export type SubtareaCreateInput = z.infer<typeof SubtareaCreateSchema>
export type SubtareaUpdateInput = z.infer<typeof SubtareaUpdateSchema>
export type DependenciaCreateInput = z.infer<typeof DependenciaCreateSchema>
export type AsignacionRecursoCreateInput = z.infer<typeof AsignacionRecursoCreateSchema>
export type AsignacionRecursoUpdateInput = z.infer<typeof AsignacionRecursoUpdateSchema>
export type RegistroProgresoCreateInput = z.infer<typeof RegistroProgresoCreateSchema>
export type TareaQueryInput = z.infer<typeof TareaQuerySchema>
export type SubtareaQueryInput = z.infer<typeof SubtareaQuerySchema>
export type DependenciaQueryInput = z.infer<typeof DependenciaQuerySchema>
export type CambiarEstadoTareaInput = z.infer<typeof CambiarEstadoTareaSchema>
export type ActualizarProgresoInput = z.infer<typeof ActualizarProgresoSchema>
export type RegistrarHorasInput = z.infer<typeof RegistrarHorasSchema>
export type ReordenarTareasInput = z.infer<typeof ReordenarTareasSchema>
export type DuplicarTareaInput = z.infer<typeof DuplicarTareaSchema>

// 🔧 Funciones auxiliares de validación
export const validateTareaCreate = (data: unknown) => TareaCreateSchema.parse(data)
export const validateTareaUpdate = (data: unknown) => TareaUpdateSchema.parse(data)
export const validateSubtareaCreate = (data: unknown) => SubtareaCreateSchema.parse(data)
export const validateSubtareaUpdate = (data: unknown) => SubtareaUpdateSchema.parse(data)
export const validateDependenciaCreate = (data: unknown) => DependenciaCreateSchema.parse(data)
export const validateAsignacionRecursoCreate = (data: unknown) => AsignacionRecursoCreateSchema.parse(data)
export const validateAsignacionRecursoUpdate = (data: unknown) => AsignacionRecursoUpdateSchema.parse(data)
export const validateRegistroProgresoCreate = (data: unknown) => RegistroProgresoCreateSchema.parse(data)
export const validateTareaQuery = (data: unknown) => TareaQuerySchema.parse(data)
export const validateSubtareaQuery = (data: unknown) => SubtareaQuerySchema.parse(data)
export const validateDependenciaQuery = (data: unknown) => DependenciaQuerySchema.parse(data)
export const validateParamId = (data: unknown) => ParamIdSchema.parse(data)
export const validateProyectoServicioId = (data: unknown) => ProyectoServicioIdSchema.parse(data)

// 🔧 Función para formatear errores de validación
export const formatValidationErrors = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })
  
  return formattedErrors
}

// 🔧 Middleware para validación de request
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error)
        throw new Error(`Errores de validación: ${JSON.stringify(formattedErrors)}`)
      }
      throw error
    }
  }
}