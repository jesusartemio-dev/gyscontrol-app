// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tareas-disponibles
// 🔧 Descripción: Obtener tareas disponibles para crear dependencias
// ✅ GET: Lista todas las tareas del proyecto disponibles para dependencias
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener query params para filtrar por cronograma específico
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')

    // Construir filtro base
    const whereClause: any = {
      proyectoEdt: { proyectoId }
    }

    // Si se especifica cronogramaId, filtrar por ese cronograma
    if (cronogramaId) {
      whereClause.proyectoCronogramaId = cronogramaId
    }

    // Buscar todas las tareas del proyecto
    const tareas = await prisma.proyectoTarea.findMany({
      where: whereClause,
      include: {
        proyectoEdt: {
          select: {
            nombre: true,
            edt: {
              select: { nombre: true }
            }
          }
        },
        proyectoActividad: {
          select: { nombre: true }
        }
      },
      orderBy: [
        { proyectoEdt: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    })

    // Formatear respuesta para el frontend
    const tareasFormateadas = tareas.map(tarea => ({
      id: tarea.id,
      nombre: tarea.nombre,
      descripcion: tarea.descripcion,
      estado: tarea.estado,
      horasEstimadas: tarea.horasEstimadas,
      proyectoEdtId: tarea.proyectoEdtId,
      proyectoActividadId: tarea.proyectoActividadId,
      proyectoEdt: {
        nombre: tarea.proyectoEdt?.nombre || 'Sin EDT'
      },
      proyectoActividad: {
        nombre: tarea.proyectoActividad?.nombre || 'Sin Actividad'
      },
      edtNombre: tarea.proyectoEdt?.nombre || tarea.proyectoEdt?.edt?.nombre || 'Sin EDT',
      actividadNombre: tarea.proyectoActividad?.nombre || 'Sin Actividad',
      fechaInicio: tarea.fechaInicio?.toISOString() || null,
      fechaFin: tarea.fechaFin?.toISOString() || null,
      esHito: tarea.horasEstimadas ? Number(tarea.horasEstimadas) === 0 : true
    }))

    return NextResponse.json({
      success: true,
      data: tareasFormateadas,
      total: tareasFormateadas.length
    })

  } catch (error) {
    console.error('❌ Error obteniendo tareas disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
