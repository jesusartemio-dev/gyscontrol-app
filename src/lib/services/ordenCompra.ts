/**
 * 📦 Servicio de Órdenes de Compra
 * 
 * Lógica de negocio para:
 * - CRUD de órdenes de compra
 * - Generación de números de PO
 * - Cálculos financieros
 * - Validaciones de negocio
 * - Métricas y reportes
 */

import { prisma } from '@/lib/prisma';
// import { EventBus } from '@/lib/events/aprovisionamiento-events';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import type { 
  OrdenCompra, 
  OrdenCompraItem, 
  EstadoOrdenCompra
} from '@prisma/client';
import { 
  CreateOrdenCompraInput, 
  UpdateOrdenCompraInput, 
  OrdenCompraFilters 
} from '@/lib/validators/logistica';

// 📋 Tipos para el servicio
export interface OrdenCompraWithRelations extends OrdenCompra {
  pedidoEquipo: {
    id: string;
    codigo: string;
    proyecto: {
      id: string;
      nombre: string;
    };
    lista?: {
      id: string;
      nombre: string;
    };
  };
  proveedor: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
  };
  items: (OrdenCompraItem & {
    pedidoEquipoItem: {
      id: string;
      codigo: string;
      descripcion: string;
    };
    producto: {
      id: string;
      codigo: string;
      nombre: string;
      descripcion?: string;
      categoria?: string;
      unidadMedida?: string;
    };
  })[];
  recepciones?: any[];
  pagos?: any[];
  usuario: {
    id: string;
    name: string;
  };
}

export interface OrdenCompraMetrics {
  totalOrdenes: number;
  ordenesActivas: number;
  montoTotal: number;
  montoPromedio: number;
  proveedoresActivos: number;
  tiempoPromedioEntrega: number;
  porcentajeEntregasATiempo: number;
}

export interface OrdenCompraSummary {
  ordenes: OrdenCompraWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metrics?: OrdenCompraMetrics;
}

/**
 * 🏭 Servicio principal de Órdenes de Compra
 */
export class OrdenCompraService {
  // private static eventBus = new EventBus();

