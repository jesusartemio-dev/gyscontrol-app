/**
 * 📊 Servicio CronogramaAnalytics - Fase 4 Sistema EDT
 * 
 * Proporciona análisis avanzados, KPIs y métricas del cronograma de proyectos.
 * Incluye tendencias mensuales, comparativos de rendimiento y alertas automáticas.
 * 
 * @author TRAE AI - GYS App
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  KpisCronograma,
  TendenciaMensual,
  AnalisisRendimiento,
  AlertaCronograma,
  MetricasComparativas,
  FiltrosCronogramaData
} from '@/types/modelos';

export class CronogramaAnalyticsService {
  // ✅ Obtener KPIs principales del cronograma
  static async obtenerKpisCronograma(
    proyectoId?: string,
    filtros: FiltrosCronogramaData = {}
  ): Promise<KpisCronograma> {
    try {
      const whereClause = {
        ...(proyectoId && { proyectoId }),
        ...(filtros.categoriaServicioId && { categoriaServicioId: filtros.categoriaServicioId }),
        ...(filtros.responsableId && { responsableId: filtros.responsableId }),
        ...(filtros.fechaDesde && {
          fechaInicioPlan: {
            gte: filtros.fechaDesde
          }
        }),
        ...(filtros.fechaHasta && {
          fechaFinPlan: {
            lte: filtros.fechaHasta
          }
        })
      };

      // 📊 Estadísticas generales
      const estadisticasGenerales = await prisma.proyectoEdt.groupBy({
        by: ['estado'],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          horasPlan: true,
          horasReales: true
        },
        _avg: {
          porcentajeAvance: true
        }
      });

      let totalEdts = 0;
      let edtsPlanificados = 0;
      let edtsEnProgreso = 0;
      let edtsCompletados = 0;
      let edtsRetrasados = 0;
      let horasPlanTotal = 0;
      let horasRealesTotal = 0;
      let promedioAvance = 0;

      estadisticasGenerales.forEach(stat => {
        totalEdts += stat._count.id;
        horasPlanTotal += Number(stat._sum.horasPlan || 0);
        horasRealesTotal += Number(stat._sum.horasReales || 0);
        promedioAvance += Number(stat._avg.porcentajeAvance || 0) * stat._count.id;

        switch (stat.estado) {
          case 'planificado':
            edtsPlanificados += stat._count.id;
            break;
          case 'en_progreso':
            edtsEnProgreso += stat._count.id;
            break;
          case 'completado':
            edtsCompletados += stat._count.id;
            break;
          case 'detenido':
            edtsRetrasados += stat._count.id;
            break;
        }
      });

      promedioAvance = totalEdts > 0 ? Math.round(promedioAvance / totalEdts) : 0;

      // 📈 Calcular eficiencia
      const eficienciaGeneral = horasPlanTotal > 0
      ? Math.round((horasPlanTotal / horasRealesTotal) * 100)
        : 0;

      // 🎯 Calcular cumplimiento de fechas
      const edtsConFechasPlan = await prisma.proyectoEdt.count({
        where: {
          ...whereClause,
          fechaFinPlan: { not: null }
        }
      });

      const edtsEnTiempo = await prisma.proyectoEdt.count({
        where: {
          ...whereClause,
          estado: 'completado',
          fechaFinReal: { 
            not: null,
            lte: prisma.proyectoEdt.fields.fechaFinPlan
          },
          fechaFinPlan: { not: null }
        }
      });

      const cumplimientoFechas = edtsConFechasPlan > 0 
        ? Math.round((edtsEnTiempo / edtsConFechasPlan) * 100)
        : 0;

      // 💰 Calcular desviación presupuestaria (basada en horas)
      const desviacionPresupuestaria = horasPlanTotal > 0
      ? Math.round(((horasRealesTotal - horasPlanTotal) / horasPlanTotal) * 100)
        : 0;

      return {
        totalEdts,
        edtsPlanificados,
        edtsEnProgreso,
        edtsCompletados,
        edtsRetrasados,
        horasPlanTotal,
        horasRealesTotal,
        promedioAvance,
        eficienciaGeneral,
        cumplimientoFechas,
        desviacionPresupuestaria,
        fechaCalculo: new Date()
      };
    } catch (error) {
      logger.error('Error al obtener KPIs de cronograma:', error);
      throw new Error('Error al calcular KPIs del cronograma');
    }
  }

  // ✅ Obtener tendencias mensuales
  static async obtenerTendenciasMensuales(
    proyectoId?: string,
    mesesAtras: number = 12
  ): Promise<TendenciaMensual[]> {
    try {
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - mesesAtras);
      fechaInicio.setDate(1);
      fechaInicio.setHours(0, 0, 0, 0);

      const whereClause = {
        ...(proyectoId && { proyectoId }),
        fechaInicioPlan: {
          gte: fechaInicio
        }
      };

      // 📊 Obtener datos agrupados por mes
      const datosRaw = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "fechaInicioPlan") as mes,
          COUNT(*) as total_edts,
          COUNT(CASE WHEN estado = 'completado' THEN 1 END) as edts_completados,
          SUM("horasPlan") as horas_plan,
          SUM("horasReales") as horas_reales,
          AVG("porcentajeAvance") as promedio_avance
        FROM "ProyectoEdt"
        WHERE ${proyectoId ? `"proyectoId" = '${proyectoId}' AND` : ''}
              "fechaInicioPlan" >= ${fechaInicio.toISOString()}
        GROUP BY DATE_TRUNC('month', "fechaInicioPlan")
        ORDER BY mes ASC
      ` as any[];

      const tendencias: TendenciaMensual[] = datosRaw.map(dato => {
        const totalEdts = Number(dato.total_edts);
        const edtsCompletados = Number(dato.edts_completados);
        const horasPlan = Number(dato.horas_plan || 0);
        const horasReales = Number(dato.horas_reales || 0);
        const promedioAvance = Number(dato.promedio_avance || 0);

        return {
          mes: new Date(dato.mes),
          totalEdts,
          edtsCompletados,
          tasaCompletitud: totalEdts > 0 ? Math.round((edtsCompletados / totalEdts) * 100) : 0,
          horasPlan,
          horasReales,
          eficiencia: horasPlan > 0 ? Math.round((horasPlan / horasReales) * 100) : 0,
          promedioAvance: Math.round(promedioAvance)
        };
      });

      return tendencias;
    } catch (error) {
      logger.error('Error al obtener tendencias mensuales:', error);
      throw new Error('Error al calcular tendencias mensuales');
    }
  }

  // ✅ Análisis de rendimiento por categoría
  static async obtenerAnalisisRendimiento(
    proyectoId?: string
  ): Promise<AnalisisRendimiento[]> {
    try {
      const whereClause = {
        ...(proyectoId && { proyectoId })
      };

      const rendimientoPorCategoria = await prisma.proyectoEdt.groupBy({
        by: ['categoriaServicioId'],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          horasPlan: true,
          horasReales: true
        },
        _avg: {
          porcentajeAvance: true
        }
      });

      // 🔍 Obtener nombres de categorías
      const categoriasIds = rendimientoPorCategoria.map(r => r.categoriaServicioId);
      const categorias = await prisma.categoriaServicio.findMany({
        where: {
          id: {
            in: categoriasIds
          }
        },
        select: {
          id: true,
          nombre: true
        }
      });

      const categoriasMap = new Map(categorias.map(c => [c.id, c.nombre]));

      const analisis: AnalisisRendimiento[] = rendimientoPorCategoria.map(rendimiento => {
        const totalEdts = rendimiento._count.id;
        const horasPlan = Number(rendimiento._sum.horasPlan || 0);
        const horasReales = Number(rendimiento._sum.horasReales || 0);
        const promedioAvance = Number(rendimiento._avg.porcentajeAvance || 0);

        // 📊 Calcular métricas
        const eficiencia = horasPlan > 0 ? Math.round((horasPlan / horasReales) * 100) : 0;
        const desviacion = horasPlan > 0 ? Math.round(((horasReales - horasPlan) / horasPlan) * 100) : 0;
        
        // 🎯 Determinar nivel de rendimiento
        let nivelRendimiento: 'excelente' | 'bueno' | 'regular' | 'deficiente';
        if (eficiencia >= 90 && promedioAvance >= 80) {
          nivelRendimiento = 'excelente';
        } else if (eficiencia >= 75 && promedioAvance >= 60) {
          nivelRendimiento = 'bueno';
        } else if (eficiencia >= 60 && promedioAvance >= 40) {
          nivelRendimiento = 'regular';
        } else {
          nivelRendimiento = 'deficiente';
        }

        return {
          categoriaServicioId: rendimiento.categoriaServicioId,
          categoriaServicioNombre: categoriasMap.get(rendimiento.categoriaServicioId) || 'Sin categoría',
          totalEdts,
          horasPlan,
          horasReales,
          promedioAvance,
          eficiencia,
          desviacion,
          nivelRendimiento
        };
      });

      return analisis.sort((a, b) => b.eficiencia - a.eficiencia);
    } catch (error) {
      logger.error('Error al obtener análisis de rendimiento:', error);
      throw new Error('Error al calcular análisis de rendimiento');
    }
  }

  // ✅ Generar alertas automáticas
  static async generarAlertas(
    proyectoId?: string
  ): Promise<AlertaCronograma[]> {
    try {
      const alertas: AlertaCronograma[] = [];
      const hoy = new Date();
      const enUnaSemana = new Date();
      enUnaSemana.setDate(hoy.getDate() + 7);

      const whereClause = {
        ...(proyectoId && { proyectoId })
      };

      // 🚨 EDT retrasados
      const edtsRetrasados = await prisma.proyectoEdt.findMany({
        where: {
          ...whereClause,
          estado: { in: ['en_progreso', 'planificado'] },
          fechaFinPlan: {
            lt: hoy
          }
        },
        include: {
          proyecto: { select: { nombre: true } },
          categoriaServicio: { select: { nombre: true } },
          responsable: { select: { name: true } }
        }
      });

      edtsRetrasados.forEach(edt => {
        const diasRetraso = Math.ceil((hoy.getTime() - edt.fechaFinPlan!.getTime()) / (1000 * 60 * 60 * 24));
        alertas.push({
          tipo: 'retraso',
          severidad: diasRetraso > 7 ? 'alta' : 'media',
          titulo: `EDT retrasado: ${edt.categoriaServicio.nombre}`,
          descripcion: `${diasRetraso} días de retraso en ${edt.proyecto.nombre}`,
          proyectoId: edt.proyectoId,
          edtId: edt.id,
          responsableId: edt.responsableId ?? undefined,
          fechaDeteccion: hoy,
          datos: {
            diasRetraso,
            fechaFinPlan: edt.fechaFinPlan,
            porcentajeAvance: edt.porcentajeAvance
          }
        });
      });

      // ⚠️ EDT próximos a vencer
      const edtsProximosVencer = await prisma.proyectoEdt.findMany({
        where: {
          ...whereClause,
          estado: { in: ['en_progreso', 'planificado'] },
          fechaFinPlan: {
            gte: hoy,
            lte: enUnaSemana
          }
        },
        include: {
          proyecto: { select: { nombre: true } },
          categoriaServicio: { select: { nombre: true } },
          responsable: { select: { name: true } }
        }
      });

      edtsProximosVencer.forEach(edt => {
        const diasRestantes = Math.ceil((edt.fechaFinPlan!.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        alertas.push({
          tipo: 'vencimiento_proximo',
          severidad: diasRestantes <= 3 ? 'alta' : 'media',
          titulo: `EDT próximo a vencer: ${edt.categoriaServicio.nombre}`,
          descripcion: `Vence en ${diasRestantes} días en ${edt.proyecto.nombre}`,
          proyectoId: edt.proyectoId,
          edtId: edt.id,
          responsableId: edt.responsableId ?? undefined,
          fechaDeteccion: hoy,
          datos: {
            diasRestantes,
            fechaFinPlan: edt.fechaFinPlan,
            porcentajeAvance: edt.porcentajeAvance
          }
        });
      });

      // 📊 EDT con desviación significativa de horas
      const edtsDesviacion = await prisma.proyectoEdt.findMany({
        where: {
          ...whereClause,
          estado: { in: ['en_progreso', 'completado'] },
          horasPlan: { gt: 0 },
          horasReales: { gt: 0 }
        },
        include: {
          proyecto: { select: { nombre: true } },
          categoriaServicio: { select: { nombre: true } },
          responsable: { select: { name: true } }
        }
      });

      edtsDesviacion.forEach(edt => {
        const horasPlan = Number(edt.horasPlan);
        const horasReales = Number(edt.horasReales);
        const desviacion = Math.round(((horasReales - horasPlan) / horasPlan) * 100);

        if (Math.abs(desviacion) > 25) { // Desviación mayor al 25%
          alertas.push({
            tipo: 'desviacion_horas',
            severidad: Math.abs(desviacion) > 50 ? 'alta' : 'media',
            titulo: `Desviación de horas: ${edt.categoriaServicio.nombre}`,
            descripcion: `${desviacion > 0 ? 'Exceso' : 'Déficit'} de ${Math.abs(desviacion)}% en ${edt.proyecto.nombre}`,
            proyectoId: edt.proyectoId,
            edtId: edt.id,
            responsableId: edt.responsableId ?? undefined,
            fechaDeteccion: hoy,
            datos: {
              desviacion,
              horasPlan,
              horasReales
            }
          });
        }
      });

      // 🔄 EDT sin progreso reciente
      const fechaLimite = new Date();
      fechaLimite.setDate(hoy.getDate() - 7); // Sin registros en 7 días

      const edtsSinProgreso = await prisma.proyectoEdt.findMany({
        where: {
          ...whereClause,
          estado: 'en_progreso',
          registrosHoras: {
            none: {
              fechaTrabajo: {
                gte: fechaLimite
              }
            }
          }
        },
        include: {
          proyecto: { select: { nombre: true } },
          categoriaServicio: { select: { nombre: true } },
          responsable: { select: { name: true } }
        }
      });

      edtsSinProgreso.forEach(edt => {
        alertas.push({
          tipo: 'sin_progreso',
          severidad: 'media',
          titulo: `Sin progreso reciente: ${edt.categoriaServicio.nombre}`,
          descripcion: `No hay registros de horas en los últimos 7 días en ${edt.proyecto.nombre}`,
          proyectoId: edt.proyectoId,
          edtId: edt.id,
          responsableId: edt.responsableId ?? undefined,
          fechaDeteccion: hoy,
          datos: {
            diasSinRegistros: 7,
            porcentajeAvance: edt.porcentajeAvance
          }
        });
      });

      return alertas.sort((a, b) => {
        const severidadOrder = { 'alta': 3, 'media': 2, 'baja': 1 };
        return severidadOrder[b.severidad] - severidadOrder[a.severidad];
      });
    } catch (error) {
      logger.error('Error al generar alertas:', error);
      throw new Error('Error al generar alertas del cronograma');
    }
  }

  // ✅ Métricas comparativas entre proyectos
  static async obtenerMetricasComparativas(
    proyectosIds: string[]
  ): Promise<MetricasComparativas[]> {
    try {
      const metricas: MetricasComparativas[] = [];

      for (const proyectoId of proyectosIds) {
        const proyecto = await prisma.proyecto.findUnique({
          where: { id: proyectoId },
          select: { id: true, nombre: true, codigo: true }
        });

        if (!proyecto) continue;

        const kpis = await this.obtenerKpisCronograma(proyectoId);
        
        metricas.push({
          proyectoId,
          proyectoNombre: proyecto.nombre,
          proyectoCodigo: proyecto.codigo,
          totalEdts: kpis.totalEdts,
          porcentajeCompletitud: kpis.totalEdts > 0 
            ? Math.round((kpis.edtsCompletados / kpis.totalEdts) * 100) 
            : 0,
          eficienciaGeneral: kpis.eficienciaGeneral,
          cumplimientoFechas: kpis.cumplimientoFechas,
          desviacionPresupuestaria: kpis.desviacionPresupuestaria,
          horasPlanTotal: kpis.horasPlanTotal,
          horasRealesTotal: kpis.horasRealesTotal
        });
      }

      return metricas.sort((a, b) => b.eficienciaGeneral - a.eficienciaGeneral);
    } catch (error) {
      logger.error('Error al obtener métricas comparativas:', error);
      throw new Error('Error al calcular métricas comparativas');
    }
  }

  // ✅ Dashboard ejecutivo - Resumen de alto nivel
  static async obtenerDashboardEjecutivo(): Promise<{
    resumenGeneral: KpisCronograma;
    proyectosCriticos: { proyectoId: string; proyectoNombre: string; alertasAltas: number }[];
    tendenciaUltimosTrimestres: TendenciaMensual[];
    topCategoriasPorRendimiento: AnalisisRendimiento[];
  }> {
    try {
      // 📊 Resumen general de todos los proyectos
      const resumenGeneral = await this.obtenerKpisCronograma();

      // 🚨 Proyectos con más alertas críticas
      const alertasTodasProyectos = await this.generarAlertas();
      const alertasPorProyecto = new Map<string, { nombre: string; alertasAltas: number }>();
      
      for (const alerta of alertasTodasProyectos) {
        if (alerta.severidad === 'alta') {
          const proyecto = await prisma.proyecto.findUnique({
            where: { id: alerta.proyectoId },
            select: { nombre: true }
          });
          
          if (proyecto) {
            const actual = alertasPorProyecto.get(alerta.proyectoId) || 
              { nombre: proyecto.nombre, alertasAltas: 0 };
            actual.alertasAltas++;
            alertasPorProyecto.set(alerta.proyectoId, actual);
          }
        }
      }

      const proyectosCriticos = Array.from(alertasPorProyecto.entries())
        .map(([proyectoId, data]) => ({
          proyectoId,
          proyectoNombre: data.nombre,
          alertasAltas: data.alertasAltas
        }))
        .sort((a, b) => b.alertasAltas - a.alertasAltas)
        .slice(0, 5);

      // 📈 Tendencia últimos 3 meses
      const tendenciaUltimosTrimestres = await this.obtenerTendenciasMensuales(undefined, 3);

      // 🏆 Top 5 categorías por rendimiento
      const topCategoriasPorRendimiento = (await this.obtenerAnalisisRendimiento())
        .slice(0, 5);

      return {
        resumenGeneral,
        proyectosCriticos,
        tendenciaUltimosTrimestres,
        topCategoriasPorRendimiento
      };
    } catch (error) {
      logger.error('Error al obtener dashboard ejecutivo:', error);
      throw new Error('Error al generar dashboard ejecutivo');
    }
  }
}
