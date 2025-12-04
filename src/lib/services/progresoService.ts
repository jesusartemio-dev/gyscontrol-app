/**
 * Servicio de Cálculo de Progreso Automático
 *
 * Calcula y actualiza automáticamente el progreso de elementos del cronograma
 * basado en horas registradas vs horas planificadas.
 */

import { prisma } from '@/lib/prisma'

export class ProgresoService {

  /**
   * Actualiza el progreso de una tarea basado en horas registradas
   */
  static async actualizarProgresoTarea(tareaId: string) {
    try {
      // Obtener tarea con horas registradas
      const tarea = await prisma.proyectoTarea.findUnique({
        where: { id: tareaId },
        include: {
          registrosHoras: true
        }
      })

      if (!tarea) return

      // Calcular horas reales totales
      const horasReales = tarea.registrosHoras.reduce((sum, registro) => sum + registro.horasTrabajadas, 0)

      // Calcular progreso basado en horas
      let porcentajeAvance = 0
      if (tarea.horasEstimadas && Number(tarea.horasEstimadas) > 0) {
        porcentajeAvance = Math.min(100, Math.round((horasReales / Number(tarea.horasEstimadas)) * 100))
      }

      // Actualizar tarea
      await prisma.proyectoTarea.update({
        where: { id: tareaId },
        data: {
          horasReales,
          porcentajeCompletado: porcentajeAvance,
          estado: porcentajeAvance >= 100 ? 'completada' : 'en_progreso'
        }
      })

      // Propagar progreso hacia arriba (actividad -> EDT)
      await this.actualizarProgresoActividad(tarea.proyectoActividadId)

    } catch (error) {
      console.error('Error actualizando progreso de tarea:', error)
    }
  }

  /**
   * Actualiza el progreso de una actividad basado en sus tareas
   */
  static async actualizarProgresoActividad(actividadId: string | null) {
    if (!actividadId) return

    try {
      // Obtener actividad con tareas
      const actividad = await prisma.proyectoActividad.findUnique({
        where: { id: actividadId },
        include: {
          tareas: true
        }
      })

      if (!actividad || actividad.tareas.length === 0) return

      // Calcular progreso promedio de tareas
      const totalTareas = actividad.tareas.length
      const tareasCompletadas = actividad.tareas.filter(t => t.estado === 'completada').length
      const progresoPromedio = Math.round(
        actividad.tareas.reduce((sum, tarea) => sum + tarea.porcentajeCompletado, 0) / totalTareas
      )

      // Calcular horas reales totales
      const horasReales = actividad.tareas.reduce((sum, tarea) => sum + Number(tarea.horasReales), 0)

      // Actualizar actividad
      await prisma.proyectoActividad.update({
        where: { id: actividadId },
        data: {
          porcentajeAvance: progresoPromedio,
          horasReales,
          estado: progresoPromedio >= 100 ? 'completada' : 'en_progreso'
        }
      })

      // Propagar progreso hacia arriba (EDT)
      await this.actualizarProgresoEDT(actividad.proyectoEdtId)

    } catch (error) {
      console.error('Error actualizando progreso de actividad:', error)
    }
  }


  /**
    * Actualiza el progreso de un EDT basado en sus actividades
    */
   static async actualizarProgresoEDT(edtId: string) {
     try {
       // Obtener actividades del EDT
       const actividades = await prisma.proyectoActividad.findMany({
         where: { proyectoEdtId: edtId }
       })

       if (actividades.length === 0) return

       // Calcular progreso promedio de actividades
       const progresoPromedio = Math.round(
         actividades.reduce((sum, act) => sum + act.porcentajeAvance, 0) / actividades.length
       )

       // Calcular horas reales totales
       const horasReales = actividades.reduce((sum, act) => sum + Number(act.horasReales), 0)

       // Actualizar EDT
       await prisma.proyectoEdt.update({
         where: { id: edtId },
         data: {
           porcentajeAvance: progresoPromedio,
           horasReales,
           estado: progresoPromedio >= 100 ? 'completado' : 'en_progreso'
         }
       })

       // Propagar progreso hacia arriba (fase -> proyecto)
       const edt = await prisma.proyectoEdt.findUnique({
         where: { id: edtId },
         select: { proyectoFaseId: true }
       })

       if (edt?.proyectoFaseId) {
         await this.actualizarProgresoFase(edt.proyectoFaseId)
       }

     } catch (error) {
       console.error('Error actualizando progreso de EDT:', error)
     }
   }

  /**
   * Actualiza el progreso de una fase basado en sus EDTs
   */
  static async actualizarProgresoFase(faseId: string | null) {
    if (!faseId) return

    try {
      // Obtener fase con EDTs
      const fase = await prisma.proyectoFase.findUnique({
        where: { id: faseId },
        include: {
          edts: true
        }
      })

      if (!fase || fase.edts.length === 0) return

      // Calcular progreso promedio de EDTs
      const progresoPromedio = Math.round(
        fase.edts.reduce((sum, edt) => sum + edt.porcentajeAvance, 0) / fase.edts.length
      )

      // Actualizar fase
      await prisma.proyectoFase.update({
        where: { id: faseId },
        data: {
          porcentajeAvance: progresoPromedio,
          estado: progresoPromedio >= 100 ? 'completado' : 'en_progreso'
        }
      })

      // Propagar progreso hacia arriba (proyecto)
      await this.actualizarProgresoProyecto(fase.proyectoId)

    } catch (error) {
      console.error('Error actualizando progreso de fase:', error)
    }
  }

