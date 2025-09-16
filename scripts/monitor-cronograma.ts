/**
 * 📊 Script de monitoreo para el módulo de cronograma ERP
 * 🎯 Objetivo: Verificar integridad de datos y performance del sistema
 * 📅 Ejecutar cada hora via cron job: 0 * * * * /usr/bin/node scripts/monitor-cronograma.ts
 * 👤 Autor: Sistema GYS - Agente TRAE
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/lib/logger';
import type { EstadoEdt, PrioridadEdt } from '../src/types/modelos';

const prisma = new PrismaClient();

// ✅ Interfaces para reportes
interface EstadisticasMonitoreo {
  timestamp: Date;
  totalProyectos: number;
  totalEdts: number;
  edtsPorEstado: Record<EstadoEdt, number>;
  edtsPorPrioridad: Record<PrioridadEdt, number>;
  edtsSinResponsable: number;
  tareasInconsistentes: number;
  registrosHorasSinEdt: number;
  performanceQueries: {
    queryListaEdts: number;
    queryKpis: number;
    queryAnalytics: number;
  };
  alertas: string[];
}

interface AlertaIntegridad {
  tipo: 'error' | 'warning' | 'info';
  mensaje: string;
  detalles?: any;
}

/**
 * 🔍 Verificar integridad de datos del cronograma
 */
async function verificarIntegridad(): Promise<AlertaIntegridad[]> {
  const alertas: AlertaIntegridad[] = [];
  
  try {
    logger.info('🔍 Iniciando verificación de integridad de datos');

    // ✅ 1. Verificar EDTs sin responsable asignado
    const edtsSinResponsable = await prisma.proyectoEdt.findMany({
      where: {
        responsableId: null
      },
      select: {
        id: true,
        zona: true,
        proyecto: { select: { nombre: true } }
      }
    });

    if (edtsSinResponsable.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `Encontradas ${edtsSinResponsable.length} EDTs sin responsable asignado`,
        detalles: edtsSinResponsable.map(t => ({ id: t.id, zona: t.zona, proyecto: t.proyecto.nombre }))
      });
    }

    // ✅ 2. Verificar tareas con fechas inconsistentes
    const tareasInconsistentes = await prisma.proyectoEdt.findMany({
      where: {
        AND: [
          { fechaInicioPlan: { not: null } },
          { fechaFinPlan: { not: null } }
        ]
      },
      select: {
        id: true,
        fechaInicioPlan: true,
        fechaFinPlan: true,
        proyecto: { select: { nombre: true } }
      }
    });

    const fechasInconsistentes = tareasInconsistentes.filter(
      t => t.fechaInicioPlan && t.fechaFinPlan && t.fechaInicioPlan > t.fechaFinPlan
    );

    if (fechasInconsistentes.length > 0) {
      alertas.push({
        tipo: 'error',
        mensaje: `Encontradas ${fechasInconsistentes.length} tareas con fechas inconsistentes`,
        detalles: fechasInconsistentes.map(t => ({
          id: t.id,
          proyecto: t.proyecto.nombre,
          fechaInicio: t.fechaInicioPlan,
          fechaFin: t.fechaFinPlan
        }))
      });
    }

    // ✅ 3. Verificar EDT completados sin 100% de avance
    const edtsCompletadosInconsistentes = await prisma.proyectoEdt.findMany({
      where: {
        estado: 'completado',
        porcentajeAvance: { not: 100 }
      },
      select: {
        id: true,
        porcentajeAvance: true,
        proyecto: { select: { nombre: true } }
      }
    });

    if (edtsCompletadosInconsistentes.length > 0) {
      alertas.push({
        tipo: 'error',
        mensaje: `Encontrados ${edtsCompletadosInconsistentes.length} EDT completados sin 100% de avance`,
        detalles: edtsCompletadosInconsistentes.map(e => ({
          id: e.id,
          proyecto: e.proyecto.nombre,
          avance: e.porcentajeAvance
        }))
      });
    }

    // ✅ 4. Verificar registros de horas sin EDT asociado
    const registrosSinEdt = await prisma.registroHoras.count({
      where: {
        proyectoEdtId: null
      }
    });

    if (registrosSinEdt > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `Encontrados ${registrosSinEdt} registros de horas sin EDT asociado`,
        detalles: { count: registrosSinEdt }
      });
    }

    // ✅ 5. Verificar proyectos sin EDT
    const proyectosSinEdt = await prisma.proyecto.findMany({
      where: {
        proyectoEdts: { none: {} },
        estado: { in: ['en_ejecucion', 'en_planificacion'] }
      },
      select: {
        id: true,
        nombre: true,
        estado: true
      }
    });

    if (proyectosSinEdt.length > 0) {
      alertas.push({
        tipo: 'info',
        mensaje: `Encontrados ${proyectosSinEdt.length} proyectos activos sin EDT`,
        detalles: proyectosSinEdt.map(p => ({ id: p.id, nombre: p.nombre, estado: p.estado }))
      });
    }

    // ✅ 6. Verificar EDT con horas reales pero sin registros
    const edtsConHorasSinRegistros = await prisma.proyectoEdt.findMany({
      where: {
        horasReales: { gt: 0 },
        registrosHoras: { none: {} }
      },
      select: {
        id: true,
        horasReales: true,
        proyecto: { select: { nombre: true } }
      }
    });

    if (edtsConHorasSinRegistros.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `Encontrados ${edtsConHorasSinRegistros.length} EDT con horas reales pero sin registros`,
        detalles: edtsConHorasSinRegistros.map(e => ({
          id: e.id,
          proyecto: e.proyecto.nombre,
          horasReales: e.horasReales
        }))
      });
    }

    logger.info(`✅ Verificación de integridad completada. ${alertas.length} alertas generadas`);
    return alertas;

  } catch (error) {
    logger.error('❌ Error en verificación de integridad:', error);
    alertas.push({
      tipo: 'error',
      mensaje: 'Error crítico en verificación de integridad',
      detalles: error
    });
    return alertas;
  }
}

