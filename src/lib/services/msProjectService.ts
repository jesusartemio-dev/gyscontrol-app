/**
 * Servicio MS Project - Exportación e Importación de Cronogramas
 *
 * Servicio para exportar cronogramas de proyectos a formato MS Project XML
 * e importar desde archivos XML de MS Project.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface MSProjectTask {
  id: string;
  name: string;
  start: Date;
  finish: Date;
  percentComplete: number;
  outlineLevel: number;
  predecessors?: string[];
  successors?: string[];
  notes?: string;
  priority?: number;
}

export interface MSProjectData {
  name: string;
  startDate: Date;
  finishDate: Date;
  tasks: MSProjectTask[];
}

export class MSProjectService {
  /**
   * Exportar cronograma completo a formato MS Project XML
   */
  static async exportToMSProject(proyectoId: string, cronogramaId?: string): Promise<string> {
    try {
      logger.info(`Exportando proyecto ${proyectoId} a MS Project`);

      // Obtener datos del proyecto
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true,
          fechaInicio: true,
          fechaFin: true,
        }
      });

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      if (!proyecto.fechaFin) {
        throw new Error('El proyecto debe tener fecha de fin definida');
      }

      // Obtener jerarquía completa
      const msProjectData = await this.buildMSProjectHierarchy(proyectoId, cronogramaId);

      // Generar XML
      const xml = this.generateMSProjectXML({
        name: proyecto.nombre,
        startDate: proyecto.fechaInicio,
        finishDate: proyecto.fechaFin,
        tasks: msProjectData
      });

      logger.info(`Proyecto ${proyectoId} exportado exitosamente a MS Project`);
      return xml;

    } catch (error) {
      logger.error('Error exportando a MS Project:', error);
      throw new Error('Error al exportar proyecto a MS Project');
    }
  }

  /**
   * Importar cronograma desde archivo MS Project XML
   */
  static async importFromMSProject(proyectoId: string, xmlContent: string): Promise<{
    importedTasks: number;
    errors: string[];
  }> {
    try {
      logger.info(`Importando MS Project XML para proyecto ${proyectoId}`);

      const result = {
        importedTasks: 0,
        errors: [] as string[]
      };

      // Parsear XML (simplificado - en producción usar una librería XML completa)
      const msProjectData = this.parseMSProjectXML(xmlContent);

      // Convertir y guardar en base de datos
      await this.saveMSProjectData(proyectoId, msProjectData, result);

      logger.info(`Importación completada: ${result.importedTasks} tareas importadas`);
      return result;

    } catch (error) {
      logger.error('Error importando desde MS Project:', error);
      throw new Error('Error al importar desde MS Project');
    }
  }

  /**
   * Construir jerarquía completa para MS Project
   */
  private static async buildMSProjectHierarchy(proyectoId: string, cronogramaId?: string): Promise<MSProjectTask[]> {
    const tasks: MSProjectTask[] = [];

    // Obtener fases
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoId },
      orderBy: { orden: 'asc' },
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
    });

    let taskId = 1;

    for (const fase of fases) {
      // Agregar fase como tarea resumen
      tasks.push({
        id: taskId.toString(),
        name: fase.nombre,
        start: fase.fechaInicioPlan || fase.fechaFinPlan || new Date(),
        finish: fase.fechaFinPlan || fase.fechaInicioPlan || new Date(),
        percentComplete: fase.porcentajeAvance || 0,
        outlineLevel: 1,
        notes: fase.descripcion || undefined
      });

      const faseTaskId = taskId++;

      // Agregar EDTs
      for (const edt of fase.edts) {
        if (!edt.fechaInicioPlan || !edt.fechaFinPlan) continue;

        tasks.push({
          id: taskId.toString(),
          name: edt.nombre,
          start: edt.fechaInicioPlan,
          finish: edt.fechaFinPlan,
          percentComplete: edt.porcentajeAvance || 0,
          outlineLevel: 2,
          notes: edt.descripcion || undefined
        });

        const edtTaskId = taskId++;

        // Agregar zonas
        for (const zona of edt.zonas) {
          tasks.push({
            id: taskId.toString(),
            name: zona.nombre,
            start: zona.fechaInicioPlan || zona.fechaFinPlan || edt.fechaInicioPlan,
            finish: zona.fechaFinPlan || zona.fechaInicioPlan || edt.fechaFinPlan,
            percentComplete: zona.porcentajeAvance || 0,
            outlineLevel: 3,
            notes: undefined
          });

          const zonaTaskId = taskId++;

          // Agregar actividades
          for (const actividad of zona.actividades) {
            tasks.push({
              id: taskId.toString(),
              name: actividad.nombre,
              start: actividad.fechaInicioPlan,
              finish: actividad.fechaFinPlan,
              percentComplete: actividad.porcentajeAvance || 0,
              outlineLevel: 4,
              notes: actividad.descripcion || undefined,
              priority: this.mapPrioridadToMSPriority(actividad.prioridad)
            });

            const actividadTaskId = taskId++;

            // Agregar tareas
            for (const tarea of actividad.tareas) {
              tasks.push({
                id: taskId.toString(),
                name: tarea.nombre,
                start: new Date(tarea.fechaInicio),
                finish: new Date(tarea.fechaFin),
                percentComplete: tarea.porcentajeCompletado || 0,
                outlineLevel: 5,
                notes: tarea.descripcion || undefined,
                priority: this.mapPrioridadToMSPriority(tarea.prioridad)
              });

              taskId++;
            }
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Generar XML de MS Project
   */
  private static generateMSProjectXML(data: MSProjectData): string {
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${data.name}</Name>
  <StartDate>${formatDate(data.startDate)}</StartDate>
  <FinishDate>${formatDate(data.finishDate)}</FinishDate>
  <Tasks>
`;

    for (const task of data.tasks) {
      xml += `    <Task>
      <ID>${task.id}</ID>
      <Name>${task.name}</Name>
      <Start>${formatDate(task.start)}</Start>
      <Finish>${formatDate(task.finish)}</Finish>
      <PercentComplete>${task.percentComplete}</PercentComplete>
      <OutlineLevel>${task.outlineLevel}</OutlineLevel>`;

      if (task.notes) {
        xml += `\n      <Notes>${task.notes}</Notes>`;
      }

      if (task.priority !== undefined) {
        xml += `\n      <Priority>${task.priority}</Priority>`;
      }

      if (task.predecessors && task.predecessors.length > 0) {
        xml += `\n      <Predecessors>${task.predecessors.join(',')}</Predecessors>`;
      }

      xml += `\n    </Task>\n`;
    }

    xml += `  </Tasks>
</Project>`;

    return xml;
  }

  /**
   * Parsear XML de MS Project (simplificado)
   */
  private static parseMSProjectXML(xmlContent: string): MSProjectData {
    // Esta es una implementación simplificada
    // En producción, usar una librería XML completa como xml2js

    const tasks: MSProjectTask[] = [];
    let name = 'Proyecto Importado';
    let startDate = new Date();
    let finishDate = new Date();

    // Extraer datos básicos (simplificado)
    const nameMatch = xmlContent.match(/<Name>(.*?)<\/Name>/);
    if (nameMatch) name = nameMatch[1];

    const startMatch = xmlContent.match(/<StartDate>(.*?)<\/StartDate>/);
    if (startMatch) startDate = new Date(startMatch[1]);

    const finishMatch = xmlContent.match(/<FinishDate>(.*?)<\/FinishDate>/);
    if (finishMatch) finishDate = new Date(finishMatch[1]);

    // Extraer tareas (simplificado - compatible con ES5)
    const taskBlocks = xmlContent.split('<Task>');
    for (let i = 1; i < taskBlocks.length; i++) {
      const taskBlock = taskBlocks[i];
      const endIndex = taskBlock.indexOf('</Task>');
      if (endIndex === -1) continue;
      const taskXml = taskBlock.substring(0, endIndex);

      const idMatch = taskXml.match(/<ID>(.*?)<\/ID>/);
      const nameMatch = taskXml.match(/<Name>(.*?)<\/Name>/);
      const startMatch = taskXml.match(/<Start>(.*?)<\/Start>/);
      const finishMatch = taskXml.match(/<Finish>(.*?)<\/Finish>/);
      const percentMatch = taskXml.match(/<PercentComplete>(.*?)<\/PercentComplete>/);
      const levelMatch = taskXml.match(/<OutlineLevel>(.*?)<\/OutlineLevel>/);

      if (idMatch && nameMatch && startMatch && finishMatch) {
        tasks.push({
          id: idMatch[1],
          name: nameMatch[1],
          start: new Date(startMatch[1]),
          finish: new Date(finishMatch[1]),
          percentComplete: percentMatch ? parseInt(percentMatch[1]) : 0,
          outlineLevel: levelMatch ? parseInt(levelMatch[1]) : 1
        });
      }
    }

    return { name, startDate, finishDate, tasks };
  }

  /**
   * Guardar datos importados de MS Project
   */
  private static async saveMSProjectData(
    proyectoId: string,
    data: MSProjectData,
    result: { importedTasks: number; errors: string[] }
  ): Promise<void> {
    // Crear cronograma de importación
    const cronograma = await prisma.proyectoCronograma.create({
      data: {
        proyectoId,
        tipo: 'planificacion',
        nombre: `Importado desde MS Project - ${data.name}`,
        esBaseline: false,
        version: 1
      }
    });

    // Procesar tareas por nivel
    const fasesMap = new Map<string, any>();
    const edtsMap = new Map<string, any>();
    const zonasMap = new Map<string, any>();
    const actividadesMap = new Map<string, any>();

    for (const task of data.tasks) {
      try {
        switch (task.outlineLevel) {
          case 1: // Fase
            const fase = await prisma.proyectoFase.create({
              data: {
                proyectoId,
                proyectoCronogramaId: cronograma.id,
                nombre: task.name,
                descripcion: task.notes,
                fechaInicioPlan: task.start,
                fechaFinPlan: task.finish,
                estado: 'planificado',
                orden: fasesMap.size + 1
              }
            });
            fasesMap.set(task.id, fase);
            break;

          case 2: // EDT
            // Buscar fase padre (simplificado - asumir orden secuencial)
            const fasePadre = Array.from(fasesMap.values())[fasesMap.size - 1];
            if (fasePadre) {
              const edt = await prisma.proyectoEdt.create({
                data: {
                  proyectoId,
                  proyectoCronogramaId: cronograma.id,
                  proyectoFaseId: fasePadre.id,
                  categoriaServicioId: '', // Valor por defecto
                  nombre: task.name,
                  descripcion: task.notes,
                  fechaInicioPlan: task.start,
                  fechaFinPlan: task.finish,
                  estado: 'planificado',
                  prioridad: this.mapMSPriorityToPrioridad(task.priority)
                }
              });
              edtsMap.set(task.id, edt);
            }
            break;

          case 3: // Zona
            const edtPadre = Array.from(edtsMap.values())[edtsMap.size - 1];
            if (edtPadre) {
              const zona = await prisma.proyectoZona.create({
                data: {
                  proyectoId,
                  proyectoEdtId: edtPadre.id,
                  nombre: task.name,
                  fechaInicioPlan: task.start,
                  fechaFinPlan: task.finish,
                  estado: 'planificado'
                }
              });
              zonasMap.set(task.id, zona);
            }
            break;

          case 4: // Actividad
            const zonaPadre = Array.from(zonasMap.values())[zonasMap.size - 1];
            if (zonaPadre) {
              const actividad = await prisma.proyectoActividad.create({
                data: {
                  proyectoZonaId: zonaPadre.id,
                  proyectoCronogramaId: cronograma.id,
                  nombre: task.name,
                  descripcion: task.notes,
                  fechaInicioPlan: task.start,
                  fechaFinPlan: task.finish,
                  estado: 'pendiente',
                  prioridad: this.mapMSPriorityToPrioridad(task.priority)
                }
              });
              actividadesMap.set(task.id, actividad);
            }
            break;

          case 5: // Tarea
            const actividadPadre = Array.from(actividadesMap.values())[actividadesMap.size - 1];
            if (actividadPadre) {
              await prisma.proyectoTarea.create({
                data: {
                  proyectoEdtId: actividadPadre.proyectoEdtId, // Necesitaríamos obtener esto
                  proyectoCronogramaId: cronograma.id,
                  proyectoActividadId: actividadPadre.id,
                  nombre: task.name,
                  descripcion: task.notes,
                  fechaInicio: task.start,
                  fechaFin: task.finish,
                  estado: 'pendiente',
                  prioridad: this.mapMSPriorityToPrioridad(task.priority),
                  porcentajeCompletado: task.percentComplete
                }
              });
            }
            break;
        }

        result.importedTasks++;

      } catch (error) {
        result.errors.push(`Error importando tarea ${task.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Mapear prioridad del sistema a MS Project
   */
  private static mapPrioridadToMSPriority(prioridad: string): number {
    switch (prioridad) {
      case 'critica': return 1000;
      case 'alta': return 800;
      case 'media': return 500;
      case 'baja': return 200;
      default: return 500;
    }
  }

  /**
   * Mapear prioridad de MS Project al sistema
   */
  private static mapMSPriorityToPrioridad(priority?: number): 'baja' | 'media' | 'alta' | 'critica' {
    if (!priority) return 'media';
    if (priority >= 800) return 'critica';
    if (priority >= 600) return 'alta';
    if (priority >= 400) return 'media';
    return 'baja';
  }

  /**
   * Descargar archivo XML
   */
  static downloadMSProjectXML(xmlContent: string, filename: string): void {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}