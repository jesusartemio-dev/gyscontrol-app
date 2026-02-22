// ===================================================
// 📁 Archivo: entrega/route.ts
// 📌 API para gestionar entregas de items de pedidos de equipo
// 🧠 Uso: Registrar, actualizar y consultar entregas específicas
// ✍️ Autor: GYS Team + IA
// 🗕️ Última actualización: 2025-01-17
// ===================================================

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EntregaItemSchema } from '@/lib/validators/trazabilidad';
import type { EntregaItemPayload } from '@/lib/validators/trazabilidad';
import { propagarPrecioRealCatalogo } from '@/lib/services/catalogoPrecioSync';
import { logger } from '@/lib/logger';

// ✅ Registrar nueva entrega
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const { id } = await context.params;
    const body: EntregaItemPayload = await request.json();

    const validationResult = EntregaItemSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Datos de entrega inválidos:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrega inválidos', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const itemExistente = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedidoEquipo: {
          select: {
            id: true,
            codigo: true,
            proyectoId: true,
            proyecto: { select: { nombre: true } }
          }
        }
      }
    });

    if (!itemExistente) {
      return NextResponse.json({ error: 'Item de pedido no encontrado' }, { status: 404 });
    }

    // Auto-sync estado from estadoEntrega
    const estadoEntrega = validationResult.data.estadoEntrega
    let estadoDerivado: 'pendiente' | 'atendido' | 'parcial' | 'entregado' | 'cancelado' | undefined = undefined
    if (estadoEntrega === 'entregado') estadoDerivado = 'entregado'
    else if (estadoEntrega === 'parcial') estadoDerivado = 'parcial'
    else if (estadoEntrega === 'cancelado') estadoDerivado = 'cancelado'
    else if (estadoEntrega === 'en_proceso') estadoDerivado = 'atendido'

    const data = validationResult.data
    const pedido = itemExistente.pedidoEquipo

    // Override for servicio items: always full delivery
    const esServicio = (itemExistente as any).tipoItem === 'servicio'
    if (esServicio) {
      data.cantidadAtendida = itemExistente.cantidadPedida
      data.estadoEntrega = 'entregado' as any
      estadoDerivado = 'entregado'
    }

    const itemActualizado = await prisma.$transaction(async (tx) => {
      // 1. Update PedidoEquipoItem
      const updatedItem = await tx.pedidoEquipoItem.update({
        where: { id },
        data: {
          cantidadAtendida: data.cantidadAtendida,
          estadoEntrega: data.estadoEntrega,
          fechaEntregaReal: data.fechaEntregaReal,
          observacionesEntrega: data.observacionesEntrega,
          comentarioLogistica: data.comentarioLogistica,
          ...(estadoDerivado ? { estado: estadoDerivado } : {}),
          // Direct attention fields
          ...(data.motivoAtencionDirecta ? { motivoAtencionDirecta: data.motivoAtencionDirecta } : {}),
          ...(data.costoRealUnitario ? {
            costoRealUnitario: data.costoRealUnitario,
            costoRealMoneda: data.costoRealMoneda || 'USD',
          } : {}),
          updatedAt: new Date()
        },
        include: {
          pedidoEquipo: {
            select: { codigo: true, proyecto: { select: { nombre: true } } }
          }
        }
      });

      // 2. Update ListaEquipoItem aggregates
      if (itemExistente.listaEquipoItemId) {
        const sumResult = await tx.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: itemExistente.listaEquipoItemId },
          _sum: { cantidadAtendida: true }
        })
        const allLinkedItems = await tx.pedidoEquipoItem.findMany({
          where: { listaEquipoItemId: itemExistente.listaEquipoItemId },
          select: { precioUnitario: true, cantidadAtendida: true }
        })
        const costoReal = allLinkedItems.reduce((sum, item) =>
          sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)
        await tx.listaEquipoItem.update({
          where: { id: itemExistente.listaEquipoItemId },
          data: { costoReal, cantidadEntregada: sumResult._sum.cantidadAtendida || 0 }
        })
      }

      // 3. Recalculate PedidoEquipo.costoRealTotal
      const allPedidoItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: pedido.id },
        select: { precioUnitario: true, cantidadAtendida: true }
      })
      const costoRealTotal = allPedidoItems.reduce((sum, item) =>
        sum + ((item.precioUnitario || 0) * (item.cantidadAtendida || 0)), 0)
      await tx.pedidoEquipo.update({
        where: { id: pedido.id },
        data: { costoRealTotal, updatedAt: new Date() }
      })

      // 4. Create EntregaItem
      const entregaItemId = `ent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await tx.entregaItem.create({
        data: {
          id: entregaItemId,
          pedidoEquipoItemId: id,
          listaEquipoItemId: itemExistente.listaEquipoItemId || null,
          proyectoId: pedido.proyectoId,
          fechaEntrega: data.fechaEntregaReal || new Date(),
          estado: data.estadoEntrega as any,
          cantidad: itemExistente.cantidadPedida || 0,
          cantidadEntregada: data.cantidadAtendida || 0,
          observaciones: data.observacionesEntrega || null,
          usuarioId: userId,
          updatedAt: new Date()
        }
      })

      // 5. Create EventoTrazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entregaItemId: entregaItemId,
          proyectoId: pedido.proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: esServicio ? 'CONFIRMACION_SERVICIO' : (data.motivoAtencionDirecta ? 'ENTREGA_DIRECTA' : 'ENTREGA'),
          descripcion: esServicio
            ? `Servicio confirmado: ${itemExistente.descripcion}. Ejecutado el ${data.fechaEntregaReal ? data.fechaEntregaReal.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}.`
            : `Entrega registrada: ${data.cantidadAtendida} unidades - ${data.estadoEntrega}${data.motivoAtencionDirecta ? ` (${data.motivoAtencionDirecta})` : ''}`,
          estadoAnterior: itemExistente.estadoEntrega as any || null,
          estadoNuevo: data.estadoEntrega as any,
          usuarioId: userId,
          metadata: {
            cantidadAtendida: data.cantidadAtendida,
            fechaEntregaReal: data.fechaEntregaReal?.toISOString(),
            observaciones: data.observacionesEntrega,
            comentarioLogistica: data.comentarioLogistica,
            pedidoCodigo: pedido.codigo,
            proyectoNombre: pedido.proyecto.nombre,
            motivoAtencionDirecta: data.motivoAtencionDirecta || null,
            costoRealUnitario: data.costoRealUnitario || null,
            costoRealMoneda: data.costoRealMoneda || null,
          },
          updatedAt: new Date()
        }
      })

      // 6. Auto-create CxP for importacion_gerencia
      if (data.motivoAtencionDirecta === 'importacion_gerencia' && data.costoRealUnitario) {
        const montoTotal = data.costoRealUnitario * (data.cantidadAtendida || 0)

        let provId = itemExistente.proveedorId
        if (!provId) {
          const fallback = await tx.proveedor.findFirst({
            where: { nombre: { contains: 'Importacion' } },
            select: { id: true },
          })
          provId = fallback?.id || null
        }

        if (provId) {
          await tx.cuentaPorPagar.create({
            data: {
              proveedorId: provId,
              proyectoId: pedido.proyectoId,
              pedidoEquipoId: pedido.id,
              pedidoEquipoItemId: id,
              tipoOrigen: 'importacion_gerencia',
              descripcion: `Importación directa: ${data.cantidadAtendida} x ${itemExistente.codigo} - ${itemExistente.descripcion}`,
              monto: montoTotal,
              moneda: data.costoRealMoneda || 'USD',
              saldoPendiente: montoTotal,
              fechaRecepcion: new Date(),
              fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              condicionPago: 'contado',
              estado: 'pendiente_documentos',
              observaciones: `Auto-generada desde atención directa. Pedido: ${pedido.codigo}`,
              updatedAt: new Date(),
            }
          })

          // EventoTrazabilidad for CxP creation
          await tx.eventoTrazabilidad.create({
            data: {
              id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-cxp`,
              proyectoId: pedido.proyectoId,
              pedidoEquipoId: pedido.id,
              tipo: 'atencion_directa_gerencia',
              descripcion: `Importación directa registrada. Costo real: ${data.costoRealMoneda || 'USD'} ${montoTotal.toFixed(2)}. CxP creada pendiente de documentos.`,
              usuarioId: userId,
              metadata: {
                costoRealUnitario: data.costoRealUnitario,
                costoRealMoneda: data.costoRealMoneda,
                montoTotal,
                itemCodigo: itemExistente.codigo,
                pedidoCodigo: pedido.codigo,
              },
              updatedAt: new Date(),
            }
          })
        }
      }

      // 7. Auto-derive parent pedido state
      const allItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: pedido.id },
        select: { estado: true }
      })
      const estados = allItems.map(i => i.estado)
      let nuevoEstadoPedido: 'borrador' | 'enviado' | 'atendido' | 'parcial' | 'entregado' | 'cancelado' | null = null
      if (estados.every(e => e === 'cancelado')) {
        nuevoEstadoPedido = 'cancelado'
      } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
        nuevoEstadoPedido = 'entregado'
      } else if (estados.some(e => e !== 'pendiente' && e !== 'cancelado')) {
        nuevoEstadoPedido = 'parcial'
      }
      if (nuevoEstadoPedido) {
        await tx.pedidoEquipo.update({
          where: { id: pedido.id },
          data: { estado: nuevoEstadoPedido, updatedAt: new Date() }
        })
      }

      return updatedItem
    });

    // 8. Propagate precioReal to catalog (outside transaction, non-critical)
    if (data.costoRealUnitario && itemExistente.catalogoEquipoId) {
      propagarPrecioRealCatalogo({
        catalogoEquipoId: itemExistente.catalogoEquipoId,
        precioReal: data.costoRealUnitario,
        userId,
        metadata: { source: 'atencion_directa', pedidoCodigo: pedido.codigo },
      }).catch(err => logger.error('Error propagating precioReal:', err))
    }

    logger.info('Entrega registrada exitosamente:', { itemId: id, estadoEntrega: data.estadoEntrega, cantidadAtendida: data.cantidadAtendida });

    return NextResponse.json(itemActualizado);
  } catch (error) {
    logger.error('Error al registrar entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al registrar entrega' },
      { status: 500 }
    );
  }
}

