import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FiltrosCronogramaPayload } from '@/types/payloads';
import { logger } from '@/lib/logger';
import { EstadoEdt, PrioridadEdt } from '@/types/modelos';

// ✅ GET - Generar reportes de cronograma
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔐 Verificar permisos para reportes
    const rolesPermitidos = ['admin', 'gerente', 'proyectos', 'comercial'];
    if (!rolesPermitidos.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sin permisos para generar reportes' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipoReporte = searchParams.get('tipo') || 'resumen';
    
    // 🔍 Filtros comunes
    const filtros: FiltrosCronogramaPayload = {
      proyectoId: searchParams.get('proyectoId') || undefined,
      categoriaServicioId: searchParams.get('categoriaServicioId') || undefined,
      estado: searchParams.get('estado') as any || undefined,
      responsableId: searchParams.get('responsableId') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      zona: searchParams.get('zona') || undefined
    };

    let reporte: any = {};

    switch (tipoReporte) {
      case 'resumen':
        reporte = await generarReporteResumen(filtros);
        break;
      case 'comparativo':
        reporte = await generarReporteComparativo(filtros);
        break;
      case 'eficiencia':
        reporte = await generarReporteEficiencia(filtros);
        break;
      case 'alertas':
        reporte = await generarReporteAlertas(filtros);
        break;
      case 'timeline':
        reporte = await generarReporteTimeline(filtros);
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de reporte no válido' },
          { status: 400 }
        );
    }

    logger.info(`📊 Reporte generado: ${tipoReporte} - ${Object.keys(reporte.data || {}).length} elementos`);

    return NextResponse.json({
      success: true,
      tipo: tipoReporte,
      filtros,
      generadoEn: new Date(),
      ...reporte
    });

  } catch (error) {
    logger.error('❌ Error al generar reporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 📊 Reporte Resumen General
async function generarReporteResumen(filtros: any) {
  const whereClause = construirWhereClause(filtros);

  // Métricas generales
  const [totalEdts, metricas, estadisticas] = await Promise.all([
    prisma.proyectoEdt.count({ where: whereClause }),
    prisma.proyectoEdt.aggregate({
      where: whereClause,
      _sum: {
        horasPlan: true,
        horasReales: true
      },
      _avg: {
        porcentajeAvance: true
      }
    }),
    prisma.proyectoEdt.groupBy({
      by: ['estado'],
      where: whereClause,
      _count: true
    })
  ]);

  // Distribución por estado
  const distribucionEstado = estadisticas.reduce((acc, item) => {
    acc[item.estado] = item._count;
    return acc;
  }, {} as Record<EstadoEdt, number>);

  // Top proyectos por horas
  const topProyectos = await prisma.proyectoEdt.groupBy({
    by: ['proyectoId'],
    where: whereClause,
    _sum: {
      horasReales: true,
      horasPlan: true
    },
    _count: true,
    orderBy: {
      _sum: {
        horasReales: 'desc'
      }
    },
    take: 10
  });

  // Enriquecer con datos del proyecto
  const proyectosConDatos = await Promise.all(
    topProyectos.map(async (item) => {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: item.proyectoId },
        select: { nombre: true, codigo: true }
      });
      return {
        ...item,
        proyecto
      };
    })
  );

  return {
    data: {
      resumen: {
        totalEdts,
        horasEstimadasTotal: Number(metricas._sum.horasPlan || 0),
        horasRealesTotal: Number(metricas._sum.horasReales || 0),
        promedioAvance: Number(metricas._avg.porcentajeAvance || 0),
        eficienciaGeneral: metricas._sum.horasPlan ? 
          (Number(metricas._sum.horasReales) / Number(metricas._sum.horasPlan)) * 100 : 0
      },
      distribucionEstado,
      topProyectos: proyectosConDatos
    }
  };
}

