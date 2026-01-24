/**
 * 📊 API de Gráficos de Trazabilidad - Sistema GYS
 * 
 * Endpoint para obtener datos de gráficos de progreso y análisis visual
 * de la trazabilidad de entregas por entidad y período.
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

// 📋 Esquemas de validación
const FiltrosGraficoSchema = z.object({
  entidadId: z.string().min(1, 'ID de entidad requerido'),
  periodo: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  tipoGrafico: z.enum(['progreso', 'estados', 'tendencia', 'comparativo']).default('progreso'),
  incluirProyecciones: z.string().transform(val => val === 'true').optional()
});

/**
 * 📡 GET - Obtener datos para gráficos de trazabilidad
 */
export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 📊 Validar parámetros de consulta
    const { searchParams } = new URL(request.url);
    const filtrosRaw = Object.fromEntries(searchParams.entries());
    
    const validacion = FiltrosGraficoSchema.safeParse(filtrosRaw);
    if (!validacion.success) {
      logger.warn('Parámetros de gráfico inválidos', {
        errores: validacion.error.errors,
        parametros: filtrosRaw
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros inválidos',
          detalles: validacion.error.errors
        },
        { status: 400 }
      );
    }

    const filtros = validacion.data;

    logger.info('Obteniendo datos de gráfico de trazabilidad', {
      entidadId: filtros.entidadId,
      periodo: filtros.periodo,
      tipoGrafico: filtros.tipoGrafico,
      usuario: session.user.email
    });

    // 🔍 Procesar según tipo de gráfico
    let datosGrafico;
    switch (filtros.tipoGrafico) {
      case 'progreso':
        datosGrafico = await obtenerDatosProgreso(filtros);
        break;
      case 'estados':
        datosGrafico = await obtenerDistribucionEstados(filtros);
        break;
      case 'tendencia':
        datosGrafico = await obtenerTendenciaTemporal(filtros);
        break;
      case 'comparativo':
        datosGrafico = await obtenerComparativoEntidades(filtros);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de gráfico no válido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: datosGrafico,
      metadata: {
        entidadId: filtros.entidadId,
        periodo: filtros.periodo,
        tipoGrafico: filtros.tipoGrafico,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error al obtener datos de gráfico', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        mensaje: 'No se pudieron obtener los datos del gráfico'
      },
      { status: 500 }
    );
  }
}

// 🔧 Funciones auxiliares

/**
 * 📈 Obtener datos de progreso de entregas
 */
