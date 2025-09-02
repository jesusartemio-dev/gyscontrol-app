/**
 * 📦 Servicio de Productos
 * 
 * Lógica de negocio para:
 * - CRUD de productos
 * - Búsqueda y filtrado
 * - Validaciones de negocio
 * - Gestión de categorías
 * - Métricas de productos
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import type { Producto } from '@prisma/client';
import { 
  CreateProductoInput, 
  UpdateProductoInput, 
  ProductoFilters 
} from '@/lib/validators/catalogo';

// 📋 Tipos para el servicio
export interface ProductoWithRelations extends Producto {
  // Relaciones futuras si se necesitan
  _count?: {
    ordenCompraItems?: number;
  };
}

export interface ProductoSummary {
  productos: ProductoWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  categorias?: string[];
}

export interface ProductoMetrics {
  totalProductos: number;
  productosPorCategoria: Record<string, number>;
  productosActivos: number;
  productosInactivos: number;
}

/**
 * 🏭 Servicio de Productos
 * Maneja toda la lógica de negocio relacionada con productos
 */
export class ProductoService {
  
  /**
   * 📋 Obtener productos con filtros y paginación
   */
  static async getProductos(
    filters: ProductoFilters = {}
  ): Promise<ProductoSummary> {
    try {
      const {
        categoria,
        activo,
        search,
        page = 1,
        limit = 10,
        sortBy = 'nombre',
        sortOrder = 'asc'
      } = filters;

      // 🔍 Construir condiciones de filtro
      const where: Prisma.ProductoWhereInput = {
        ...(categoria && { categoria }),
        ...(activo !== undefined && { activo }),
        ...(search && {
          OR: [
            { codigo: { contains: search, mode: 'insensitive' } },
            { nombre: { contains: search, mode: 'insensitive' } },
            { descripcion: { contains: search, mode: 'insensitive' } },
            { categoria: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // 📊 Obtener total para paginación
      const total = await prisma.producto.count({ where });
      const pages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      // 🔄 Obtener productos
      const productos = await prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      // 📈 Obtener categorías únicas si se necesita
      const categorias = await prisma.producto.findMany({
        where: { activo: true },
        select: { categoria: true },
        distinct: ['categoria']
      }).then(results => 
        results
          .map(r => r.categoria)
          .filter(Boolean)
          .sort()
      );

      logger.info(`✅ Productos obtenidos: ${productos.length}/${total}`, {
        filters,
        total,
        page,
        limit
      });

      return {
        productos,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        categorias
      };

    } catch (error) {
      logger.error('❌ Error al obtener productos:', error);
      throw new Error('Error al obtener productos');
    }
  }

  /**
   * 🔍 Obtener producto por ID
   */
  static async getProductoById(id: string): Promise<ProductoWithRelations | null> {
    try {
      const producto = await prisma.producto.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      if (!producto) {
        logger.warn(`⚠️ Producto no encontrado: ${id}`);
        return null;
      }

      logger.info(`✅ Producto obtenido: ${producto.codigo} - ${producto.nombre}`);
      return producto;

    } catch (error) {
      logger.error(`❌ Error al obtener producto ${id}:`, error);
      throw new Error('Error al obtener producto');
    }
  }

  /**
   * ➕ Crear nuevo producto
   */
  static async createProducto(
    data: CreateProductoInput,
    userId: string
  ): Promise<ProductoWithRelations> {
    try {
      // ✅ Verificar que el código no exista
      const existingProducto = await prisma.producto.findUnique({
        where: { codigo: data.codigo }
      });

      if (existingProducto) {
        throw new Error(`Ya existe un producto con el código: ${data.codigo}`);
      }

      // 🆕 Crear producto
      const producto = await prisma.producto.create({
        data: {
          ...data,
          usuarioId: userId,
          fechaCreacion: new Date()
        },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      logger.info(`✅ Producto creado: ${producto.codigo} - ${producto.nombre}`, {
        id: producto.id,
        userId
      });

      return producto;

    } catch (error) {
      logger.error('❌ Error al crear producto:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al crear producto');
    }
  }

  /**
   * ✏️ Actualizar producto
   */
  static async updateProducto(
    id: string,
    data: UpdateProductoInput,
    userId: string
  ): Promise<ProductoWithRelations> {
    try {
      // ✅ Verificar que el producto existe
      const existingProducto = await prisma.producto.findUnique({
        where: { id }
      });

      if (!existingProducto) {
        throw new Error('Producto no encontrado');
      }

      // ✅ Verificar código único si se está cambiando
      if (data.codigo && data.codigo !== existingProducto.codigo) {
        const duplicateProducto = await prisma.producto.findUnique({
          where: { codigo: data.codigo }
        });

        if (duplicateProducto) {
          throw new Error(`Ya existe un producto con el código: ${data.codigo}`);
        }
      }

      // 🔄 Actualizar producto
      const producto = await prisma.producto.update({
        where: { id },
        data: {
          ...data,
          actualizadoPor: userId,
          fechaActualizacion: new Date()
        },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      logger.info(`✅ Producto actualizado: ${producto.codigo} - ${producto.nombre}`, {
        id,
        changes: Object.keys(data),
        userId
      });

      return producto;

    } catch (error) {
      logger.error(`❌ Error al actualizar producto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al actualizar producto');
    }
  }

  /**
   * 🗑️ Eliminar producto (soft delete)
   */
  static async deleteProducto(id: string, userId: string): Promise<void> {
    try {
      // ✅ Verificar que el producto existe
      const existingProducto = await prisma.producto.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      if (!existingProducto) {
        throw new Error('Producto no encontrado');
      }

      // ⚠️ Verificar si tiene órdenes de compra asociadas
      if (existingProducto._count?.ordenCompraItems && existingProducto._count.ordenCompraItems > 0) {
        // Soft delete - marcar como inactivo
        await prisma.producto.update({
          where: { id },
          data: {
            activo: false,
            actualizadoPor: userId,
            fechaActualizacion: new Date()
          }
        });

        logger.info(`✅ Producto desactivado (tiene órdenes asociadas): ${existingProducto.codigo}`, {
          id,
          ordenesAsociadas: existingProducto._count.ordenCompraItems,
          userId
        });
      } else {
        // Hard delete - eliminar completamente
        await prisma.producto.delete({
          where: { id }
        });

        logger.info(`✅ Producto eliminado: ${existingProducto.codigo}`, {
          id,
          userId
        });
      }

    } catch (error) {
      logger.error(`❌ Error al eliminar producto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al eliminar producto');
    }
  }

  /**
   * 🔍 Buscar productos por texto
   */
  static async searchProductos(query: string, limit = 10): Promise<ProductoWithRelations[]> {
    try {
      const productos = await prisma.producto.findMany({
        where: {
          activo: true,
          OR: [
            { codigo: { contains: query, mode: 'insensitive' } },
            { nombre: { contains: query, mode: 'insensitive' } },
            { descripcion: { contains: query, mode: 'insensitive' } },
            { categoria: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: [
          { codigo: 'asc' },
          { nombre: 'asc' }
        ],
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      logger.info(`🔍 Búsqueda de productos: "${query}" - ${productos.length} resultados`);
      return productos;

    } catch (error) {
      logger.error(`❌ Error en búsqueda de productos: "${query}":`, error);
      throw new Error('Error en búsqueda de productos');
    }
  }

  /**
   * 📊 Obtener métricas de productos
   */
  static async getMetricas(): Promise<ProductoMetrics> {
    try {
      const [totalProductos, productosActivos, productosPorCategoria] = await Promise.all([
        // Total de productos
        prisma.producto.count(),
        
        // Productos activos
        prisma.producto.count({ where: { activo: true } }),
        
        // Productos por categoría
        prisma.producto.groupBy({
          by: ['categoria'],
          where: { activo: true },
          _count: { categoria: true }
        })
      ]);

      const productosInactivos = totalProductos - productosActivos;
      
      const categorias = productosPorCategoria.reduce((acc, item) => {
        if (item.categoria) {
          acc[item.categoria] = item._count.categoria;
        }
        return acc;
      }, {} as Record<string, number>);

      const metrics: ProductoMetrics = {
        totalProductos,
        productosActivos,
        productosInactivos,
        productosPorCategoria: categorias
      };

      logger.info('📊 Métricas de productos calculadas', metrics);
      return metrics;

    } catch (error) {
      logger.error('❌ Error al calcular métricas de productos:', error);
      throw new Error('Error al calcular métricas de productos');
    }
  }

  /**
   * 📋 Obtener categorías únicas
   */
  static async getCategorias(): Promise<string[]> {
    try {
      const categorias = await prisma.producto.findMany({
        where: { 
          activo: true,
          categoria: { not: null }
        },
        select: { categoria: true },
        distinct: ['categoria']
      });

      const result = categorias
        .map(c => c.categoria)
        .filter(Boolean)
        .sort();

      logger.info(`📋 Categorías obtenidas: ${result.length}`);
      return result;

    } catch (error) {
      logger.error('❌ Error al obtener categorías:', error);
      throw new Error('Error al obtener categorías');
    }
  }

  /**
   * ✅ Activar/Desactivar producto
   */
  static async toggleActivo(id: string, userId: string): Promise<ProductoWithRelations> {
    try {
      const existingProducto = await prisma.producto.findUnique({
        where: { id }
      });

      if (!existingProducto) {
        throw new Error('Producto no encontrado');
      }

      const producto = await prisma.producto.update({
        where: { id },
        data: {
          activo: !existingProducto.activo,
          actualizadoPor: userId,
          fechaActualizacion: new Date()
        },
        include: {
          _count: {
            select: {
              ordenCompraItems: true
            }
          }
        }
      });

      const action = producto.activo ? 'activado' : 'desactivado';
      logger.info(`✅ Producto ${action}: ${producto.codigo} - ${producto.nombre}`, {
        id,
        activo: producto.activo,
        userId
      });

      return producto;

    } catch (error) {
      logger.error(`❌ Error al cambiar estado del producto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al cambiar estado del producto');
    }
  }
}