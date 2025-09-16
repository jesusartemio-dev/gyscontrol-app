// ===================================================
// 📁 Archivo: proyecto.ts
// 📌 Ubicación: src/lib/validators/
// 🔧 Descripción: Validadores Zod para entidad Proyecto
//    Incluye schemas para crear, actualizar y filtrar proyectos
//    con validaciones de negocio completas.
//
// 🧠 Uso: Importar en rutas API y servicios que manejen proyectos
// ===================================================

import { z } from 'zod'

// ✅ Enum values for ProyectoEstado validation
const PROYECTO_ESTADOS = ['en_planificacion', 'en_ejecucion', 'en_pausa', 'cerrado', 'cancelado'] as const

// ============================
// 🔧 VALIDADORES BASE
// ============================

// ✅ Schema principal para validar datos de proyecto
export const proyectoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  descripcion: z.string().optional(),
  estado: z.enum(PROYECTO_ESTADOS, { 
    errorMap: () => ({ message: 'Estado de proyecto inválido' }) 
  }),
  fechaInicio: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida'
  }),
  fechaFin: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de fin inválida'
  }),
  clienteId: z.string().min(1, 'El cliente es requerido'),
  comercialId: z.string().min(1, 'El comercial es requerido'),
  gestorId: z.string().min(1, 'El gestor es requerido'),
  
  // ✅ Campos financieros requeridos
  totalEquiposInterno: z.number().min(0, 'Total equipos interno debe ser mayor o igual a 0'),
  totalServiciosInterno: z.number().min(0, 'Total servicios interno debe ser mayor o igual a 0'),
  totalGastosInterno: z.number().min(0, 'Total gastos interno debe ser mayor o igual a 0'),
  totalInterno: z.number().min(0, 'Total interno debe ser mayor o igual a 0'),
  totalCliente: z.number().min(0, 'Total cliente debe ser mayor o igual a 0'),
  descuento: z.number().min(0, 'Descuento debe ser mayor o igual a 0').max(100, 'Descuento no puede ser mayor a 100%'),
  grandTotal: z.number().min(0, 'Grand total debe ser mayor o igual a 0'),
})
.refine((data) => {
  // ✅ Validación: fecha inicio debe ser anterior a fecha fin
  const fechaInicio = new Date(data.fechaInicio)
  const fechaFin = new Date(data.fechaFin)
  return fechaInicio <= fechaFin
}, {
  message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
  path: ['fechaFin']
})
.refine((data) => {
  // ✅ Validación: total interno debe ser suma de componentes
  const sumaCalculada = data.totalEquiposInterno + data.totalServiciosInterno + data.totalGastosInterno
  return Math.abs(data.totalInterno - sumaCalculada) < 0.01 // Tolerancia para decimales
}, {
  message: 'El total interno debe ser igual a la suma de equipos, servicios y gastos internos',
  path: ['totalInterno']
})

// ============================
// 📋 SCHEMAS PRINCIPALES
// ============================

/**
 * ✅ Schema para crear un nuevo proyecto
 * Incluye todas las validaciones de negocio necesarias
 */
export const createProyectoSchema = proyectoSchema

/**
 * ✅ Schema para crear proyecto desde cotización
 * Excluye el campo 'codigo' ya que se genera automáticamente
 * Incluye cotizacionId para identificar la cotización origen
 */
export const createProyectoFromCotizacionSchema = z.object({
  cotizacionId: z.string().min(1, 'La cotización es requerida'),
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  descripcion: z.string().optional(),
  estado: z.enum(PROYECTO_ESTADOS, { 
    errorMap: () => ({ message: 'Estado de proyecto inválido' }) 
  }).default('en_planificacion'),
  fechaInicio: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida'
  }),
  fechaFin: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de fin inválida'
  }).optional(),
  gestorId: z.string().min(1, 'El gestor es requerido'),
  
  // ✅ Campos de relaciones opcionales (se obtienen de la cotización si no se proporcionan)
  clienteId: z.string().optional(),
  comercialId: z.string().optional(),
  
  // ✅ Campos financieros opcionales (se copian de la cotización)
  totalEquiposInterno: z.number().min(0).optional(),
  totalServiciosInterno: z.number().min(0).optional(),
  totalGastosInterno: z.number().min(0).optional(),
  totalInterno: z.number().min(0).optional(),
  totalCliente: z.number().min(0).optional(),
  descuento: z.number().min(0).max(100).optional(),
  grandTotal: z.number().min(0).optional(),
})
.refine((data) => {
  // ✅ Solo validar fechas si ambas están presentes
  if (data.fechaInicio && data.fechaFin) {
    const fechaInicio = new Date(data.fechaInicio)
    const fechaFin = new Date(data.fechaFin)
    return fechaInicio <= fechaFin
  }
  return true
}, {
  message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
  path: ['fechaFin']
})

/**
 * ✅ Schema para actualizar un proyecto existente
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export const updateProyectoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo').optional(),
  descripcion: z.string().optional(),
  estado: z.enum(PROYECTO_ESTADOS).optional(),
  fechaInicio: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de inicio inválida'
  }).optional(),
  fechaFin: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha de fin inválida'
  }).optional(),
  clienteId: z.string().min(1, 'El cliente es requerido').optional(),
  comercialId: z.string().min(1, 'El comercial es requerido').optional(),
  gestorId: z.string().min(1, 'El gestor es requerido').optional(),
  
  // ✅ Campos financieros opcionales
  totalEquiposInterno: z.number().min(0).optional(),
  totalServiciosInterno: z.number().min(0).optional(),
  totalGastosInterno: z.number().min(0).optional(),
  totalInterno: z.number().min(0).optional(),
  totalCliente: z.number().min(0).optional(),
  descuento: z.number().min(0).max(100).optional(),
  grandTotal: z.number().min(0).optional(),
})
.refine((data) => {
  // ✅ Solo validar fechas si ambas están presentes
  if (data.fechaInicio && data.fechaFin) {
    const fechaInicio = new Date(data.fechaInicio)
    const fechaFin = new Date(data.fechaFin)
    return fechaInicio <= fechaFin
  }
  return true
}, {
  message: 'La fecha de inicio debe ser anterior o igual a la fecha de fin',
  path: ['fechaFin']
})

// ============================
// 🔍 FUNCIONES DE VALIDACIÓN
// ============================

/**
 * ✅ Función principal para validar datos de proyecto
 * Lanza errores descriptivos si la validación falla
 */
export function validateProyectoData(data: unknown) {
  try {
    return createProyectoSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Datos de proyecto inválidos: ${errorMessages}`)
    }
    throw new Error('Error de validación desconocido')
  }
}

/**
 * ✅ Validación segura que retorna resultado sin lanzar errores
 */
export function safeValidateProyecto(data: unknown): 
  { success: true; data: z.infer<typeof createProyectoSchema> } | 
  { success: false; errors: Array<{ field: string; message: string }> } {
  
  const result = createProyectoSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }))
  
  return { success: false, errors }
}

// ============================
// 📤 TIPOS EXPORTADOS
// ============================

export type CreateProyectoInput = z.infer<typeof createProyectoSchema>
export type CreateProyectoFromCotizacionInput = z.infer<typeof createProyectoFromCotizacionSchema>
export type UpdateProyectoInput = z.infer<typeof updateProyectoSchema>