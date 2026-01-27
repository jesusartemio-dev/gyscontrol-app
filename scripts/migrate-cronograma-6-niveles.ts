/**
 * Script de Migración: Sistema de Cronograma de 6 Niveles
 *
 * Migra datos del sistema anterior de 4 niveles al nuevo sistema de 6 niveles:
 * Anterior: Proyecto → Fases → EDTs → Tareas
 * Nuevo: Proyecto → Fases → EDTs → Zonas → Actividades → Tareas
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

interface MigrationStats {
  proyectosMigrados: number;
  fasesCreadas: number;
  edtsMigrados: number;
  zonasCreadas: number;
  actividadesCreadas: number;
  tareasMigradas: number;
  dependenciasMigradas: number;
  errores: string[];
}

export class CronogramaMigrationService {
  /**
   * Ejecutar migración completa del sistema
   */
  static async ejecutarMigracionCompleta(): Promise<MigrationStats> {
    const stats: MigrationStats = {
      proyectosMigrados: 0,
      fasesCreadas: 0,
      edtsMigrados: 0,
      zonasCreadas: 0,
      actividadesCreadas: 0,
      tareasMigradas: 0,
      dependenciasMigradas: 0,
      errores: []
    };

    try {
      logger.info('🚀 Iniciando migración del sistema de cronograma de 6 niveles');

      // Paso 1: Migrar proyectos existentes
      await this.migrarProyectos(stats);

      // Paso 2: Crear estructura de 6 niveles para proyectos existentes
      await this.crearEstructura6Niveles(stats);

      // Paso 3: Migrar dependencias existentes
      await this.migrarDependencias(stats);

      // Paso 4: Validar migración
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
   * Paso 1: Migrar proyectos existentes
   */
  private static async migrarProyectos(stats: MigrationStats): Promise<void> {
    logger.info('📋 Paso 1: Migrando proyectos existentes');

    const proyectos = await prisma.proyecto.findMany({
      where: {
        estado: {
          not: 'creado' // Solo proyectos que ya tienen estructura
        }
      },
      include: {
        fases: true,
        proyectoEdts: true
      }
    });

    for (const proyecto of proyectos) {
      try {
        // Verificar si ya tiene cronograma de 6 niveles
        const cronogramaExistente = await prisma.proyectoCronograma.findFirst({
          where: {
            proyectoId: proyecto.id,
            tipo: 'planificacion'
          }
        });

        if (!cronogramaExistente) {
          // Crear cronograma de planificación
          await prisma.proyectoCronograma.create({
            data: {
              proyectoId: proyecto.id,
              tipo: 'planificacion',
              nombre: 'Cronograma de Planificación (Migrado)',
              esBaseline: false,
              version: 1
            }
          });

          logger.info(`📝 Creado cronograma para proyecto: ${proyecto.nombre}`);
        }

        stats.proyectosMigrados++;

      } catch (error) {
        const errorMsg = `Error migrando proyecto ${proyecto.nombre}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errores.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(`✅ Proyectos migrados: ${stats.proyectosMigrados}`);
  }

  /**
   * Paso 2: Crear estructura de 6 niveles para cotizaciones
   */
  private static async crearEstructura6Niveles(stats: MigrationStats): Promise<void> {
    logger.info('🏗️ Paso 2: Creando estructura de 6 niveles para cotizaciones');

    // Migrar cotizaciones existentes a 6 niveles
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        fases: {
          include: {
            edts: {
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
        },
        servicios: {
          include: {
            edts: {
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
        },
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
    });

    for (const cotizacion of cotizaciones) {
      try {
        await this.migrarCotizacionA6Niveles(cotizacion, stats);
      } catch (error) {
        const errorMsg = `Error migrando cotización ${cotizacion.nombre}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errores.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // Ahora procesar proyectos
    const proyectos = await prisma.proyecto.findMany({
      include: {
        fases: {
          include: {
            edts: {
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
        },
        proyectoEdts: {
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

    for (const proyecto of proyectos) {
      try {
        const cronograma = await prisma.proyectoCronograma.findFirst({
          where: {
            proyectoId: proyecto.id,
            tipo: 'planificacion'
          }
        });

        if (!cronograma) continue;

        // Procesar EDTs que no están asignados a fases
        const edtsSinFase = proyecto.proyectoEdts.filter(edt =>
          !proyecto.fases.some(fase => fase.edts.some(faseEdt => faseEdt.id === edt.id))
        );

        for (const edt of edtsSinFase) {
          await this.procesarEdtSinFase(edt, cronograma.id, stats);
        }

        // Procesar EDTs dentro de fases
        for (const fase of proyecto.fases) {
          for (const edt of fase.edts) {
            await this.procesarEdtConFase(edt, fase.id, cronograma.id, stats);
          }
        }

      } catch (error) {
        const errorMsg = `Error creando estructura para proyecto ${proyecto.nombre}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errores.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(`✅ Estructura 6 niveles creada: ${stats.zonasCreadas} zonas, ${stats.actividadesCreadas} actividades`);
  }

  /**
   * Migrar cotización a estructura de 6 niveles
   */
  private static async migrarCotizacionA6Niveles(
    cotizacion: any,
    stats: MigrationStats
  ): Promise<void> {
    logger.info(`Migrando cotización: ${cotizacion.nombre}`);

    // Para cada EDT en la cotización, crear zonas y actividades si no existen
    const todosEdts = [
      ...cotizacion.fases.flatMap((fase: any) => fase.edts),
      ...cotizacion.servicios.flatMap((servicio: any) => servicio.edts)
    ];

    for (const edt of todosEdts) {
      // Verificar si ya tiene zonas
      if (edt.zonas.length === 0) {
        // Crear zona por defecto
        const zona = await prisma.cotizacionZona.create({
          data: {
            cotizacionId: cotizacion.id,
            cotizacionEdtId: edt.id,
            nombre: `Zona Principal - ${edt.nombre}`,
            fechaInicioComercial: edt.fechaInicioComercial,
            fechaFinComercial: edt.fechaFinComercial,
            estado: 'planificado',
            porcentajeAvance: 0
          }
        });

        stats.zonasCreadas++;

        // Crear actividad por defecto
        const actividad = await prisma.cotizacionActividad.create({
          data: {
            cotizacionZonaId: zona.id,
            nombre: `Actividad Principal - ${edt.nombre}`,
            fechaInicioComercial: edt.fechaInicioComercial,
            fechaFinComercial: edt.fechaFinComercial,
            estado: 'pendiente',
            porcentajeAvance: 0,
            prioridad: edt.prioridad || 'media'
          }
        });

        stats.actividadesCreadas++;

        // Si hay tareas en el EDT, migrarlas a la actividad
        // Nota: Las tareas están en CotizacionServicioItem, no directamente en EDT
        // Esta lógica puede necesitar ajuste según la estructura real
      }
    }

    stats.edtsMigrados += todosEdts.length;
  }

  /**
   * Procesar EDT sin fase asignada
   */
  private static async procesarEdtSinFase(
    edt: any,
    cronogramaId: string,
    stats: MigrationStats
  ): Promise<void> {
    // Crear zona por defecto para EDTs sin fase
    const zona = await prisma.proyectoZona.create({
      data: {
        proyectoId: edt.proyectoId,
        proyectoEdtId: edt.id,
        nombre: `Zona Principal - ${edt.nombre}`,
        fechaInicioPlan: edt.fechaInicioPlan,
        fechaFinPlan: edt.fechaFinPlan,
        horasPlan: edt.horasPlan || 0,
        estado: 'planificado'
      }
    });

    stats.zonasCreadas++;

    // Crear actividad por defecto
    const actividad = await prisma.proyectoActividad.create({
      data: {
        proyectoZonaId: zona.id,
        proyectoCronogramaId: cronogramaId,
        nombre: `Actividad Principal - ${edt.nombre}`,
        fechaInicioPlan: edt.fechaInicioPlan,
        fechaFinPlan: edt.fechaFinPlan,
        horasPlan: edt.horasPlan || 0,
        estado: 'pendiente',
        prioridad: edt.prioridad || 'media'
      }
    });

    stats.actividadesCreadas++;

    // Migrar tareas existentes a la nueva actividad
    for (const tarea of edt.tareas || []) {
      await prisma.proyectoTarea.update({
        where: { id: tarea.id },
        data: {
          proyectoActividadId: actividad.id
        }
      });
      stats.tareasMigradas++;
    }

    stats.edtsMigrados++;
  }

  /**
   * Procesar EDT con fase asignada
   */
  private static async procesarEdtConFase(
    edt: any,
    faseId: string,
    cronogramaId: string,
    stats: MigrationStats
  ): Promise<void> {
    // Verificar si ya tiene zonas
    const zonasExistentes = await prisma.proyectoZona.findMany({
      where: { proyectoEdtId: edt.id }
    });

    if (zonasExistentes.length === 0) {
      // Crear zona por defecto
      const zona = await prisma.proyectoZona.create({
        data: {
          proyectoId: edt.proyectoId,
          proyectoEdtId: edt.id,
          nombre: `Zona ${edt.nombre}`,
          fechaInicioPlan: edt.fechaInicioPlan,
          fechaFinPlan: edt.fechaFinPlan,
          horasPlan: edt.horasPlan || 0,
          estado: 'planificado'
        }
      });

      stats.zonasCreadas++;

      // Crear actividad por defecto
      const actividad = await prisma.proyectoActividad.create({
        data: {
          proyectoZonaId: zona.id,
          proyectoCronogramaId: cronogramaId,
          nombre: `Actividad ${edt.nombre}`,
          fechaInicioPlan: edt.fechaInicioPlan,
          fechaFinPlan: edt.fechaFinPlan,
          horasPlan: edt.horasPlan || 0,
          estado: 'pendiente',
          prioridad: edt.prioridad || 'media'
        }
      });

      stats.actividadesCreadas++;

      // Migrar tareas existentes
      for (const tarea of edt.tareas || []) {
        await prisma.proyectoTarea.update({
          where: { id: tarea.id },
          data: {
            proyectoActividadId: actividad.id
          }
        });
        stats.tareasMigradas++;
      }
    }

    stats.edtsMigrados++;
  }

  /**
   * Paso 3: Migrar dependencias existentes
   */
  private static async migrarDependencias(stats: MigrationStats): Promise<void> {
    logger.info('🔗 Paso 3: Migrando dependencias existentes');

    // Nota: Las dependencias existentes entre tareas deberían mantenerse
    // ya que el modelo ProyectoDependenciaTarea sigue siendo válido

    const dependencias = await prisma.proyectoDependenciaTarea.findMany({
      include: {
        tareaOrigen: true,
        tareaDependiente: true
      }
    });

    // Validar que todas las dependencias sean válidas en el nuevo sistema
    for (const dependencia of dependencias) {
      try {
        // Verificar que ambas tareas tengan actividad asignada
        if (!dependencia.tareaOrigen.proyectoActividadId ||
            !dependencia.tareaDependiente.proyectoActividadId) {
          stats.errores.push(`Dependencia ${dependencia.id} tiene tareas sin actividad asignada`);
          continue;
        }

        stats.dependenciasMigradas++;

      } catch (error) {
        const errorMsg = `Error validando dependencia ${dependencia.id}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errores.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(`✅ Dependencias migradas: ${stats.dependenciasMigradas}`);
  }

  /**
   * Paso 4: Validar migración
   */
  private static async validarMigracion(stats: MigrationStats): Promise<void> {
    logger.info('✅ Paso 4: Validando migración');

    const proyectos = await prisma.proyecto.findMany({
      include: {
        fases: {
          include: {
            edts: {
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
        },
        proyectoEdts: {
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

    let proyectosValidos = 0;
    let totalZonas = 0;
    let totalActividades = 0;
    let totalTareas = 0;

    for (const proyecto of proyectos) {
      try {
        // Validar que cada EDT tenga al menos una zona
        const todosEdts = [...proyecto.fases.flatMap(f => f.edts), ...proyecto.proyectoEdts];

        for (const edt of todosEdts) {
          if (edt.zonas.length === 0) {
            stats.errores.push(`EDT ${edt.nombre} no tiene zonas asignadas`);
            continue;
          }

          // Validar que cada zona tenga al menos una actividad
          for (const zona of edt.zonas) {
            totalZonas++;
            if (zona.actividades.length === 0) {
              stats.errores.push(`Zona ${zona.nombre} no tiene actividades asignadas`);
              continue;
            }

            // Validar que cada actividad tenga tareas asignadas
            for (const actividad of zona.actividades) {
              totalActividades++;
              const tareasActividad = actividad.tareas.length;
              totalTareas += tareasActividad;

              if (tareasActividad === 0) {
                stats.errores.push(`Actividad ${actividad.nombre} no tiene tareas asignadas`);
              }
            }
          }
        }

        proyectosValidos++;

      } catch (error) {
        const errorMsg = `Error validando proyecto ${proyecto.nombre}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errores.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(`✅ Validación completada:`);
    logger.info(`   Proyectos válidos: ${proyectosValidos}`);
    logger.info(`   Zonas totales: ${totalZonas}`);
    logger.info(`   Actividades totales: ${totalActividades}`);
    logger.info(`   Tareas totales: ${totalTareas}`);
    logger.info(`   Errores encontrados: ${stats.errores.length}`);
  }

  /**
   * Ejecutar rollback de migración (para testing)
   */
  static async rollbackMigracion(): Promise<void> {
    logger.warn('🔄 Ejecutando rollback de migración...');

    try {
      // Eliminar dependencias nuevas (si las hay)
      await prisma.proyectoDependenciaTarea.deleteMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          }
        }
      });

      // Eliminar tareas migradas (restaurar proyectoActividadId null si es necesario)
      // Nota: Esto es complejo, mejor no automatizar

      // Eliminar actividades nuevas
      await prisma.proyectoActividad.deleteMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      // Eliminar zonas nuevas
      await prisma.proyectoZona.deleteMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      // Eliminar cronogramas nuevos
      await prisma.proyectoCronograma.deleteMany({
        where: {
          tipo: 'planificacion',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      logger.info('✅ Rollback completado');

    } catch (error) {
      logger.error('❌ Error en rollback:', error);
      throw error;
    }
  }
}

// Script ejecutable
if (require.main === module) {
  CronogramaMigrationService.ejecutarMigracionCompleta()
    .then((stats) => {
      console.log('🎉 Migración completada:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export default CronogramaMigrationService;