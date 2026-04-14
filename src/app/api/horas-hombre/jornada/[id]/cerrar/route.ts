/**
 * API para cerrar una jornada de campo
 * PUT /api/horas-hombre/jornada/[id]/cerrar
 *
 * Cambia el estado de 'iniciado' a 'pendiente' y registra
 * el avance del día, bloqueos y plan siguiente
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgresoService } from '@/lib/services/progresoService'

interface Bloqueo {
  tipoBloqueoId?: string
  tipoBloqueoNombre?: string
  descripcion: string
  impacto?: string
  accion?: string
}

interface ProgresoTarea {
  proyectoTareaId: string
  porcentaje: number
}

interface HorasMiembro {
  miembroId: string
  horas: number
}

interface CerrarJornadaPayload {
  avanceDia: string
  bloqueos?: Bloqueo[]
  planSiguiente?: string
  progresoTareas?: ProgresoTarea[]
  horasMiembros?: HorasMiembro[]
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId } = await context.params
    const body: CerrarJornadaPayload = await request.json()

    const { avanceDia, bloqueos, planSiguiente, progresoTareas, horasMiembros } = body

    // Verificar que la jornada existe
    let jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        tareas: {
          include: {
            miembros: true
          }
        }
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el supervisor de la jornada
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para cerrar esta jornada' },
        { status: 403 }
      )
    }

    // Verificar estado
    if (jornada.estado !== 'iniciado') {
      return NextResponse.json(
        { error: 'Solo se pueden cerrar jornadas en estado "iniciado"' },
        { status: 400 }
      )
    }

    // Validar que tiene al menos una tarea
    if (jornada.tareas.length === 0) {
      return NextResponse.json(
        { error: 'No se puede cerrar una jornada sin tareas registradas' },
        { status: 400 }
      )
    }

    // Validar que las tareas tienen miembros
    const tareasSinMiembros = jornada.tareas.filter(t => t.miembros.length === 0)
    if (tareasSinMiembros.length > 0) {
      return NextResponse.json(
        { error: 'Todas las tareas deben tener al menos un miembro asignado' },
        { status: 400 }
      )
    }

    // Validar avance del día
    if (!avanceDia || avanceDia.trim().length === 0) {
      return NextResponse.json(
        { error: 'El avance del día es requerido para cerrar la jornada' },
        { status: 400 }
      )
    }

    // Validar bloqueos si se proporcionan
    if (bloqueos && bloqueos.length > 0) {
      for (const bloqueo of bloqueos) {
        if (!bloqueo.descripcion || bloqueo.descripcion.trim().length === 0) {
          return NextResponse.json(
            { error: 'Cada bloqueo debe tener una descripción' },
            { status: 400 }
          )
        }
      }
    }

    // Actualizar horas de miembros (enviadas desde el modal de cierre)
    if (horasMiembros && horasMiembros.length > 0) {
      for (const { miembroId, horas } of horasMiembros) {
        if (horas > 0 && horas <= 24) {
          await prisma.registroHorasCampoMiembro.update({
            where: { id: miembroId },
            data: { horas }
          })
        }
      }

      // Re-fetch jornada con horas actualizadas para cálculos correctos
      jornada = await prisma.registroHorasCampo.findUnique({
        where: { id: jornadaId },
        include: {
          proyecto: { select: { id: true, codigo: true, nombre: true } },
          tareas: {
            include: {
              miembros: true
            }
          }
        }
      }) as typeof jornada
    }

    // Calcular estadísticas
    const cantidadTareas = jornada.tareas.length
    const cantidadMiembros = new Set(
      jornada.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
    ).size
    const totalHoras = jornada.tareas.reduce(
      (sum, t) => sum + t.miembros.reduce((s, m) => s + m.horas, 0),
      0
    )

    // Filtrar bloqueos válidos
    const bloqueosValidos = bloqueos?.filter(b => b.descripcion?.trim()) || []

    // Actualizar la jornada
    await prisma.registroHorasCampo.update({
      where: { id: jornadaId },
      data: {
        estado: 'pendiente',
        avanceDia: avanceDia.trim(),
        bloqueos: bloqueosValidos.length > 0 ? bloqueosValidos : undefined,
        planSiguiente: planSiguiente?.trim() || null,
        fechaCierre: new Date()
      }
    })

    // Calcular horas por tarea del cronograma
    const horasPorTarea: Record<string, number> = {}
    for (const tarea of jornada.tareas) {
      if (tarea.proyectoTareaId) {
        const horasTarea = tarea.miembros.reduce((sum, m) => sum + m.horas, 0)
        horasPorTarea[tarea.proyectoTareaId] = (horasPorTarea[tarea.proyectoTareaId] || 0) + horasTarea
      }
    }

    // Construir mapa de progreso: progresoTareas enviado por el supervisor
    const progresoMap = new Map<string, number>()
    if (progresoTareas && progresoTareas.length > 0) {
      for (const { proyectoTareaId, porcentaje } of progresoTareas) {
        if (proyectoTareaId && porcentaje >= 0 && porcentaje <= 100) {
          progresoMap.set(proyectoTareaId, Math.round(porcentaje))
        }
      }
    }

    // Guardar porcentajeFinal en RegistroHorasCampoTarea para todos los que tengan progreso
    for (const [proyectoTareaId, porcentaje] of progresoMap.entries()) {
      await prisma.registroHorasCampoTarea.updateMany({
        where: { registroCampoId: jornadaId, proyectoTareaId },
        data: { porcentajeFinal: porcentaje }
      })
    }

    // Actualizar ProyectoTarea: progreso + horas al cerrar
    // Las APIs de listado ya solo devuelven tareas de ejecucion, así que siempre es ejecucion
    const tareasConProgreso = new Set<string>()
    for (const [proyectoTareaId, porcentaje] of progresoMap.entries()) {
      const horasIncremento = horasPorTarea[proyectoTareaId] || 0
      const updateData: Record<string, any> = {
        porcentajeCompletado: porcentaje,
        estado: porcentaje >= 100 ? 'completada' : 'en_progreso',
        updatedAt: new Date()
      }
      if (porcentaje >= 100) updateData.fechaFinReal = new Date()
      if (horasIncremento > 0) updateData.horasReales = { increment: horasIncremento }

      await prisma.proyectoTarea.update({ where: { id: proyectoTareaId }, data: updateData })
      tareasConProgreso.add(proyectoTareaId)
    }

    // Incrementar horas para tareas sin progreso enviado (solo horas, sin tocar porcentaje)
    for (const [proyectoTareaId, horas] of Object.entries(horasPorTarea)) {
      if (!tareasConProgreso.has(proyectoTareaId) && horas > 0) {
        await prisma.proyectoTarea.update({
          where: { id: proyectoTareaId },
          data: { horasReales: { increment: horas }, updatedAt: new Date() }
        })
      }
    }

    // Propagar progreso hacia arriba: Actividad → EDT → Fase → Proyecto
    // Recolectar todas las tareas afectadas (con progreso o con horas) para obtener sus actividadId
    const todasTareasAfectadas = [
      ...Array.from(tareasConProgreso),
      ...Object.keys(horasPorTarea).filter(id => !tareasConProgreso.has(id))
    ]
    if (todasTareasAfectadas.length > 0) {
      const tareasConActividad = await prisma.proyectoTarea.findMany({
        where: { id: { in: todasTareasAfectadas } },
        select: { proyectoActividadId: true }
      })
      const actividadesUnicas = [...new Set(
        tareasConActividad.map(t => t.proyectoActividadId).filter(Boolean) as string[]
      )]
      for (const actividadId of actividadesUnicas) {
        try {
          await ProgresoService.actualizarProgresoActividad(actividadId)
        } catch (err) {
          console.error(`⚠️ Error propagando progreso para actividad ${actividadId}:`, err)
        }
      }
    }

    // Obtener la jornada actualizada con relaciones
    const jornadaCerrada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true, edt: { select: { id: true, nombre: true } } } },
        supervisor: { select: { id: true, name: true, email: true } },
        tareas: {
          include: {
            proyectoTarea: {
              select: {
                id: true,
                nombre: true,
                proyectoActividad: { select: { id: true, nombre: true } }
              }
            },
            miembros: {
              include: {
                usuario: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      }
    })

    console.log(`✅ JORNADA CAMPO: Cerrada jornada ${jornadaId} - ${cantidadTareas} tareas, ${cantidadMiembros} personas, ${totalHoras}h total`)

    // TODO: Notificar a gestores que hay una jornada pendiente de aprobación

    return NextResponse.json({
      success: true,
      message: `Jornada cerrada y enviada a aprobación (${cantidadTareas} tareas, ${cantidadMiembros} personas, ${totalHoras}h)`,
      data: {
        id: jornadaCerrada?.id,
        proyecto: jornadaCerrada?.proyecto,
        edt: jornadaCerrada?.proyectoEdt,
        fechaTrabajo: jornadaCerrada?.fechaTrabajo,
        estado: jornadaCerrada?.estado,
        objetivosDia: jornadaCerrada?.objetivosDia,
        avanceDia: jornadaCerrada?.avanceDia,
        bloqueos: jornadaCerrada?.bloqueos,
        planSiguiente: jornadaCerrada?.planSiguiente,
        fechaCierre: jornadaCerrada?.fechaCierre,
        cantidadTareas,
        cantidadMiembros,
        totalHoras
      }
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al cerrar:', error)
    return NextResponse.json(
      {
        error: 'Error cerrando jornada de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
