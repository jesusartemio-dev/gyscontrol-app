/**
 * API para obtener elementos de un EDT específico
 * 
 * Retorna actividades y tareas disponibles para registro de horas
 * en un EDT específico
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const edtId = searchParams.get('edtId')

    if (!edtId) {
      return NextResponse.json(
        { error: 'ID del EDT requerido' },
        { status: 400 }
      )
    }

    // Verificar que el EDT existe y el usuario tiene acceso
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: edtId,
        OR: [
          { responsableId: session.user.id },
          {
            proyectoActividad: {
              some: { responsableId: session.user.id }
            }
          },
          {
            proyectoTarea: {
              some: { responsableId: session.user.id }
            }
          },
          {
            proyecto: {
              OR: [
                { comercialId: session.user.id },
                { gestorId: session.user.id }
              ]
            }
          }
        ]
      },
      select: { 
        id: true, 
        nombre: true,
        proyectoId: true 
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado o sin acceso' },
        { status: 404 }
      )
    }

    // Obtener actividades del EDT
    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        proyectoEdtId: edtId
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        responsableId: true,
        horasPlan: true,
        horasReales: true,
        estado: true,
        porcentajeAvance: true
      },
      orderBy: {
        orden: 'asc'
      }
    })

    // Obtener tareas del EDT
    const tareas = await prisma.proyectoTarea.findMany({
      where: {
        proyectoEdtId: edtId
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        responsableId: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true
      },
      orderBy: {
        orden: 'asc'
      }
    })

    // Obtener información de usuarios para responsables
    const responsableIds = [
      ...actividades.map(a => a.responsableId).filter(Boolean) as string[],
      ...tareas.map(t => t.responsableId).filter(Boolean) as string[]
    ]

    const usuarios = await prisma.user.findMany({
      where: {
        id: { in: responsableIds }
      },
      select: {
        id: true,
        name: true
      }
    })

    const responsableMap = new Map(usuarios.map(u => [u.id, u.name]))

    // Formatear actividades
    const actividadesFormateadas = actividades.map(actividad => ({
      id: actividad.id,
      nombre: actividad.nombre,
      tipo: 'actividad' as const,
      responsableNombre: responsableMap.get(actividad.responsableId || '') || 'Sin responsable',
      horasPlan: Number(actividad.horasPlan) || 0,
      horasReales: Number(actividad.horasReales) || 0,
      estado: actividad.estado,
      progreso: actividad.porcentajeAvance || 0,
      descripcion: actividad.descripcion
    }))

    // Formatear tareas
    const tareasFormateadas = tareas.map(tarea => ({
      id: tarea.id,
      nombre: tarea.nombre,
      tipo: 'tarea' as const,
      responsableNombre: responsableMap.get(tarea.responsableId || '') || 'Sin responsable',
      horasPlan: 0, // Tareas no tienen horas planificadas en el schema actual
      horasReales: 0, // Tareas no tienen horas reales en el schema actual
      estado: tarea.estado,
      progreso: 0, // Tareas no tienen porcentajeAvance en el schema actual
      descripcion: tarea.descripcion || '',
      fechaInicio: tarea.fechaInicio,
      fechaFin: tarea.fechaFin
    }))

    // Combinar todos los elementos
    const todosLosElementos = [...actividadesFormateadas, ...tareasFormateadas]

    return NextResponse.json({
      success: true,
      elementos: todosLosElementos,
      estadisticas: {
        total: todosLosElementos.length,
        actividades: actividadesFormateadas.length,
        tareas: tareasFormateadas.length
      }
    })

  } catch (error) {
    console.error('Error obteniendo elementos del EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}