// 📈 Reporte Comparativo Plan vs Real
async function generarReporteComparativo(filtros: any) {
  const whereClause = construirWhereClause(filtros);

  const comparativo = await prisma.proyectoEdt.findMany({
    where: whereClause,
    include: {
      proyecto: {
        select: {
          id: true,
          nombre: true,
          codigo: true
        }
      },
      categoriaServicio: {
        select: {
          id: true,
          nombre: true
        }
      }
    },
    orderBy: [
      { horasReales: 'desc' }
    ]
  });

  const datos = comparativo.map(edt => {
    const horasPlan = Number(edt.horasPlan || 0);
    const horasReales = Number(edt.horasReales);
    const variacion = horasPlan > 0 ? ((horasReales - horasPlan) / horasPlan) * 100 : 0;
    
    let estado = 'en_tiempo';
    if (variacion > 20) estado = 'sobrecosto';
    else if (variacion < -10) estado = 'subcosto';
    
    // Calcular días de retraso
    let diasRetraso = 0;
    if (edt.fechaFinPlan && new Date() > edt.fechaFinPlan && edt.estado !== 'completado') {
      diasRetraso = Math.ceil((new Date().getTime() - edt.fechaFinPlan.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: edt.id,
      proyecto: edt.proyecto,
      categoriaServicio: edt.categoriaServicio,
      zona: edt.zona,
      horasPlan,
      horasReales,
      variacion,
      estado,
      porcentajeAvance: edt.porcentajeAvance,
      diasRetraso,
      estadoEdt: edt.estado
    };
  });

  // Estadísticas del comparativo
  const estadisticas = {
    enTiempo: datos.filter(d => d.estado === 'en_tiempo').length,
    sobrecosto: datos.filter(d => d.estado === 'sobrecosto').length,
    subcosto: datos.filter(d => d.estado === 'subcosto').length,
    conRetraso: datos.filter(d => d.diasRetraso > 0).length,
    variacionPromedio: datos.reduce((sum, d) => sum + d.variacion, 0) / datos.length
  };

  return {
    data: {
      comparativo: datos,
      estadisticas
    }
  };
}

// ⚡ Reporte de Eficiencia
async function generarReporteEficiencia(filtros: any) {
  const whereClause = construirWhereClause(filtros);

  // Eficiencia por categoría de servicio
  const eficienciaPorCategoria = await prisma.proyectoEdt.groupBy({
    by: ['categoriaServicioId'],
    where: {
      ...whereClause,
      horasPlan: { gt: 0 }
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
    eficienciaPorCategoria.map(async (item) => {
      const categoria = await prisma.categoriaServicio.findUnique({
        where: { id: item.categoriaServicioId },
        select: { nombre: true }
      });
      
      const eficiencia = Number(item._sum.horasReales || 0) / Number(item._sum.horasPlan || 1) * 100;
      
      return {
        categoriaServicio: categoria,
        horasPlan: Number(item._sum.horasPlan || 0),
        horasReales: Number(item._sum.horasReales || 0),
        eficiencia,
        promedioAvance: Number(item._avg.porcentajeAvance || 0),
        totalEdts: item._count
      };
    })
  );

  // Eficiencia por responsable
  const eficienciaPorResponsable = await prisma.proyectoEdt.groupBy({
    by: ['responsableId'],
    where: {
      ...whereClause,
      responsableId: { not: null },
      horasPlan: { gt: 0 }
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
    eficienciaPorResponsable.map(async (item) => {
      const usuario = await prisma.user.findUnique({
        where: { id: item.responsableId! },
        select: { name: true, email: true }
      });
      
      const eficiencia = Number(item._sum.horasReales || 0) / Number(item._sum.horasPlan || 1) * 100;
      
      return {
        responsable: usuario,
        horasPlan: Number(item._sum.horasPlan || 0),
        horasReales: Number(item._sum.horasReales || 0),
        eficiencia,
        promedioAvance: Number(item._avg.porcentajeAvance || 0),
        totalEdts: item._count
      };
    })
  );

  return {
    data: {
      porCategoria: categorias.sort((a, b) => b.eficiencia - a.eficiencia),
      porResponsable: responsables.sort((a, b) => b.eficiencia - a.eficiencia)
    }
  };
}

// 🚨 Reporte de Alertas
async function generarReporteAlertas(filtros: any) {
  const whereClause = construirWhereClause(filtros);
  const alertas: any[] = [];

  // EDT vencidos
  const edtsVencidos = await prisma.proyectoEdt.findMany({
    where: {
      ...whereClause,
      fechaFinPlan: { lt: new Date() },
      estado: { notIn: ['completado', 'cancelado'] }
    },
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      categoriaServicio: { select: { nombre: true } },
      responsable: { select: { name: true, email: true } }
    }
  });

  edtsVencidos.forEach(edt => {
    const diasRetraso = Math.ceil((new Date().getTime() - edt.fechaFinPlan!.getTime()) / (1000 * 60 * 60 * 24));
    alertas.push({
      tipo: 'vencido',
      prioridad: diasRetraso > 30 ? 'critica' : diasRetraso > 7 ? 'alta' : 'media',
      edt,
      mensaje: `EDT vencido hace ${diasRetraso} días`,
      diasRetraso
    });
  });

  // EDT con sobrecosto
  const edtsSobrecosto = await prisma.proyectoEdt.findMany({
    where: {
      ...whereClause,
      horasPlan: { gt: 0 }
    },
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      categoriaServicio: { select: { nombre: true } },
      responsable: { select: { name: true, email: true } }
    }
  });

  edtsSobrecosto.forEach(edt => {
    const horasPlan = Number(edt.horasPlan!);
    const horasReales = Number(edt.horasReales);
    const exceso = ((horasReales - horasPlan) / horasPlan) * 100;
    
    if (exceso > 20) {
      alertas.push({
        tipo: 'sobrecosto',
        prioridad: exceso > 50 ? 'critica' : 'alta',
        edt,
        mensaje: `Sobrecosto del ${exceso.toFixed(1)}%`,
        exceso: exceso
      });
    }
  });

  // EDT sin avance reciente
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 7);
  
  const edtsSinAvance = await prisma.proyectoEdt.findMany({
    where: {
      ...whereClause,
      estado: 'en_progreso',
      registrosHoras: {
        none: {
          fechaTrabajo: { gte: fechaLimite }
        }
      }
    },
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      categoriaServicio: { select: { nombre: true } },
      responsable: { select: { name: true, email: true } }
    }
  });

  edtsSinAvance.forEach(edt => {
    alertas.push({
      tipo: 'sin_avance',
      prioridad: 'media',
      edt,
      mensaje: 'Sin registros de horas en los últimos 7 días'
    });
  });

  return {
    data: {
      alertas: alertas.sort((a, b) => {
        const prioridadOrder = { 'critica': 3, 'alta': 2, 'media': 1, 'baja': 0 };
        return prioridadOrder[b.prioridad as keyof typeof prioridadOrder] - 
               prioridadOrder[a.prioridad as keyof typeof prioridadOrder];
      }),
      resumen: {
        total: alertas.length,
        criticas: alertas.filter(a => a.prioridad === 'critica').length,
        altas: alertas.filter(a => a.prioridad === 'alta').length,
        medias: alertas.filter(a => a.prioridad === 'media').length
      }
    }
  };
}

// 📅 Reporte Timeline
async function generarReporteTimeline(filtros: any) {
  const whereClause = construirWhereClause(filtros);

  const edts = await prisma.proyectoEdt.findMany({
    where: whereClause,
    include: {
      proyecto: { select: { nombre: true, codigo: true } },
      categoriaServicio: { select: { nombre: true } },
      registrosHoras: {
        select: {
          fechaTrabajo: true,
          horasTrabajadas: true
        },
        orderBy: { fechaTrabajo: 'asc' }
      }
    },
    orderBy: { fechaInicioPlan: 'asc' }
  });

  const timeline = edts.map(edt => {
    const registrosPorFecha = edt.registrosHoras.reduce((acc, reg) => {
      const fecha = reg.fechaTrabajo.toISOString().split('T')[0];
      acc[fecha] = (acc[fecha] || 0) + Number(reg.horasTrabajadas);
      return acc;
    }, {} as Record<string, number>);

    return {
      id: edt.id,
      proyecto: edt.proyecto,
      categoriaServicio: edt.categoriaServicio,
      zona: edt.zona,
      fechaInicioPlan: edt.fechaInicioPlan,
      fechaFinPlan: edt.fechaFinPlan,
      fechaInicioReal: edt.fechaInicioReal,
      fechaFinReal: edt.fechaFinReal,
      estado: edt.estado,
      porcentajeAvance: edt.porcentajeAvance,
      registrosPorFecha
    };
  });

  return {
    data: {
      timeline
    }
  };
}

// 🛠️ Función auxiliar para construir WHERE clause
function construirWhereClause(filtros: any) {
  const where: any = {};
  
  if (filtros.proyectoId) where.proyectoId = filtros.proyectoId;
  if (filtros.categoriaServicioId) where.categoriaServicioId = filtros.categoriaServicioId;
  if (filtros.estado) where.estado = filtros.estado;
  if (filtros.responsableId) where.responsableId = filtros.responsableId;
  if (filtros.zona) where.zona = filtros.zona;
  
  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.OR = [];
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const fechaCondition: any = {};
      if (filtros.fechaDesde) fechaCondition.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) fechaCondition.lte = filtros.fechaHasta;
      
      where.OR.push(
        { fechaInicioPlan: fechaCondition },
        { fechaFinPlan: fechaCondition },
        { fechaInicioReal: fechaCondition },
        { fechaFinReal: fechaCondition }
      );
    }
  }
  
  return where;
}