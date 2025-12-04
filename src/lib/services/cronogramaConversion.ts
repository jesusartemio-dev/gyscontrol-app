// ===================================================
// 📁 Archivo: cronogramaConversion.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicio de conversión automática cotización → proyecto
//
// 🧠 Uso: Convertir cronogramas comerciales en planes de ejecución
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-21
// ===================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface ResultadoConversion {
  proyectoId: string;
  fasesCreadas: number;
  edtsConvertidos: number;
  actividadesConvertidas: number;
  tareasConvertidas: number;
  errores: string[];
  warnings: string[];
}

export class CronogramaConversionService {
  /**
   * ✅ Convertir cronograma comercial a plan de ejecución de 5 niveles
   *
   * Cotizaciones: Proyecto(implícito) → Fases → EDTs → Actividades → Tareas
   * Proyectos: Proyecto → Fases → EDTs → Actividades → Tareas
   */
  static async convertirCotizacionAProyecto(
    cotizacionId: string,
    proyectoId: string
  ): Promise<ResultadoConversion> {
    const resultado: ResultadoConversion = {
      proyectoId,
      fasesCreadas: 0,
      edtsConvertidos: 0,
      actividadesConvertidas: 0,
      tareasConvertidas: 0,
      errores: [],
      warnings: []
    };

    try {
      logger.info(`Iniciando conversión de cotización ${cotizacionId} a proyecto ${proyectoId}`);

      // 1. Obtener cotización con cronograma comercial completo de 5 niveles
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id: cotizacionId },
        include: {
          // ✅ Proyecto asociado (relación directa)
          proyectos: {
            select: {
              id: true,
              nombre: true,
              fechaInicio: true,
              fechaFin: true
            }
          }
        }
      });

      // 2. Obtener EDTs comerciales
      const edtsComerciales = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId },
        include: {
          cotizacionServicio: {
            select: {
              id: true,
              nombre: true,
              categoria: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      if (!cotizacion) {
        throw new Error('Cotización no encontrada');
      }

      if (!cotizacion.proyectos || cotizacion.proyectos.length === 0) {
        throw new Error('La cotización no tiene un proyecto asociado');
      }

      const proyectoAsociado = cotizacion.proyectos[0];

      // 2. Crear cronograma de ejecución para el proyecto
      const cronogramaEjecucion = await prisma.proyectoCronograma.create({
        data: {
          proyectoId,
          tipo: 'ejecucion',
          nombre: 'Plan de Ejecución',
          esBaseline: false,
          version: 1
        }
      });

      // 3. Crear fases estándar del proyecto
      const fasesProyecto = await this.crearFasesEstandar(proyectoId, proyectoAsociado, cronogramaEjecucion.id);
      resultado.fasesCreadas = fasesProyecto.length;

      // 4. Convertir EDTs comerciales a EDTs de proyecto con jerarquía completa
      const asignaciones = await this.convertirEdtsComerciales(
        edtsComerciales,
        fasesProyecto,
        proyectoId,
        cronogramaEjecucion.id
      );
      resultado.edtsConvertidos = asignaciones.length;

      // 5. Convertir actividades comerciales a actividades de proyecto (directamente bajo EDTs)
      // Primero procesar las asignaciones para obtener actividades directas
      await this.prepararActividadesDirectas(asignaciones);
      resultado.actividadesConvertidas = await this.convertirActividadesComerciales(asignaciones);

      // 6. Convertir tareas comerciales a tareas de proyecto
      resultado.tareasConvertidas = await this.convertirTareasComerciales(asignaciones);

      // 5. Ajustar fechas de fases basadas en EDTs
      await this.ajustarFechasFases(fasesProyecto);

      // 6. Validar resultado
      const erroresValidacion = await this.validarConversion(proyectoId);
      resultado.errores = erroresValidacion.filter(e => e.severidad === 'error').map(e => e.mensaje);
      resultado.warnings = erroresValidacion.filter(e => e.severidad === 'warning').map(e => e.mensaje);

      logger.info(`Conversión completada: ${JSON.stringify(resultado)}`);

      return resultado;
    } catch (error) {
      logger.error('Error en conversión de cotización a proyecto:', error);
      resultado.errores.push(`Error en conversión: ${error instanceof Error ? error.message : String(error)}`);
      return resultado;
    }
  }

  /**
    * ✅ Crear fases estándar para el proyecto
    */
   private static async crearFasesEstandar(
     proyectoId: string,
     proyecto: { fechaInicio: Date; fechaFin: Date | null },
     proyectoCronogramaId: string
   ): Promise<any[]> {
    if (!proyecto.fechaFin) {
      throw new Error('El proyecto debe tener fecha de fin definida');
    }

    const duracionTotal = proyecto.fechaFin.getTime() - proyecto.fechaInicio.getTime();
    const diasTotal = duracionTotal / (1000 * 60 * 60 * 24);

    // Distribución estándar: 20% planificación, 60% ejecución, 20% cierre
    const fase1Dias = Math.floor(diasTotal * 0.2);
    const fase2Dias = Math.floor(diasTotal * 0.6);
    const fase3Dias = diasTotal - fase1Dias - fase2Dias;

    const fases = [
      {
        nombre: 'Planificación Detallada',
        descripcion: 'Fase de planificación detallada y preparación del proyecto',
        orden: 1,
        fechaInicio: proyecto.fechaInicio,
        fechaFin: new Date(proyecto.fechaInicio.getTime() + (fase1Dias * 24 * 60 * 60 * 1000))
      },
      {
        nombre: 'Ejecución Planificada',
        descripcion: 'Fase principal de ejecución del proyecto',
        orden: 2,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + (fase1Dias * 24 * 60 * 60 * 1000)),
        fechaFin: new Date(proyecto.fechaInicio.getTime() + ((fase1Dias + fase2Dias) * 24 * 60 * 60 * 1000))
      },
      {
        nombre: 'Cierre Planificado',
        descripcion: 'Fase de cierre, pruebas y entrega final',
        orden: 3,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + ((fase1Dias + fase2Dias) * 24 * 60 * 60 * 1000)),
        fechaFin: proyecto.fechaFin
      }
    ];

    const fasesCreadas = [];
    for (const fase of fases) {
      const faseCreada = await prisma.proyectoFase.create({
        data: {
          proyectoId,
          proyectoCronogramaId,
          nombre: fase.nombre,
          descripcion: fase.descripcion,
          orden: fase.orden,
          fechaInicioPlan: fase.fechaInicio,
          fechaFinPlan: fase.fechaFin,
          estado: 'planificado'
        }
      });
      fasesCreadas.push(faseCreada);
    }

    return fasesCreadas;
  }

  /**
    * ✅ Convertir EDTs comerciales a EDTs de proyecto
    */
   private static async convertirEdtsComerciales(
     edtsComerciales: any[],
     fasesProyecto: any[],
     proyectoId: string,
     proyectoCronogramaId: string
   ): Promise<any[]> {
     const asignaciones = [];

     for (const edtComercial of edtsComerciales) {
       // Determinar fase apropiada
       const faseAsignada = this.determinarFaseParaEdt(edtComercial, fasesProyecto);

       // Crear EDT de proyecto
       const edtProyecto = await prisma.proyectoEdt.create({
         data: {
           proyectoId,
           proyectoCronogramaId,
           nombre: edtComercial.nombre || edtComercial.cotizacionServicio?.nombre || 'EDT sin nombre',
           categoriaServicioId: edtComercial.categoriaServicioId,
           fechaInicioPlan: edtComercial.fechaInicioComercial,
           fechaFinPlan: edtComercial.fechaFinComercial,
           horasPlan: edtComercial.horasEstimadas || 0,
           responsableId: edtComercial.responsableId,
           descripcion: edtComercial.descripcion,
           prioridad: edtComercial.prioridad || 'media',
           estado: 'planificado',
           porcentajeAvance: 0
         }
       });

       // En jerarquía de 5 niveles, las actividades van directamente bajo EDTs
       asignaciones.push({
         edtComercial: edtComercial,
         edtProyecto: edtProyecto.id,
         proyectoId,
         proyectoCronogramaId,
         faseId: faseAsignada.id,
         faseNombre: faseAsignada.nombre,
         actividades: edtComercial.actividades || [] // Actividades directas bajo EDT
       });
     }

     return asignaciones;
   }

  /**
     * ✅ Preparar actividades directas bajo EDTs (jerarquía de 5 niveles)
     */
   private static async prepararActividadesDirectas(asignaciones: any[]): Promise<void> {
     // En la jerarquía de 5 niveles, las actividades van directamente bajo EDTs
     for (const asignacion of asignaciones) {
       // Usar actividades que ya están en la asignación (de edtComercial.actividades)
       asignacion.actividadesDirectas = asignacion.actividades || [];
     }
   }

  /**
    * ✅ Convertir actividades comerciales a actividades de proyecto (directamente bajo EDTs)
    */
  private static async convertirActividadesComerciales(asignaciones: any[]): Promise<number> {
    let totalActividades = 0;

    for (const asignacion of asignaciones) {
      const edtProyectoId = asignacion.edtProyecto;
      const actividadesComerciales = asignacion.actividadesDirectas || [];

      // Inicializar array de actividades asignadas
      asignacion.actividadesAsignadas = [];

      // Procesar actividades comerciales directamente bajo EDT
      for (const actividadComercial of actividadesComerciales) {
        const actividadProyecto = await prisma.proyectoActividad.create({
          data: {
            proyectoEdtId: edtProyectoId, // ✅ Directamente bajo EDT
            proyectoCronogramaId: asignacion.proyectoCronogramaId, // ✅ Referencia al cronograma
            nombre: actividadComercial.nombre,
            fechaInicioPlan: actividadComercial.fechaInicioComercial,
            fechaFinPlan: actividadComercial.fechaFinComercial,
            estado: actividadComercial.estado || 'pendiente',
            porcentajeAvance: actividadComercial.porcentajeAvance || 0,
            descripcion: actividadComercial.descripcion,
            prioridad: actividadComercial.prioridad || 'media',
            horasPlan: actividadComercial.horasEstimadas || 0
          }
        } as any);

        // Agregar actividad asignada
        asignacion.actividadesAsignadas.push({
          actividadProyecto: actividadProyecto.id,
          actividadComercial: actividadComercial,
          tareas: actividadComercial.tareas || []
        });

        totalActividades++;
      }

      // Si no hay actividades comerciales, crear una actividad por defecto
      if (actividadesComerciales.length === 0) {
        const actividadProyecto = await prisma.proyectoActividad.create({
          data: {
            proyectoEdtId: edtProyectoId,
            proyectoCronogramaId: asignacion.proyectoCronogramaId,
            nombre: `Actividad Principal - ${asignacion.edtComercial?.nombre || 'EDT'}`,
            fechaInicioPlan: asignacion.edtComercial?.fechaInicioComercial,
            fechaFinPlan: asignacion.edtComercial?.fechaFinComercial,
            estado: 'pendiente',
            porcentajeAvance: 0,
            descripcion: 'Actividad principal del EDT',
            prioridad: 'media',
            horasPlan: asignacion.edtComercial?.horasEstimadas || 0
          }
        } as any);

        asignacion.actividadesAsignadas = [{
          actividadProyecto: actividadProyecto.id,
          actividadComercial: null,
          tareas: asignacion.edtComercial?.tareas || []
        }];

        totalActividades++;
      }
    }

    return totalActividades;
  }

  /**
    * ✅ Convertir tareas comerciales a tareas de proyecto
    */
  private static async convertirTareasComerciales(asignaciones: any[]): Promise<number> {
    let totalTareas = 0;

    for (const asignacion of asignaciones) {
      // Procesar tareas por actividad asignada
      for (const actividadAsignacion of asignacion.actividadesAsignadas || []) {
        const actividadProyectoId = actividadAsignacion.actividadProyecto;

        // Convertir tareas de esta actividad
        for (const tareaComercial of actividadAsignacion.tareas || []) {
          await prisma.proyectoTarea.create({
            data: {
              proyectoEdtId: asignacion.edtProyecto,
              proyectoCronogramaId: asignacion.proyectoCronogramaId,
              proyectoActividadId: actividadProyectoId,
              nombre: tareaComercial.nombre,
              descripcion: tareaComercial.descripcion,
              fechaInicio: tareaComercial.fechaInicio,
              fechaFin: tareaComercial.fechaFin,
              horasEstimadas: tareaComercial.horasEstimadas,
              responsableId: tareaComercial.responsableId,
              prioridad: tareaComercial.prioridad || 'media',
              estado: 'pendiente'
            }
          });

          totalTareas++;
        }

        // Si no hay tareas en la actividad, crear una tarea por defecto
        if ((actividadAsignacion.tareas || []).length === 0) {
          await prisma.proyectoTarea.create({
            data: {
              proyectoEdtId: asignacion.edtProyecto,
              proyectoCronogramaId: asignacion.proyectoCronogramaId,
              proyectoActividadId: actividadProyectoId,
              nombre: `Tarea Principal - ${actividadAsignacion.actividadComercial?.nombre || 'Actividad'}`,
              descripcion: 'Tarea principal de la actividad',
              fechaInicio: actividadAsignacion.actividadComercial?.fechaInicioComercial,
              fechaFin: actividadAsignacion.actividadComercial?.fechaFinComercial,
              horasEstimadas: actividadAsignacion.actividadComercial?.horasEstimadas || 0,
              prioridad: 'media',
              estado: 'pendiente'
            }
          });

          totalTareas++;
        }
      }
    }

    return totalTareas;
  }

  /**
   * ✅ Determinar fase apropiada para un EDT comercial
   */
  private static determinarFaseParaEdt(edtComercial: any, fases: any[]): any {
    const categoria = edtComercial.categoriaServicio?.nombre?.toLowerCase() || '';
    const nombreServicio = edtComercial.cotizacionServicio?.nombre?.toLowerCase() || '';

    // Reglas de asignación por categoría/servicio
    if (categoria.includes('levantamiento') ||
        categoria.includes('diseño') ||
        nombreServicio.includes('planificación') ||
        nombreServicio.includes('estudio')) {
      return fases.find(f => f.nombre === 'Planificación Detallada');
    }

    if (categoria.includes('instalación') ||
        categoria.includes('montaje') ||
        nombreServicio.includes('ejecución') ||
        nombreServicio.includes('construcción')) {
      return fases.find(f => f.nombre === 'Ejecución Planificada');
    }

    if (categoria.includes('prueba') ||
        categoria.includes('puesta en marcha') ||
        nombreServicio.includes('cierre') ||
        nombreServicio.includes('entrega')) {
      return fases.find(f => f.nombre === 'Cierre Planificado');
    }

    // Default: fase de ejecución
    return fases.find(f => f.nombre === 'Ejecución Planificada') || fases[1];
  }

  /**
   * ✅ Ajustar fechas de fases basadas en EDTs asignados
   */
  private static async ajustarFechasFases(fases: any[]): Promise<void> {
    for (const fase of fases) {
      const edtsFase = await prisma.proyectoEdt.findMany({
        where: { proyectoFaseId: fase.id },
        select: {
          fechaInicioPlan: true,
          fechaFinPlan: true
        }
      });

      if (edtsFase.length > 0) {
        const fechasValidas = edtsFase.filter(edt =>
          edt.fechaInicioPlan && edt.fechaFinPlan
        );

        if (fechasValidas.length > 0) {
          const minFecha = new Date(Math.min(...fechasValidas.map(e => e.fechaInicioPlan!.getTime())));
          const maxFecha = new Date(Math.max(...fechasValidas.map(e => e.fechaFinPlan!.getTime())));

          await prisma.proyectoFase.update({
            where: { id: fase.id },
            data: {
              fechaInicioPlan: minFecha,
              fechaFinPlan: maxFecha
            }
          });
        }
      }
    }
  }

  /**
   * ✅ Validar resultado de la conversión
   */
  private static async validarConversion(proyectoId: string): Promise<any[]> {
    // Importar dinámicamente para evitar dependencias circulares
    const { CronogramaValidationService } = await import('./cronogramaValidation');
    return await CronogramaValidationService.validarJerarquiaCompleta(proyectoId);
  }

  /**
   * ✅ Obtener preview de conversión sin ejecutar
   */
  static async obtenerPreviewConversion(cotizacionId: string): Promise<any> {
    try {
      // 1. Obtener cotización básica
      const cotizacion = await prisma.cotizacion.findUnique({
        where: { id: cotizacionId },
        include: {
          proyectos: {
            select: {
              id: true,
              nombre: true,
              fechaInicio: true,
              fechaFin: true
            }
          }
        }
      });

      if (!cotizacion) {
        throw new Error('Cotización no encontrada');
      }

      if (!cotizacion.proyectos || cotizacion.proyectos.length === 0) {
        throw new Error('La cotización no tiene proyecto asociado');
      }

      const proyectoAsociado = cotizacion.proyectos[0];

      // 2. Obtener EDTs comerciales
      const edtsComerciales = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId },
        include: {
          cotizacionServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      // Simular creación de fases
      const fasesSimuladas = this.simularFasesEstandar(proyectoAsociado);

      // Simular asignaciones
      const asignacionesSimuladas = this.simularAsignaciones(
        edtsComerciales,
        fasesSimuladas
      );

      // Contar elementos en la jerarquía de 5 niveles
      let totalActividades = 0;
      let totalTareas = 0;

      // Contar actividades y tareas por separado
      for (const edt of edtsComerciales) {
        const actividadesCount = await prisma.cotizacionActividad.count({
          where: { cotizacionEdtId: edt.id }
        });
        totalActividades += actividadesCount;

        // Contar tareas de estas actividades
        const actividades = await prisma.cotizacionActividad.findMany({
          where: { cotizacionEdtId: edt.id },
          select: { id: true }
        });

        for (const actividad of actividades) {
          const tareasCount = await prisma.cotizacionTarea.count({
            where: { cotizacionActividadId: actividad.id }
          });
          totalTareas += tareasCount;
        }
      }

      return {
        cotizacion: {
          id: cotizacion.id,
          nombre: cotizacion.nombre,
          edtsComerciales: edtsComerciales.length,
          actividadesComerciales: totalActividades,
          tareasComerciales: totalTareas
        },
        proyecto: proyectoAsociado,
        fasesSimuladas,
        asignacionesSimuladas,
        resumen: {
          fasesACrear: fasesSimuladas.length,
          edtsAConvertir: asignacionesSimuladas.length,
          actividadesAConvertir: totalActividades,
          tareasAConvertir: totalTareas
        }
      };
    } catch (error) {
      logger.error('Error al obtener preview de conversión:', error);
      throw new Error('Error al obtener preview de conversión');
    }
  }

  /**
   * ✅ Simular fases estándar (para preview)
   */
  private static simularFasesEstandar(proyecto: { fechaInicio: Date; fechaFin: Date | null }): any[] {
    if (!proyecto?.fechaInicio || !proyecto?.fechaFin) {
      return [];
    }

    const fechaFin = proyecto.fechaFin; // Type assertion que ya validamos

    const duracionTotal = proyecto.fechaFin.getTime() - proyecto.fechaInicio.getTime();
    const diasTotal = duracionTotal / (1000 * 60 * 60 * 24);

    const fase1Dias = Math.floor(diasTotal * 0.2);
    const fase2Dias = Math.floor(diasTotal * 0.6);

    return [
      {
        nombre: 'Planificación Detallada',
        orden: 1,
        fechaInicio: proyecto.fechaInicio,
        fechaFin: new Date(proyecto.fechaInicio.getTime() + (fase1Dias * 24 * 60 * 60 * 1000))
      },
      {
        nombre: 'Ejecución Planificada',
        orden: 2,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + (fase1Dias * 24 * 60 * 60 * 1000)),
        fechaFin: new Date(proyecto.fechaInicio.getTime() + ((fase1Dias + fase2Dias) * 24 * 60 * 60 * 1000))
      },
      {
        nombre: 'Cierre Planificado',
        orden: 3,
        fechaInicio: new Date(proyecto.fechaInicio.getTime() + ((fase1Dias + fase2Dias) * 24 * 60 * 60 * 1000)),
        fechaFin: fechaFin
      }
    ];
  }

  /**
     * ✅ Simular asignaciones (para preview) - Jerarquía de 5 niveles
     */
  private static simularAsignaciones(edtsComerciales: any[], fases: any[]): any[] {
    return edtsComerciales.map(edt => {
      const faseAsignada = this.determinarFaseParaEdt(edt, fases);

      // Para simulación, usamos valores por defecto
      const actividadesCount = 1; // Asumir al menos 1 actividad por EDT
      const tareasCount = 2; // Asumir al menos 2 tareas por actividad

      return {
        edtNombre: edt.nombre || edt.cotizacionServicio?.nombre || 'Sin nombre',
        categoria: edt.categoriaServicio?.nombre || 'Sin categoría',
        faseAsignada: faseAsignada.nombre,
        actividadesCount,
        tareasCount,
        horasEstimadas: edt.horasEstimadas || 0
      };
    });
  }
}
