/**
 * API para obtener las tareas asignadas al usuario actual
 *
 * Consulta tanto Tarea como ProyectoTarea filtradas por responsableId
 * Solo accesible para usuarios autenticados
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesion
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const estadoFiltro = searchParams.get('estado')
    const prioridadFiltro = searchParams.get('prioridad')

    // Obtener tareas de ProyectoTarea asignadas al usuario
    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: {
        responsableId: userId,
        ...(estadoFiltro && { estado: estadoFiltro as any }),
        ...(prioridadFiltro && { prioridad: prioridadFiltro as any })
      },
      include: {
        proyectoEdt: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { prioridad: 'desc' },
        { fechaFin: 'asc' }
      ]
    })

    // Obtener tareas del modelo Tarea asignadas al usuario
    const tareas = await prisma.tarea.findMany({
      where: {
        responsableId: userId,
        ...(estadoFiltro && { estado: estadoFiltro as any }),
        ...(prioridadFiltro && { prioridad: prioridadFiltro as any })
      },
      include: {
        proyectoServicioCotizado: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { prioridad: 'desc' },
        { fechaFin: 'asc' }
      ]
    })

    const ahora = new Date()

    // Mapear ProyectoTarea al formato unificado
    const tareasDeProyecto = proyectoTareas.map(tarea => {
      const diasRestantes = Math.ceil(
        (new Date(tarea.fechaFin).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: tarea.id,
        nombre: tarea.nombre,
        descripcion: tarea.descripcion,
        tipo: 'proyecto_tarea' as const,
        proyectoId: tarea.proyectoEdt?.proyecto?.id || '',
        proyectoNombre: tarea.proyectoEdt?.proyecto
          ? `${tarea.proyectoEdt.proyecto.codigo} - ${tarea.proyectoEdt.proyecto.nombre}`
          : 'Sin proyecto',
        edtNombre: tarea.proyectoEdt?.nombre || 'Sin EDT',
        responsableId: tarea.responsableId,
        responsableNombre: tarea.user?.name || 'Sin asignar',
        fechaInicio: tarea.fechaInicio,
        fechaFin: tarea.fechaFin,
        horasPlan: Number(tarea.horasEstimadas || 0),
        horasReales: Number(tarea.horasReales || 0),
        progreso: tarea.porcentajeCompletado,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        diasRestantes: diasRestantes
      }
    })

    // Mapear Tarea al formato unificado
    const tareasDeServicio = tareas.map(tarea => {
      const diasRestantes = Math.ceil(
        (new Date(tarea.fechaFin).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: tarea.id,
        nombre: tarea.nombre,
        descripcion: tarea.descripcion,
        tipo: 'tarea' as const,
        proyectoId: tarea.proyectoServicioCotizado?.proyecto?.id || '',
        proyectoNombre: tarea.proyectoServicioCotizado?.proyecto
          ? `${tarea.proyectoServicioCotizado.proyecto.codigo} - ${tarea.proyectoServicioCotizado.proyecto.nombre}`
          : 'Sin proyecto',
        edtNombre: 'Servicio',
        responsableId: tarea.responsableId,
        responsableNombre: tarea.user?.name || 'Sin asignar',
        fechaInicio: tarea.fechaInicio,
        fechaFin: tarea.fechaFin,
        horasPlan: Number(tarea.horasEstimadas || 0),
        horasReales: Number(tarea.horasReales || 0),
        progreso: tarea.porcentajeCompletado,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        diasRestantes: diasRestantes
      }
    })

    // Combinar y ordenar por prioridad y fecha
    const todasLasTareas = [...tareasDeProyecto, ...tareasDeServicio].sort((a, b) => {
      // Primero por prioridad (critica > alta > media > baja)
      const prioridadOrden = { critica: 4, alta: 3, media: 2, baja: 1 }
      const prioridadDiff = (prioridadOrden[b.prioridad] || 0) - (prioridadOrden[a.prioridad] || 0)
      if (prioridadDiff !== 0) return prioridadDiff

      // Luego por dias restantes (menos dias primero)
      return a.diasRestantes - b.diasRestantes
    })

    // Calcular metricas
    const tareasActivas = todasLasTareas.filter(t => t.estado === 'en_progreso' || t.estado === 'pendiente')
    const tareasCompletadas = todasLasTareas.filter(t => t.estado === 'completada')
    const tareasProximasVencer = todasLasTareas.filter(t =>
      t.diasRestantes <= 7 &&
      t.diasRestantes >= 0 &&
      t.estado !== 'completada' &&
      t.estado !== 'cancelada'
    )
    const tareasVencidas = todasLasTareas.filter(t =>
      t.diasRestantes < 0 &&
      t.estado !== 'completada' &&
      t.estado !== 'cancelada'
    )
    const horasTotalesReales = todasLasTareas.reduce((sum, t) => sum + t.horasReales, 0)

    return NextResponse.json({
      success: true,
      data: {
        tareas: todasLasTareas,
        metricas: {
          totalTareas: todasLasTareas.length,
          tareasActivas: tareasActivas.length,
          tareasCompletadas: tareasCompletadas.length,
          tareasProximasVencer: tareasProximasVencer.length,
          tareasVencidas: tareasVencidas.length,
          horasRegistradas: Math.round(horasTotalesReales * 10) / 10
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo tareas asignadas:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Actualizar estado de una tarea
 */
export async function PATCH(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tareaId, tipo, estado, progreso } = body

    if (!tareaId || !tipo) {
      return NextResponse.json(
        { error: 'Faltan parametros requeridos: tareaId y tipo' },
        { status: 400 }
      )
    }

    let tareaActualizada

    if (tipo === 'proyecto_tarea') {
      // Verificar que la tarea pertenece al usuario
      const tarea = await prisma.proyectoTarea.findFirst({
        where: {
          id: tareaId,
          responsableId: session.user.id
        }
      })

      if (!tarea) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o no tienes permisos' },
          { status: 404 }
        )
      }

      tareaActualizada = await prisma.proyectoTarea.update({
        where: { id: tareaId },
        data: {
          ...(estado && { estado }),
          ...(progreso !== undefined && { porcentajeCompletado: progreso }),
          ...(estado === 'completada' && {
            porcentajeCompletado: 100,
            fechaFinReal: new Date()
          })
        }
      })
    } else {
      // Tarea de servicio
      const tarea = await prisma.tarea.findFirst({
        where: {
          id: tareaId,
          responsableId: session.user.id
        }
      })

      if (!tarea) {
        return NextResponse.json(
          { error: 'Tarea no encontrada o no tienes permisos' },
          { status: 404 }
        )
      }

      tareaActualizada = await prisma.tarea.update({
        where: { id: tareaId },
        data: {
          ...(estado && { estado }),
          ...(progreso !== undefined && { porcentajeCompletado: progreso }),
          ...(estado === 'completada' && {
            porcentajeCompletado: 100,
            fechaFinReal: new Date()
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: tareaActualizada
    })

  } catch (error) {
    console.error('Error actualizando tarea:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}