/**
 * 📊 Generar estadísticas del sistema
 */
async function generarEstadisticas(): Promise<Partial<EstadisticasMonitoreo>> {
  try {
    logger.info('📊 Generando estadísticas del sistema');

    // ✅ Contar proyectos totales
    const totalProyectos = await prisma.proyecto.count();

    // ✅ Contar EDT totales
    const totalEdts = await prisma.proyectoEdt.count();

    // ✅ EDT por estado
    const edtsPorEstadoRaw = await prisma.proyectoEdt.groupBy({
      by: ['estado'],
      _count: { id: true }
    });

    const edtsPorEstado = edtsPorEstadoRaw.reduce((acc, item) => {
      // ✅ Solo incluir estados válidos
      const estadosValidos: EstadoEdt[] = ['planificado', 'en_progreso', 'detenido', 'completado', 'cancelado'];
      if (estadosValidos.includes(item.estado as EstadoEdt)) {
        acc[item.estado as EstadoEdt] = item._count.id;
      }
      return acc;
    }, {} as Record<EstadoEdt, number>);

    // ✅ EDT por prioridad
    const edtsPorPrioridadRaw = await prisma.proyectoEdt.groupBy({
      by: ['prioridad'],
      _count: { id: true }
    });

    const edtsPorPrioridad = edtsPorPrioridadRaw.reduce((acc, item) => {
      // ✅ Solo incluir prioridades válidas
      const prioridadesValidas: PrioridadEdt[] = ['baja', 'media', 'alta', 'critica'];
      if (prioridadesValidas.includes(item.prioridad as PrioridadEdt)) {
        acc[item.prioridad as PrioridadEdt] = item._count.id;
      }
      return acc;
    }, {} as Record<PrioridadEdt, number>);

    // ✅ Registros de horas sin EDT
    const registrosHorasSinEdt = await prisma.registroHoras.count({
      where: { proyectoEdtId: null }
    });

    logger.info('✅ Estadísticas generadas correctamente');

    return {
      timestamp: new Date(),
      totalProyectos,
      totalEdts,
      edtsPorEstado,
      edtsPorPrioridad,
      registrosHorasSinEdt
    };

  } catch (error) {
    logger.error('❌ Error generando estadísticas:', error);
    throw error;
  }
}

/**
 * ⚡ Medir performance de queries críticas
 */
