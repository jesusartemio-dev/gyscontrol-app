/**
 * 📄 Utilidad de Paginación Reutilizable - Sistema GYS
 * 
 * Proporciona funciones y tipos para implementar paginación consistente
 * en todas las APIs del sistema con parámetros estándar y cálculos optimizados.
 */

// ✅ Tipos base para paginación
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

// ✅ Configuración por defecto
const DEFAULT_CONFIG: PaginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultSortBy: 'createdAt',
  defaultSortOrder: 'desc'
};

/**
 * 🔧 Parsea y valida parámetros de paginación desde URL
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  config: Partial<PaginationConfig> = {}
): Required<PaginationParams> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    finalConfig.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || finalConfig.defaultLimit.toString(), 10))
  );
  
  return {
    page,
    limit,
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || finalConfig.defaultSortBy || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || finalConfig.defaultSortOrder || 'desc'
  };
}

/**
 * 🔧 Calcula offset para Prisma skip
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * 🔧 Construye objeto de paginación para respuesta
 */
export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * 🔧 Construye objeto orderBy para Prisma
 */
export function buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): Record<string, 'asc' | 'desc'> {
  // 📡 Mapeo de campos comunes para evitar errores
  const fieldMapping: Record<string, string> = {
    'fecha': 'createdAt',
    'nombre': 'nombre',
    'codigo': 'codigo',
    'estado': 'estado',
    'precio': 'precio',
    'cantidad': 'cantidad'
  };
  
  const field = fieldMapping[sortBy] || sortBy;
  return { [field]: sortOrder };
}

/**
 * 🔧 Construye filtros de búsqueda para Prisma where
 */
export function buildSearchFilter(
  search: string,
  searchFields: string[]
): Record<string, any> | undefined {
  if (!search.trim()) return undefined;
  
  const searchTerm = search.trim();
  
  if (searchFields.length === 1) {
    return {
      [searchFields[0]]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    };
  }
  
  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }))
  };
}

/**
 * 🔧 Utilidad completa para APIs - combina todos los helpers
 */
export async function paginateQuery<T>(
  queryFn: (args: { skip: number; take: number; where?: any; orderBy?: any }) => Promise<T[]>,
  countFn: (where?: any) => Promise<number>,
  params: Required<PaginationParams>,
  searchFields: string[] = [],
  additionalWhere: Record<string, any> = {}
): Promise<PaginationResult<T>> {
  const { page, limit, search, sortBy, sortOrder } = params;
  
  // 🔁 Construir filtros
  const searchFilter = buildSearchFilter(search, searchFields);
  const where = {
    ...additionalWhere,
    ...(searchFilter && searchFilter)
  };
  
  // 🔁 Construir ordenamiento
  const orderBy = buildOrderBy(sortBy, sortOrder);
  
  // 📡 Ejecutar consultas en paralelo
  const [data, total] = await Promise.all([
    queryFn({
      skip: calculateOffset(page, limit),
      take: limit,
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy
    }),
    countFn(Object.keys(where).length > 0 ? where : undefined)
  ]);
  
  return buildPaginationResult(data, total, page, limit);
}

/**
 * 🔧 Configuraciones específicas por entidad
 */
export const PAGINATION_CONFIGS = {
  listasEquipo: {
    defaultLimit: 15,
    maxLimit: 50,
    defaultSortBy: 'createdAt',
    searchFields: ['codigo', 'nombre', 'proyecto.nombre']
  },
  cotizaciones: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    searchFields: ['codigo', 'cliente.nombre', 'comercial.nombre']
  },
  pedidos: {
    defaultLimit: 25,
    maxLimit: 100,
    defaultSortBy: 'fechaPedido',
    searchFields: ['codigo', 'proveedor.nombre', 'lista.codigo']
  },
  timeline: {
    defaultLimit: 30,
    maxLimit: 200,
    defaultSortBy: 'fecha',
    searchFields: ['descripcion', 'tipo']
  }
} as const;
