/**
 * 📊 API de Reportes de Pedidos - Sistema de Trazabilidad GYS
 * 
 * Endpoints para obtener métricas generales, datos para gráficos y reportes
 * con filtros avanzados para el dashboard de trazabilidad.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';


// ✅ Schema de validación para filtros
const FiltrosReportesSchema = z.object({
  proyectoId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  estadoEntrega: z.enum(['pendiente', 'en_proceso', 'entregado', 'retrasado', 'cancelado']).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  incluirDetalles: z.boolean().default(false),
  tipoReporte: z.enum(['metricas', 'graficos', 'detallado']).default('metricas')
});

/**
 * 📡 GET - Obtener reportes de pedidos con métricas y filtros
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 📋 Extraer y validar parámetros de consulta
    const { searchParams } = new URL(request.url);
    const filtros = {
      proyectoId: searchParams.get('proyectoId') || undefined,
      proveedorId: searchParams.get('proveedorId') || undefined,
      estadoEntrega: searchParams.get('estadoEntrega') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      incluirDetalles: searchParams.get('incluirDetalles') === 'true',
      tipoReporte: searchParams.get('tipoReporte') || 'metricas'
    };

    const validatedFiltros = FiltrosReportesSchema.parse(filtros);

    // 🔍 Construir condiciones WHERE dinámicas
    const whereConditions: any = {};
    
    if (validatedFiltros.proyectoId) {
      whereConditions.pedido = {
        proyectoId: validatedFiltros.proyectoId
      };
    }
    
    if (validatedFiltros.proveedorId) {
      whereConditions.pedido = {
        ...whereConditions.pedido,
        proyecto: {
          id: validatedFiltros.proyectoId
        }
      };
    }
    
    if (validatedFiltros.estadoEntrega) {
      whereConditions.estadoEntrega = validatedFiltros.estadoEntrega;
    }
    
    if (validatedFiltros.fechaDesde || validatedFiltros.fechaHasta) {
      whereConditions.createdAt = {};
      if (validatedFiltros.fechaDesde) {
        whereConditions.createdAt.gte = new Date(validatedFiltros.fechaDesde);
      }
      if (validatedFiltros.fechaHasta) {
        whereConditions.createdAt.lte = new Date(validatedFiltros.fechaHasta);
      }
    }

    // 📊 Generar reporte según tipo solicitado
    let resultado;
    
    switch (validatedFiltros.tipoReporte) {
      case 'metricas':
        resultado = await generarMetricasGenerales(whereConditions);
        break;
      case 'graficos':
        resultado = await generarDatosGraficos(whereConditions);
        break;
      case 'detallado':
        resultado = await generarReporteDetallado(whereConditions, validatedFiltros.incluirDetalles);
        break;
      default:
        resultado = await generarMetricasGenerales(whereConditions);
    }

    // 📝 Log de actividad
    logger.info('Reporte de pedidos generado', {
      usuario: session.user.email,
      tipoReporte: validatedFiltros.tipoReporte,
      filtros: validatedFiltros,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: resultado,
      filtros: validatedFiltros,
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error al generar reporte de pedidos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros de filtro inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * 📈 Generar métricas generales de pedidos (versión simplificada)
 */
async function generarMetricasGenerales(whereConditions: any) {
  // 🔢 Obtener conteos por estado básico
  const estadisticasPorEstado = await prisma.pedidoEquipoItem.groupBy({
    by: ['estado'],
    where: whereConditions,
    _count: {
      id: true
    },
    _sum: {
      cantidadPedida: true,
      cantidadAtendida: true
    }
  });

  // 📊 Calcular métricas totales
  const totalItems = estadisticasPorEstado.reduce((acc, item) => acc + item._count.id, 0);
  const totalCantidad = estadisticasPorEstado.reduce((acc, item) => acc + (item._sum.cantidadPedida || 0), 0);
  const totalAtendida = estadisticasPorEstado.reduce((acc, item) => acc + (item._sum.cantidadAtendida || 0), 0);

  // 🎯 Calcular KPIs
  const porcentajeProgreso = totalCantidad > 0 ? (totalAtendida / totalCantidad) * 100 : 0;
  const itemsEntregados = estadisticasPorEstado.find(e => e.estado === 'entregado')?._count.id || 0;
  const itemsPendientes = estadisticasPorEstado.find(e => e.estado === 'pendiente')?._count.id || 0;
  const itemsAtendidos = estadisticasPorEstado.find(e => e.estado === 'atendido')?._count.id || 0;

  // ⏱️ Tiempo promedio simplificado (basado en tiempoEntregaDias)
  const itemsConTiempo = await prisma.pedidoEquipoItem.findMany({
    where: {
      ...whereConditions,
      tiempoEntregaDias: { not: null }
    },
    select: {
      tiempoEntregaDias: true
    }
  });

  const tiempoPromedioEntrega = itemsConTiempo.length > 0 
    ? itemsConTiempo.reduce((acc, item) => acc + (item.tiempoEntregaDias || 0), 0) / itemsConTiempo.length
    : 0;

  return {
    resumenGeneral: {
      totalItems,
      totalCantidad,
      totalAtendida,
      porcentajeProgreso: Math.round(porcentajeProgreso * 100) / 100,
      tiempoPromedioEntrega: Math.round(tiempoPromedioEntrega * 100) / 100
    },
    distribucionPorEstado: estadisticasPorEstado.map(item => ({
      estado: item.estado,
      cantidad: item._count.id,
      totalCantidad: item._sum.cantidadPedida || 0,
      cantidadAtendida: item._sum.cantidadAtendida || 0,
      porcentaje: totalItems > 0 ? Math.round((item._count.id / totalItems) * 10000) / 100 : 0
    })),
    kpis: {
      itemsEntregados,
      itemsPendientes,
      itemsAtendidos,
      eficienciaEntrega: totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 10000) / 100 : 0
    }
  };
}