async function obtenerDatosProgreso(filtros: any) {
  try {
    // 📅 Calcular rango de fechas según período
    const fechaHasta = new Date();
    const fechaDesde = new Date();
    
    switch (filtros.periodo) {
      case '7d':
        fechaDesde.setDate(fechaHasta.getDate() - 7);
        break;
      case '30d':
        fechaDesde.setDate(fechaHasta.getDate() - 30);
        break;
      case '90d':
        fechaDesde.setDate(fechaHasta.getDate() - 90);
        break;
      case '1y':
        fechaDesde.setFullYear(fechaHasta.getFullYear() - 1);
        break;
    }

    // 🔍 TODO: Crear modelo EntregaItem en Prisma schema
    // const itemsEntrega = await prisma.entregaItem.findMany({
    //   where: {
    //     pedidoItem: {
    //       pedido: {
    //         proyectoId: filtros.entidadId
    //       }
    //     },
    //     fechaCreacion: {
    //       gte: fechaDesde,
    //       lte: fechaHasta
    //     }
    //   },
    //   include: {
    //     pedidoItem: {
    //       include: {
    //         equipo: true,
    //         pedido: {
    //           include: {
    //             proyecto: true
    //           }
    //         }
    //       }
    //     }
    //   },
    //   orderBy: {
    //     fechaCreacion: 'asc'
    //   }
    // });

    // 📊 TODO: Datos temporales hasta implementar modelo EntregaItem
    const itemsEntrega: any[] = [];
    const datosAgrupados = new Map<string, any>();
    
    // itemsEntrega.forEach(item => {
    //   const fecha = item.fechaCreacion.toISOString().split('T')[0];
    //   
    //   if (!datosAgrupados.has(fecha)) {
    //     datosAgrupados.set(fecha, {
    //       fecha,
    //       totalItems: 0,
    //       itemsEntregados: 0,
    //       itemsEnProceso: 0,
    //       itemsPendientes: 0,
    //       itemsRetrasados: 0,
    //       porcentajeProgreso: 0
    //     });
    //   }
    //   
    //   const datos = datosAgrupados.get(fecha)!;
    //   datos.totalItems++;
    //   
    //   switch (item.estadoEntrega) {
    //     case 'entregado':
    //       datos.itemsEntregados++;
    //       break;
    //     case 'en_proceso':
    //       datos.itemsEnProceso++;
    //       break;
    //     case 'pendiente':
    //       datos.itemsPendientes++;
    //       break;
    //     case 'retrasado':
    //       datos.itemsRetrasados++;
    //       break;
    //   }
    //   
    //   // ✅ Calcular porcentaje de progreso
    //   datos.porcentajeProgreso = datos.totalItems > 0 ? 
    //     Math.round((datos.itemsEntregados / datos.totalItems) * 100) : 0;
    // });

    // 🔄 TODO: Datos temporales vacíos
    const serieProgreso: any[] = [];

    // 📈 TODO: Métricas temporales
    const totalItems = 0;
    const itemsEntregados = 0;
    const eficienciaGeneral = 0;

    return {
      serieProgreso,
      resumen: {
        totalItems,
        itemsEntregados,
        eficienciaGeneral,
        periodo: filtros.periodo,
        fechaDesde: fechaDesde.toISOString(),
        fechaHasta: fechaHasta.toISOString()
      }
    };

  } catch (error) {
    logger.error('Error al obtener datos de progreso', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * 🥧 Obtener distribución de estados
 */
async function obtenerDistribucionEstados(filtros: any) {
  try {
    // 🔍 TODO: Crear modelo EntregaItem en Prisma schema
    // const distribucion = await prisma.entregaItem.groupBy({
    //   by: ['estadoEntrega'],
    //   where: {
    //     pedidoItem: {
    //       pedido: {
    //         proyectoId: filtros.entidadId
    //       }
    //     }
    //   },
    //   _count: {
    //     id: true
    //   }
    // });
    
    const distribucion: any[] = [];

    // 🎨 Mapear colores y etiquetas
    const coloresEstado = {
      'pendiente': '#f59e0b',
      'en_proceso': '#3b82f6',
      'entregado': '#10b981',
      'retrasado': '#ef4444',
      'cancelado': '#6b7280'
    };

    const etiquetasEstado = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'entregado': 'Entregado',
      'retrasado': 'Retrasado',
      'cancelado': 'Cancelado'
    };

    // 📊 Transformar datos para gráfico de dona/pie
    const datosDistribucion = distribucion.map(item => ({
      estado: item.estadoEntrega,
      etiqueta: etiquetasEstado[item.estadoEntrega as keyof typeof etiquetasEstado] || item.estadoEntrega,
      cantidad: item._count.id,
      color: coloresEstado[item.estadoEntrega as keyof typeof coloresEstado] || '#6b7280'
    }));

    const totalItems = datosDistribucion.reduce((sum, item) => sum + item.cantidad, 0);
    
    // ✅ Agregar porcentajes
    const datosConPorcentaje = datosDistribucion.map(item => ({
      ...item,
      porcentaje: totalItems > 0 ? Math.round((item.cantidad / totalItems) * 100) : 0
    }));

    return {
      distribucion: datosConPorcentaje,
      resumen: {
        totalItems,
        estadoMayoritario: datosConPorcentaje.length > 0 ? 
          datosConPorcentaje.reduce((max, item) => item.cantidad > max.cantidad ? item : max) : null
      }
    };

  } catch (error) {
    logger.error('Error al obtener distribución de estados', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * 📈 Obtener tendencia temporal
 */
async function obtenerTendenciaTemporal(filtros: any) {
  try {
    // 📅 TODO: Crear modelos EventoTrazabilidad y EntregaItem en Prisma schema
    // const eventos = await prisma.eventoTrazabilidad.findMany({
    //   where: {
    //     entregaItem: {
    //       pedidoItem: {
    //         pedido: {
    //           proyectoId: filtros.entidadId
    //         }
    //       }
    //     }
    //   },
    //   orderBy: {
    //     fechaEvento: 'asc'
    //   }
    // });
    
    const eventos: any[] = [];
    
    return {
      tendencia: [],
      metricas: {
        velocidadPromedio: 0,
        tiempoPromedioEntrega: 0,
        eficienciaTendencia: 0
      }
    };

    // 📊 Agrupar eventos por día
    const eventosPorDia = new Map<string, number>();
    
    eventos.forEach(evento => {
      const fecha = evento.fechaEvento.toISOString().split('T')[0];
      eventosPorDia.set(fecha, (eventosPorDia.get(fecha) || 0) + 1);
    });

    // 🔄 Convertir a serie temporal
    const serieTendencia = Array.from(eventosPorDia.entries())
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return {
      tendencia: serieTendencia,
      resumen: {
        totalEventos: eventos.length,
        promedioEventosPorDia: serieTendencia.length > 0 ? 
          Math.round(eventos.length / serieTendencia.length) : 0,
        pico: serieTendencia.length > 0 ? 
          serieTendencia.reduce((max, item) => item.cantidad > max.cantidad ? item : max) : null
      }
    };

  } catch (error) {
    logger.error('Error al obtener tendencia temporal', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

/**
 * 🔄 Obtener comparativo entre entidades
 */
async function obtenerComparativoEntidades(filtros: any) {
  try {
    // 🔍 TODO: Crear modelo EntregaItem en Prisma schema
    const proyectos = await prisma.proyecto.findMany({
      include: {
        pedidoEquipo: {
          include: {
            pedidoEquipoItem: {
              // include: {
              //   entregaItems: true
              // }
            }
          }
        }
      },
      take: 5 // Limitar a 5 proyectos para comparación
    });

    // 📊 TODO: Calcular métricas temporales hasta implementar EntregaItem
    const comparativo = proyectos.map(proyecto => {
      // const todosLosItems: any[] = [];
      // 
      // proyecto.pedidos.forEach(pedido => {
      //   pedido.items.forEach(item => {
      //     todosLosItems.push(...item.entregaItems);
      //   });
      // });

      const totalItems = 0;
      const itemsEntregados = 0;
      const eficiencia = 0;

      return {
        proyectoId: proyecto.id,
        nombre: proyecto.nombre,
        totalItems,
        itemsEntregados,
        eficiencia,
        estado: proyecto.estado
      };
    });

    // 🏆 Ordenar por eficiencia
    comparativo.sort((a, b) => b.eficiencia - a.eficiencia);

    return {
      comparativo,
      resumen: {
        totalProyectos: comparativo.length,
        mejorProyecto: comparativo.length > 0 ? comparativo[0] : null,
        promedioEficiencia: comparativo.length > 0 ? 
          Math.round(comparativo.reduce((sum, p) => sum + p.eficiencia, 0) / comparativo.length) : 0
      }
    };

  } catch (error) {
    logger.error('Error al obtener comparativo de entidades', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}
