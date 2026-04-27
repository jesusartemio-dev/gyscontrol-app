// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyecto-edt/[id]/tareas/[tareaId]/
// 🔧 Descripción: API para gestión individual de tareas EDT
//
// 🧠 Uso: Actualizar, eliminar tareas específicas
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-22
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'

// ✅ GET /api/proyecto-edt/[id]/tareas/[tareaId] - Obtener tarea individual
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, tareaId } = await params
    const tarea = await prisma.proyectoTarea.findFirst({
      where: {
        id: tareaId,
        proyectoEdtId: id,
        proyectoEdt: {
          proyecto: {
            OR: [
              { comercialId: session.user.id },
              { gestorId: session.user.id }
            ]
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tareaPadre: {
          select: {
            id: true,
            nombre: true
          }
        },
        tareasHijas: {
          select: {
            id: true,
            nombre: true,
            estado: true
          }
        },
        registroHoras: {
          orderBy: { fechaTrabajo: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        proyectoSubtarea: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tarea
    })

  } catch (error) {
    console.error('Error obteniendo tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT /api/proyecto-edt/[id]/tareas/[tareaId] - Actualizar tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  try {
    const { id, tareaId } = await params
    const permiso = await validarPermisoCronogramaPorTarea(tareaId)
    if (!permiso.ok) return permiso.response

    const data = await request.json()

    // Verificar existencia (los permisos ya los validó validarPermisoCronogramaPorTarea)
    const tareaExistente = await prisma.proyectoTarea.findFirst({
      where: {
        id: tareaId,
        proyectoEdtId: id,
      },
      include: {
        proyectoEdt: {
          include: {
            proyecto: {
              select: {
                fechaInicio: true,
                fechaFin: true
              }
            }
          }
        }
      }
    })

    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    // Validar fechas si se están actualizando
    if (data.fechaInicio || data.fechaFin) {
      const fechaInicio = data.fechaInicio ? new Date(data.fechaInicio) : tareaExistente.fechaInicio
      const fechaFin = data.fechaFin ? new Date(data.fechaFin) : tareaExistente.fechaFin

      if (fechaInicio < tareaExistente.proyectoEdt.proyecto.fechaInicio ||
          (tareaExistente.proyectoEdt.proyecto.fechaFin && fechaFin > tareaExistente.proyectoEdt.proyecto.fechaFin)) {
        return NextResponse.json(
          { error: 'Las fechas deben estar dentro del rango del proyecto' },
          { status: 400 }
        )
      }
    }

    const tareaActualizada = await prisma.proyectoTarea.update({
      where: { id: tareaId },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
        fechaInicioReal: data.fechaInicioReal ? new Date(data.fechaInicioReal) : undefined,
        fechaFinReal: data.fechaFinReal ? new Date(data.fechaFinReal) : undefined,
        horasEstimadas: data.horasEstimadas,
        estado: data.estado,
        prioridad: data.prioridad,
        porcentajeCompletado: data.porcentajeCompletado,
        responsableId: data.responsableId,
        dependenciaId: data.dependenciaId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: tareaActualizada,
      message: 'Tarea actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error actualizando tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyecto-edt/[id]/tareas/[tareaId] - Eliminar tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  try {
    const { id, tareaId } = await params
    const permiso = await validarPermisoCronogramaPorTarea(tareaId)
    if (!permiso.ok) return permiso.response

    // Verificar existencia
    const tarea = await prisma.proyectoTarea.findFirst({
      where: { id: tareaId, proyectoEdtId: id }
    })

    if (!tarea) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    // Solo el creador o admin pueden eliminar
    const esAdmin = permiso.role === 'admin'
    const esCreador = tarea.creadoPorId === permiso.userId
    if (!esAdmin && !esCreador) {
      return NextResponse.json(
        { error: 'Solo el creador de la tarea o un administrador puede eliminarla' },
        { status: 403 }
      )
    }

    // Verificar si tiene dependencias
    const dependencias = await prisma.proyectoDependenciasTarea.count({
      where: {
        OR: [
          { tareaOrigenId: tareaId },
          { tareaDependienteId: tareaId }
        ]
      }
    })

    if (dependencias > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una tarea que tiene dependencias' },
        { status: 400 }
      )
    }

    // Verificar si tiene horas registradas
    const [horasRegistradas, horasCampo] = await Promise.all([
      prisma.registroHoras.count({ where: { proyectoTareaId: tareaId } }),
      prisma.registroHorasCampoTarea.count({ where: { proyectoTareaId: tareaId } })
    ])

    if (horasRegistradas > 0 || horasCampo > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una tarea que ya tiene horas registradas' },
        { status: 409 }
      )
    }

    await prisma.proyectoTarea.delete({
      where: { id: tareaId }
    })

    return NextResponse.json({
      success: true,
      message: 'Tarea eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}