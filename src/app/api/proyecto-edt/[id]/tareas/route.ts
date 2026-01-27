// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyecto-edt/[id]/tareas/
// 🔧 Descripción: API para gestión de tareas de EDT
//
// 🧠 Uso: CRUD completo de ProyectoTarea por EDT
// ✍️ Autor: Sistema GYS - Implementación Cronograma 4 Niveles
// 📅 Última actualización: 2025-09-22
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ✅ GET /api/proyecto-edt/[id]/tareas - Obtener tareas de un EDT
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const tareas = await prisma.proyectoTarea.findMany({
      where: {
        proyectoEdtId: id
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
          take: 5,
          orderBy: { fechaTrabajo: 'desc' },
          select: {
            horasTrabajadas: true,
            fechaTrabajo: true,
            aprobado: true
          }
        },
        proyectoSubtarea: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            porcentajeCompletado: true
          }
        }
      },
      orderBy: [
        { fechaInicio: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: tareas,
      meta: {
        totalTareas: tareas.length,
        totalHorasEstimadas: tareas.reduce((sum, t) => sum + Number(t.horasEstimadas || 0), 0),
        totalHorasReales: tareas.reduce((sum, t) => sum + Number(t.horasReales), 0),
        tareasCompletadas: tareas.filter(t => t.estado === 'completada').length
      }
    })

  } catch (error) {
    console.error('Error obteniendo tareas del EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyecto-edt/[id]/tareas - Crear nueva tarea en EDT
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Validar que el EDT existe y pertenece a un proyecto accesible
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id,
        proyecto: {
          OR: [
            { comercialId: session.user.id },
            { gestorId: session.user.id }
          ]
        }
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            fechaInicio: true,
            fechaFin: true
          }
        }
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o sin permisos' },
        { status: 404 }
      )
    }

    // Validar fechas dentro del rango del proyecto
    const fechaInicio = new Date(data.fechaInicio)
    const fechaFin = new Date(data.fechaFin)

    if (fechaInicio < edt.proyecto.fechaInicio ||
        (edt.proyecto.fechaFin && fechaFin > edt.proyecto.fechaFin)) {
      return NextResponse.json(
        { error: 'Las fechas deben estar dentro del rango del proyecto' },
        { status: 400 }
      )
    }

    const nuevaTarea = await prisma.proyectoTarea.create({
      data: {
        id: `proyecto-tarea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        proyectoEdtId: id,
        proyectoCronogramaId: edt.proyectoCronogramaId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        fechaInicio,
        fechaFin,
        horasEstimadas: data.horasEstimadas,
        responsableId: data.responsableId,
        prioridad: data.prioridad || 'media',
        updatedAt: new Date()
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
      data: nuevaTarea,
      message: 'Tarea creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creando tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}