  /**
   * Actualiza el progreso general del proyecto
   */
  static async actualizarProgresoProyecto(proyectoId: string) {
    try {
      // Obtener proyecto con fases
      const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        include: {
          fases: true
        }
      })

      if (!proyecto || proyecto.fases.length === 0) return

      // Calcular progreso promedio de fases
      const progresoGeneral = Math.round(
        proyecto.fases.reduce((sum, fase) => sum + fase.porcentajeAvance, 0) / proyecto.fases.length
      )

      // Actualizar proyecto
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: {
          progresoGeneral
        }
      })

    } catch (error) {
      console.error('Error actualizando progreso de proyecto:', error)
    }
  }

  /**
    * Método principal para registrar horas y actualizar progreso
    */
   static async registrarHorasYActualizarProgreso(
     nivel: 'edt' | 'actividad' | 'tarea',
     elementoId: string,
     horas: number,
     descripcion: string,
     usuarioId: string,
     fecha: Date
   ) {
    try {
      // Obtener información necesaria para el registro
      const proyectoId = await this.obtenerProyectoIdDesdeElemento(nivel, elementoId)
      const recursoId = await this.obtenerRecursoIdDesdeUsuario(usuarioId)
      const recurso = await prisma.recurso.findUnique({ where: { id: recursoId } })
      const categoriaServicioId = await this.obtenerCategoriaServicioIdDesdeElemento(nivel, elementoId)
      const categoriaServicio = categoriaServicioId ? await prisma.categoriaServicio.findUnique({ where: { id: categoriaServicioId } }) : null

      // Crear registro de horas
      const registro = await prisma.registroHoras.create({
        data: {
          proyectoId,
          proyectoServicioId: await this.obtenerProyectoServicioIdDesdeElemento(nivel, elementoId),
          categoria: categoriaServicio?.nombre || 'General',
          nombreServicio: 'Trabajo en Cronograma',
          recursoId,
          recursoNombre: recurso?.nombre || 'Recurso Genérico',
          categoriaServicioId,
          proyectoEdtId: nivel === 'edt' ? elementoId : await this.obtenerEdtIdDesdeElemento(nivel, elementoId),
          proyectoTareaId: nivel === 'tarea' ? elementoId : undefined,
          usuarioId,
          fechaTrabajo: fecha,
          horasTrabajadas: horas,
          descripcion,
          aprobado: false // Requiere aprobación
        }
      })

      // Actualizar progreso según el nivel
      switch (nivel) {
        case 'tarea':
          await this.actualizarProgresoTarea(elementoId)
          break
        case 'actividad':
          await this.actualizarProgresoActividad(elementoId)
          break
        case 'edt':
          await this.actualizarProgresoEDT(elementoId)
          break
      }

      return registro

    } catch (error) {
      console.error('Error registrando horas:', error)
      throw error
    }
  }

  // Métodos auxiliares para obtener IDs relacionados

  private static async obtenerProyectoIdDesdeElemento(nivel: string, elementoId: string): Promise<string> {
    switch (nivel) {
      case 'tarea':
        const tarea = await prisma.proyectoTarea.findUnique({
          where: { id: elementoId },
          include: { proyectoEdt: { include: { proyecto: true } } }
        })
        return tarea?.proyectoEdt?.proyecto?.id || ''

      case 'actividad':
        const actividad = await prisma.proyectoActividad.findUnique({
          where: { id: elementoId },
          include: {
            proyectoEdt: { include: { proyecto: true } }
          }
        })
        return actividad?.proyectoEdt?.proyecto?.id || ''

      case 'edt':
        const edt = await prisma.proyectoEdt.findUnique({
          where: { id: elementoId },
          include: { proyecto: true }
        })
        return edt?.proyecto?.id || ''

      default:
        return ''
    }
  }

  private static async obtenerProyectoServicioIdDesdeElemento(nivel: string, elementoId: string): Promise<string> {
    // Lógica para obtener el servicio relacionado
    // Esto depende de cómo estén relacionados los servicios con los elementos del cronograma
    return '' // Implementar según la lógica de negocio
  }

  private static async obtenerCategoriaServicioIdDesdeElemento(nivel: string, elementoId: string): Promise<string | undefined> {
    switch (nivel) {
      case 'edt':
        const edt = await prisma.proyectoEdt.findUnique({
          where: { id: elementoId },
          include: { categoriaServicio: true }
        })
        return edt?.categoriaServicio?.id

      default:
        return undefined
    }
  }

  private static async obtenerEdtIdDesdeElemento(nivel: string, elementoId: string): Promise<string | undefined> {
    switch (nivel) {
      case 'tarea':
        const tarea = await prisma.proyectoTarea.findUnique({
          where: { id: elementoId },
          include: { proyectoEdt: true }
        })
        return tarea?.proyectoEdt?.id

      case 'actividad':
        const actividad = await prisma.proyectoActividad.findUnique({
          where: { id: elementoId },
          include: {
            proyectoEdt: true
          }
        })
        return actividad?.proyectoEdt?.id

      default:
        return undefined
    }
  }

  private static async obtenerRecursoIdDesdeUsuario(usuarioId: string): Promise<string> {
    // Lógica para obtener el recurso asociado al usuario
    // Por defecto, usar un recurso genérico o buscar por nombre
    const recurso = await prisma.recurso.findFirst({
      where: { nombre: 'Trabajo General' }
    })
    return recurso?.id || ''
  }
}