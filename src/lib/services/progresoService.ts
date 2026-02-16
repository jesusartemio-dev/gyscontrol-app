/**
 * Servicio de Cálculo de Progreso Automático
 *
 * Calcula y actualiza automáticamente el progreso de elementos del cronograma
 * basado en horas registradas vs horas planificadas.
 */

import { prisma } from '@/lib/prisma'
import { obtenerCostoHoraPEN } from '@/lib/utils/costoHoraSnapshot'

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
          registroHoras: true
        }
      })

      if (!tarea) return

      // Calcular horas reales totales
      const horasReales = tarea.registroHoras.reduce((sum, registro) => sum + registro.horasTrabajadas, 0)

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
          estado: porcentajeAvance >= 100 ? 'completada' : 'en_progreso',
          updatedAt: new Date()
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
          proyectoTarea: true
        }
      })

      if (!actividad || actividad.proyectoTarea.length === 0) return

      // Calcular progreso ponderado por horas estimadas
      const horasReales = actividad.proyectoTarea.reduce((sum, tarea) => sum + Number(tarea.horasReales), 0)
      const totalHorasEstimadas = actividad.proyectoTarea.reduce((sum, tarea) => sum + Number(tarea.horasEstimadas || 0), 0)

      let progresoPromedio: number
      if (totalHorasEstimadas > 0) {
        // Progreso ponderado: tareas con más horas pesan más
        progresoPromedio = Math.round(
          actividad.proyectoTarea.reduce((sum, tarea) => {
            const peso = Number(tarea.horasEstimadas || 0)
            return sum + tarea.porcentajeCompletado * peso
          }, 0) / totalHorasEstimadas
        )
      } else {
        // Fallback: promedio simple si no hay horas estimadas
        progresoPromedio = Math.round(
          actividad.proyectoTarea.reduce((sum, tarea) => sum + tarea.porcentajeCompletado, 0) / actividad.proyectoTarea.length
        )
      }

      // Actualizar actividad
      await prisma.proyectoActividad.update({
        where: { id: actividadId },
        data: {
          porcentajeAvance: progresoPromedio,
          horasReales,
          estado: progresoPromedio >= 100 ? 'completada' : 'en_progreso',
          updatedAt: new Date()
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

       // Calcular horas reales totales
       const horasReales = actividades.reduce((sum, act) => sum + Number(act.horasReales), 0)
       const totalHorasPlan = actividades.reduce((sum, act) => sum + Number(act.horasPlan || 0), 0)

       let progresoPromedio: number
       if (totalHorasPlan > 0) {
         // Progreso ponderado: actividades con más horas planificadas pesan más
         progresoPromedio = Math.round(
           actividades.reduce((sum, act) => {
             const peso = Number(act.horasPlan || 0)
             return sum + act.porcentajeAvance * peso
           }, 0) / totalHorasPlan
         )
       } else {
         // Fallback: promedio simple si no hay horas planificadas
         progresoPromedio = Math.round(
           actividades.reduce((sum, act) => sum + act.porcentajeAvance, 0) / actividades.length
         )
       }

       // Actualizar EDT
       await prisma.proyectoEdt.update({
         where: { id: edtId },
         data: {
           porcentajeAvance: progresoPromedio,
           horasReales,
           estado: progresoPromedio >= 100 ? 'completado' : 'en_progreso',
           updatedAt: new Date()
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
          proyectoEdt: true
        }
      })

      if (!fase || fase.proyectoEdt.length === 0) return

      // Calcular progreso ponderado por horas planificadas de EDTs
      const totalHorasPlan = fase.proyectoEdt.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)

      let progresoPromedio: number
      if (totalHorasPlan > 0) {
        // Progreso ponderado: EDTs con más horas planificadas pesan más
        progresoPromedio = Math.round(
          fase.proyectoEdt.reduce((sum, edt) => {
            const peso = Number(edt.horasPlan || 0)
            return sum + edt.porcentajeAvance * peso
          }, 0) / totalHorasPlan
        )
      } else {
        // Fallback: promedio simple si no hay horas planificadas
        progresoPromedio = Math.round(
          fase.proyectoEdt.reduce((sum, edt) => sum + edt.porcentajeAvance, 0) / fase.proyectoEdt.length
        )
      }

      // Actualizar fase
      await prisma.proyectoFase.update({
        where: { id: faseId },
        data: {
          porcentajeAvance: progresoPromedio,
          estado: progresoPromedio >= 100 ? 'completado' : 'en_progreso',
          updatedAt: new Date()
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
          proyectoFase: true
        }
      })

      if (!proyecto || proyecto.proyectoFase.length === 0) return

      // Calcular progreso ponderado por horas planificadas de fases
      // Necesitamos obtener horasPlan de los EDTs de cada fase
      const fasesConHoras = await Promise.all(
        proyecto.proyectoFase.map(async (fase) => {
          const edts = await prisma.proyectoEdt.findMany({
            where: { proyectoFaseId: fase.id },
            select: { horasPlan: true }
          })
          const horasPlanFase = edts.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)
          return { ...fase, horasPlanFase }
        })
      )

      const totalHorasPlan = fasesConHoras.reduce((sum, f) => sum + f.horasPlanFase, 0)

      let progresoGeneral: number
      if (totalHorasPlan > 0) {
        progresoGeneral = Math.round(
          fasesConHoras.reduce((sum, f) => sum + f.porcentajeAvance * f.horasPlanFase, 0) / totalHorasPlan
        )
      } else {
        progresoGeneral = Math.round(
          proyecto.proyectoFase.reduce((sum, fase) => sum + fase.porcentajeAvance, 0) / proyecto.proyectoFase.length
        )
      }

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
      const edtId = await this.obtenerCategoriaServicioIdDesdeElemento(nivel, elementoId)
      const edtCatalogo = edtId ? await prisma.edt.findUnique({ where: { id: edtId } }) : null

      // Snapshot del costo hora actual del empleado (PEN)
      const costoHora = await obtenerCostoHoraPEN(usuarioId)

      // Crear registro de horas
      const registro = await prisma.registroHoras.create({
        data: {
          id: crypto.randomUUID(),
          proyectoId,
          proyectoServicioId: await this.obtenerProyectoServicioIdDesdeElemento(nivel, elementoId),
          categoria: edtCatalogo?.nombre || 'General',
          nombreServicio: 'Trabajo en Cronograma',
          recursoId,
          recursoNombre: recurso?.nombre || 'Recurso Genérico',
          edtId,
          proyectoEdtId: nivel === 'edt' ? elementoId : await this.obtenerEdtIdDesdeElemento(nivel, elementoId),
          proyectoTareaId: nivel === 'tarea' ? elementoId : undefined,
          usuarioId,
          fechaTrabajo: fecha,
          horasTrabajadas: horas,
          descripcion,
          aprobado: false, // Requiere aprobación
          costoHora: costoHora || null,
          updatedAt: new Date()
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
        const edtRecord = await prisma.proyectoEdt.findUnique({
          where: { id: elementoId },
          include: { edt: true } // Prisma relation name
        })
        return edtRecord?.edt?.id

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