// ✅ Actualizar entrega existente
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body: Partial<EntregaItemPayload> = await request.json();

    // 🔍 Verificar que el item existe
    const itemExistente = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        estadoEntrega: true,
        cantidadAtendida: true
      }
    });

    if (!itemExistente) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // 🔄 Preparar datos para actualización
    const datosActualizacion: any = {
      updatedAt: new Date()
    };

    if (body.cantidadAtendida !== undefined) {
      datosActualizacion.cantidadAtendida = body.cantidadAtendida;
    }
    if (body.estadoEntrega !== undefined) {
      datosActualizacion.estadoEntrega = body.estadoEntrega;
    }
    if (body.fechaEntregaReal !== undefined) {
      datosActualizacion.fechaEntregaReal = body.fechaEntregaReal;
    }
    if (body.observacionesEntrega !== undefined) {
      datosActualizacion.observacionesEntrega = body.observacionesEntrega;
    }
    if (body.comentarioLogistica !== undefined) {
      datosActualizacion.comentarioLogistica = body.comentarioLogistica;
    }

    // Auto-sync estado from estadoEntrega
    if (body.estadoEntrega) {
      if (body.estadoEntrega === 'entregado') datosActualizacion.estado = 'entregado'
      else if (body.estadoEntrega === 'parcial') datosActualizacion.estado = 'parcial'
      else if (body.estadoEntrega === 'cancelado') datosActualizacion.estado = 'cancelado'
      else if (body.estadoEntrega === 'en_proceso') datosActualizacion.estado = 'atendido'
    }

    // 🔄 Actualizar el item
    const itemActualizado = await prisma.pedidoEquipoItem.update({
      where: { id },
      data: datosActualizacion,
      include: {
        pedidoEquipo: {
          select: {
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    // 📝 Log de trazabilidad si cambió el estado (modelo no disponible)
    if (body.estadoEntrega && body.estadoEntrega !== itemExistente.estadoEntrega) {
      logger.info('Estado de entrega actualizado', {
        pedidoEquipoItemId: id,
        estado: body.estadoEntrega,
        descripcion: `Estado actualizado de ${itemExistente.estadoEntrega} a ${body.estadoEntrega}`,
        metadata: {
          estadoAnterior: itemExistente.estadoEntrega,
          estadoNuevo: body.estadoEntrega,
          cantidadAtendida: body.cantidadAtendida || itemExistente.cantidadAtendida,
          observaciones: body.observacionesEntrega
        }
      });
    }

    logger.info('✅ Entrega actualizada exitosamente:', {
      itemId: id,
      cambios: Object.keys(datosActualizacion)
    });

    return NextResponse.json(itemActualizado);
  } catch (error) {
    logger.error('❌ Error al actualizar entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar entrega' },
      { status: 500 }
    );
  }
}

// ✅ Obtener estado actual de entrega
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const item = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      select: {
        id: true,
        cantidadPedida: true,
        cantidadAtendida: true,
        estadoEntrega: true,
        fechaEntregaReal: true,
        fechaEntregaEstimada: true,
        observacionesEntrega: true,
        comentarioLogistica: true,
        codigo: true,
        descripcion: true,
        unidad: true,
        pedidoEquipo: {
          select: {
            codigo: true,
            proyecto: {
              select: { nombre: true }
            }
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item de pedido no encontrado' },
        { status: 404 }
      );
    }

    // 📊 Calcular progreso de entrega
    const progreso = item.cantidadPedida > 0 
      ? Math.round(((item.cantidadAtendida || 0) / item.cantidadPedida) * 100)
      : 0;

    const resultado = {
      ...item,
      progresoEntrega: progreso,
      cantidadPendiente: item.cantidadPedida - (item.cantidadAtendida || 0)
    };

    return NextResponse.json(resultado);
  } catch (error) {
    logger.error('❌ Error al obtener estado de entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener estado de entrega' },
      { status: 500 }
    );
  }
}