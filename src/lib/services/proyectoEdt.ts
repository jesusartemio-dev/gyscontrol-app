/**
 * 🏗️ Servicio ProyectoEdt - Fase 4 Sistema EDT
 * 
 * Encapsula toda la lógica de negocio para la gestión de EDT (Estructura de Desglose del Trabajo)
 * Incluye operaciones CRUD, validaciones, cálculos automáticos y reportes.
 * 
 * @author TRAE AI - GYS App
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type {
  ProyectoEdt,
  ProyectoEdtConRelaciones,
  CreateProyectoEdtData,
  UpdateProyectoEdtData,
  FiltrosCronogramaData,
  ResumenCronograma,
  ComparativoPlanReal
} from '@/types/modelos';
import { validarFechasEdt, validarEstadoEdt } from '@/lib/validators/cronograma';

export class ProyectoEdtService {
  // ✅ Obtener EDT por proyecto con filtros
  static async obtenerEdtsPorProyecto(
    proyectoId: string,
    filtros: FiltrosCronogramaData = {}
  ): Promise<ProyectoEdtConRelaciones[]> {
    try {
      logger.info(`Obteniendo EDTs para proyecto: ${proyectoId}`, { filtros });

      // First, try a simple query without relations to check if the basic query works
      const basicEdts = await prisma.proyectoEdt.findMany({
        where: { proyectoId },
        select: { id: true, proyectoId: true, categoriaServicioId: true }
      });

      logger.info(`Basic query found ${basicEdts.length} EDTs`);

      const edts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId,
          ...(filtros.categoriaServicioId && { categoriaServicioId: filtros.categoriaServicioId }),
          ...(filtros.estado && { estado: filtros.estado }),
          ...(filtros.responsableId && { responsableId: filtros.responsableId }),
          ...(filtros.zona && { zona: filtros.zona }),
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
        },
        select: {
          id: true,
          proyectoId: true,
          nombre: true,
          categoriaServicioId: true,
          responsableId: true,
          descripcion: true,
          estado: true,
          prioridad: true,
          zona: true,
          fechaInicioPlan: true,
          fechaFinPlan: true,
          fechaInicioReal: true,
          fechaFinReal: true,
          horasPlan: true,
          horasReales: true,
          porcentajeAvance: true,
          createdAt: true,
          updatedAt: true,
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              proyectoId: true,
              proyectoServicioId: true,
              categoria: true,
              nombreServicio: true,
              recursoId: true,
              recursoNombre: true,
              usuarioId: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              descripcion: true,
              observaciones: true,
              aprobado: true,
              proyectoEdtId: true,
              categoriaServicioId: true,
              origen: true,
              ubicacion: true,
              createdAt: true,
              updatedAt: true,
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            },
            take: 5
          }
        },
        orderBy: [
          { estado: 'asc' },
          { prioridad: 'desc' },
          { fechaFinPlan: 'asc' }
        ]
      });


      return edts.map(edt => ({
        ...edt,
        nombre: edt.nombre,
        zona: edt.zona || undefined,
        fechaInicio: edt.fechaInicioPlan?.toISOString() || undefined,
        fechaFin: edt.fechaFinPlan?.toISOString() || undefined,
        fechaInicioReal: edt.fechaInicioReal?.toISOString() || undefined,
        fechaFinReal: edt.fechaFinReal?.toISOString() || undefined,
        horasPlan: Number(edt.horasPlan || 0),
        registrosHoras: edt.registrosHoras.map(registro => ({
          ...registro,
          proyectoId: registro.proyectoId || '',
          categoria: registro.categoria || '',
          nombreServicio: registro.nombreServicio || '',
          usuarioId: registro.usuarioId || '',
          horasTrabajadas: Number(registro.horasTrabajadas || 0),
          aprobado: Boolean(registro.aprobado),
          fechaTrabajo: registro.fechaTrabajo.toISOString(),
          createdAt: registro.createdAt.toISOString(),
          updatedAt: registro.updatedAt.toISOString(),
          descripcion: registro.descripcion || undefined,
          observaciones: registro.observaciones || undefined,
          proyectoServicioId: registro.proyectoServicioId || '',
          recursoId: registro.recursoId || '',
          recursoNombre: registro.recursoNombre || '',
          proyectoEdtId: registro.proyectoEdtId || '',
          categoriaServicioId: registro.categoriaServicioId || '',
          origen: registro.origen || '',
          ubicacion: registro.ubicacion || ''
        })),
        horasReales: Number(edt.horasReales || 0),
        responsableId: edt.responsableId || undefined,
        descripcion: edt.descripcion || undefined,
        createdAt: edt.createdAt.toISOString(),
        updatedAt: edt.updatedAt.toISOString(),
        responsable: edt.responsable || undefined,
        proyecto: {
          ...edt.proyecto,
          estado: edt.proyecto.estado as any
        },
        categoriaServicio: edt.categoriaServicio
      })) as ProyectoEdtConRelaciones[];
    } catch (error) {
      logger.error('Error al obtener EDT por proyecto:', {
        proyectoId,
        filtros,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Error al obtener EDT del proyecto: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ✅ Obtener EDT individual por ID
  static async obtenerEdtPorId(edtId: string): Promise<ProyectoEdtConRelaciones | null> {
    try {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              proyectoId: true,
              proyectoServicioId: true,
              categoria: true,
              nombreServicio: true,
              recursoId: true,
              recursoNombre: true,
              usuarioId: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              descripcion: true,
              observaciones: true,
              aprobado: true,
              proyectoEdtId: true,
              categoriaServicioId: true,
              origen: true,
              ubicacion: true,
              createdAt: true,
              updatedAt: true,
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            }
          }
        }
      });

      if (!edt) return null;
      
      return {
        ...edt,
        nombre: edt.nombre,
        zona: edt.zona || undefined,
        fechaInicio: edt.fechaInicioPlan?.toISOString() || undefined,
        fechaFin: edt.fechaFinPlan?.toISOString() || undefined,
        fechaInicioReal: edt.fechaInicioReal?.toISOString() || undefined,
        fechaFinReal: edt.fechaFinReal?.toISOString() || undefined,
        horasPlan: Number(edt.horasPlan || 0),
        horasReales: Number(edt.horasReales || 0),
        responsableId: edt.responsableId || undefined,
        descripcion: edt.descripcion || undefined,
        createdAt: edt.createdAt.toISOString(),
        updatedAt: edt.updatedAt.toISOString(),
        responsable: edt.responsable || undefined,
        proyecto: {
          ...edt.proyecto,
          estado: edt.proyecto.estado as any
        },
        registrosHoras: edt.registrosHoras.map(registro => ({
          ...registro,
          proyectoId: registro.proyectoId || '',
          categoria: registro.categoria || '',
          nombreServicio: registro.nombreServicio || '',
          usuarioId: registro.usuarioId || '',
          horasTrabajadas: Number(registro.horasTrabajadas || 0),
          aprobado: Boolean(registro.aprobado),
          fechaTrabajo: registro.fechaTrabajo.toISOString(),
          createdAt: registro.createdAt.toISOString(),
          updatedAt: registro.updatedAt.toISOString(),
          descripcion: registro.descripcion || undefined,
          observaciones: registro.observaciones || undefined,
          proyectoServicioId: registro.proyectoServicioId || '',
          recursoId: registro.recursoId || '',
          recursoNombre: registro.recursoNombre || '',
          proyectoEdtId: registro.proyectoEdtId || '',
          categoriaServicioId: registro.categoriaServicioId || '',
          origen: registro.origen || '',
          ubicacion: registro.ubicacion || ''
        }))
      } as ProyectoEdtConRelaciones;
    } catch (error) {
      logger.error('Error al obtener EDT por ID:', error);
      throw new Error('Error al obtener EDT');
    }
  }

  // ✅ Crear nuevo EDT
  static async crearEdt(data: CreateProyectoEdtData): Promise<ProyectoEdtConRelaciones> {
    try {
      // 📡 Validaciones de negocio
      const erroresFechas = validarFechasEdt(
        data.fechaInicioPlan?.toISOString(),
        data.fechaFinPlan?.toISOString()
      );
      if (erroresFechas.length > 0) {
        throw new Error(`Errores de validación: ${erroresFechas.join(', ')}`);
      }

      // 🔍 Verificar unicidad
      const edtExistente = await prisma.proyectoEdt.findFirst({
        where: {
          proyectoId: data.proyectoId,
          categoriaServicioId: data.categoriaServicioId,
          zona: data.zona ?? null
        }
      });

      if (edtExistente) {
        throw new Error('Ya existe un EDT para esta combinación de proyecto, categoría y zona');
      }

      // 🏗️ Crear EDT
      const nuevoEdt = await prisma.proyectoEdt.create({
        data: {
          ...data,
          zona: data.zona || null,
          nombre: data.nombre,
          proyectoCronogramaId: data.proyectoCronogramaId
        },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              proyectoId: true,
              proyectoServicioId: true,
              categoria: true,
              nombreServicio: true,
              recursoId: true,
              recursoNombre: true,
              usuarioId: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              descripcion: true,
              observaciones: true,
              aprobado: true,
              proyectoEdtId: true,
              categoriaServicioId: true,
              origen: true,
              ubicacion: true,
              createdAt: true,
              updatedAt: true,
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            }
          }
        }
      });

      logger.info(`EDT creado: ${nuevoEdt.id}`);
      return {
        ...nuevoEdt,
        nombre: nuevoEdt.nombre,
        zona: nuevoEdt.zona || undefined,
        responsableId: nuevoEdt.responsableId || undefined,
        descripcion: nuevoEdt.descripcion || undefined,
        fechaInicio: nuevoEdt.fechaInicioPlan?.toISOString() || undefined,
        fechaFin: nuevoEdt.fechaFinPlan?.toISOString() || undefined,
        fechaInicioReal: nuevoEdt.fechaInicioReal?.toISOString() || undefined,
        fechaFinReal: nuevoEdt.fechaFinReal?.toISOString() || undefined,
        createdAt: nuevoEdt.createdAt.toISOString(),
        updatedAt: nuevoEdt.updatedAt.toISOString(),
        horasPlan: Number(nuevoEdt.horasPlan || 0),
        horasReales: Number(nuevoEdt.horasReales || 0),
        responsable: nuevoEdt.responsable || undefined,
        proyecto: {
          ...nuevoEdt.proyecto,
          estado: nuevoEdt.proyecto.estado as any
        },
        registrosHoras: nuevoEdt.registrosHoras.map(registro => ({
          ...registro,
          proyectoId: registro.proyectoId || '',
          categoria: registro.categoria || '',
          nombreServicio: registro.nombreServicio || '',
          usuarioId: registro.usuarioId || '',
          horasTrabajadas: Number(registro.horasTrabajadas || 0),
          aprobado: Boolean(registro.aprobado),
          fechaTrabajo: registro.fechaTrabajo.toISOString(),
          createdAt: registro.createdAt.toISOString(),
          updatedAt: registro.updatedAt.toISOString(),
          descripcion: registro.descripcion || undefined,
          observaciones: registro.observaciones || undefined,
          proyectoServicioId: registro.proyectoServicioId || '',
          recursoId: registro.recursoId || '',
          recursoNombre: registro.recursoNombre || '',
          proyectoEdtId: registro.proyectoEdtId || '',
          categoriaServicioId: registro.categoriaServicioId || '',
          origen: registro.origen || '',
          ubicacion: registro.ubicacion || ''
        }))
      } as ProyectoEdtConRelaciones;
    } catch (error) {
      logger.error('Error al crear EDT:', error);
      throw error;
    }
  }

  // ✅ Actualizar EDT
  static async actualizarEdt(
    edtId: string,
    data: Omit<UpdateProyectoEdtData, 'id'>
  ): Promise<ProyectoEdtConRelaciones> {
    try {
      // 🔍 Obtener EDT actual
      const edtActual = await prisma.proyectoEdt.findUnique({
        where: { id: edtId }
      });

      if (!edtActual) {
        throw new Error('EDT no encontrado');
      }

      // 📡 Validaciones de negocio
      const fechaInicioPlan = data.fechaInicioPlan ?? edtActual.fechaInicioPlan;
      const fechaFinPlan = data.fechaFinPlan ?? edtActual.fechaFinPlan;
      const fechaInicioReal = data.fechaInicioReal ?? edtActual.fechaInicioReal;
      const fechaFinReal = data.fechaFinReal ?? edtActual.fechaFinReal;

      // Validar fechas de plan
      const erroresFechasPlan = validarFechasEdt(
        fechaInicioPlan?.toISOString(),
        fechaFinPlan?.toISOString()
      );
      
      // Validar fechas reales
      const erroresFechasReal = validarFechasEdt(
        fechaInicioReal?.toISOString(),
        fechaFinReal?.toISOString()
      );
      
      const erroresFechas = [...erroresFechasPlan, ...erroresFechasReal];
      if (erroresFechas.length > 0) {
        throw new Error(`Errores de validación: ${erroresFechas.join(', ')}`);
      }

      // 🔁 Validar estado si se está actualizando
      if (data.estado || data.porcentajeAvance !== undefined) {
        const estado = data.estado ?? edtActual.estado;
        const porcentajeAvance = data.porcentajeAvance ?? edtActual.porcentajeAvance;
        
        const erroresEstado: string[] = [];
        
        // Validar coherencia del estado
        if (estado === 'completado') {
          if (porcentajeAvance !== 100) {
            erroresEstado.push('Un EDT completado debe tener 100% de avance');
          }
          if (!fechaFinReal) {
            erroresEstado.push('Un EDT completado debe tener fecha de fin real');
          }
        }
        
        if (estado === 'planificado' && porcentajeAvance > 0) {
          erroresEstado.push('Un EDT planificado no puede tener avance mayor a 0%');
        }
        if (erroresEstado.length > 0) {
          throw new Error(`Errores de validación de estado: ${erroresEstado.join(', ')}`);
        }
      }

      // 🔄 Actualizar EDT
      const edtActualizado = await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: {
          ...data,
          nombre: data.nombre
        },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              proyectoId: true,
              proyectoServicioId: true,
              categoria: true,
              nombreServicio: true,
              recursoId: true,
              recursoNombre: true,
              usuarioId: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              descripcion: true,
              observaciones: true,
              aprobado: true,
              proyectoEdtId: true,
              categoriaServicioId: true,
              origen: true,
              ubicacion: true,
              createdAt: true,
              updatedAt: true,
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            }
          }
        }
      });

      logger.info(`EDT actualizado: ${edtId}`);
      return {
        ...edtActualizado,
        nombre: edtActualizado.nombre,
        zona: edtActualizado.zona ?? undefined,
        responsableId: edtActualizado.responsableId ?? undefined,
        descripcion: edtActualizado.descripcion ?? undefined,
        responsable: edtActualizado.responsable ?? undefined,
        fechaInicio: edtActualizado.fechaInicioPlan?.toISOString() ?? undefined,
        fechaFin: edtActualizado.fechaFinPlan?.toISOString() ?? undefined,
        fechaInicioReal: edtActualizado.fechaInicioReal?.toISOString() ?? undefined,
        fechaFinReal: edtActualizado.fechaFinReal?.toISOString() ?? undefined,
        horasPlan: Number(edtActualizado.horasPlan),
        horasReales: Number(edtActualizado.horasReales),
        createdAt: edtActualizado.createdAt.toISOString(),
        updatedAt: edtActualizado.updatedAt.toISOString(),
        proyecto: {
          ...edtActualizado.proyecto,
          estado: edtActualizado.proyecto.estado as any
        },
        registrosHoras: edtActualizado.registrosHoras.map(registro => ({
          ...registro,
          proyectoId: registro.proyectoId || '',
          categoria: registro.categoria || '',
          nombreServicio: registro.nombreServicio || '',
          usuarioId: registro.usuarioId || '',
          horasTrabajadas: Number(registro.horasTrabajadas || 0),
          aprobado: Boolean(registro.aprobado),
          fechaTrabajo: registro.fechaTrabajo.toISOString(),
          createdAt: registro.createdAt.toISOString(),
          updatedAt: registro.updatedAt.toISOString(),
          descripcion: registro.descripcion || undefined,
          observaciones: registro.observaciones || undefined,
          proyectoServicioId: registro.proyectoServicioId || '',
          recursoId: registro.recursoId || '',
          recursoNombre: registro.recursoNombre || '',
          proyectoEdtId: registro.proyectoEdtId || '',
          categoriaServicioId: registro.categoriaServicioId || '',
          origen: registro.origen || '',
          ubicacion: registro.ubicacion || ''
        }))
      } as ProyectoEdtConRelaciones;
    } catch (error) {
      logger.error('Error al actualizar EDT:', error);
      throw error;
    }
  }

  // ✅ Eliminar EDT
  static async eliminarEdt(edtId: string): Promise<void> {
    try {
      // 🔍 Verificar existencia
      const edtExistente = await prisma.proyectoEdt.findUnique({
        where: { id: edtId },
        include: {
          registrosHoras: {
            select: { id: true }
          }
        }
      });

      if (!edtExistente) {
        throw new Error('EDT no encontrado');
      }

      // 📡 Validar que no tenga registros de horas
      if (edtExistente.registrosHoras.length > 0) {
        throw new Error('No se puede eliminar un EDT que tiene registros de horas asociados');
      }

      // 🗑️ Eliminar EDT
      await prisma.proyectoEdt.delete({
        where: { id: edtId }
      });

      logger.info(`EDT eliminado: ${edtId}`);
    } catch (error) {
      logger.error('Error al eliminar EDT:', error);
      throw error;
    }
  }

  // ✅ Calcular y actualizar horas reales
  static async recalcularHorasReales(edtId: string): Promise<void> {
    try {
      const totalHoras = await prisma.registroHoras.aggregate({
        where: {
          proyectoEdtId: edtId
        },
        _sum: {
          horasTrabajadas: true
        }
      });

      await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: {
          horasReales: totalHoras._sum.horasTrabajadas || 0
        }
      });

      logger.info(`Horas reales recalculadas para EDT: ${edtId}`);
    } catch (error) {
      logger.error('Error al recalcular horas reales:', error);
      throw error;
    }
  }

  // ✅ Actualizar porcentaje de avance automático
  static async actualizarPorcentajeAvance(edtId: string): Promise<void> {
    try {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: edtId }
      });

      if (!edt) {
        throw new Error('EDT no encontrado');
      }

      let porcentaje = 0;

      if (edt.horasPlan && Number(edt.horasPlan) > 0) {
        porcentaje = Math.min(100, Math.round((Number(edt.horasReales) / Number(edt.horasPlan)) * 100));
      } else if (Number(edt.horasReales) > 0) {
        porcentaje = 50; // Si hay horas reales pero no plan, asumir 50%
      }

      await prisma.proyectoEdt.update({
        where: { id: edtId },
        data: { porcentajeAvance: porcentaje }
      });

      logger.info(`Porcentaje de avance actualizado para EDT ${edtId}: ${porcentaje}%`);
    } catch (error) {
      logger.error('Error al actualizar porcentaje de avance:', error);
      throw error;
    }
  }

  // ✅ Generar resumen de cronograma
  static async generarResumenCronograma(proyectoId: string): Promise<ResumenCronograma> {
    try {
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          nombre: true
        }
      });

      if (!proyecto) {
        throw new Error('Proyecto no encontrado');
      }

      const estadisticas = await prisma.proyectoEdt.groupBy({
        by: ['estado'],
        where: {
          proyectoId
        },
        _count: {
          id: true
        },
        _sum: {
          horasPlan: true,
          horasReales: true
        }
      });

      let totalEdts = 0;
      let edtsPlanificados = 0;
      let edtsEnProgreso = 0;
      let edtsCompletados = 0;
      let horasPlanTotal = 0;
      let horasRealesTotal = 0;

      estadisticas.forEach(stat => {
        totalEdts += stat._count.id;
        horasPlanTotal += Number(stat._sum.horasPlan || 0);
        horasRealesTotal += Number(stat._sum.horasReales || 0);

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
        }
      });

      const porcentajeAvanceGeneral = horasPlanTotal > 0
      ? Math.round((horasRealesTotal / horasPlanTotal) * 100)
        : 0;

      return {
        proyectoId,
        proyectoNombre: proyecto.nombre,
        totalEdts,
        edtsPlanificados,
        edtsEnProgreso,
        edtsCompletados,
        horasPlanTotal,
        horasRealesTotal,
        porcentajeAvanceGeneral
      };
    } catch (error) {
      logger.error('Error al generar resumen de cronograma:', error);
      throw error;
    }
  }

  // ✅ Obtener comparativo plan vs real
  static async obtenerComparativoPlanReal(proyectoId: string): Promise<ComparativoPlanReal[]> {
    try {
      const edts = await prisma.proyectoEdt.findMany({
        where: {
          proyectoId
        },
        include: {
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          categoriaServicio: {
            nombre: 'asc'
          }
        }
      });

      return edts.map(edt => {
        const horasPlan = Number(edt.horasPlan || 0);
        const horasReales = Number(edt.horasReales);
        
        // 📊 Calcular días de retraso si aplica
        let diasRetraso: number | undefined;
        if (edt.fechaFinPlan && edt.fechaFinReal) {
          const diffTime = edt.fechaFinReal.getTime() - edt.fechaFinPlan.getTime();
          diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (edt.fechaFinPlan && edt.estado === 'en_progreso') {
          const hoy = new Date();
          if (hoy > edt.fechaFinPlan) {
            const diffTime = hoy.getTime() - edt.fechaFinPlan.getTime();
            diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        return {
          categoriaServicioId: edt.categoriaServicioId,
          categoriaServicioNombre: edt.categoriaServicio.nombre,
          zona: edt.zona,
          horasPlan,
          horasReales,
          porcentajeAvance: edt.porcentajeAvance,
          estado: edt.estado,
          diasRetraso: diasRetraso && diasRetraso > 0 ? diasRetraso : undefined
        };
      });
    } catch (error) {
      logger.error('Error al obtener comparativo plan vs real:', error);
      throw error;
    }
  }

  // ✅ Obtener EDTs comerciales de un proyecto (desde su cotización)
  static async obtenerEdtsComercialesDeProyecto(proyectoId: string): Promise<any[]> {
    try {
      // Obtener el proyecto con su cotización
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          cotizacion: {
            select: { id: true }
          }
        }
      });

      if (!proyecto?.cotizacion) {
        return [];
      }

      // Obtener EDTs comerciales de la cotización
      const comercialEdts = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId: proyecto.cotizacion.id },
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
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tareas: {
            include: {
              responsable: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Transformar datos para consistencia con ProyectoEdt
      return comercialEdts.map(edt => ({
        id: edt.id,
        proyectoId: proyectoId, // Referencia al proyecto actual
        nombre: edt.cotizacionServicio?.nombre || 'EDT sin nombre', // Copiar nombre del servicio
        categoriaServicioId: edt.categoriaServicioId,
        zona: edt.zona,
        fechaInicio: edt.fechaInicioComercial?.toISOString(),
        fechaFin: edt.fechaFinComercial?.toISOString(),
        horasPlan: Number(edt.horasEstimadas || 0),
        responsableId: edt.responsableId,
        descripcion: edt.descripcion,
        prioridad: edt.prioridad,
        estado: edt.estado,
        createdAt: edt.createdAt.toISOString(),
        updatedAt: edt.updatedAt.toISOString(),
        proyecto: {
          id: proyectoId,
          nombre: '', // Se llenará desde el contexto
          codigo: '',
          estado: 'en_ejecucion' as any // Estado por defecto para comerciales
        },
        categoriaServicio: edt.categoriaServicio,
        responsable: edt.responsable,
        tareas: edt.tareas.map(tarea => ({
          id: tarea.id,
          nombre: tarea.nombre,
          descripcion: tarea.descripcion,
          fechaInicio: tarea.fechaInicio.toISOString(),
          fechaFin: tarea.fechaFin.toISOString(),
          horasEstimadas: Number(tarea.horasEstimadas || 0),
          estado: tarea.estado,
          prioridad: tarea.prioridad,
          responsableId: tarea.responsableId,
          dependenciaId: tarea.dependenciaId,
          responsable: tarea.responsable,
          createdAt: tarea.createdAt.toISOString(),
          updatedAt: tarea.updatedAt.toISOString()
        })),
        // Campos específicos de EDT comercial
        tipo: 'comercial',
        horasReales: 0, // No aplica para comerciales
        porcentajeAvance: 0, // No aplica para comerciales
        registrosHoras: [] // No aplica para comerciales
      }));
    } catch (error) {
      logger.error('Error al obtener EDTs comerciales del proyecto:', error);
      throw new Error('Error al obtener EDTs comerciales del proyecto');
    }
  }

  // ✅ Obtener EDT por responsable
  static async obtenerEdtsPorResponsable(
    responsableId: string,
    filtros: Partial<FiltrosCronogramaData> = {}
  ): Promise<ProyectoEdtConRelaciones[]> {
    try {
      const edts = await prisma.proyectoEdt.findMany({
        where: {
          responsableId,
          ...(filtros.estado && { estado: filtros.estado }),
          ...(filtros.proyectoId && { proyectoId: filtros.proyectoId })
        },
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              estado: true
            }
          },
          categoriaServicio: {
            select: {
              id: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          registrosHoras: {
            select: {
              id: true,
              proyectoId: true,
              proyectoServicioId: true,
              categoria: true,
              nombreServicio: true,
              recursoId: true,
              recursoNombre: true,
              usuarioId: true,
              fechaTrabajo: true,
              horasTrabajadas: true,
              descripcion: true,
              observaciones: true,
              aprobado: true,
              proyectoEdtId: true,
              categoriaServicioId: true,
              origen: true,
              ubicacion: true,
              createdAt: true,
              updatedAt: true,
              usuario: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              fechaTrabajo: 'desc'
            },
            take: 3
          }
        },
        orderBy: [
          { prioridad: 'desc' },
          { fechaFinPlan: 'asc' }
        ]
      });

      return edts.map(edt => ({
        ...edt,
        nombre: edt.nombre,
        zona: edt.zona ?? undefined,
        responsableId: edt.responsableId ?? undefined,
        descripcion: edt.descripcion ?? undefined,
        responsable: edt.responsable ?? undefined,
        fechaInicio: edt.fechaInicioPlan?.toISOString() ?? undefined,
        fechaFin: edt.fechaFinPlan?.toISOString() ?? undefined,
        fechaInicioReal: edt.fechaInicioReal?.toISOString() ?? undefined,
        fechaFinReal: edt.fechaFinReal?.toISOString() ?? undefined,
        horasPlan: Number(edt.horasPlan),
        horasReales: Number(edt.horasReales),
        createdAt: edt.createdAt.toISOString(),
        updatedAt: edt.updatedAt.toISOString(),
        proyecto: {
          ...edt.proyecto,
          estado: edt.proyecto.estado as any
        },
        registrosHoras: edt.registrosHoras.map(registro => ({
          ...registro,
          fechaTrabajo: registro.fechaTrabajo.toISOString(),
          createdAt: registro.createdAt.toISOString(),
          updatedAt: registro.updatedAt.toISOString(),
          descripcion: registro.descripcion || undefined,
          observaciones: registro.observaciones || undefined,
          proyectoServicioId: registro.proyectoServicioId || '',
          recursoId: registro.recursoId || '',
          recursoNombre: registro.recursoNombre || '',
          proyectoEdtId: registro.proyectoEdtId || '',
          categoriaServicioId: registro.categoriaServicioId || '',
          origen: registro.origen || '',
          ubicacion: registro.ubicacion || ''
        }))
      })) as ProyectoEdtConRelaciones[];
    } catch (error) {
      logger.error('Error al obtener EDT por responsable:', error);
      throw error;
    }
  }
}
