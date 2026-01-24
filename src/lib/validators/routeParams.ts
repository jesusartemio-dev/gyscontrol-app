/**
 * 🔍 Route Parameters Validation
 * 
 * Validation schemas and utilities for dynamic route parameters.
 * Ensures type safety and proper error handling for route params.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import { z } from 'zod';

// ✅ Base CUID validation schema (Prisma uses cuid() by default)
const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'ID debe ser un CUID válido');

// ✅ Legacy UUID validation schema (for backward compatibility)
const uuidSchema = z.string().uuid('ID debe ser un UUID válido');

// ✅ Combined ID schema that accepts both CUID and UUID formats
const idSchema = z.string().refine(
  (val) => /^c[a-z0-9]{24}$/.test(val) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
  'ID debe ser un CUID o UUID válido'
);

// ✅ Proyecto route params validation
export const proyectoParamsSchema = z.object({
  id: idSchema
});

// ✅ Lista Equipo Detail route params validation
export const listaEquipoDetailParamsSchema = z.object({
  id: idSchema, // proyectoId
  listaId: idSchema
});

// ✅ Generic route params validation
export const genericDetailParamsSchema = z.object({
  id: idSchema,
  detailId: idSchema.optional()
});

// ✅ Search params validation for lists
export const listSearchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.enum(['nombre', 'fecha', 'estado', 'responsable']).default('nombre'),
  order: z.enum(['asc', 'desc']).default('asc'),
  estado: z.string().optional(),
  responsable: z.string().optional()
});

// ✅ Type exports
export type ProyectoParams = z.infer<typeof proyectoParamsSchema>;
export type ListaEquipoDetailParams = z.infer<typeof listaEquipoDetailParamsSchema>;
export type GenericDetailParams = z.infer<typeof genericDetailParamsSchema>;
export type ListSearchParams = z.infer<typeof listSearchParamsSchema>;

// ✅ Validation utilities
export class RouteParamsValidator {
  /**
   * Validate proyecto route parameters
   */
  static validateProyectoParams(params: unknown): ProyectoParams {
    try {
      return proyectoParamsSchema.parse(params);
    } catch (error) {
      throw new Error('Parámetros de proyecto inválidos');
    }
  }
  
  /**
   * Validate lista equipo detail route parameters
   */
  static validateListaEquipoDetailParams(params: unknown): ListaEquipoDetailParams {
    try {
      return listaEquipoDetailParamsSchema.parse(params);
    } catch (error) {
      throw new Error('Parámetros de lista de equipos inválidos');
    }
  }
  
  /**
   * Validate search parameters for lists
   */
  static validateListSearchParams(searchParams: unknown): ListSearchParams {
    try {
      return listSearchParamsSchema.parse(searchParams);
    } catch (error) {
      // Return default values on validation error
      return {
        page: 1,
        limit: 10,
        sort: 'nombre',
        order: 'asc'
      };
    }
  }
  
  /**
   * Safe parameter validation with fallback
   */
  static safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    fallback?: T
  ): { success: true; data: T } | { success: false; error: string } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => e.message).join(', ');
        return { success: false, error: errorMessage };
      }
      return { success: false, error: 'Error de validación desconocido' };
    }
  }
  
  /**
   * Check if a string is a valid CUID
   */
  static isValidCUID(value: string): boolean {
    const cuidRegex = /^c[a-z0-9]{24}$/;
    return cuidRegex.test(value);
  }

  /**
   * Check if a string is a valid UUID (legacy support)
   */
  static isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
  
  /**
   * Sanitize and validate route parameters
   */
  static sanitizeParams(params: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else if (Array.isArray(value) && value.length > 0) {
        sanitized[key] = value[0].trim();
      }
    }
    
    return sanitized;
  }
}

// ✅ Route validation middleware helper
export const validateRouteParams = {
  /**
   * Validate and extract proyecto parameters
   */
  proyecto: (params: unknown) => {
    const validation = RouteParamsValidator.safeValidate(proyectoParamsSchema, params);
    if (!validation.success) {
      throw new Error(`Proyecto no válido: ${validation.error}`);
    }
    return validation.data;
  },
  
  /**
   * Validate and extract lista equipo detail parameters
   */
  listaEquipoDetail: (params: unknown) => {
    const validation = RouteParamsValidator.safeValidate(listaEquipoDetailParamsSchema, params);
    if (!validation.success) {
      throw new Error(`Lista de equipos no válida: ${validation.error}`);
    }
    return validation.data;
  }
};

// ✅ Error types for route validation
export class RouteValidationError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_PARAMS' | 'MISSING_PARAMS' | 'UNAUTHORIZED' = 'INVALID_PARAMS'
  ) {
    super(message);
    this.name = 'RouteValidationError';
  }
}

// ✅ Route guards
export const routeGuards = {
  /**
   * Ensure user has access to proyecto
   */
  requireProyectoAccess: (proyectoId: string, userRole?: string) => {
    if (!RouteParamsValidator.isValidUUID(proyectoId)) {
      throw new RouteValidationError('ID de proyecto inválido', 'INVALID_PARAMS');
    }
    
    // Add role-based access control here if needed
    // if (userRole && !hasProyectoAccess(userRole, proyectoId)) {
    //   throw new RouteValidationError('Sin permisos para acceder al proyecto', 'UNAUTHORIZED');
    // }
    
    return true;
  },
  
  /**
   * Ensure user has access to lista equipo
   */
  requireListaEquipoAccess: (proyectoId: string, listaId: string, userRole?: string) => {
    routeGuards.requireProyectoAccess(proyectoId, userRole);
    
    if (!RouteParamsValidator.isValidUUID(listaId)) {
      throw new RouteValidationError('ID de lista inválido', 'INVALID_PARAMS');
    }
    
    return true;
  }
};

export default RouteParamsValidator;
