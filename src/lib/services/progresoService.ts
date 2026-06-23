/**
 * Servicio de Cálculo de Progreso Automático
 *
 * Calcula y actualiza automáticamente el progreso de elementos del cronograma
 * basado en horas registradas vs horas planificadas.
 */

import { prisma } from '@/lib/prisma'
import { obtenerCostoHoraPEN } from '@/lib/utils/costoHoraSnapshot'
import { verificarSemanaEditable } from '@/lib/utils/timesheetAprobacion'
import { hh } from './horasHombre'

export class ProgresoService {

  /**
   * Avance ponderado por horas estimadas sobre un conjunto de tareas (flat). Es la base
   * robusta del rollup: pondera por las horas REALES de las tareas, no por el campo
   * horasPlan (que puede estar en 0 o desfasado y distorsiona el promedio).
   */
  private static avanceFlat(tareas: { porcentajeCompletado: number; horasEstimadas: any; personasEstimadas?: any }[]): number {
    if (tareas.length === 0) return 0
    const h = tareas.reduce((s, t) => s + hh(t), 0)
    if (h <= 0) return Math.round(tareas.reduce((s, t) => s + t.porcentajeCompletado, 0) / tareas.length)
    return Math.round(tareas.reduce((s, t) => s + t.porcentajeCompletado * hh(t), 0) / h)
  }

  /**
   * Actualiza el progreso de una tarea basado en horas registradas
   */
  static async actualizarProgresoTarea(tareaId: string) {
    try {
      // Obtener tarea con ambas fuentes de horas: timesheets (RegistroHoras) y jornadas de campo
      const tarea = await prisma.proyectoTarea.findUnique({
        where: { id: tareaId },
        include: {
          registroHoras: { select: { horasTrabajadas: true } },
          registrosCampoTarea: {
            include: { miembros: { select: { horas: true } } }
          }
        }
      })

      if (!tarea) return

      // Fuente 1: timesheets de oficina/campo (RegistroHoras)
      const horasTimesheet = tarea.registroHoras.reduce((sum, r) => sum + r.horasTrabajadas, 0)
      // Fuente 2: jornadas de campo (RegistroHorasCampoTarea → miembros)
      const horasCampo = tarea.registrosCampoTarea.reduce(
        (sum, ct) => sum + ct.miembros.reduce((s, m) => s + m.horas, 0), 0
      )
      const horasReales = horasTimesheet + horasCampo

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
          proyectoTarea: { select: { porcentajeCompletado: true, horasEstimadas: true, personasEstimadas: true, horasReales: true } }
        }
      })

      if (!actividad || actividad.proyectoTarea.length === 0) return

      // Calcular progreso ponderado por horas-hombre
      const horasReales = actividad.proyectoTarea.reduce((sum, tarea) => sum + Number(tarea.horasReales), 0)
      const progresoPromedio = this.avanceFlat(actividad.proyectoTarea)

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
       // Avance del EDT = ponderado por horas de TODAS sus tareas (flat, no por horasPlan).
       const tareas = await prisma.proyectoTarea.findMany({
         where: { proyectoEdtId: edtId },
         select: { porcentajeCompletado: true, horasEstimadas: true, personasEstimadas: true, horasReales: true }
       })

       if (tareas.length === 0) return

       const horasReales = tareas.reduce((sum, t) => sum + Number(t.horasReales || 0), 0)
       const progresoPromedio = this.avanceFlat(tareas)

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
      const fase = await prisma.proyectoFase.findUnique({
        where: { id: faseId },
        select: { proyectoId: true }
      })
      if (!fase) return

      // Avance de la fase = ponderado por horas de TODAS sus tareas (vía sus EDTs).
      const tareas = await prisma.proyectoTarea.findMany({
        where: { proyectoEdt: { proyectoFaseId: faseId } },
        select: { porcentajeCompletado: true, horasEstimadas: true, personasEstimadas: true }
      })
      if (tareas.length === 0) return

      const progresoPromedio = this.avanceFlat(tareas)

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
      // progresoGeneral = avance ponderado por horas de TODAS las tareas del cronograma de
      // ejecución (flat). Fallback: tareas ligadas al proyecto vía fases/EDTs si no hay
      // cronograma de tipo 'ejecucion'.
      const cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId, tipo: 'ejecucion' },
        select: { id: true }
      })

      const tareas = cronograma
        ? await prisma.proyectoTarea.findMany({
            where: { proyectoCronogramaId: cronograma.id },
            select: { porcentajeCompletado: true, horasEstimadas: true, personasEstimadas: true }
          })
        : await prisma.proyectoTarea.findMany({
            where: { proyectoEdt: { proyectoFase: { proyectoId } } },
            select: { porcentajeCompletado: true, horasEstimadas: true, personasEstimadas: true }
          })

      if (tareas.length === 0) return

      const progresoGeneral = this.avanceFlat(tareas)

      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { progresoGeneral }
      })

    } catch (error) {
      console.error('Error actualizando progreso de proyecto:', error)
    }
  }

  /**
   * Recalcula el avance almacenado de TODO un cronograma (actividad → EDT → fase → proyecto)
   * a partir del % actual de las tareas. No modifica el % de las tareas; solo refresca el
   * rollup almacenado que pudo quedar desactualizado.
   */
  static async recalcularAvanceCronograma(cronogramaId: string): Promise<{ actividades: number }> {
    const [actividades, edts, fases] = await Promise.all([
      prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
      prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
      prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, select: { id: true } }),
    ])
    for (const a of actividades) await this.actualizarProgresoActividad(a.id)
    for (const e of edts) await this.actualizarProgresoEDT(e.id)
    for (const f of fases) await this.actualizarProgresoFase(f.id) // recomputa fase (flat) y cascada → proyecto
    return { actividades: actividades.length }
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
      // 🔒 Verificar que la semana no esté bloqueada (enviada/aprobada)
      const semanaEditable = await verificarSemanaEditable(usuarioId, fecha)
      if (!semanaEditable) {
        throw new Error('No se pueden registrar horas en una semana enviada o aprobada')
      }

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