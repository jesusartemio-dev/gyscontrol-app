/**
 * 📅 Servicio CotizacionCronograma - Sistema EDT Comercial
 *
 * Servicio de negocio para gestión completa del cronograma comercial.
 * Maneja EDTs, tareas, dependencias y lógica de conversión a proyecto.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { EstadoEdt, PrioridadEdt, CotizacionEdt, CotizacionTarea, ProyectoEdt } from '@/types/modelos'
import {
  fechasComercialesCoherentes,
  calcularPorcentajeAvanceComercial,
  estaEnRiesgoDeRetrasoComercial,
  puedecambiarEstadoCotizacionEdt
} from '@/lib/validators/cronograma'

export class CotizacionCronogramaService {
  // ===================================================
  // 📋 GESTIÓN DE EDTs COMERCIALES
  // ===================================================

  /**
   * 📝 Crear EDT comercial
    */
   static async crearEdtComercial(data: {
     cotizacionId: string
     cotizacionServicioId: string
     categoriaServicioId: string
     nombre: string
     zona?: string
     fechaInicioCom?: Date
     fechaFinCom?: Date
     horasCom?: number
     responsableId?: string
     descripcion?: string
     prioridad?: 'baja' | 'media' | 'alta' | 'critica'
   }) {
    try {
      // Validar coherencia de fechas
      if (!fechasComercialesCoherentes(
        data.fechaInicioCom?.toISOString(),
        data.fechaFinCom?.toISOString()
      )) {
        throw new Error('Fechas comerciales incoherentes')
      }

      const nuevoEdt = await prisma.cotizacionEdt.create({
        data: {
          cotizacionId: data.cotizacionId,
          cotizacionServicioId: data.cotizacionServicioId || '', // ✅ Add required field
          categoriaServicioId: data.categoriaServicioId,
          nombre: data.nombre,
          zona: data.zona,
          fechaInicioComercial: data.fechaInicioCom,
          fechaFinComercial: data.fechaFinCom,
          horasEstimadas: data.horasCom,
          responsableId: data.responsableId,
          descripcion: data.descripcion,
          prioridad: data.prioridad || 'media'
        },
        include: {
          categoriaServicio: true,
          responsable: true
        }
      })

      logger.info(`✅ EDT comercial creado: ${nuevoEdt.id}`)
      return nuevoEdt

    } catch (error) {
      logger.error('❌ Error creando EDT comercial:', error)
      throw error
    }
  }

  /**
   * 📊 Obtener EDTs de una cotización
   */
  static async obtenerEdtsCotizacion(cotizacionId: string) {
    try {
      const edts = await prisma.cotizacionEdt.findMany({
        where: { cotizacionId },
        include: {
          categoriaServicio: true,
          responsable: true,
          tareas: true
        },
        orderBy: { createdAt: 'asc' }
      })

      return edts

    } catch (error) {
      logger.error('❌ Error obteniendo EDTs de cotización:', error)
      throw error
    }
  }

  /**
   * 🔄 Actualizar EDT comercial
   */
  static async actualizarEdtComercial(
    edtId: string,
    data: Partial<{
      zona: string
      fechaInicioCom: Date
      fechaFinCom: Date
      horasCom: number
      responsableId: string
      descripcion: string
      prioridad: 'baja' | 'media' | 'alta' | 'critica'
    }>
  ): Promise<any> {
    try {
      // Validar coherencia de fechas si se actualizan
      if (data.fechaInicioCom || data.fechaFinCom) {
        const edtActual = await prisma.cotizacionEdt.findUnique({
          where: { id: edtId }
        })

        const fechaInicio = data.fechaInicioCom || edtActual?.fechaInicioComercial
        const fechaFin = data.fechaFinCom || edtActual?.fechaFinComercial

        if (!fechasComercialesCoherentes(
          fechaInicio?.toISOString(),
          fechaFin?.toISOString()
        )) {
          throw new Error('Fechas comerciales incoherentes')
        }
      }

      const edtActualizado = await prisma.cotizacionEdt.update({
        where: { id: edtId },
        data: {
          ...(data.zona !== undefined && { zona: data.zona }),
          ...(data.fechaInicioCom && { fechaInicioComercial: data.fechaInicioCom }),
          ...(data.fechaFinCom && { fechaFinComercial: data.fechaFinCom }),
          ...(data.horasCom !== undefined && { horasEstimadas: data.horasCom }),
          ...(data.responsableId !== undefined && { responsableId: data.responsableId }),
          ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
          ...(data.prioridad && { prioridad: data.prioridad })
        },
        include: {
          categoriaServicio: true,
          responsable: true,
          tareas: true
        }
      })

      logger.info(`✅ EDT comercial actualizado: ${edtId}`)
      return edtActualizado

    } catch (error) {
      logger.error('❌ Error actualizando EDT comercial:', error)
      throw error
    }
  }

  /**
   * 🗑️ Eliminar EDT comercial
   */
  static async eliminarEdtComercial(edtId: string): Promise<void> {
    try {
      await prisma.cotizacionEdt.delete({
        where: { id: edtId }
      })

      logger.info(`✅ EDT comercial eliminado: ${edtId}`)

    } catch (error) {
      logger.error('❌ Error eliminando EDT comercial:', error)
      throw error
    }
  }

  // ===================================================
  // 📋 GESTIÓN DE TAREAS COMERCIALES
  // ===================================================

  /**
   * 📝 Crear tarea comercial
   */
  static async crearTareaComercial(data: {
    cotizacionEdtId: string
    nombre: string
    fechaInicioCom?: Date
    fechaFinCom?: Date
    horasCom?: number
    dependenciaDeId?: string
    descripcion?: string
    prioridad?: 'baja' | 'media' | 'alta' | 'critica'
    responsableId?: string
  }): Promise<any> {
    try {
      // Validar coherencia de fechas
      if (!fechasComercialesCoherentes(
        data.fechaInicioCom?.toISOString(),
        data.fechaFinCom?.toISOString()
      )) {
        throw new Error('Fechas de tarea incoherentes')
      }

      // Validar dependencia si existe
      if (data.dependenciaDeId) {
        const dependencia = await prisma.cotizacionTarea.findFirst({
          where: {
            id: data.dependenciaDeId,
            cotizacionEdtId: data.cotizacionEdtId
          }
        })

        if (!dependencia) {
          throw new Error('Tarea de dependencia no encontrada')
        }
      }

      const nuevaTarea = await prisma.cotizacionTarea.create({
        data: {
          cotizacionEdtId: data.cotizacionEdtId,
          nombre: data.nombre,
          fechaInicio: data.fechaInicioCom || new Date(),
          fechaFin: data.fechaFinCom || new Date(),
          horasEstimadas: data.horasCom,
          dependenciaId: data.dependenciaDeId,
          descripcion: data.descripcion,
          prioridad: data.prioridad || 'media',
          responsableId: data.responsableId
        },
        include: {
          dependencia: true,
          responsable: true
        }
      })

      logger.info(`✅ Tarea comercial creada: ${nuevaTarea.id}`)
      return nuevaTarea

    } catch (error) {
      logger.error('❌ Error creando tarea comercial:', error)
      throw error
    }
  }

  /**
   * 📊 Obtener tareas de un EDT
   */
  static async obtenerTareasEdt(edtId: string): Promise<any[]> {
    try {
      const tareas = await prisma.cotizacionTarea.findMany({
        where: { cotizacionEdtId: edtId },
        include: {
          dependencia: {
            select: { id: true, nombre: true }
          },
          tareasDependientes: {
            select: { id: true, nombre: true }
          },
          responsable: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return tareas

    } catch (error) {
      logger.error('❌ Error obteniendo tareas de EDT:', error)
      throw error
    }
  }

  // ===================================================
  // 🔄 CONVERSIÓN A PROYECTO
  // ===================================================

  /**
   * 🔄 Convertir EDTs comerciales a EDTs de proyecto
   */
  static async convertirEdtsAProyecto(
    cotizacionId: string,
    proyectoId: string,
    proyectoCronogramaId: string
  ): Promise<any[]> {
    try {
      // Obtener todos los EDTs comerciales de la cotización
      const edtsComerciales = await this.obtenerEdtsCotizacion(cotizacionId)

      const edtsProyecto: ProyectoEdt[] = []

      for (const edtComercial of edtsComerciales) {
        // Crear EDT de proyecto basado en el comercial
        const edtProyecto = await prisma.proyectoEdt.create({
          data: {
            proyectoId,
            proyectoCronogramaId,
            categoriaServicioId: edtComercial.categoriaServicioId || '',
            nombre: edtComercial.nombre || `EDT ${edtComercial.categoriaServicio?.nombre || 'Sin nombre'}`,
            zona: edtComercial.zona,
            fechaInicioPlan: edtComercial.fechaInicioComercial,
            fechaFinPlan: edtComercial.fechaFinComercial,
            horasPlan: edtComercial.horasEstimadas,
            responsableId: edtComercial.responsableId,
            descripcion: edtComercial.descripcion,
            prioridad: edtComercial.prioridad
          },
          include: {
            proyecto: true,
            categoriaServicio: true
          }
        })

        // Convert null values to undefined for type compatibility
        const edtCompatible: ProyectoEdt = {
          ...edtProyecto,
          zona: edtProyecto.zona || undefined,
          responsableId: edtProyecto.responsableId || undefined,
          descripcion: edtProyecto.descripcion || undefined,
          fechaInicioReal: edtProyecto.fechaInicioReal?.toISOString() || undefined,
          fechaFinReal: edtProyecto.fechaFinReal?.toISOString() || undefined,
          horasPlan: Number(edtProyecto.horasPlan) || 0,
          horasReales: Number(edtProyecto.horasReales) || 0,
          createdAt: edtProyecto.createdAt.toISOString(),
          updatedAt: edtProyecto.updatedAt.toISOString(),
          proyecto: edtProyecto.proyecto,
          categoriaServicio: edtProyecto.categoriaServicio
        }
        edtsProyecto.push(edtCompatible)

        // Convertir tareas comerciales a tareas de proyecto
        await this.convertirTareasAProyecto(edtComercial.id, edtProyecto.id)
      }

      logger.info(`✅ Convertidos ${edtsProyecto.length} EDTs comerciales a proyecto ${proyectoId}`)
      return edtsProyecto

    } catch (error) {
      logger.error('❌ Error convirtiendo EDTs a proyecto:', error)
      throw error
    }
  }

  /**
   * 🔄 Convertir tareas comerciales a tareas de proyecto
   */
  private static async convertirTareasAProyecto(
    edtComercialId: string,
    edtProyectoId: string
  ): Promise<void> {
    try {
      const tareasComerciales = await this.obtenerTareasEdt(edtComercialId)

      for (const tareaComercial of tareasComerciales) {
        // Aquí se crearía la tarea de proyecto correspondiente
        // Nota: Este código asume que existe un modelo ProyectoTarea
        // que debería ser implementado en el futuro

        logger.info(`📝 Tarea comercial ${tareaComercial.id} lista para conversión`)
      }

    } catch (error) {
      logger.error('❌ Error convirtiendo tareas a proyecto:', error)
      throw error
    }
  }

  // ===================================================
  // 📊 MÉTRICAS Y REPORTES
  // ===================================================

  /**
   * 📊 Calcular métricas del cronograma comercial
   */
  static async calcularMetricasCronograma(cotizacionId: string): Promise<{
    totalEdts: number
    totalTareas: number
    horasTotales: number
    edtsEnRiesgo: number
    eficienciaPromedio: number
  }> {
    try {
      const edts = await this.obtenerEdtsCotizacion(cotizacionId)

      let totalTareas = 0
      let horasTotales = 0
      let edtsEnRiesgo = 0

      for (const edt of edts) {
        totalTareas += edt.tareas?.length || 0
        horasTotales += Number(edt.horasEstimadas) || 0

        // Verificar si está en riesgo
        if (edt.fechaFinComercial &&
            estaEnRiesgoDeRetrasoComercial(edt.fechaFinComercial.toISOString())) {
          edtsEnRiesgo++
        }
      }

      const eficienciaPromedio = horasTotales > 0 ? (totalTareas / horasTotales) * 100 : 0

      return {
        totalEdts: edts.length,
        totalTareas,
        horasTotales,
        edtsEnRiesgo,
        eficienciaPromedio
      }

    } catch (error) {
      logger.error('❌ Error calculando métricas:', error)
      throw error
    }
  }

  /**
   * 🚨 Obtener alertas del cronograma comercial
   */
  static async obtenerAlertasCronograma(cotizacionId: string): Promise<Array<{
    tipo: 'retraso' | 'sin_fechas' | 'sin_responsable'
    severidad: 'alta' | 'media' | 'baja'
    mensaje: string
    edtId: string
  }>> {
    try {
      const edts = await this.obtenerEdtsCotizacion(cotizacionId)
      const alertas = []

      for (const edt of edts) {
        // Alerta: EDT sin fechas definidas
        if (!edt.fechaInicioComercial || !edt.fechaFinComercial) {
          alertas.push({
            tipo: 'sin_fechas' as const,
            severidad: 'media' as const,
            mensaje: `EDT ${edt.categoriaServicio?.nombre || 'Sin nombre'} sin fechas definidas`,
            edtId: edt.id
          })
        }

        // Alerta: EDT sin responsable asignado
        if (!edt.responsableId) {
          alertas.push({
            tipo: 'sin_responsable' as const,
            severidad: 'baja' as const,
            mensaje: `EDT ${edt.categoriaServicio?.nombre || 'Sin nombre'} sin responsable asignado`,
            edtId: edt.id
          })
        }

        // Alerta: EDT en riesgo de retraso
        if (edt.fechaFinComercial &&
            estaEnRiesgoDeRetrasoComercial(edt.fechaFinComercial.toISOString())) {
          alertas.push({
            tipo: 'retraso' as const,
            severidad: 'alta' as const,
            mensaje: `EDT ${edt.categoriaServicio?.nombre || 'Sin nombre'} en riesgo de retraso`,
            edtId: edt.id
          })
        }
      }

      return alertas

    } catch (error) {
      logger.error('❌ Error obteniendo alertas:', error)
      throw error
    }
  }
}