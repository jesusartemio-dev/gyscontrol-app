/**
 * API para gestion de tareas desde supervision
 * Permite ver todas las tareas de todos los proyectos, asignarlas y crear tareas extra
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
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

    // Solo supervisores pueden ver todas las tareas
    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para gestionar tareas' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const responsableId = searchParams.get('responsableId')
    const estado = searchParams.get('estado')
    const soloSinAsignar = searchParams.get('sinAsignar') === 'true'

    // Obtener ProyectoTareas (tareas del cronograma de EJECUCIÓN únicamente)
    // Los cronogramas comercial y planificación son solo para comparación/línea base
    const whereProyectoTarea: any = {
      proyectoEdt: {
        proyectoCronograma: {
          tipo: 'ejecucion'
        }
      }
    }

    if (proyectoId) {
      whereProyectoTarea.proyectoEdt.proyectoId = proyectoId
    }

    if (responsableId) {
      whereProyectoTarea.responsableId = responsableId
    } else if (soloSinAsignar) {
      whereProyectoTarea.responsableId = null
    }

    if (estado) {
      whereProyectoTarea.estado = estado
    }

    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: whereProyectoTarea,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        proyectoEdt: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estado: true
              }
            }
          }
        }
      },
      orderBy: [
        { fechaFin: 'asc' },
        { prioridad: 'desc' }
      ]
    })

    // Obtener Tareas simples
    const whereTarea: any = {
      estado: { not: 'cancelada' }
    }

    if (proyectoId) {
      whereTarea.proyectoServicioCotizado = {
        proyectoId: proyectoId
      }
    }

    if (responsableId) {
      whereTarea.responsableId = responsableId
    } else if (soloSinAsignar) {
      whereTarea.responsableId = null
    }

    if (estado) {
      whereTarea.estado = estado
    }

    const tareasSimples = await prisma.tarea.findMany({
      where: whereTarea,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        proyectoServicioCotizado: {
          include: {
            proyecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estado: true
              }
            }
          }
        }
      },
      orderBy: [
        { fechaFin: 'asc' },
        { prioridad: 'desc' }
      ]
    })

    // Obtener lista de proyectos para el filtro
    const proyectos = await prisma.proyecto.findMany({
      where: {
        estado: {
          in: ['creado', 'en_ejecucion', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados']
        }
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true
      },
      orderBy: { codigo: 'asc' }
    })

    // Obtener lista de usuarios para asignacion
    const usuarios = await prisma.user.findMany({
      where: {
        role: {
          in: ['colaborador', 'proyectos', 'coordinador', 'gestor', 'admin']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })

    // Formatear tareas de ProyectoTarea
    // Una tarea es "Extra" si su descripcion contiene el marcador [EXTRA]
    const tareasFormateadas = proyectoTareas.map(t => {
      const edtNombre = t.proyectoEdt?.nombre || 'Sin EDT'
      const esExtra = t.descripcion?.startsWith('[EXTRA]') || false
      const descripcionLimpia = esExtra ? t.descripcion?.replace('[EXTRA]', '').trim() : t.descripcion
      return {
        id: t.id,
        tipo: 'proyecto_tarea' as const,
        nombre: t.nombre,
        descripcion: descripcionLimpia,
        proyectoId: t.proyectoEdt?.proyecto?.id || null,
        proyectoCodigo: t.proyectoEdt?.proyecto?.codigo || 'Sin proyecto',
        proyectoNombre: t.proyectoEdt?.proyecto?.nombre || 'Sin proyecto',
        edtNombre,
        esExtra,
        responsableId: t.responsableId,
        responsableNombre: t.user?.name || null,
        responsableEmail: t.user?.email || null,
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        horasPlan: t.horasEstimadas ? Number(t.horasEstimadas) : 0,
        progreso: t.porcentajeCompletado || 0,
        estado: t.estado,
        prioridad: t.prioridad || 'media'
      }
    })

    // Formatear Tareas simples
    const tareasFormateadasSimples = tareasSimples.map(t => ({
      id: t.id,
      tipo: 'tarea' as const,
      nombre: t.nombre,
      descripcion: t.descripcion,
      proyectoId: t.proyectoServicioCotizado?.proyecto?.id || null,
      proyectoCodigo: t.proyectoServicioCotizado?.proyecto?.codigo || 'Sin proyecto',
      proyectoNombre: t.proyectoServicioCotizado?.proyecto?.nombre || 'Sin proyecto',
      edtNombre: 'Tarea simple',
      esExtra: false,
      responsableId: t.responsableId,
      responsableNombre: t.user?.name || null,
      responsableEmail: t.user?.email || null,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      horasPlan: t.horasEstimadas ? Number(t.horasEstimadas) : 0,
      progreso: t.porcentajeCompletado || 0,
      estado: t.estado,
      prioridad: t.prioridad || 'media'
    }))

    // Combinar todas las tareas
    const todasLasTareas = [...tareasFormateadas, ...tareasFormateadasSimples]
      .sort((a, b) => {
        // Primero por fecha de fin
        const fechaA = new Date(a.fechaFin).getTime()
        const fechaB = new Date(b.fechaFin).getTime()
        return fechaA - fechaB
      })

    // Calcular metricas
    const totalTareas = todasLasTareas.length
    const tareasCompletadas = todasLasTareas.filter(t => t.estado === 'completada').length
    const tareasEnProgreso = todasLasTareas.filter(t => t.estado === 'en_progreso').length
    const tareasPendientes = todasLasTareas.filter(t => t.estado === 'pendiente').length
    const tareasSinAsignar = todasLasTareas.filter(t => !t.responsableId).length

    const ahora = new Date()
    const tareasVencidas = todasLasTareas.filter(t =>
      t.estado !== 'completada' &&
      t.estado !== 'cancelada' &&
      new Date(t.fechaFin) < ahora
    ).length

    const tareasProximasVencer = todasLasTareas.filter(t => {
      if (t.estado === 'completada' || t.estado === 'cancelada') return false
      const fechaFin = new Date(t.fechaFin)
      const diasRestantes = Math.ceil((fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      return diasRestantes >= 0 && diasRestantes <= 7
    }).length

    return NextResponse.json({
      success: true,
      data: {
        tareas: todasLasTareas,
        proyectos,
        usuarios,
        metricas: {
          totalTareas,
          tareasCompletadas,
          tareasEnProgreso,
          tareasPendientes,
          tareasSinAsignar,
          tareasVencidas,
          tareasProximasVencer
        }
      }
    })

  } catch (error) {
    console.error('Error obteniendo tareas de supervision:', error)
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

// PATCH - Asignar tarea a un usuario
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

    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para asignar tareas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tareaId, tipo, responsableId, estado, prioridad } = body

    if (!tareaId || !tipo) {
      return NextResponse.json(
        { error: 'Se requiere tareaId y tipo' },
        { status: 400 }
      )
    }

    let tareaActualizada

    if (tipo === 'proyecto_tarea') {
      const updateData: any = { updatedAt: new Date() }
      if (responsableId !== undefined) updateData.responsableId = responsableId || null
      if (estado) updateData.estado = estado
      if (prioridad) updateData.prioridad = prioridad

      tareaActualizada = await prisma.proyectoTarea.update({
        where: { id: tareaId },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    } else {
      const updateData: any = { updatedAt: new Date() }
      if (responsableId !== undefined) updateData.responsableId = responsableId || null
      if (estado) updateData.estado = estado
      if (prioridad) updateData.prioridad = prioridad

      tareaActualizada = await prisma.tarea.update({
        where: { id: tareaId },
        data: updateData,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: tareaActualizada,
      message: 'Tarea actualizada correctamente'
    })

  } catch (error) {
    console.error('Error actualizando tarea:', error)
    return NextResponse.json(
      {
        error: 'Error al actualizar tarea',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}

// POST - Crear tarea extra (no planificada)
export async function POST(request: NextRequest) {
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

    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para crear tareas' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      proyectoId,
      proyectoEdtId,
      nombre,
      descripcion,
      fechaInicio,
      fechaFin,
      responsableId,
      prioridad = 'media',
      horasEstimadas
    } = body

    // Validaciones
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'El proyecto es requerido' },
        { status: 400 }
      )
    }

    if (!proyectoEdtId) {
      return NextResponse.json(
        { error: 'El EDT es requerido' },
        { status: 400 }
      )
    }

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la tarea es requerido' },
        { status: 400 }
      )
    }

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Las fechas de inicio y fin son requeridas' },
        { status: 400 }
      )
    }

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, codigo: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el ProyectoEdt existe y pertenece al proyecto
    const proyectoEdt = await prisma.proyectoEdt.findFirst({
      where: {
        id: proyectoEdtId,
        proyectoId: proyectoId
      },
      include: {
        proyectoCronograma: true
      }
    })

    if (!proyectoEdt) {
      return NextResponse.json(
        { error: 'El EDT no existe o no pertenece al proyecto' },
        { status: 400 }
      )
    }

    // Crear la tarea con marcador [EXTRA] en la descripcion
    const descripcionConMarcador = `[EXTRA]${descripcion?.trim() || ''}`

    const nuevaTarea = await prisma.proyectoTarea.create({
      data: {
        id: randomUUID(),
        proyectoEdtId: proyectoEdt.id,
        proyectoCronogramaId: proyectoEdt.proyectoCronogramaId,
        nombre: nombre.trim(),
        descripcion: descripcionConMarcador,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        responsableId: responsableId || null,
        prioridad,
        horasEstimadas: horasEstimadas ? parseFloat(horasEstimadas) : null,
        estado: 'pendiente',
        orden: 0,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        proyectoEdt: {
          include: {
            proyecto: {
              select: { id: true, codigo: true, nombre: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: nuevaTarea.id,
        tipo: 'proyecto_tarea',
        nombre: nuevaTarea.nombre,
        descripcion: descripcion?.trim() || null,
        proyectoId: proyecto.id,
        proyectoCodigo: proyecto.codigo,
        proyectoNombre: proyecto.nombre,
        edtNombre: proyectoEdt.nombre,
        esExtra: true,
        responsableId: nuevaTarea.responsableId,
        responsableNombre: nuevaTarea.user?.name || null,
        fechaInicio: nuevaTarea.fechaInicio,
        fechaFin: nuevaTarea.fechaFin,
        horasPlan: nuevaTarea.horasEstimadas ? Number(nuevaTarea.horasEstimadas) : 0,
        progreso: 0,
        estado: nuevaTarea.estado,
        prioridad: nuevaTarea.prioridad
      },
      message: 'Tarea extra creada correctamente'
    })

  } catch (error) {
    console.error('Error creando tarea extra:', error)
    return NextResponse.json(
      {
        error: 'Error al crear tarea',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    )
  }
}
