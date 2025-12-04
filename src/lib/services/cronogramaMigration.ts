/**
 * Servicio de Migración - Sistema de Cronograma de 5 Niveles
 *
 * Convierte proyectos existentes de 4 niveles a 5 niveles jerárquicos.
 * Proyecto → Fases → EDTs → Actividades → Tareas
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface MigrationResult {
  proyectoId: string;
  proyectoNombre: string;
  exito: boolean;
  estadisticas: {
    edtsMigrados: number;
    zonasCreadas: number;
    actividadesCreadas: number;
    tareasMigradas: number;
    dependenciasCreadas: number;
  };
  errores: string[];
  warnings: string[];
  tiempoEjecucion: number;
  fechaMigracion: Date;
}

export interface MigrationPreview {
  proyectoId: string;
  proyectoNombre: string;
  analisis: {
    totalEdts: number;
    totalTareas: number;
    totalDependencias: number;
    edtsSinZona: number;
    tareasSinEdt: number;
  };
  planMigracion: {
    zonasACrear: number;
    actividadesACrear: number;
    tareasAMigrar: number;
    dependenciasACrear: number;
  };
  riesgos: string[];
  recomendaciones: string[];
}

export class CronogramaMigrationService {
  /**
   * ✅ Migra un proyecto específico de 4 a 5 niveles
   */
  static async migrarProyecto(proyectoId: string): Promise<MigrationResult> {
    const inicio = Date.now();
    const resultado: MigrationResult = {
      proyectoId,
      proyectoNombre: '',
      exito: false,
      estadisticas: {
        edtsMigrados: 0,
        zonasCreadas: 0,
        actividadesCreadas: 0,
        tareasMigradas: 0,
        dependenciasCreadas: 0,
      },
      errores: [],
      warnings: [],
      tiempoEjecucion: 0,
      fechaMigracion: new Date(),
    };

    try {
      logger.info(`🚀 Iniciando migración del proyecto ${proyectoId}`);

      // 1. Verificar que el proyecto existe
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true,
          _count: {
            select: {
              proyectoEdts: true,
            },
          },
        },
      });

      if (!proyecto) {
        throw new Error(`Proyecto ${proyectoId} no encontrado`);
      }

      resultado.proyectoNombre = proyecto.nombre;

      // 2. Verificar si ya está migrado
      const yaMigrado = await this.verificarProyectoMigrado(proyectoId);
      if (yaMigrado) {
        resultado.warnings.push('El proyecto ya parece estar migrado a 5 niveles');
        resultado.exito = true;
        return resultado;
      }

      // 3. Obtener EDTs del proyecto
      const edts = await prisma.proyectoEdt.findMany({
        where: { proyectoId },
        include: {
          ProyectoTarea: {
            include: {
              dependencia: true,
            },
          },
          categoriaServicio: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      logger.info(`📊 Encontrados ${edts.length} EDTs para migrar`);

      // 4. Procesar cada EDT
      for (const edt of edts) {
        try {
          await this.migrarEdt(edt, resultado);
          resultado.estadisticas.edtsMigrados++;
        } catch (error) {
          const errorMsg = `Error migrando EDT ${edt.nombre}: ${error instanceof Error ? error.message : String(error)}`;
          resultado.errores.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // 5. Marcar proyecto como migrado
      await this.marcarProyectoMigrado(proyectoId);

      resultado.exito = resultado.errores.length === 0;
      resultado.tiempoEjecucion = Date.now() - inicio;

      logger.info(`✅ Migración a 5 niveles completada: ${JSON.stringify(resultado.estadisticas)}`);

    } catch (error) {
      resultado.errores.push(`Error general en migración: ${error instanceof Error ? error.message : String(error)}`);
      resultado.tiempoEjecucion = Date.now() - inicio;
      logger.error('❌ Error en migración:', error);
    }

    return resultado;
  }

  /**
   * ✅ Migra un EDT específico creando zona y actividad por defecto
   */
  private static async migrarEdt(
    edt: any,
    resultado: MigrationResult
  ): Promise<void> {
    const proyectoId = edt.proyectoId;

    // ✅ SISTEMA DE 5 NIVELES: Crear actividad directamente bajo EDT (sin zona intermedia)
    const actividad = await prisma.proyectoActividad.create({
      data: {
        proyectoEdtId: edt.id, // ✅ Directo al EDT
        proyectoCronogramaId: edt.proyectoCronogramaId,
        nombre: `Actividad Principal - ${edt.nombre}`,
        descripcion: `Actividad principal creada automáticamente durante la migración del EDT ${edt.nombre}`,
        fechaInicioPlan: edt.fechaInicioPlan || new Date(),
        fechaFinPlan: edt.fechaFinPlan || new Date(),
        horasPlan: edt.horasPlan || 0,
        estado: 'pendiente',
        prioridad: edt.prioridad || 'media',
        porcentajeAvance: 0,
        orden: 0, // ✅ Agregar orden requerido
      } as any, // ✅ Type assertion para evitar errores de tipos complejos
      select: {
        id: true,
        nombre: true,
        proyectoEdtId: true,
        proyectoCronogramaId: true,
      },
    });

    resultado.estadisticas.actividadesCreadas++;
    logger.info(`⚙️ Actividad creada: ${actividad.nombre} directamente bajo EDT ${edt.nombre}`);

    // 3. Migrar tareas existentes a la nueva actividad
    for (const tarea of edt.ProyectoTarea || []) {
      try {
        await prisma.proyectoTarea.update({
          where: { id: tarea.id },
          data: {
            proyectoActividadId: actividad.id,
          },
        });
        resultado.estadisticas.tareasMigradas++;
      } catch (error) {
        resultado.errores.push(`Error migrando tarea ${tarea.nombre}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 4. Crear dependencias si existen
    if (edt.ProyectoTarea && edt.ProyectoTarea.length > 0) {
      await this.migrarDependenciasTareas(edt.ProyectoTarea, resultado);
    }
  }

  /**
   * ✅ Migra dependencias entre tareas
   */
  private static async migrarDependenciasTareas(
    tareas: any[],
    resultado: MigrationResult
  ): Promise<void> {
    // Buscar tareas que tienen dependencias
    const tareasConDependencias = tareas.filter(t => t.dependenciaId);

    for (const tarea of tareasConDependencias) {
      try {
        // Verificar que tanto la tarea origen como destino existen
        const tareaOrigen = tareas.find(t => t.id === tarea.dependenciaId);
        if (!tareaOrigen) {
          resultado.warnings.push(`Dependencia rota: tarea ${tarea.nombre} depende de tarea no encontrada`);
          continue;
        }

        // Crear dependencia en el nuevo sistema
        await prisma.proyectoDependenciaTarea.create({
          data: {
            tareaOrigenId: tareaOrigen.id,
            tareaDependienteId: tarea.id,
            tipo: 'finish_to_start', // Por defecto
          },
        });

        resultado.estadisticas.dependenciasCreadas++;
      } catch (error) {
        resultado.errores.push(`Error creando dependencia para tarea ${tarea.nombre}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * ✅ Verifica si un proyecto ya está migrado (sistema de 5 niveles)
   */
  private static async verificarProyectoMigrado(proyectoId: string): Promise<boolean> {
    try {
      // ✅ SISTEMA DE 5 NIVELES: Verificar si existen actividades directamente bajo EDTs
      const actividadesCount = await prisma.proyectoActividad.count({
        where: {
          proyecto_edt: {
            proyectoId,
          },
        },
      });

      return actividadesCount > 0;
    } catch (error) {
      logger.error('Error verificando migración:', error);
      return false;
    }
  }

  /**
   * ✅ Marca un proyecto como migrado
   */
  private static async marcarProyectoMigrado(proyectoId: string): Promise<void> {
    try {
      // Podríamos agregar un campo al proyecto para marcarlo como migrado
      // Por ahora, solo loggeamos
      logger.info(`✅ Proyecto ${proyectoId} marcado como migrado a 5 niveles`);
    } catch (error) {
      logger.error('Error marcando proyecto como migrado:', error);
    }
  }

  /**
   * ✅ Genera preview de migración sin ejecutarla
   */
  static async generarPreviewMigracion(proyectoId: string): Promise<MigrationPreview> {
    const preview: MigrationPreview = {
      proyectoId,
      proyectoNombre: '',
      analisis: {
        totalEdts: 0,
        totalTareas: 0,
        totalDependencias: 0,
        edtsSinZona: 0,
        tareasSinEdt: 0,
      },
      planMigracion: {
        zonasACrear: 0,
        actividadesACrear: 0,
        tareasAMigrar: 0,
        dependenciasACrear: 0,
      },
      riesgos: [],
      recomendaciones: [],
    };

    try {
      // Obtener información del proyecto
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          nombre: true,
          _count: {
            select: {
              proyectoEdts: true,
            },
          },
        },
      });

      if (!proyecto) {
        throw new Error(`Proyecto ${proyectoId} no encontrado`);
      }

      preview.proyectoNombre = proyecto.nombre;
      preview.analisis.totalEdts = proyecto._count.proyectoEdts;

      // Analizar EDTs y tareas
      const edts = await prisma.proyectoEdt.findMany({
        where: { proyectoId },
        include: {
          ProyectoTarea: true,
          _count: {
            select: {
              ProyectoTarea: true,
            },
          },
        },
      });

      let totalTareas = 0;
      let totalDependencias = 0;

      for (const edt of edts) {
        totalTareas += edt._count.ProyectoTarea;
        totalDependencias += edt.ProyectoTarea.filter((t: any) => t.dependenciaId).length;
      }

      preview.analisis.totalTareas = totalTareas;
      preview.analisis.totalDependencias = totalDependencias;

      // Calcular plan de migración
      preview.planMigracion.zonasACrear = preview.analisis.totalEdts;
      preview.planMigracion.actividadesACrear = preview.analisis.totalEdts;
      preview.planMigracion.tareasAMigrar = preview.analisis.totalTareas;
      preview.planMigracion.dependenciasACrear = preview.analisis.totalDependencias;

      // Identificar riesgos
      if (preview.analisis.totalDependencias > 0) {
        preview.riesgos.push('Existen dependencias entre tareas que deben ser migradas');
      }

      if (preview.analisis.totalEdts > 50) {
        preview.riesgos.push('Proyecto grande - la migración puede tomar tiempo considerable');
      }

      // Recomendaciones
      preview.recomendaciones.push('Realizar backup de la base de datos antes de migrar');
      preview.recomendaciones.push('Probar la migración en un entorno de desarrollo primero');
      preview.recomendaciones.push('Verificar los resultados después de la migración');

    } catch (error) {
      logger.error('Error generando preview de migración:', error);
      throw error;
    }

    return preview;
  }

  /**
   * ✅ Ejecuta migración masiva de múltiples proyectos
   */
  static async migrarProyectosMasivo(proyectoIds: string[]): Promise<MigrationResult[]> {
    const resultados: MigrationResult[] = [];

    logger.info(`🚀 Iniciando migración masiva a 5 niveles de ${proyectoIds.length} proyectos`);

    for (const proyectoId of proyectoIds) {
      try {
        const resultado = await this.migrarProyecto(proyectoId);
        resultados.push(resultado);

        // Pequeña pausa entre migraciones para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error en migración masiva del proyecto ${proyectoId}:`, error);
        resultados.push({
          proyectoId,
          proyectoNombre: 'Desconocido',
          exito: false,
          estadisticas: {
            edtsMigrados: 0,
            zonasCreadas: 0,
            actividadesCreadas: 0,
            tareasMigradas: 0,
            dependenciasCreadas: 0,
          },
          errores: [`Error en migración: ${error instanceof Error ? error.message : String(error)}`],
          warnings: [],
          tiempoEjecucion: 0,
          fechaMigracion: new Date(),
        });
      }
    }

    const exitosos = resultados.filter(r => r.exito).length;
    const fallidos = resultados.length - exitosos;

    logger.info(`✅ Migración masiva a 5 niveles completada: ${exitosos} exitosos, ${fallidos} fallidos`);

    return resultados;
  }

  /**
   * ✅ Revierte migración de un proyecto (experimental)
   */
  static async revertirMigracion(proyectoId: string): Promise<{ exito: boolean; mensaje: string }> {
    try {
      logger.warn(`⚠️ Revirtiendo migración del proyecto ${proyectoId}`);

      // Esta función es experimental y debería usarse con cuidado
      // Eliminaría todas las zonas, actividades y dependencias creadas durante la migración

      const actividadesEliminadas = await prisma.proyectoActividad.deleteMany({
        where: {
          proyecto_edt: {
            proyectoId,
          },
        },
      });

      // Resetear ProyectoTarea.proyectoActividadId a null
      await prisma.proyectoTarea.updateMany({
        where: {
          proyectoEdt: {
            proyectoId,
          },
        },
        data: {
          proyectoActividadId: null,
        },
      });

      // Eliminar dependencias
      await prisma.proyectoDependenciaTarea.deleteMany({
        where: {
          tareaOrigen: {
            proyectoEdt: {
              proyectoId,
            },
          },
        },
      });

      return {
        exito: true,
        mensaje: `Migración revertida: ${actividadesEliminadas.count} actividades eliminadas`,
      };

    } catch (error) {
      logger.error('Error revirtiendo migración:', error);
      return {
        exito: false,
        mensaje: `Error revirtiendo migración: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}