async function medirPerformance(): Promise<EstadisticasMonitoreo['performanceQueries']> {
  try {
    logger.info('⚡ Midiendo performance de queries');

    // ✅ Query lista de EDT con relaciones
    const startListaEdts = Date.now();
    await prisma.proyectoEdt.findMany({
      take: 50,
      include: {
        proyecto: { select: { nombre: true } },
        categoriaServicio: { select: { nombre: true } },
        responsable: { select: { name: true } },
        registrosHoras: {
          take: 10,
          select: { horasTrabajadas: true, fechaTrabajo: true }
        }
      }
    });
    const queryListaEdts = Date.now() - startListaEdts;

    // ✅ Query KPIs básicos
    const startKpis = Date.now();
    await Promise.all([
      prisma.proyectoEdt.count(),
      prisma.proyectoEdt.count({ where: { estado: 'completado' } }),
      prisma.proyectoEdt.count({ where: { estado: 'en_progreso' } }),
      prisma.proyectoEdt.aggregate({
        _avg: { porcentajeAvance: true },
        _sum: { horasReales: true, horasPlan: true }
      })
    ]);
    const queryKpis = Date.now() - startKpis;

    // ✅ Query analytics compleja
    const startAnalytics = Date.now();
    await prisma.proyectoEdt.findMany({
      where: {
        fechaFinPlan: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      include: {
        proyecto: true,
        registrosHoras: {
          where: {
            fechaTrabajo: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });
    const queryAnalytics = Date.now() - startAnalytics;

    const performance = {
      queryListaEdts,
      queryKpis,
      queryAnalytics
    };

    // ✅ Alertas de performance
    const alertasPerformance: string[] = [];
    if (queryListaEdts > 1000) {
      alertasPerformance.push(`Query lista EDT lenta: ${queryListaEdts}ms`);
    }
    if (queryKpis > 500) {
      alertasPerformance.push(`Query KPIs lenta: ${queryKpis}ms`);
    }
    if (queryAnalytics > 2000) {
      alertasPerformance.push(`Query analytics lenta: ${queryAnalytics}ms`);
    }

    if (alertasPerformance.length > 0) {
      logger.warn('⚠️ Alertas de performance:', alertasPerformance);
    }

    logger.info('✅ Medición de performance completada');
    return performance;

  } catch (error) {
    logger.error('❌ Error midiendo performance:', error);
    throw error;
  }
}

/**
 * 🔧 Función principal de monitoreo
 */
export async function monitorearCronograma(): Promise<EstadisticasMonitoreo> {
  try {
    logger.info('🚀 Iniciando monitoreo completo del cronograma');
    const startTime = Date.now();

    // ✅ Ejecutar verificaciones en paralelo
    const [alertasIntegridad, estadisticas, performance] = await Promise.all([
      verificarIntegridad(),
      generarEstadisticas(),
      medirPerformance()
    ]);

    // ✅ Compilar alertas
    const alertas = alertasIntegridad.map(a => `[${a.tipo.toUpperCase()}] ${a.mensaje}`);

    // ✅ Crear reporte completo
    const reporte: EstadisticasMonitoreo = {
      timestamp: new Date(),
      totalProyectos: estadisticas.totalProyectos || 0,
      totalEdts: estadisticas.totalEdts || 0,
      edtsPorEstado: estadisticas.edtsPorEstado || {} as Record<EstadoEdt, number>,
      edtsPorPrioridad: estadisticas.edtsPorPrioridad || {} as Record<PrioridadEdt, number>,
      edtsSinResponsable: alertasIntegridad.filter(a => a.mensaje.includes('sin responsable')).length,
      tareasInconsistentes: alertasIntegridad.filter(a => a.mensaje.includes('inconsistentes')).length,
      registrosHorasSinEdt: estadisticas.registrosHorasSinEdt || 0,
      performanceQueries: performance,
      alertas
    };

    const tiempoTotal = Date.now() - startTime;
    
    // ✅ Log del reporte
    logger.info('📋 Reporte de monitoreo:', {
      duracion: `${tiempoTotal}ms`,
      totalProyectos: reporte.totalProyectos,
      totalEdts: reporte.totalEdts,
      alertas: reporte.alertas.length,
      performance: reporte.performanceQueries
    });

    // ✅ Alertas críticas
    const alertasCriticas = alertasIntegridad.filter(a => a.tipo === 'error');
    if (alertasCriticas.length > 0) {
      logger.error('🚨 ALERTAS CRÍTICAS DETECTADAS:', alertasCriticas);
    }

    logger.info(`✅ Monitoreo completado en ${tiempoTotal}ms`);
    return reporte;

  } catch (error) {
    logger.error('❌ Error crítico en monitoreo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 📝 Generar reporte en formato markdown
 */
export async function generarReporteMarkdown(reporte: EstadisticasMonitoreo): Promise<string> {
  const fecha = reporte.timestamp.toLocaleString('es-ES');
  
  return `# 📊 Reporte de Monitoreo - Cronograma ERP

**Fecha**: ${fecha}

## 📈 Estadísticas Generales
- **Total Proyectos**: ${reporte.totalProyectos}
- **Total EDT**: ${reporte.totalEdts}
- **Registros de Horas sin EDT**: ${reporte.registrosHorasSinEdt}

## 📊 EDT por Estado
${Object.entries(reporte.edtsPorEstado)
  .map(([estado, count]) => `- **${estado}**: ${count}`)
  .join('\n')}

## ⚡ EDT por Prioridad
${Object.entries(reporte.edtsPorPrioridad)
  .map(([prioridad, count]) => `- **${prioridad}**: ${count}`)
  .join('\n')}

## ⚡ Performance de Queries
- **Lista EDT**: ${reporte.performanceQueries.queryListaEdts}ms
- **KPIs**: ${reporte.performanceQueries.queryKpis}ms
- **Analytics**: ${reporte.performanceQueries.queryAnalytics}ms

## 🚨 Alertas
${reporte.alertas.length > 0 
  ? reporte.alertas.map(alerta => `- ${alerta}`).join('\n')
  : '✅ No hay alertas'}

## 🔍 Problemas de Integridad
- **EDTs sin Responsable**: ${reporte.edtsSinResponsable}
- **Tareas con Fechas Inconsistentes**: ${reporte.tareasInconsistentes}

---
*Generado automáticamente por el sistema de monitoreo GYS*
`;
}

// ✅ Ejecutar si es llamado directamente
if (require.main === module) {
  monitorearCronograma()
    .then(async (reporte) => {
      console.log('✅ Monitoreo completado exitosamente');
      
      // Generar reporte markdown si se solicita
      if (process.argv.includes('--markdown')) {
        const markdown = await generarReporteMarkdown(reporte);
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `./logs/monitor-report-${timestamp}.md`;
        
        fs.writeFileSync(filename, markdown);
        console.log(`📋 Reporte markdown generado: ${filename}`);
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en monitoreo:', error);
      process.exit(1);
    });
}

export { verificarIntegridad, generarEstadisticas, medirPerformance };