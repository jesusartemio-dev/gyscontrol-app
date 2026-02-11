import { z } from 'zod'

// ✅ Estados válidos para proyectos según el enum de Prisma
// Flujo: creado → en_planificacion → listas → pedidos → en_ejecucion → en_cierre → cerrado
export const proyectoEstados = [
  'creado',              // 1. Creado por Comercial
  'en_planificacion',    // 2. Elaboración del cronograma
  'listas_pendientes',   // 3. Elaboración de listas
  'listas_aprobadas',    // 4. Listas aprobadas
  'pedidos_creados',     // 5. Pedidos de compra
  'en_ejecucion',        // 6. En campo
  'en_cierre',           // 7. Proceso de cierre
  'cerrado',             // 8. Proyecto cerrado
  'pausado',             // Especial: pausado
  'cancelado'            // Especial: cancelado
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
  supervisorId: z.string().optional(),
  liderId: z.string().optional(),
  estado: proyectoEstadoSchema.default('creado'),
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
  supervisorId: z.string().optional(),
  liderId: z.string().optional(),
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
  codigo: z.string().min(1, 'Código es requerido').optional(),
  nombre: z.string().min(1, 'Nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  estado: proyectoEstadoSchema.optional(),
  gestorId: z.string().optional(),
  supervisorId: z.string().nullable().optional(),
  liderId: z.string().nullable().optional(),
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

// ✅ Roles válidos para personal del proyecto
export const rolesPersonalProyecto = [
  'programador',
  'cadista',
  'ingeniero',
  'lider',
  'tecnico',
  'coordinador',
  'asistente'
] as const

export const rolPersonalProyectoSchema = z.enum(rolesPersonalProyecto, {
  errorMap: () => ({ message: 'Rol de personal inválido' })
})

// ✅ Schema para crear personal del proyecto
export const createPersonalProyectoSchema = z.object({
  proyectoId: z.string().min(1, 'Proyecto es requerido'),
  userId: z.string().min(1, 'Usuario es requerido'),
  rol: rolPersonalProyectoSchema,
  fechaAsignacion: z.string().optional(),
  fechaFin: z.string().optional(),
  activo: z.boolean().default(true),
  notas: z.string().optional()
})

// ✅ Schema para actualizar personal del proyecto
export const updatePersonalProyectoSchema = z.object({
  rol: rolPersonalProyectoSchema.optional(),
  fechaFin: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  notas: z.string().nullable().optional()
})

// ✅ Tipos inferidos
export type CreateProyectoFromCotizacionInput = z.infer<typeof createProyectoFromCotizacionSchema>
export type CreateProyectoInput = z.infer<typeof createProyectoSchema>
export type UpdateProyectoInput = z.infer<typeof updateProyectoSchema>
export type ProyectoEstado = z.infer<typeof proyectoEstadoSchema>
export type RolPersonalProyecto = z.infer<typeof rolPersonalProyectoSchema>
export type CreatePersonalProyectoInput = z.infer<typeof createPersonalProyectoSchema>
export type UpdatePersonalProyectoInput = z.infer<typeof updatePersonalProyectoSchema>
