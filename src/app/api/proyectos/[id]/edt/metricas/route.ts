import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { EstadoEdt, PrioridadEdt } from '@/types/modelos';

// ✅ GET - Obtener métricas detalladas del EDT de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const proyectoId = id;
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'ID de proyecto requerido' },
        { status: 400 }
      );
    }

    // 🔐 Verificar acceso al proyecto
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true
      }
    });

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      );
    }

    // 🔍 Parámetros de consulta
    const { searchParams } = new URL(request.url);
    const tipoMetrica = searchParams.get('tipo') || 'general';
    const periodo = searchParams.get('periodo') || '30'; // días
    const incluirHistorico = searchParams.get('historico') === 'true';

    let metricas: any = {};

    switch (tipoMetrica) {
      case 'general':
        metricas = await obtenerMetricasGenerales(proyectoId);
        break;
      case 'rendimiento':
        metricas = await obtenerMetricasRendimiento(proyectoId, parseInt(periodo));
        break;
      case 'recursos':
        metricas = await obtenerMetricasRecursos(proyectoId);
        break;
      case 'calidad':
        metricas = await obtenerMetricasCalidad(proyectoId);
        break;
      case 'tendencias':
        metricas = await obtenerMetricasTendencias(proyectoId, parseInt(periodo));
        break;
      case 'comparativo':
        metricas = await obtenerMetricasComparativo(proyectoId);
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de métrica no válido' },
          { status: 400 }
        );
    }

    // 📊 Incluir histórico si se solicita
    if (incluirHistorico && tipoMetrica === 'general') {
      metricas.historico = await obtenerHistoricoMetricas(proyectoId, parseInt(periodo));
    }

    logger.info(`📊 Métricas generadas para proyecto ${proyectoId}: ${tipoMetrica}`);

    return NextResponse.json({
      success: true,
      proyecto,
      tipo: tipoMetrica,
      periodo: parseInt(periodo),
      generadoEn: new Date(),
      ...metricas
    });

  } catch (error) {
    logger.error('❌ Error al obtener métricas EDT:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 📊 Métricas Generales del Proyecto
async function obtenerMetricasGenerales(proyectoId: string) {
  const [totalEdts, metricas, distribucionEstado, distribucionPrioridad] = await Promise.all([
    // Total de EDTs
    prisma.proyectoEdt.count({
      where: { proyectoId }
    }),
    
    // Métricas agregadas
    prisma.proyectoEdt.aggregate({
      where: { proyectoId },
      _sum: {
        horasPlan: true,
        horasReales: true
      },
      _avg: {
        porcentajeAvance: true
      },
      _min: {
        fechaInicioPlan: true
      },
      _max: {
        fechaFinPlan: true
      }
    }),
    
    // Distribución por estado
    prisma.proyectoEdt.groupBy({
      by: ['estado'],
      where: { proyectoId },
      _count: true
    }),
    
    // Distribución por prioridad
    prisma.proyectoEdt.groupBy({
      by: ['prioridad'],
      where: { proyectoId },
      _count: true
    })
  ]);

  // Calcular métricas derivadas
  const horasEstimadasTotal = Number(metricas._sum.horasPlan || 0);
  const horasRealesTotal = Number(metricas._sum.horasReales || 0);
  const promedioAvance = Number(metricas._avg.porcentajeAvance || 0);
  
  const eficienciaGeneral = horasEstimadasTotal > 0 ?
      (horasRealesTotal / horasEstimadasTotal) * 100 : 0;
  
  const variacionHoras = horasEstimadasTotal > 0 ?
      ((horasRealesTotal - horasEstimadasTotal) / horasEstimadasTotal) * 100 : 0;

  // Calcular duración del proyecto
  let duracionPlanDias = 0;
  if (metricas._min.fechaInicioPlan && metricas._max.fechaFinPlan) {
    duracionPlanDias = Math.ceil(
      (metricas._max.fechaFinPlan.getTime() - metricas._min.fechaInicioPlan.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
  }

  // Formatear distribuciones
  const estadoDistribucion = distribucionEstado.reduce((acc, item) => {
    acc[item.estado as EstadoEdt] = item._count;
    return acc;
  }, {} as Record<string, number>);

  const prioridadDistribucion = distribucionPrioridad.reduce((acc, item) => {
    acc[item.prioridad] = item._count;
    return acc;
  }, {} as Record<PrioridadEdt, number>);

  return {
    data: {
      resumen: {
        totalEdts,
        horasEstimadasTotal,
        horasRealesTotal,
        promedioAvance,
        eficienciaGeneral,
        variacionHoras,
        duracionPlanDias
      },
      distribucion: {
        porEstado: estadoDistribucion,
        porPrioridad: prioridadDistribucion
      },
      fechas: {
        inicioProyecto: metricas._min.fechaInicioPlan,
        finProyecto: metricas._max.fechaFinPlan
      }
    }
  };
}

// ⚡ Métricas de Rendimiento
async function obtenerMetricasRendimiento(proyectoId: string, periodo: number) {
  const fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - periodo);

  // Rendimiento por categoría de servicio
  const rendimientoPorCategoria = await prisma.proyectoEdt.groupBy({
    by: ['categoriaServicioId'],
    where: {
      proyectoId,
      updatedAt: { gte: fechaDesde }
    },
    _sum: {
      horasPlan: true,
      horasReales: true
    },
    _avg: {
      porcentajeAvance: true
    },
    _count: true
  });

  // Enriquecer con datos de categoría
  const categorias = await Promise.all(
    rendimientoPorCategoria.map(async (item) => {
      const categoria = await prisma.categoriaServicio.findUnique({
        where: { id: item.categoriaServicioId },
        select: { nombre: true }
      });
      
      const horasPlan = Number(item._sum.horasPlan || 0);
      const horasReales = Number(item._sum.horasReales || 0);
      const eficiencia = horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0;
      
      return {
        categoria,
        horasPlan,
        horasReales,
        eficiencia,
        promedioAvance: Number(item._avg.porcentajeAvance || 0),
        totalEdts: item._count
      };
    })
  );

  // Rendimiento por responsable
  const rendimientoPorResponsable = await prisma.proyectoEdt.groupBy({
    by: ['responsableId'],
    where: {
      proyectoId,
      responsableId: { not: null },
      updatedAt: { gte: fechaDesde }
    },
    _sum: {
      horasPlan: true,
      horasReales: true
    },
    _avg: {
      porcentajeAvance: true
    },
    _count: true
  });

  const responsables = await Promise.all(
    rendimientoPorResponsable.map(async (item) => {
      const usuario = await prisma.user.findUnique({
        where: { id: item.responsableId! },
        select: { name: true, email: true }
      });
      
      const horasPlan = Number(item._sum.horasPlan || 0);
      const horasReales = Number(item._sum.horasReales || 0);
      const eficiencia = horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0;
      
      return {
        responsable: usuario,
        horasPlan,
        horasReales,
        eficiencia,
        promedioAvance: Number(item._avg.porcentajeAvance || 0),
        totalEdts: item._count
      };
    })
  );

  // Velocidad de completado (EDTs completados por semana)
  const edtsCompletados = await prisma.proyectoEdt.findMany({
    where: {
      proyectoId,
      estado: 'completado',
      fechaFinReal: { gte: fechaDesde }
    },
    select: {
      fechaFinReal: true
    }
  });

  // Agrupar por semana
  const completadosPorSemana = edtsCompletados.reduce((acc, edt) => {
    if (edt.fechaFinReal) {
      const semana = getWeekNumber(edt.fechaFinReal);
      acc[semana] = (acc[semana] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    data: {
      porCategoria: categorias.sort((a, b) => b.eficiencia - a.eficiencia),
      porResponsable: responsables.sort((a, b) => b.eficiencia - a.eficiencia),
      velocidadCompletado: completadosPorSemana
    }
  };
}

// 👥 Métricas de Recursos
async function obtenerMetricasRecursos(proyectoId: string) {
  // Carga de trabajo por responsable
  const cargaTrabajo = await prisma.proyectoEdt.groupBy({
    by: ['responsableId'],
    where: {
      proyectoId,
      responsableId: { not: null },
      estado: { in: ['planificado', 'en_progreso'] }
    },
    _sum: {
      horasPlan: true,
      horasReales: true
    },
    _count: true
  });

  const recursos = await Promise.all(
    cargaTrabajo.map(async (item) => {
      const usuario = await prisma.user.findUnique({
        where: { id: item.responsableId! },
        select: { name: true, email: true }
      });
      
      // Calcular horas pendientes
      const horasPlan = Number(item._sum.horasPlan || 0);
      const horasReales = Number(item._sum.horasReales || 0);
      const horasPendientes = Math.max(0, horasPlan - horasReales);
      
      return {
        responsable: usuario,
        edtsAsignados: item._count,
        horasPlan,
        horasReales,
        horasPendientes,
        porcentajeCarga: horasPlan > 0 ? (horasReales / horasPlan) * 100 : 0
      };
    })
  );

  return {
    data: {
      recursos: recursos.sort((a, b) => b.horasPendientes - a.horasPendientes)
    }
  };
}

// 🎯 Métricas de Calidad
async function obtenerMetricasCalidad(proyectoId: string) {
  // EDTs con retrasos
  const edtsConRetraso = await prisma.proyectoEdt.count({
    where: {
      proyectoId,
      fechaFinPlan: { lt: new Date() },
      estado: { notIn: ['completado', 'cancelado'] }
    }
  });

  // EDTs completados a tiempo
  const edtsATiempo = await prisma.proyectoEdt.count({
    where: {
      proyectoId,
      estado: 'completado',
      fechaFinReal: { lte: prisma.proyectoEdt.fields.fechaFinPlan }
    }
  });

  // EDTs con sobrecosto (>20% de horas planificadas)
  const edtsConSobrecosto = await prisma.proyectoEdt.findMany({
    where: {
      proyectoId,
      horasPlan: { gt: 0 }
    },
    select: {
      horasPlan: true,
      horasReales: true
    }
  });

  const sobrecostos = edtsConSobrecosto.filter(edt => {
    const horasPlan = Number(edt.horasPlan!);
    const horasReales = Number(edt.horasReales);
    return (horasReales / horasPlan) > 1.2; // >20% sobrecosto
  }).length;

  // Índice de calidad general
  const totalEdts = await prisma.proyectoEdt.count({ where: { proyectoId } });
  const indiceCalidad = totalEdts > 0 ? 
    ((totalEdts - edtsConRetraso - sobrecostos) / totalEdts) * 100 : 100;

  return {
    data: {
      indicadores: {
        edtsConRetraso,
        edtsATiempo,
        edtsConSobrecosto: sobrecostos,
        totalEdts,
        indiceCalidad
      },
      porcentajes: {
        puntualidad: totalEdts > 0 ? (edtsATiempo / totalEdts) * 100 : 0,
        eficienciaCosto: totalEdts > 0 ? ((totalEdts - sobrecostos) / totalEdts) * 100 : 100,
        cumplimiento: totalEdts > 0 ? ((totalEdts - edtsConRetraso) / totalEdts) * 100 : 100
      }
    }
  };
}

// 📈 Métricas de Tendencias
async function obtenerMetricasTendencias(proyectoId: string, periodo: number) {
  const fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - periodo);

  // Progreso diario
  const registrosHoras = await prisma.registroHoras.findMany({
    where: {
      proyectoEdt: {
        proyectoId
      },
      fechaTrabajo: { gte: fechaDesde }
    },
    select: {
      fechaTrabajo: true,
      horasTrabajadas: true
    },
    orderBy: { fechaTrabajo: 'asc' }
  });

  // Agrupar por fecha
  const horasPorDia = registrosHoras.reduce((acc, registro) => {
    const fecha = registro.fechaTrabajo.toISOString().split('T')[0];
    acc[fecha] = (acc[fecha] || 0) + Number(registro.horasTrabajadas);
    return acc;
  }, {} as Record<string, number>);

  // Tendencia de completado
  const edtsCompletadosPorDia = await prisma.proyectoEdt.findMany({
    where: {
      proyectoId,
      estado: 'completado',
      fechaFinReal: { gte: fechaDesde }
    },
    select: {
      fechaFinReal: true
    }
  });

  const completadosPorDia = edtsCompletadosPorDia.reduce((acc, edt) => {
    if (edt.fechaFinReal) {
      const fecha = edt.fechaFinReal.toISOString().split('T')[0];
      acc[fecha] = (acc[fecha] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    data: {
      horasPorDia,
      completadosPorDia,
      tendenciaGeneral: calcularTendencia(Object.values(horasPorDia))
    }
  };
}

// 🔄 Métricas Comparativo (vs otros proyectos)
async function obtenerMetricasComparativo(proyectoId: string) {
  // Obtener métricas del proyecto actual
  const proyectoActual = await prisma.proyectoEdt.aggregate({
    where: { proyectoId },
    _avg: {
      porcentajeAvance: true
    },
    _sum: {
      horasPlan: true,
      horasReales: true
    },
    _count: true
  });

  // Obtener métricas promedio de todos los proyectos
  const promedioGeneral = await prisma.proyectoEdt.aggregate({
    _avg: {
      porcentajeAvance: true
    }
  });

  const eficienciaActual = Number(proyectoActual._sum.horasPlan || 0) > 0 ? 
    (Number(proyectoActual._sum.horasReales || 0) / Number(proyectoActual._sum.horasPlan || 1)) * 100 : 0;

  return {
    data: {
      proyectoActual: {
        totalEdts: proyectoActual._count,
        promedioAvance: Number(proyectoActual._avg.porcentajeAvance || 0),
        eficiencia: eficienciaActual,
        horasTotales: Number(proyectoActual._sum.horasReales || 0)
      },
      promedioIndustria: {
        promedioAvance: Number(promedioGeneral._avg.porcentajeAvance || 0)
      },
      comparacion: {
        mejorQuePromedio: Number(proyectoActual._avg.porcentajeAvance || 0) > Number(promedioGeneral._avg.porcentajeAvance || 0)
      }
    }
  };
}

// 📊 Histórico de Métricas
async function obtenerHistoricoMetricas(proyectoId: string, periodo: number) {
  const fechaDesde = new Date();
  fechaDesde.setDate(fechaDesde.getDate() - periodo);

  // Obtener snapshots históricos (simulado con updatedAt)
  const historico = await prisma.proyectoEdt.findMany({
    where: {
      proyectoId,
      updatedAt: { gte: fechaDesde }
    },
    select: {
      updatedAt: true,
      porcentajeAvance: true,
      horasReales: true,
      estado: true
    },
    orderBy: { updatedAt: 'asc' }
  });

  // Agrupar por semana
  const historicoSemanal = historico.reduce((acc, item) => {
    const semana = getWeekNumber(item.updatedAt);
    if (!acc[semana]) {
      acc[semana] = {
        avancePromedio: 0,
        horasAcumuladas: 0,
        count: 0
      };
    }
    acc[semana].avancePromedio += item.porcentajeAvance;
    acc[semana].horasAcumuladas += Number(item.horasReales);
    acc[semana].count += 1;
    return acc;
  }, {} as Record<string, any>);

  // Calcular promedios
  Object.keys(historicoSemanal).forEach(semana => {
    const data = historicoSemanal[semana];
    data.avancePromedio = data.avancePromedio / data.count;
  });

  return historicoSemanal;
}

// 🛠️ Funciones auxiliares
function getWeekNumber(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

function calcularTendencia(valores: number[]): 'ascendente' | 'descendente' | 'estable' {
  if (valores.length < 2) return 'estable';
  
  const inicio = valores.slice(0, Math.ceil(valores.length / 3)).reduce((a, b) => a + b, 0);
  const fin = valores.slice(-Math.ceil(valores.length / 3)).reduce((a, b) => a + b, 0);
  
  const diferencia = (fin - inicio) / inicio;
  
  if (diferencia > 0.1) return 'ascendente';
  if (diferencia < -0.1) return 'descendente';
  return 'estable';
}