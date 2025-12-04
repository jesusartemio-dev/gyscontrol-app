/**
 * Script de Migración: Cotizaciones de 4 niveles a 6 niveles
 *
 * Migra cotizaciones existentes del sistema anterior de 4 niveles al nuevo sistema de 6 niveles:
 * Anterior: Proyecto(implícito) → Fases → EDTs → Tareas (con campo zona opcional string)
 * Nuevo: Proyecto(implícito) → Fases → EDTs → Zonas → Actividades → Tareas
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

interface MigrationStats {
  cotizacionesMigradas: number;
  zonasCreadas: number;
  actividadesCreadas: number;
  tareasReubicadas: number;
  errores: string[];
}

export class QuoteMigrationService {
  /**
   * Ejecutar migración completa de cotizaciones
   */
  static async ejecutarMigracionCompleta(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      cotizacionesMigradas: 0,
      zonasCreadas: 0,
      actividadesCreadas: 0,
      tareasReubicadas: 0,
      errores: []
    };

    try {
      logger.info('🚀 Iniciando migración de cotizaciones a 6 niveles');

      // Paso 1: Obtener cotizaciones con EDTs
      const cotizaciones = await prisma.cotizacion.findMany({
        where: {
          estado: {
            not: 'borrador' // Solo cotizaciones activas
          }
        },
        include: {
          cronograma: true
        }
      });

      logger.info(`📋 Encontradas ${cotizaciones.length} cotizaciones para migrar`);

      // Paso 2: Migrar cada cotización
      for (const cotizacion of cotizaciones) {
        try {
          await this.migrarCotizacion(cotizacion, stats);
          stats.cotizacionesMigradas++;
        } catch (error) {
          const errorMsg = `Error migrando cotización ${cotizacion.nombre}: ${error instanceof Error ? error.message : String(error)}`;
          stats.errores.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Paso 3: Validar migración
      await this.validarMigracion(stats);

      logger.info('✅ Migración completada exitosamente', stats);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Error en migración:', error);
      stats.errores.push(`Error general: ${errorMessage}`);
    }

    return stats;
  }

  /**
   * Migrar una cotización individual
   */
  private static async migrarCotizacion(
    cotizacion: any,
    stats: MigrationStats
  ): Promise<void> {
    logger.info(`🔄 Migrando cotización: ${cotizacion.nombre}`);

    for (const edt of cotizacion.cronograma) {
      // Verificar si ya tiene zonas
      const zonasExistentes = await prisma.cotizacionZona.findMany({
        where: { cotizacionEdtId: edt.id }
      });

      if (zonasExistentes.length > 0) {
        logger.info(`⏭️ EDT ${edt.nombre} ya tiene zonas, saltando`);
        continue;
      }

      // Crear zona por defecto
      const zona = await prisma.cotizacionZona.create({
        data: {
          cotizacionId: edt.cotizacionId,
          cotizacionEdtId: edt.id,
          nombre: `Zona Principal - ${edt.nombre}`,
          fechaInicioComercial: edt.fechaInicioComercial,
          fechaFinComercial: edt.fechaFinComercial,
          estado: edt.estado || 'planificado',
          porcentajeAvance: 0
        }
      });

      stats.zonasCreadas++;
      logger.info(`📍 Creada zona: ${zona.nombre}`);

      // Crear actividad por defecto
      const actividad = await prisma.cotizacionActividad.create({
        data: {
          cotizacionZonaId: zona.id,
          nombre: `Actividad Principal - ${edt.nombre}`,
          fechaInicioComercial: edt.fechaInicioComercial,
          fechaFinComercial: edt.fechaFinComercial,
          estado: 'pendiente',
          prioridad: edt.prioridad || 'media',
          porcentajeAvance: 0,
          descripcion: 'Actividad principal del EDT'
        }
      });

      stats.actividadesCreadas++;
      logger.info(`⚙️ Creada actividad: ${actividad.nombre}`);

      // Reubicar tareas existentes a la nueva actividad
      for (const tarea of edt.tareas || []) {
        await prisma.cotizacionTarea.update({
          where: { id: tarea.id },
          data: {
            cotizacionActividadId: actividad.id
          }
        });
        stats.tareasReubicadas++;
      }

      logger.info(`✅ Reubicadas ${edt.tareas?.length || 0} tareas`);
    }
  }

  /**
   * Validar migración
   */
  private static async validarMigracion(stats: MigrationStats): Promise<void> {
    logger.info('✅ Validando migración');

    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        estado: {
          not: 'borrador'
        }
      },
      include: {
        cronograma: {
          include: {
            zonas: {
              include: {
                actividades: {
                  include: {
                    tareas: true
                  }
                }
              }
            }
          }
        }
      }
    });

    let totalEdts = 0;
    let totalZonas = 0;
    let totalActividades = 0;
    let totalTareas = 0;

    for (const cotizacion of cotizaciones) {
      for (const edt of cotizacion.cronograma) {
        totalEdts++;

        if (edt.zonas.length === 0) {
          stats.errores.push(`EDT ${edt.nombre} no tiene zonas`);
          continue;
        }

        for (const zona of edt.zonas) {
          totalZonas++;

          if (zona.actividades.length === 0) {
            stats.errores.push(`Zona ${zona.nombre} no tiene actividades`);
            continue;
          }

          for (const actividad of zona.actividades) {
            totalActividades++;
            totalTareas += actividad.tareas.length;
          }
        }
      }
    }

    logger.info(`✅ Validación completada:`);
    logger.info(`   EDTs totales: ${totalEdts}`);
    logger.info(`   Zonas totales: ${totalZonas}`);
    logger.info(`   Actividades totales: ${totalActividades}`);
    logger.info(`   Tareas totales: ${totalTareas}`);
    logger.info(`   Errores encontrados: ${stats.errores.length}`);
  }

  /**
   * Ejecutar rollback de migración (para testing)
   */
  static async rollbackMigracion(): Promise<void> {
    logger.warn('🔄 Ejecutando rollback de migración de cotizaciones...');

    try {
      // Eliminar actividades nuevas
      await prisma.cotizacionActividad.deleteMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        }
      });

      // Eliminar zonas nuevas
      await prisma.cotizacionZona.deleteMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      // Restaurar tareas (quitar cotizacionActividadId)
      // Nota: Para simplificar, no haremos rollback automático de tareas
      // ya que es complejo determinar cuáles fueron migradas vs cuáles ya existían
      logger.info('⚠️ No se realizó rollback automático de tareas para evitar pérdida de datos');

      logger.info('✅ Rollback completado');

    } catch (error) {
      logger.error('❌ Error en rollback:', error);
      throw error;
    }
  }
}

// Script ejecutable
if (require.main === module) {
  QuoteMigrationService.ejecutarMigracionCompleta()
    .then((stats) => {
      console.log('🎉 Migración de cotizaciones a 6 niveles completada:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export default QuoteMigrationService;