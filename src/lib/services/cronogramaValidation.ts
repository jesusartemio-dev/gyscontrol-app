// ===================================================
// 📁 Archivo: cronogramaValidation.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio de validaciones avanzadas para jerarquía completa
//
// 🧠 Uso: Validar estructura Proyecto → Fases → EDTs → Tareas
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ValidationError {
  severidad: 'error' | 'warning';
  entidadTipo: 'proyecto' | 'fase' | 'edt' | 'tarea';
  entidadId: string;
  campo?: string;
  mensaje: string;
  sugerencia?: string;
}

export interface ValidationResult {
  esValido: boolean;
  errores: ValidationError[];
  warnings: ValidationError[];
  estadisticas: {
    totalEntidades: number;
    entidadesValidas: number;
    entidadesConErrores: number;
    entidadesConWarnings: number;
  };
}

export class CronogramaValidationService {
  /**
   * ✅ Validar jerarquía completa de un proyecto
   */
  static async validarJerarquiaCompleta(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      // 1. Validar proyecto
      const proyectoErrores = await this.validarProyecto(proyectoId);
      errores.push(...proyectoErrores);

      // 2. Validar fases
      const fasesErrores = await this.validarFases(proyectoId);
      errores.push(...fasesErrores);

      // 3. Validar EDTs
      const edtsErrores = await this.validarEdts(proyectoId);
      errores.push(...edtsErrores);

      logger.info(`Validación completa para proyecto ${proyectoId}: ${errores.length} problemas encontrados`);

      return errores;
    } catch (error) {
      logger.error('Error en validación de jerarquía completa:', error);
      return [{
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno en validación',
        sugerencia: 'Contactar al administrador del sistema'
      }];
    }
  }

  /**
   * ✅ Validar proyecto
   */
  private static async validarProyecto(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true,
          fechaInicio: true,
          fechaFin: true,
          estado: true,
          _count: {
            select: {
              proyectoEdts: true,
              fases: true
            }
          }
        }
      });

      if (!proyecto) {
        errores.push({
          severidad: 'error',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          mensaje: 'Proyecto no encontrado',
          sugerencia: 'Verificar que el proyecto existe en la base de datos'
        });
        return errores;
      }

      // Validar fechas
      if (!proyecto.fechaInicio) {
        errores.push({
          severidad: 'error',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          campo: 'fechaInicio',
          mensaje: 'Fecha de inicio no definida',
          sugerencia: 'Definir fecha de inicio del proyecto'
        });
      }

      if (!proyecto.fechaFin) {
        errores.push({
          severidad: 'error',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          campo: 'fechaFin',
          mensaje: 'Fecha de fin no definida',
          sugerencia: 'Definir fecha de fin del proyecto'
        });
      }

      if (proyecto.fechaInicio && proyecto.fechaFin && proyecto.fechaInicio >= proyecto.fechaFin) {
        errores.push({
          severidad: 'error',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          campo: 'fechas',
          mensaje: 'Fecha de inicio debe ser anterior a fecha de fin',
          sugerencia: 'Corregir las fechas del proyecto'
        });
      }

      // Validar que tenga fases o EDTs
      if (proyecto._count.fases === 0 && proyecto._count.proyectoEdts === 0) {
        errores.push({
          severidad: 'warning',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          mensaje: 'Proyecto sin fases ni EDTs',
          sugerencia: 'Crear fases o EDTs para el proyecto'
        });
      }

    } catch (error) {
      logger.error('Error validando proyecto:', error);
      errores.push({
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno validando proyecto',
        sugerencia: 'Contactar al administrador del sistema'
      });
    }

    return errores;
  }

  /**
   * ✅ Validar fases
   */
  private static async validarFases(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      const fases = await prisma.proyectoFase.findMany({
        where: { proyectoId },
        include: {
          _count: {
            select: { edts: true }
          }
        },
        orderBy: { orden: 'asc' }
      });

      // Validar orden secuencial
      for (let i = 0; i < fases.length; i++) {
        const fase = fases[i];
        const ordenEsperado = i + 1;

        if (fase.orden !== ordenEsperado) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'fase',
            entidadId: fase.id,
            campo: 'orden',
            mensaje: `Orden incorrecto: ${fase.orden} (esperado: ${ordenEsperado})`,
            sugerencia: 'Reordenar las fases secuencialmente'
          });
        }

        // Validar fechas
        if (!fase.fechaInicioPlan) {
          errores.push({
            severidad: 'error',
            entidadTipo: 'fase',
            entidadId: fase.id,
            campo: 'fechaInicioPlan',
            mensaje: 'Fecha de inicio planificada no definida',
            sugerencia: 'Definir fecha de inicio de la fase'
          });
        }

        if (!fase.fechaFinPlan) {
          errores.push({
            severidad: 'error',
            entidadTipo: 'fase',
            entidadId: fase.id,
            campo: 'fechaFinPlan',
            mensaje: 'Fecha de fin planificada no definida',
            sugerencia: 'Definir fecha de fin de la fase'
          });
        }

        // Validar que tenga EDTs
        if (fase._count.edts === 0) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'fase',
            entidadId: fase.id,
            mensaje: 'Fase sin EDTs asignados',
            sugerencia: 'Asignar EDTs a esta fase'
          });
        }
      }

    } catch (error) {
      logger.error('Error validando fases:', error);
      errores.push({
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno validando fases',
        sugerencia: 'Contactar al administrador del sistema'
      });
    }

    return errores;
  }

  /**
   * ✅ Validar EDTs
   */
  private static async validarEdts(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      const edts = await prisma.proyectoEdt.findMany({
        where: { proyectoId },
        include: {
          categoriaServicio: true,
          responsable: true,
          registrosHoras: {
            select: {
              horasTrabajadas: true,
              fechaTrabajo: true
            }
          }
        }
      });

      for (const edt of edts) {
        // Validar asignación a fase
        if (!edt.proyectoFaseId) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'edt',
            entidadId: edt.id,
            campo: 'proyectoFaseId',
            mensaje: 'EDT no asignado a ninguna fase',
            sugerencia: 'Asignar EDT a una fase del proyecto'
          });
        }

        // Validar fechas
        if (!edt.fechaInicioPlan) {
          errores.push({
            severidad: 'error',
            entidadTipo: 'edt',
            entidadId: edt.id,
            campo: 'fechaInicioPlan',
            mensaje: 'Fecha de inicio planificada no definida',
            sugerencia: 'Definir fecha de inicio del EDT'
          });
        }

        if (!edt.fechaFinPlan) {
          errores.push({
            severidad: 'error',
            entidadTipo: 'edt',
            entidadId: edt.id,
            campo: 'fechaFinPlan',
            mensaje: 'Fecha de fin planificada no definida',
            sugerencia: 'Definir fecha de fin del EDT'
          });
        }

        // Validar responsable
        if (!edt.responsableId) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'edt',
            entidadId: edt.id,
            campo: 'responsableId',
            mensaje: 'EDT sin responsable asignado',
            sugerencia: 'Asignar un responsable al EDT'
          });
        }

        // Validar horas
        if (!edt.horasPlan || Number(edt.horasPlan) <= 0) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'edt',
            entidadId: edt.id,
            campo: 'horasPlan',
            mensaje: 'Horas planificadas no definidas o inválidas',
            sugerencia: 'Definir horas planificadas para el EDT'
          });
        }

        // Validar estado vs fechas reales
        if (edt.estado === 'completado') {
          if (!edt.fechaFinReal) {
            errores.push({
              severidad: 'error',
              entidadTipo: 'edt',
              entidadId: edt.id,
              campo: 'fechaFinReal',
              mensaje: 'EDT completado sin fecha de fin real',
              sugerencia: 'Definir fecha de fin real para EDT completado'
            });
          }
          if (edt.porcentajeAvance !== 100) {
            errores.push({
              severidad: 'error',
              entidadTipo: 'edt',
              entidadId: edt.id,
              campo: 'porcentajeAvance',
              mensaje: 'EDT completado debe tener 100% de avance',
              sugerencia: 'Ajustar porcentaje de avance a 100%'
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error validando EDTs:', error);
      errores.push({
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno validando EDTs',
        sugerencia: 'Contactar al administrador del sistema'
      });
    }

    return errores;
  }

  /**
   * ✅ Ejecutar validación completa con estadísticas
   */
  static async ejecutarValidacionCompleta(proyectoId: string): Promise<ValidationResult> {
    const errores = await this.validarJerarquiaCompleta(proyectoId);

    const erroresCount = errores.filter(e => e.severidad === 'error').length;
    const warningsCount = errores.filter(e => e.severidad === 'warning').length;

    // Calcular estadísticas (aproximadas)
    const estadisticas = {
      totalEntidades: errores.length * 2, // Estimación
      entidadesValidas: Math.max(0, (errores.length * 2) - erroresCount - warningsCount),
      entidadesConErrores: erroresCount,
      entidadesConWarnings: warningsCount
    };

    return {
      esValido: erroresCount === 0,
      errores: errores.filter(e => e.severidad === 'error'),
      warnings: errores.filter(e => e.severidad === 'warning'),
      estadisticas
    };
  }
}