/**
 * 📊 Generar datos para gráficos (versión simplificada)
 */
async function generarDatosGraficos(whereConditions: any) {
  // 📅 Datos de progreso por fecha (últimos 30 días)
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - 30);

  const progresoTemporal = await prisma.pedidoEquipoItem.groupBy({
    by: ['estado'],
    where: {
      ...whereConditions,
      updatedAt: { gte: fechaInicio }
    },
    _count: { id: true },
    orderBy: { estado: 'asc' }
  });

  // 🏢 Distribución por pedido
  const distribucionPedidos = await prisma.pedidoEquipoItem.groupBy({
    by: ['pedidoId'],
    where: whereConditions,
    _count: { id: true },
    _sum: { cantidadPedida: true, cantidadAtendida: true }
  });

  // 🏭 Distribución por proyecto (a través de pedidos)
  const distribucionProyectos = await prisma.pedidoEquipo.groupBy({
    by: ['proyectoId'],
    where: {},
    _count: { id: true }
  });

  return {
    progresoTemporal: progresoTemporal.map(item => ({
      estado: item.estado,
      cantidad: item._count.id,
      fecha: new Date().toISOString().split('T')[0] // Simplificado para el ejemplo
    })),
    distribucionPedidos: distribucionPedidos.slice(0, 10), // Top 10 pedidos
    distribucionProyectos: distribucionProyectos.slice(0, 10), // Top 10 proyectos
    tendencias: {
      ultimoMes: progresoTemporal.reduce((acc, item) => acc + item._count.id, 0),
      crecimiento: 0 // Se calculará con datos históricos
    }
  };
}

/**
 * 📋 Generar reporte detallado
 */
async function generarReporteDetallado(whereConditions: any, incluirDetalles: boolean) {
  const items = await prisma.pedidoEquipoItem.findMany({
    where: whereConditions,
    include: {
      pedido: {
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true
            }
          }
        }
      },
      listaEquipoItem: {
        include: {
          proveedor: {
            select: {
              id: true,
              nombre: true,
              ruc: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: incluirDetalles ? undefined : 100 // Limitar si no se requieren detalles completos
  });

  return {
    items: items.map(item => ({
      id: item.id,
      equipo: {
        nombre: item.listaEquipoItem?.descripcion || 'Equipo',
        codigo: item.listaEquipoItem?.codigo || `ITEM-${item.id}`,
        categoria: 'General' // ListaEquipoItem no tiene categoria directa
      },
      pedido: {
          id: item.pedidoId,
          proyecto: item.pedido.proyecto?.nombre,
          proveedor: item.listaEquipoItem?.proveedor?.nombre
        },
      cantidad: item.cantidadPedida,
      cantidadAtendida: item.cantidadAtendida || 0,
      estadoEntrega: item.estado, // PedidoEquipoItem usa 'estado', no 'estadoEntrega'
      fechaEntregaEstimada: undefined, // PedidoEquipoItem no tiene esta propiedad
      fechaEntregaReal: undefined, // PedidoEquipoItem no tiene esta propiedad
      observaciones: incluirDetalles ? item.comentarioLogistica : undefined,
      progreso: item.cantidadPedida > 0 ? Math.round(((item.cantidadAtendida || 0) / item.cantidadPedida) * 10000) / 100 : 0
    })),
    resumen: {
      totalItems: items.length,
      progresoPromedio: items.length > 0 
        ? Math.round(
            items.reduce((acc, item) => {
              const progreso = item.cantidadPedida > 0 ? ((item.cantidadAtendida || 0) / item.cantidadPedida) * 100 : 0;
              return acc + progreso;
            }, 0) / items.length * 100
          ) / 100
        : 0
    }
  };
}

/**
 * 📤 POST - Generar reporte personalizado
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedFiltros = FiltrosReportesSchema.parse(body);

    // 🔍 Construir condiciones WHERE
    const whereConditions: any = {};
    
    if (validatedFiltros.proyectoId) {
      whereConditions.pedido = { proyectoId: validatedFiltros.proyectoId };
    }
    
    if (validatedFiltros.proveedorId) {
      whereConditions.pedido = {
        ...whereConditions.pedido,
        proyecto: {
          id: validatedFiltros.proyectoId
        }
      };
    }

    // 📊 Generar reporte completo
    const [metricas, graficos, detallado] = await Promise.all([
      generarMetricasGenerales(whereConditions),
      generarDatosGraficos(whereConditions),
      generarReporteDetallado(whereConditions, validatedFiltros.incluirDetalles)
    ]);

    logger.info('Reporte personalizado generado', {
      usuario: session.user.email,
      filtros: validatedFiltros
    });

    return NextResponse.json({
      success: true,
      data: {
        metricas,
        graficos,
        detallado
      },
      filtros: validatedFiltros,
      generadoEn: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error al generar reporte personalizado', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos de entrada inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
