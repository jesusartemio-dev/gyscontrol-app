/**
 * Servicio de Validaciones para Cronograma de 5 Niveles
 * Validaciones específicas para la jerarquía simplificada:
 * Proyecto → Fases → EDTs → Actividades → Tareas
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ValidationError {
  severidad: 'error' | 'warning';
  entidadTipo: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea';
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

export class Cronograma5NivelesValidationService {

  /**
   * ✅ Validar jerarquía completa de 5 niveles
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

      // 4. Validar actividades (directamente bajo EDTs)
      const actividadesErrores = await this.validarActividades(proyectoId);
      errores.push(...actividadesErrores);

      // 5. Validar tareas
      const tareasErrores = await this.validarTareas(proyectoId);
      errores.push(...tareasErrores);

      // 6. Validar dependencias
      const dependenciasErrores = await this.validarDependencias(proyectoId);
      errores.push(...dependenciasErrores);

      logger.info(`Validación completa de 5 niveles para proyecto ${proyectoId}: ${errores.length} problemas encontrados`);

      return errores;
    } catch (error) {
      logger.error('Error en validación de jerarquía completa de 5 niveles:', error);
      return [{
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno en validación de 5 niveles',
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

      // Validar que tenga elementos de cronograma
      if (proyecto._count.fases === 0 && proyecto._count.proyectoEdts === 0) {
        errores.push({
          severidad: 'warning',
          entidadTipo: 'proyecto',
          entidadId: proyectoId,
          mensaje: 'Proyecto sin elementos de cronograma',
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

        // Validar que tenga actividades
        const actividadesCount = await prisma.proyectoActividad.count({
          where: { proyectoEdtId: edt.id }
        });

        if (actividadesCount === 0) {
          errores.push({
            severidad: 'warning',
            entidadTipo: 'edt',
            entidadId: edt.id,
            mensaje: 'EDT sin actividades definidas',
            sugerencia: 'Crear actividades para este EDT'
          });
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
    * ✅ Validar actividades (directamente bajo EDTs)
    */
   private static async validarActividades(proyectoId: string): Promise<ValidationError[]> {
     const errores: ValidationError[] = [];

     try {
       const actividades = await prisma.proyectoActividad.findMany({
         where: {
           proyectoEdt: {
             proyectoId
           }
         },
         include: {
           proyectoEdt: true
         }
       });

       for (const actividad of actividades) {
         // Validar fechas dentro del EDT
         if (actividad.fechaInicioPlan && actividad.proyectoEdt?.fechaInicioPlan &&
             actividad.fechaInicioPlan < actividad.proyectoEdt.fechaInicioPlan) {
           errores.push({
             severidad: 'warning',
             entidadTipo: 'actividad',
             entidadId: actividad.id,
             campo: 'fechaInicioPlan',
             mensaje: 'Fecha de inicio de actividad anterior a fecha de EDT',
             sugerencia: 'Ajustar fecha de inicio de la actividad'
           });
         }

         if (actividad.fechaFinPlan && actividad.proyectoEdt?.fechaFinPlan &&
             actividad.fechaFinPlan > actividad.proyectoEdt.fechaFinPlan) {
           errores.push({
             severidad: 'warning',
             entidadTipo: 'actividad',
             entidadId: actividad.id,
             campo: 'fechaFinPlan',
             mensaje: 'Fecha de fin de actividad posterior a fecha de EDT',
             sugerencia: 'Ajustar fecha de fin de la actividad'
           });
         }

         // Validar que tenga tareas
         const tareasCount = await prisma.proyectoTarea.count({
           where: { proyectoActividadId: actividad.id }
         });

         if (tareasCount === 0) {
           errores.push({
             severidad: 'warning',
             entidadTipo: 'actividad',
             entidadId: actividad.id,
             mensaje: 'Actividad sin tareas definidas',
             sugerencia: 'Crear tareas para esta actividad'
           });
         }
       }

     } catch (error) {
       logger.error('Error validando actividades:', error);
       errores.push({
         severidad: 'error',
         entidadTipo: 'proyecto',
         entidadId: proyectoId,
         mensaje: 'Error interno validando actividades',
         sugerencia: 'Contactar al administrador del sistema'
       });
     }

     return errores;
   }

  /**
   * ✅ Validar tareas
   */
  private static async validarTareas(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      const tareas = await prisma.proyectoTarea.findMany({
        where: {
          proyectoEdt: {
            proyectoId
          }
        },
        include: {
          proyectoEdt: true,
          proyectoActividad: true,
          dependenciasOrigen: true,
          dependenciasDependiente: true
        }
      });

      for (const tarea of tareas) {
        // Validar fechas dentro de la actividad (si está asignada)
        if (tarea.proyectoActividadId) {
          if (tarea.fechaInicio && tarea.proyectoActividad?.fechaInicioPlan &&
              tarea.fechaInicio < tarea.proyectoActividad.fechaInicioPlan) {
            errores.push({
              severidad: 'warning',
              entidadTipo: 'tarea',
              entidadId: tarea.id,
              campo: 'fechaInicio',
              mensaje: 'Fecha de inicio de tarea anterior a fecha de actividad',
              sugerencia: 'Ajustar fecha de inicio de la tarea'
            });
          }

          if (tarea.fechaFin && tarea.proyectoActividad?.fechaFinPlan &&
              tarea.fechaFin > tarea.proyectoActividad.fechaFinPlan) {
            errores.push({
              severidad: 'warning',
              entidadTipo: 'tarea',
              entidadId: tarea.id,
              campo: 'fechaFin',
              mensaje: 'Fecha de fin de tarea posterior a fecha de actividad',
              sugerencia: 'Ajustar fecha de fin de la tarea'
            });
          }
        }

        // Validar estado completado
        if (tarea.estado === 'completada' && tarea.porcentajeCompletado !== 100) {
          errores.push({
            severidad: 'error',
            entidadTipo: 'tarea',
            entidadId: tarea.id,
            campo: 'porcentajeCompletado',
            mensaje: 'Tarea completada debe tener 100% de progreso',
            sugerencia: 'Ajustar porcentaje de completado a 100%'
          });
        }
      }

    } catch (error) {
      logger.error('Error validando tareas:', error);
      errores.push({
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno validando tareas',
        sugerencia: 'Contactar al administrador del sistema'
      });
    }

    return errores;
  }

  /**
   * ✅ Validar dependencias
   */
  private static async validarDependencias(proyectoId: string): Promise<ValidationError[]> {
    const errores: ValidationError[] = [];

    try {
      const dependencias = await prisma.proyectoDependenciaTarea.findMany({
        where: {
          tareaOrigen: {
            proyectoEdt: {
              proyectoId
            }
          }
        },
        include: {
          tareaOrigen: {
            select: { id: true, nombre: true, fechaFin: true }
          },
          tareaDependiente: {
            select: { id: true, nombre: true, fechaInicio: true }
          }
        }
      });

      for (const dependencia of dependencias) {
        // Validar que las fechas sean coherentes según el tipo de dependencia
        if (dependencia.tipo === 'finish_to_start') {
          if (dependencia.tareaOrigen.fechaFin && dependencia.tareaDependiente.fechaInicio &&
              dependencia.tareaOrigen.fechaFin > dependencia.tareaDependiente.fechaInicio) {
            errores.push({
              severidad: 'warning',
              entidadTipo: 'tarea',
              entidadId: dependencia.tareaDependienteId,
              campo: 'fechaInicio',
              mensaje: `Dependencia finish_to_start violada con tarea ${dependencia.tareaOrigen.nombre}`,
              sugerencia: 'Ajustar fechas para respetar la dependencia'
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error validando dependencias:', error);
      errores.push({
        severidad: 'error',
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        mensaje: 'Error interno validando dependencias',
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
      totalEntidades: errores.length * 3, // Estimación
      entidadesValidas: Math.max(0, (errores.length * 3) - erroresCount - warningsCount),
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