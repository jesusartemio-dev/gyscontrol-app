/**
 * 📥 Servicio de Recepciones
 * 
 * Lógica de negocio para:
 * - CRUD de recepciones
 * - Control de inspección
 * - Validaciones de cantidades
 * - Actualización de estados de órdenes
 * - Métricas de recepción
 */

import { prisma } from '@/lib/prisma';
import { eventBus, eventTypes } from '@/lib/events/aprovisionamiento-events';
import { logger } from '@/lib/logger';
import { 
  Recepcion, 
  RecepcionItem, 
  EstadoRecepcion, 
  TipoRecepcion,
  EstadoInspeccion,
  EstadoOrdenCompra
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { 
  CreateRecepcionInput, 
  UpdateRecepcionInput, 
  RecepcionFilters 
} from '@/lib/validators/logistica';

// 📋 Tipos para el servicio
export interface RecepcionWithRelations extends Recepcion {
  ordenCompra: {
    id: string;
    numero: string;
    estado: string;
    montoTotal: number;
    pedidoEquipo: {
      id: string;
      codigo: string;
      proyecto: {
        id: string;
        nombre: string;
      };
    };
    proveedor: {
      id: string;
      nombre: string;
    };
  };
  items: (RecepcionItem & {
    ordenCompraItem: {
      id: string;
      cantidad: number;
      precioUnitario: number;
      pedidoEquipoItem: {
        id: string;
        codigo: string;
        descripcion: string;
      };
    };
  })[];
  usuario: {
    id: string;
    name: string;
  };
}

export interface RecepcionMetrics {
  totalRecepciones: number;
  recepcionesPendientes: number;
  porcentajeAprobacion: number;
  tiempoPromedioInspeccion: number;
  itemsRecibidos: number;
  itemsRechazados: number;
  valorTotalRecibido: number;
}

export interface RecepcionSummary {
  recepciones: RecepcionWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metrics?: RecepcionMetrics;
}

/**
 * 🏭 Servicio principal de Recepciones
 */
export class RecepcionService {

  /**
   * 📋 Obtener recepciones con filtros y paginación
   */
  static async getRecepciones(
    filters: RecepcionFilters = {}, 
    includeMetrics = false
  ): Promise<RecepcionSummary> {
    try {
      const { page = 1, limit = 10, ...filterParams } = filters;
      
      // 🔍 Construir filtros WHERE
      const where: Prisma.RecepcionWhereInput = {};
      
      if (filterParams.estado) {
        where.estado = filterParams.estado;
      }
      
      if (filterParams.ordenCompraId) {
        where.ordenCompraId = filterParams.ordenCompraId;
      }
      
      if (filterParams.fechaDesde || filterParams.fechaHasta) {
        where.fechaRecepcion = {};
        if (filterParams.fechaDesde) {
          where.fechaRecepcion.gte = new Date(filterParams.fechaDesde);
        }
        if (filterParams.fechaHasta) {
          where.fechaRecepcion.lte = new Date(filterParams.fechaHasta);
        }
      }
      
      if (filterParams.search) {
        where.OR = [
          { numero: { contains: filterParams.search, mode: 'insensitive' } },
          { ordenCompra: { numero: { contains: filterParams.search, mode: 'insensitive' } } },
          { ordenCompra: { proveedor: { nombre: { contains: filterParams.search, mode: 'insensitive' } } } }
        ];
      }

      // 📊 Ejecutar consultas en paralelo
      const [recepciones, total, metrics] = await Promise.all([
        prisma.recepcion.findMany({
          where,
          include: {
            ordenCompra: {
              include: {
                pedidoEquipo: {
                  include: {
                    proyecto: {
                      select: { id: true, nombre: true }
                    }
                  }
                },
                proveedor: {
                  select: { id: true, nombre: true }
                }
              }
            },
            items: {
              include: {
                ordenCompraItem: {
                  include: {
                    pedidoEquipoItem: {
                      select: {
                        id: true,
                        codigo: true,
                        descripcion: true
                      }
                    }
                  }
                }
              }
            },
            usuario: {
              select: { id: true, name: true }
            }
          },
          orderBy: { fechaRecepcion: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.recepcion.count({ where }),
        includeMetrics ? this.getMetricas(filterParams) : null
      ]);

      return {
        recepciones: recepciones as RecepcionWithRelations[],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        ...(metrics && { metrics })
      };
    } catch (error) {
      logger.error('Error al obtener recepciones:', error);
      throw new Error('Error al obtener recepciones');
    }
  }

  /**
   * 🆔 Obtener recepción por ID
   */
  static async getRecepcionById(id: string): Promise<RecepcionWithRelations | null> {
    try {
      const recepcion = await prisma.recepcion.findUnique({
        where: { id },
        include: {
          ordenCompra: {
            include: {
              pedidoEquipo: {
                include: {
                  proyecto: true
                }
              },
              proveedor: true,
              items: true
            }
          },
          items: {
            include: {
              ordenCompraItem: {
                include: {
                  pedidoEquipoItem: {
                    select: {
                      id: true,
                      codigo: true,
                      descripcion: true
                    }
                  }
                }
              }
            }
          },
          usuario: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return recepcion as RecepcionWithRelations | null;
    } catch (error) {
      logger.error(`Error al obtener recepción ${id}:`, error);
      throw new Error('Error al obtener la recepción');
    }
  }

  /**
   * ➕ Crear nueva recepción
   */
  static async createRecepcion(
    data: CreateRecepcionInput, 
    userId: string
  ): Promise<RecepcionWithRelations> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 🔢 Generar número de recepción
        const numero = await this.generateNumeroRecepcion(tx);
        
        // ✅ Validar que la orden existe y está en estado válido
        const ordenCompra = await tx.ordenCompra.findUnique({
          where: { id: data.ordenCompraId },
          include: {
            items: true,
            recepciones: {
              include: { items: true }
            }
          }
        });

        if (!ordenCompra) {
          throw new Error('Orden de compra no encontrada');
        }

        if (!['ENVIADA', 'CONFIRMADA', 'EN_TRANSITO', 'RECIBIDO_PARCIAL'].includes(ordenCompra.estado)) {
          throw new Error('La orden no está en estado válido para recepción');
        }

        // ✅ Validar cantidades contra items de la orden
        for (const item of data.items) {
          const ordenItem = ordenCompra.items.find(oi => oi.id === item.ordenCompraItemId);
          if (!ordenItem) {
            throw new Error(`Item de orden ${item.ordenCompraItemId} no encontrado`);
          }

          // 📊 Calcular cantidad ya recibida
          const cantidadRecibidaAnterior = ordenCompra.recepciones
            .flatMap(r => r.items)
            .filter(ri => ri.ordenCompraItemId === item.ordenCompraItemId)
            .reduce((sum, ri) => sum + ri.cantidadAceptada, 0);

          const cantidadPendiente = ordenItem.cantidad - cantidadRecibidaAnterior;

          if (item.cantidadRecibida > cantidadPendiente) {
            throw new Error(
              `Cantidad recibida (${item.cantidadRecibida}) excede la cantidad pendiente (${cantidadPendiente}) para el item`
            );
          }

          if (item.cantidadAceptada + item.cantidadRechazada !== item.cantidadRecibida) {
            throw new Error('La suma de cantidad aceptada y rechazada debe igual a la cantidad recibida');
          }
        }

        // 📥 Crear recepción
        const recepcion = await tx.recepcion.create({
          data: {
            numero,
            ordenCompraId: data.ordenCompraId,
            tipoRecepcion: data.tipoRecepcion,
            observaciones: data.observaciones,
            documentos: data.documentos || [],
            responsableRecepcionId: userId,
            items: {
              create: data.items.map(item => ({
                ordenCompraItemId: item.ordenCompraItemId,
                cantidadRecibida: item.cantidadRecibida,
                cantidadAceptada: item.cantidadAceptada,
                cantidadRechazada: item.cantidadRechazada,
                observaciones: item.observaciones
              }))
            }
          },
          include: {
            ordenCompra: {
              include: {
                pedidoEquipo: {
                  include: {
                    proyecto: true
                  }
                },
                proveedor: true
              }
            },
            items: {
              include: {
                ordenCompraItem: {
                  include: {
                    pedidoEquipoItem: {
                      select: {
                        id: true,
                        codigo: true,
                        descripcion: true
                      }
                    }
                  }
                }
              }
            },
            usuario: true
          }
        });

        // 🔄 Actualizar estado de la orden de compra
        const nuevoEstadoOrden = await this.determinarEstadoOrden(data.ordenCompraId, tx);
        await tx.ordenCompra.update({
          where: { id: data.ordenCompraId },
          data: { estado: nuevoEstadoOrden }
        });

        // 📡 Emitir evento para Finanzas
        await eventBus.emit(eventTypes.RECEPTION_CREATED, {
          id: crypto.randomUUID(),
          tipo: eventTypes.RECEPTION_CREATED,
          areaOrigen: 'LOGISTICA' as const,
          areaDestino: 'FINANZAS' as const,
          entidadId: recepcion.id,
          datos: {
            recepcionId: recepcion.id,
            numeroRecepcion: recepcion.numero,
            ordenCompraId: data.ordenCompraId,
            tipoRecepcion: data.tipoRecepcion,
            itemsRecibidos: data.items.length,
            valorRecibido: this.calcularValorRecibido(data.items, ordenCompra.items),
            timestamp: new Date()
          },
          fechaCreacion: new Date()
        });

        logger.info(`Recepción ${numero} creada exitosamente`);
        return recepcion as RecepcionWithRelations;
      });
    } catch (error) {
      logger.error('Error al crear recepción:', error);
      throw error;
    }
  }

  /**
   * ✏️ Actualizar recepción
   */
  static async updateRecepcion(
    id: string, 
    data: UpdateRecepcionInput, 
    userId: string
  ): Promise<RecepcionWithRelations> {
    try {
      const recepcionActual = await prisma.recepcion.findUnique({
        where: { id },
        include: { ordenCompra: true }
      });

      if (!recepcionActual) {
        throw new Error('Recepción no encontrada');
      }

      // ✅ Validaciones de estado
      if (recepcionActual.estado === EstadoRecepcion.APROBADO && data.estado !== EstadoRecepcion.APROBADO) {
        throw new Error('No se puede modificar una recepción ya aprobada');
      }

      const updateData: any = { ...data };
      
      // 🔍 Manejar inspección
      if (data.estado === EstadoRecepcion.EN_INSPECCION && recepcionActual.estado === EstadoRecepcion.PENDIENTE) {
        updateData.responsableInspeccionId = userId;
        updateData.fechaInspeccion = new Date();
      }

      const recepcionActualizada = await prisma.recepcion.update({
        where: { id },
        data: updateData,
        include: {
          ordenCompra: {
            include: {
              pedidoEquipo: {
                include: {
                  proyecto: true
                }
              },
              proveedor: true
            }
          },
          items: {
            include: {
              ordenCompraItem: {
                include: {
                  pedidoEquipoItem: {
                    select: {
                      id: true,
                      codigo: true,
                      descripcion: true
                    }
                  }
                }
              }
            }
          },
          usuario: true
        }
      });

      // 📡 Emitir evento si se completó la inspección
      if (data.estado === EstadoRecepcion.APROBADO && recepcionActual.estado !== EstadoRecepcion.APROBADO) {
        await eventBus.emit(eventTypes.INSPECTION_APPROVED, {
          recepcionId: id,
          ordenCompraId: recepcionActual.ordenCompraId,
          resultado: EstadoRecepcion.APROBADO
        });
      }

      logger.info(`Recepción ${recepcionActualizada.numero} actualizada`);
      return recepcionActualizada as RecepcionWithRelations;
    } catch (error) {
      logger.error(`Error al actualizar recepción ${id}:`, error);
      throw error;
    }
  }

  /**
   * 🔍 Actualizar inspección de item
   */
  static async updateInspeccionItem(
    recepcionId: string,
    itemId: string,
    estadoInspeccion: EstadoInspeccion,
    observaciones?: string,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // ✅ Validar que el item existe
        const item = await tx.recepcionItem.findUnique({
          where: { id: itemId },
          include: { recepcion: true }
        });

        if (!item || item.recepcionId !== recepcionId) {
          throw new Error('Item de recepción no encontrado');
        }

        if (item.recepcion.estado === EstadoRecepcion.APROBADO) {
          throw new Error('No se puede modificar un item de recepción aprobada');
        }

        // 🔄 Actualizar item
        await tx.recepcionItem.update({
          where: { id: itemId },
          data: {
            estadoInspeccion,
            observaciones
          }
        });

        // 🔍 Verificar si todos los items están inspeccionados
        const todosLosItems = await tx.recepcionItem.findMany({
          where: { recepcionId }
        });

        const todosInspeccionados = todosLosItems.every(
          item => item.estadoInspeccion !== EstadoInspeccion.PENDIENTE
        );

        if (todosInspeccionados) {
          const hayRechazados = todosLosItems.some(
            item => item.estadoInspeccion === EstadoInspeccion.RECHAZADO
          );

          const nuevoEstado = hayRechazados ? EstadoRecepcion.PARCIAL : EstadoRecepcion.APROBADO;
          
          await tx.recepcion.update({
            where: { id: recepcionId },
            data: { 
              estado: nuevoEstado,
              ...(userId && { responsableInspeccionId: userId, fechaInspeccion: new Date() })
            }
          });
        }
      });

      logger.info(`Inspección de item ${itemId} actualizada a ${estadoInspeccion}`);
    } catch (error) {
      logger.error(`Error al actualizar inspección del item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * 📊 Obtener métricas
   */
  static async getMetricas(filters: Partial<RecepcionFilters> = {}): Promise<RecepcionMetrics> {
    try {
      const where: Prisma.RecepcionWhereInput = {};
      
      if (filters.fechaDesde || filters.fechaHasta) {
        where.fechaRecepcion = {};
        if (filters.fechaDesde) where.fechaRecepcion.gte = new Date(filters.fechaDesde);
        if (filters.fechaHasta) where.fechaRecepcion.lte = new Date(filters.fechaHasta);
      }

      const [totalRecepciones, recepcionesPendientes, itemsStats, tiemposInspeccion] = await Promise.all([
        prisma.recepcion.count({ where }),
        prisma.recepcion.count({
          where: {
            ...where,
            estado: { in: [EstadoRecepcion.PENDIENTE, EstadoRecepcion.EN_INSPECCION] }
          }
        }),
        prisma.recepcionItem.aggregate({
          where: {
            recepcion: where
          },
          _sum: {
            cantidadRecibida: true,
            cantidadAceptada: true,
            cantidadRechazada: true
          }
        }),
        prisma.recepcion.findMany({
          where: {
            ...where,
            fechaInspeccion: { not: null }
          },
          select: {
            fechaRecepcion: true,
            fechaInspeccion: true
          }
        })
      ]);

      // 📈 Calcular métricas
      const itemsRecibidos = Number(itemsStats._sum.cantidadRecibida || 0);
      const itemsAceptados = Number(itemsStats._sum.cantidadAceptada || 0);
      const itemsRechazados = Number(itemsStats._sum.cantidadRechazada || 0);
      
      const porcentajeAprobacion = itemsRecibidos > 0 
        ? (itemsAceptados / itemsRecibidos) * 100 
        : 0;

      const tiempoPromedioInspeccion = tiemposInspeccion.length > 0
        ? tiemposInspeccion.reduce((sum, recepcion) => {
            const horas = (recepcion.fechaInspeccion!.getTime() - recepcion.fechaRecepcion.getTime()) / (1000 * 60 * 60);
            return sum + horas;
          }, 0) / tiemposInspeccion.length
        : 0;

      // 💰 Calcular valor total recibido (requiere consulta adicional)
      const recepcionesConValor = await prisma.recepcion.findMany({
        where,
        include: {
          items: {
            include: {
              ordenCompraItem: true
            }
          }
        }
      });

      const valorTotalRecibido = recepcionesConValor.reduce((total, recepcion) => {
        return total + recepcion.items.reduce((subtotal, item) => {
          return subtotal + (item.cantidadAceptada * item.ordenCompraItem.precioUnitario.toNumber());
        }, 0);
      }, 0);

      return {
        totalRecepciones,
        recepcionesPendientes,
        porcentajeAprobacion,
        tiempoPromedioInspeccion,
        itemsRecibidos,
        itemsRechazados,
        valorTotalRecibido
      };
    } catch (error) {
      logger.error('Error al obtener métricas de recepción:', error);
      throw new Error('Error al obtener métricas');
    }
  }

  /**
   * 🔢 Generar número de recepción secuencial
   */
  private static async generateNumeroRecepcion(tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx || prisma;
    
    const ultimaRecepcion = await client.recepcion.findFirst({
      orderBy: { numero: 'desc' },
      select: { numero: true }
    });

    const numeroSecuencia = ultimaRecepcion 
      ? parseInt(ultimaRecepcion.numero.split('-')[1]) + 1 
      : 1;

    return `REC-${numeroSecuencia.toString().padStart(6, '0')}`;
  }

  /**
   * 🔄 Determinar nuevo estado de orden de compra
   */
  private static async determinarEstadoOrden(
    ordenCompraId: string, 
    tx?: Prisma.TransactionClient
  ): Promise<EstadoOrdenCompra> {
    const client = tx || prisma;
    
    const orden = await client.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        items: true,
        recepciones: {
          include: { items: true }
        }
      }
    });

    if (!orden) return EstadoOrdenCompra.EN_TRANSITO;

    // 📊 Calcular cantidades totales
    const cantidadesTotales = orden.items.reduce((acc, item) => {
      acc[item.id] = item.cantidad;
      return acc;
    }, {} as Record<string, number>);

    const cantidadesRecibidas = orden.recepciones
      .flatMap(r => r.items)
      .reduce((acc, item) => {
        acc[item.ordenCompraItemId] = (acc[item.ordenCompraItemId] || 0) + item.cantidadAceptada;
        return acc;
      }, {} as Record<string, number>);

    // ✅ Verificar completitud
    const itemsCompletos = Object.keys(cantidadesTotales).filter(
      itemId => cantidadesRecibidas[itemId] >= cantidadesTotales[itemId]
    );

    const itemsParciales = Object.keys(cantidadesTotales).filter(
      itemId => (cantidadesRecibidas[itemId] || 0) > 0 && cantidadesRecibidas[itemId] < cantidadesTotales[itemId]
    );

    if (itemsCompletos.length === Object.keys(cantidadesTotales).length) {
      return EstadoOrdenCompra.RECIBIDO_TOTAL;
    } else if (itemsParciales.length > 0 || itemsCompletos.length > 0) {
      return EstadoOrdenCompra.RECIBIDO_PARCIAL;
    }

    return orden.estado;
  }

  /**
   * 💰 Calcular valor recibido
   */
  private static calcularValorRecibido(
    itemsRecepcion: CreateRecepcionInput['items'],
    itemsOrden: any[]
  ): number {
    return itemsRecepcion.reduce((total, item) => {
      const ordenItem = itemsOrden.find(oi => oi.id === item.ordenCompraItemId);
      if (ordenItem) {
        return total + (item.cantidadAceptada * Number(ordenItem.precioUnitario));
      }
      return total;
    }, 0);
  }

  /**
   * 🔍 Buscar recepciones por texto
   */
  static async searchRecepciones(query: string, limit = 10): Promise<RecepcionWithRelations[]> {
    try {
      const recepciones = await prisma.recepcion.findMany({
        where: {
          OR: [
            { numero: { contains: query, mode: 'insensitive' } },
            { ordenCompra: { numero: { contains: query, mode: 'insensitive' } } },
            { ordenCompra: { proveedor: { nombre: { contains: query, mode: 'insensitive' } } } }
          ]
        },
        include: {
          ordenCompra: {
            include: {
              pedidoEquipo: {
                include: {
                  proyecto: true
                }
              },
              proveedor: true
            }
          },
          items: {
            include: {
              ordenCompraItem: {
                include: {
                  pedidoEquipoItem: {
                    select: {
                      id: true,
                      codigo: true,
                      descripcion: true
                    }
                  }
                }
              }
            }
          },
          usuario: true
        },
        take: limit,
        orderBy: { fechaRecepcion: 'desc' }
      });

      return recepciones as RecepcionWithRelations[];
    } catch (error) {
      logger.error('Error en búsqueda de recepciones:', error);
      throw new Error('Error en la búsqueda');
    }
  }
}