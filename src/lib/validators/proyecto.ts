import { z } from 'zod'

// ✅ Estados válidos para proyectos según el enum de Prisma
export const proyectoEstados = [
  'creado',
  'en_planificacion',
  'en_ejecucion',
  'pausado',
  'completado',
  'cancelado',
  'listas_pendientes',
  'listas_aprobadas',
  'pedidos_creados'
] as const

export const proyectoEstadoSchema = z.enum(proyectoEstados, {
  errorMap: () => ({ message: 'Estado de proyecto inválido' })
})

// ✅ Schema para crear proyecto desde cotización
export const createProyectoFromCotizacionSchema = z.object({
  cotizacionId: z.string().min(1, 'cotizacionId es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  fechaInicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fechaFin: z.string().optional(),
  gestorId: z.string().min(1, 'Gestor es requerido'),
  estado: proyectoEstadoSchema.default('en_planificacion'),
  totalEquiposInterno: z.number().optional(),
  totalServiciosInterno: z.number().optional(),
  totalGastosInterno: z.number().optional(),
  totalInterno: z.number().optional(),
  totalCliente: z.number().optional(),
  descuento: z.number().optional(),
  grandTotal: z.number().optional(),
  clienteId: z.string().optional(),
  comercialId: z.string().optional()
})

// ✅ Schema para crear proyecto manual
export const createProyectoSchema = z.object({
  clienteId: z.string().min(1, 'Cliente es requerido'),
  comercialId: z.string().min(1, 'Comercial es requerido'),
  gestorId: z.string().min(1, 'Gestor es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fechaFin: z.string().optional(),
  estado: proyectoEstadoSchema.default('creado'),
  totalEquiposInterno: z.number().default(0),
  totalServiciosInterno: z.number().default(0),
  totalGastosInterno: z.number().default(0),
  totalInterno: z.number().default(0),
  totalCliente: z.number().default(0),
  descuento: z.number().default(0),
  grandTotal: z.number().default(0)
})

// ✅ Schema para actualizar proyecto
export const updateProyectoSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  estado: proyectoEstadoSchema.optional(),
  gestorId: z.string().optional(),
  totalEquiposInterno: z.number().optional(),
  totalServiciosInterno: z.number().optional(),
  totalGastosInterno: z.number().optional(),
  totalInterno: z.number().optional(),
  totalCliente: z.number().optional(),
  descuento: z.number().optional(),
  grandTotal: z.number().optional()
})

// ✅ Función de validación para proyectos
export function validateProyectoData(data: any) {
  // Determinar qué schema usar basado en la presencia de cotizacionId
  if (data.cotizacionId) {
    return createProyectoFromCotizacionSchema.parse(data)
  } else {
    return createProyectoSchema.parse(data)
  }
}

// ✅ Tipos inferidos
export type CreateProyectoFromCotizacionInput = z.infer<typeof createProyectoFromCotizacionSchema>
export type CreateProyectoInput = z.infer<typeof createProyectoSchema>
export type UpdateProyectoInput = z.infer<typeof updateProyectoSchema>
export type ProyectoEstado = z.infer<typeof proyectoEstadoSchema>