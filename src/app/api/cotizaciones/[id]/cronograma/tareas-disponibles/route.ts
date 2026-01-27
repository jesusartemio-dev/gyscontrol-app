import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)

    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // SEGÚN EL DOCUMENTO: Las tareas se crean DURANTE la generación del cronograma
    // Si no hay cronograma generado, no hay tareas disponibles para dependencias
    // Necesitamos verificar si ya se generó algún cronograma básico

    const edtsExistentes = await prisma.cotizacionEdt.findMany({
      where: { cotizacionId },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionTarea: true
          }
        }
      }
    })

    // SEGÚN EL DOCUMENTO: Las tareas se crean durante la generación del cronograma
    // Por lo tanto, si no hay cronograma generado, no hay tareas
    // Necesitamos buscar tareas de EDTs que ya existen (si se generó cronograma antes)

    const tareas = await prisma.cotizacionTarea.findMany({
      where: {
        cotizacionActividad: {
          cotizacionEdt: { cotizacionId }
        }
      },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionEdt: {
              select: { nombre: true }
            }
          }
        }
      },
      orderBy: [
        { orden: 'asc' }
      ]
    })

    // Formatear respuesta para el frontend
    const tareasFormateadas = tareas.map(tarea => ({
      id: tarea.id,
      nombre: tarea.nombre,
      descripcion: tarea.descripcion,
      estado: tarea.estado,
      horasEstimadas: tarea.horasEstimadas,
      cotizacionActividadId: tarea.cotizacionActividadId,
      cotizacionActividad: {
        nombre: tarea.cotizacionActividad?.nombre || 'Sin Actividad',
        cotizacionEdt: {
          nombre: tarea.cotizacionActividad?.cotizacionEdt?.nombre || 'Sin EDT'
        }
      },
      actividadNombre: tarea.cotizacionActividad?.nombre || 'Sin Actividad',
      edtNombre: tarea.cotizacionActividad?.cotizacionEdt?.nombre || 'Sin EDT',
      fechaInicio: tarea.fechaInicio?.toISOString() || null,
      fechaFin: tarea.fechaFin?.toISOString() || null,
      esHito: tarea.esHito,
      duracionHoras: tarea.duracionHoras
    }))


    return NextResponse.json({
      success: true,
      data: tareasFormateadas
    })

  } catch (error) {
    console.error('❌ Error obteniendo tareas disponibles:', error)
    return NextResponse.json({
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}