  /**
   * 📋 Obtener órdenes con filtros y paginación
   */
  static async getOrdenes(
    filters: OrdenCompraFilters = {}, 
    includeMetrics = false
  ): Promise<OrdenCompraSummary> {
    try {
      const { page = 1, limit = 10, ...filterParams } = filters;
      
      // 🔍 Construir filtros WHERE
      const where: Prisma.OrdenCompraWhereInput = {};
      
      if (filterParams.estado) {
        where.estado = filterParams.estado;
      }
      
      if (filterParams.proveedorId) {
        where.proveedorId = filterParams.proveedorId;
      }
      
      if (filterParams.fechaDesde || filterParams.fechaHasta) {
        where.fechaCreacion = {};
        if (filterParams.fechaDesde) {
          where.fechaCreacion.gte = new Date(filterParams.fechaDesde);
        }
        if (filterParams.fechaHasta) {
          where.fechaCreacion.lte = new Date(filterParams.fechaHasta);
        }
      }
      
      if (filterParams.proyectoId) {
        where.pedidoEquipo = {
          proyectoId: filterParams.proyectoId
        };
      }
      
      if (filterParams.search) {
        where.OR = [
          { numero: { contains: filterParams.search, mode: 'insensitive' } },
          { proveedor: { nombre: { contains: filterParams.search, mode: 'insensitive' } } },
          { pedidoEquipo: { codigo: { contains: filterParams.search, mode: 'insensitive' } } }
        ];
      }

      // 📊 Ejecutar consultas en paralelo
      const [ordenes, total, metrics] = await Promise.all([
        prisma.ordenCompra.findMany({
          where,
          include: {
            pedidoEquipo: {
              include: {
                proyecto: {
                  select: { id: true, nombre: true }
                },
                lista: {
                  select: { id: true, nombre: true }
                }
              }
            },
            proveedor: {
              select: { id: true, nombre: true, email: true, telefono: true }
            },
            items: {
              include: {
                pedidoEquipoItem: {
                  include: {
                    equipo: {
                      select: { id: true, nombre: true, codigo: true }
                    }
                  }
                },
                producto: {
                  select: { id: true, codigo: true, nombre: true, descripcion: true, categoria: true, unidadMedida: true }
                }
              }
            },
            recepciones: {
              select: {
                id: true,
                numero: true,
                estado: true,
                fechaRecepcion: true
              }
            },
            pagos: {
              select: {
                id: true,
                numero: true,
                tipo: true,
                monto: true,
                estado: true,
                fechaPago: true
              }
            },
            usuario: {
              select: { id: true, nombre: true }
            }
          },
          orderBy: { fechaCreacion: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.ordenCompra.count({ where }),
        includeMetrics ? this.getMetricas(filterParams) : null
      ]);

      return {
        ordenes: ordenes as OrdenCompraWithRelations[],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        ...(metrics && { metrics })
      };
    } catch (error) {
      logger.error('Error al obtener órdenes de compra:', error);
      throw new Error('Error al obtener órdenes de compra');
    }
  }

  /**
   * 🆔 Obtener orden por ID
   */
  static async getOrdenById(id: string): Promise<OrdenCompraWithRelations | null> {
    try {
      const orden = await prisma.ordenCompra.findUnique({
        where: { id },
        include: {
          pedidoEquipo: {
            include: {
              proyecto: true,
              lista: true
            }
          },
          proveedor: true,
          items: {
            include: {
              pedidoEquipoItem: {
                select: {
                  id: true,
                  codigo: true,
                  descripcion: true
                }
              },
              producto: {
                select: { id: true, codigo: true, nombre: true, descripcion: true, categoria: true, unidadMedida: true }
              },
              recepcionItems: {
                include: {
                  recepcion: true
                }
              }
            }
          },
          recepciones: {
            include: {
              items: true
            }
          },
          pagos: true,
          usuario: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return orden as OrdenCompraWithRelations | null;
    } catch (error) {
      logger.error(`Error al obtener orden ${id}:`, error);
      throw new Error('Error al obtener la orden de compra');
    }
  }

  /**
   * ➕ Crear nueva orden de compra
   */
  static async createOrden(
    data: CreateOrdenCompraInput, 
    userId: string
  ): Promise<OrdenCompraWithRelations> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 🔢 Generar número de PO
        const numero = await this.generateNumeroOrden(tx);
        
        // 💰 Calcular monto total
        const montoTotal = data.items.reduce(
          (sum, item) => sum + (item.cantidad * (typeof item.precioUnitario === 'number' ? item.precioUnitario : Number(item.precioUnitario))), 
          0
        );

        // ✅ Validar que el pedido existe y está disponible
        const pedidoEquipo = await tx.pedidoEquipo.findUnique({
          where: { id: data.pedidoEquipoId },
          include: { proyecto: true }
        });

        if (!pedidoEquipo) {
          throw new Error('Pedido de equipo no encontrado');
        }

        if (pedidoEquipo.estado === 'COMPLETADO') {
          throw new Error('El pedido ya está completado');
        }

        // 📦 Crear orden de compra
        const ordenCompra = await tx.ordenCompra.create({
          data: {
            numero,
            pedidoEquipoId: data.pedidoEquipoId,
            proveedorId: data.proveedorId,
            fechaRequerida: new Date(data.fechaRequerida),
            montoTotal,
            terminosEntrega: data.terminosEntrega,
            condicionesPago: data.condicionesPago,
            observaciones: data.observaciones,
            usuarioId: userId,
            items: {
              create: data.items.map(item => ({
                pedidoEquipoItemId: item.pedidoEquipoItemId,
                productoId: item.productoId,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                subtotal: item.cantidad * (typeof item.precioUnitario === 'number' ? item.precioUnitario : Number(item.precioUnitario)),
                especificaciones: item.especificaciones
              }))
            }
          },
          include: {
            pedidoEquipo: {
              include: {
                proyecto: true,
                lista: true
              }
            },
            proveedor: true,
            items: {
              include: {
                pedidoEquipoItem: {
                  include: {
                    equipo: true
                  }
                },
                producto: true
              }
            },
            usuario: true
          }
        });

        // 🔄 Actualizar estado del pedido
        await tx.pedidoEquipo.update({
          where: { id: data.pedidoEquipoId },
          data: { estado: 'EN_PROCESO' }
        });

        // 📡 Emitir evento para Finanzas
        // await this.eventBus.emit('po.created', {
        //   ordenCompraId: ordenCompra.id,
        //   pedidoEquipoId: data.pedidoEquipoId,
        //   montoTotal,
        //   proveedor: ordenCompra.proveedor.nombre,
        //   proyecto: pedidoEquipo.proyecto.nombre
        // });

        logger.info(`Orden de compra ${numero} creada exitosamente`);
        return ordenCompra as OrdenCompraWithRelations;
      });
    } catch (error) {
      logger.error('Error al crear orden de compra:', error);
      throw error;
    }
  }

  /**
   * ✏️ Actualizar orden de compra
   */
  static async updateOrden(
    id: string, 
    data: UpdateOrdenCompraInput, 
    userId: string
  ): Promise<OrdenCompraWithRelations> {
    try {
      const ordenActual = await prisma.ordenCompra.findUnique({
        where: { id },
        include: { pedidoEquipo: true }
      });

      if (!ordenActual) {
        throw new Error('Orden de compra no encontrada');
      }

      // ✅ Validaciones de estado
      if (ordenActual.estado === 'CERRADO' || ordenActual.estado === 'CANCELADO') {
        throw new Error('No se puede modificar una orden cerrada o cancelada');
      }

      const updateData: any = { ...data };
      
      // 🔐 Manejar aprobación
      if (data.estado === 'ENVIADA' && ordenActual.estado === 'BORRADOR') {
        updateData.responsableAprobacionId = userId;
        updateData.fechaAprobacion = new Date();
      }

      const ordenActualizada = await prisma.ordenCompra.update({
        where: { id },
        data: updateData,
        include: {
          pedidoEquipo: {
            include: {
              proyecto: true,
              lista: true
            }
          },
          proveedor: true,
          items: {
            include: {
              pedidoEquipoItem: {
                include: {
                  equipo: true
                }
              },
              producto: {
                select: { id: true, codigo: true, nombre: true, descripcion: true, categoria: true, unidadMedida: true }
              }
            }
          },
          recepciones: true,
          pagos: true,
          usuario: true
        }
      });

      // 📡 Emitir evento si cambió el estado
      // if (data.estado && data.estado !== ordenActual.estado) {
      //   await this.eventBus.emit('po.updated', {
      //     ordenCompraId: id,
      //     estadoAnterior: ordenActual.estado,
      //     estadoNuevo: data.estado,
      //     pedidoEquipoId: ordenActual.pedidoEquipoId
      //   });
      // }

      logger.info(`Orden de compra ${ordenActualizada.numero} actualizada`);
      return ordenActualizada as OrdenCompraWithRelations;
    } catch (error) {
      logger.error(`Error al actualizar orden ${id}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ Cancelar orden de compra
   */
  static async cancelarOrden(id: string, motivo: string, userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const orden = await tx.ordenCompra.findUnique({
          where: { id },
          include: { recepciones: true, pagos: true }
        });

        if (!orden) {
          throw new Error('Orden de compra no encontrada');
        }

        // ✅ Validar que se puede cancelar
        if (orden.recepciones.length > 0) {
          throw new Error('No se puede cancelar una orden con recepciones');
        }

        if (orden.pagos.some(p => p.estado === 'EJECUTADO')) {
          throw new Error('No se puede cancelar una orden con pagos ejecutados');
        }

        // 🚫 Cancelar orden
        await tx.ordenCompra.update({
          where: { id },
          data: {
            estado: 'CANCELADO',
            observaciones: `${orden.observaciones || ''}\n\nCANCELADO: ${motivo}`
          }
        });

        // 🔄 Revertir estado del pedido
        await tx.pedidoEquipo.update({
          where: { id: orden.pedidoEquipoId },
          data: { estado: 'PENDIENTE' }
        });

        // 📡 Emitir evento
        // await this.eventBus.emit('po.cancelled', {
        //   ordenCompraId: id,
        //   motivo,
        //   pedidoEquipoId: orden.pedidoEquipoId
        // });
      });

      logger.info(`Orden de compra ${id} cancelada: ${motivo}`);
    } catch (error) {
      logger.error(`Error al cancelar orden ${id}:`, error);
      throw error;
    }
  }

  /**
   * 📊 Obtener métricas
   */
  static async getMetricas(filters: Partial<OrdenCompraFilters> = {}): Promise<OrdenCompraMetrics> {
    try {
      const where: Prisma.OrdenCompraWhereInput = {};
      
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaCreacion = {};
        if (filters.fechaDesde) where.fechaCreacion.gte = new Date(filters.fechaDesde);
        if (filters.fechaHasta) where.fechaCreacion.lte = new Date(filters.fechaHasta);
      }

      const [totalOrdenes, ordenesActivas, montoAggregate, proveedoresUnicos, tiemposEntrega] = await Promise.all([
        prisma.ordenCompra.count({ where }),
        prisma.ordenCompra.count({
          where: {
            ...where,
            estado: {
              in: ['ENVIADA', 'CONFIRMADA', 'EN_TRANSITO', 'RECIBIDO_PARCIAL']
            }
          }
        }),
        prisma.ordenCompra.aggregate({
          where: { ...where, estado: { not: 'CANCELADO' } },
          _sum: { montoTotal: true },
          _avg: { montoTotal: true }
        }),
        prisma.ordenCompra.groupBy({
          by: ['proveedorId'],
          where
        }),
        prisma.ordenCompra.findMany({
          where: {
            ...where,
            fechaEntrega: { not: null },
            estado: { in: ['RECIBIDO_TOTAL', 'PAGADO', 'CERRADO'] }
          },
          select: {
            fechaRequerida: true,
            fechaEntrega: true
          }
        })
      ]);

      // 📈 Calcular métricas de tiempo
      const tiempoPromedioEntrega = tiemposEntrega.length > 0 
        ? tiemposEntrega.reduce((sum, orden) => {
            const dias = Math.ceil(
              (orden.fechaEntrega!.getTime() - orden.fechaRequerida.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + dias;
          }, 0) / tiemposEntrega.length
        : 0;

      const entregasATiempo = tiemposEntrega.filter(
        orden => orden.fechaEntrega! <= orden.fechaRequerida
      ).length;
      
      const porcentajeEntregasATiempo = tiemposEntrega.length > 0 
        ? (entregasATiempo / tiemposEntrega.length) * 100 
        : 0;

      return {
        totalOrdenes,
        ordenesActivas,
        montoTotal: Number(montoAggregate._sum.montoTotal || 0),
        montoPromedio: Number(montoAggregate._avg.montoTotal || 0),
        proveedoresActivos: proveedoresUnicos.length,
        tiempoPromedioEntrega,
        porcentajeEntregasATiempo
      };
    } catch (error) {
      logger.error('Error al obtener métricas:', error);
      throw new Error('Error al obtener métricas');
    }
  }

  /**
   * 🔢 Generar número de orden secuencial
   */
  private static async generateNumeroOrden(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || prisma;
    
    const ultimaOrden = await client.ordenCompra.findFirst({
      orderBy: { numero: 'desc' },
      select: { numero: true }
    });

    const numeroSecuencia = ultimaOrden 
      ? parseInt(ultimaOrden.numero.split('-')[1]) + 1 
      : 1;

    return `PO-${numeroSecuencia.toString().padStart(6, '0')}`;
  }

  /**
   * 🔍 Buscar órdenes por texto
   */
  static async searchOrdenes(query: string, limit = 10): Promise<OrdenCompraWithRelations[]> {
    try {
      const ordenes = await prisma.ordenCompra.findMany({
        where: {
          OR: [
            { numero: { contains: query, mode: 'insensitive' } },
            { proveedor: { nombre: { contains: query, mode: 'insensitive' } } },
            { pedidoEquipo: { codigo: { contains: query, mode: 'insensitive' } } },
            { pedidoEquipo: { proyecto: { nombre: { contains: query, mode: 'insensitive' } } } }
          ]
        },
        include: {
          pedidoEquipo: {
            include: {
              proyecto: true,
              lista: true
            }
          },
          proveedor: true,
          items: {
            include: {
              pedidoEquipoItem: {
                include: {
                  equipo: true
                }
              }
            }
          },
          usuario: true
        },
        take: limit,
        orderBy: { fechaCreacion: 'desc' }
      });

      return ordenes as OrdenCompraWithRelations[];
    } catch (error) {
      logger.error('Error en búsqueda de órdenes:', error);
      throw new Error('Error en la búsqueda');
    }
  }

  /**
   * 🔄 Procesar pedido de equipo para crear orden de compra
   */
  static async procesarPedidoEquipo(pedidoId: string): Promise<void> {
    try {
      logger.info(`🔄 Procesando pedido de equipo: ${pedidoId}`);
      
      // 📋 Buscar pedido de equipo
      const pedido = await prisma.pedidoEquipo.findUnique({
        where: { id: pedidoId },
        include: {
          proyecto: true,
          items: {
            include: {
              equipo: true
            }
          }
        }
      });

      if (!pedido) {
        throw new Error(`Pedido de equipo no encontrado: ${pedidoId}`);
      }

      // ✅ Marcar pedido como procesado para órdenes de compra
      await prisma.pedidoEquipo.update({
        where: { id: pedidoId },
        data: {
          fechaUltimaActualizacion: new Date()
        }
      });

      logger.info(`✅ Pedido de equipo procesado: ${pedido.codigo}`);
    } catch (error) {
      logger.error(`Error procesando pedido de equipo ${pedidoId}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Actualizar órdenes de compra por cambios en pedido
   */
  static async actualizarPorPedido(pedidoId: string, cambios: any): Promise<void> {
    try {
      logger.info(`🔄 Actualizando órdenes por cambios en pedido: ${pedidoId}`);
      
      // 📋 Buscar órdenes de compra relacionadas al pedido
      const ordenes = await prisma.ordenCompra.findMany({
        where: { pedidoEquipoId: pedidoId },
        include: {
          items: true
        }
      });

      if (ordenes.length === 0) {
        logger.info(`No hay órdenes de compra para el pedido: ${pedidoId}`);
        return;
      }

      // 🔄 Actualizar cada orden de compra
      for (const orden of ordenes) {
        await prisma.ordenCompra.update({
          where: { id: orden.id },
          data: {
            fechaUltimaActualizacion: new Date(),
            observaciones: `Actualizado por cambios en pedido: ${JSON.stringify(cambios)}`
          }
        });
      }

      logger.info(`✅ ${ordenes.length} órdenes actualizadas por cambios en pedido`);
    } catch (error) {
      logger.error(`Error actualizando órdenes por pedido ${pedidoId}:`, error);
      throw error;
    }
  }

  /**
   * 💳 Procesar pago aprobado para actualizar estado de orden
   */
  static async procesarPagoAprobado(ordenCompraId: string, pagoId: string): Promise<void> {
    try {
      logger.info(`💳 Procesando pago aprobado para orden: ${ordenCompraId}`);
      
      // 📋 Buscar orden de compra
      const orden = await prisma.ordenCompra.findUnique({
        where: { id: ordenCompraId },
        include: {
          pagos: true
        }
      });

      if (!orden) {
        throw new Error(`Orden de compra no encontrada: ${ordenCompraId}`);
      }

      // 💰 Calcular total pagado
      const totalPagado = orden.pagos.reduce((sum, pago) => {
        return sum + (pago.estado === 'EJECUTADO' ? pago.monto : 0);
      }, 0);

      // 🔄 Actualizar estado si está completamente pagada
      let nuevoEstado = orden.estado;
      if (totalPagado >= orden.montoTotal) {
        nuevoEstado = 'PAGADA' as EstadoOrdenCompra;
      } else if (totalPagado > 0) {
        nuevoEstado = 'PAGO_PARCIAL' as EstadoOrdenCompra;
      }

      await prisma.ordenCompra.update({
        where: { id: ordenCompraId },
        data: {
          estado: nuevoEstado,
          fechaUltimaActualizacion: new Date()
        }
      });

      logger.info(`✅ Orden de compra actualizada por pago: ${orden.numeroOrden} - Estado: ${nuevoEstado}`);
    } catch (error) {
      logger.error(`Error procesando pago aprobado ${pagoId} para orden ${ordenCompraId}:`, error);
      throw error;
    }
  }
}