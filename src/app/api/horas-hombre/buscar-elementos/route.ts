/**
 * API para buscar elementos del cronograma para registro de horas
 *
 * Busca EDTs, Zonas, Actividades y Tareas por nombre
 * Retorna resultados con información de responsables y progreso
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
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        elementos: [],
        total: 0
      })
    }

    const elementos: any[] = []

    // Buscar EDTs
    const edts = await prisma.proyectoEdt.findMany({
      where: {
        nombre: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        proyecto: {
          select: { id: true, nombre: true }
        }
      },
      take: 10
    })

    edts.forEach(edt => {
      elementos.push({
        id: edt.id,
        nombre: edt.nombre,
        tipo: 'edt',
        proyectoId: edt.proyectoId,
        proyectoNombre: edt.proyecto.nombre,
        responsableId: edt.responsableId,
        responsableNombre: edt.user?.name,
        horasPlan: edt.horasPlan || 0,
        horasReales: edt.horasReales || 0,
        progreso: edt.porcentajeAvance || 0,
        estado: edt.estado
      })
    })

    // ❌ ELIMINADO: Búsqueda de Zonas - Ya no existen en sistema de 5 niveles
    // Las zonas fueron eliminadas en la migración de cronograma de 5 niveles
    // const zonas = await prisma.proyectoZona.findMany({ ... }) // Eliminado

    // Buscar Actividades
    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        nombre: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        proyectoEdt: {
          include: {
            proyecto: {
              select: { id: true, nombre: true }
            }
          }
        }
      },
      take: 10
    })

    actividades.forEach(actividad => {
      // Skip if proyectoEdt is null (shouldn't happen with proper includes, but TypeScript safety)
      if (!actividad.proyectoEdt?.proyecto) return

      elementos.push({
        id: actividad.id,
        nombre: actividad.nombre,
        tipo: 'actividad',
        proyectoId: actividad.proyectoEdt.proyecto.id,
        proyectoNombre: actividad.proyectoEdt.proyecto.nombre,
        responsableId: null, // Actividades no tienen responsables en el schema actual
        responsableNombre: null,
        horasPlan: actividad.horasPlan || 0,
        horasReales: actividad.horasReales || 0,
        progreso: actividad.porcentajeAvance || 0,
        estado: actividad.estado
      })
    })

    // Buscar Tareas
    const tareas = await prisma.proyectoTarea.findMany({
      where: {
        nombre: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        proyectoActividad: {
          include: {
            proyectoEdt: {
              include: {
                proyecto: {
                  select: { id: true, nombre: true }
                }
              }
            }
          }
        }
      },
      take: 10
    })

    tareas.forEach(tarea => {
      // Skip if proyectoActividad or proyectoEdt is null (shouldn't happen with proper includes, but TypeScript safety)
      if (!tarea.proyectoActividad?.proyectoEdt?.proyecto) return

      elementos.push({
        id: tarea.id,
        nombre: tarea.nombre,
        tipo: 'tarea',
        proyectoId: tarea.proyectoActividad.proyectoEdt.proyecto.id,
        proyectoNombre: tarea.proyectoActividad.proyectoEdt.proyecto.nombre,
        responsableId: tarea.responsableId,
        responsableNombre: tarea.user?.name,
        horasPlan: tarea.horasEstimadas || 0,
        horasReales: tarea.horasReales || 0,
        progreso: tarea.porcentajeCompletado || 0,
        estado: tarea.estado
      })
    })

    // Ordenar por relevancia (tipo primero, luego por nombre)
    const ordenTipos = { tarea: 1, actividad: 2, edt: 3 } // ❌ Eliminado: 'zona'
    elementos.sort((a, b) => {
      const ordenA = ordenTipos[a.tipo as keyof typeof ordenTipos] || 5
      const ordenB = ordenTipos[b.tipo as keyof typeof ordenTipos] || 5
      if (ordenA !== ordenB) return ordenA - ordenB
      return a.nombre.localeCompare(b.nombre)
    })

    // Limitar resultados
    const elementosLimitados = elementos.slice(0, 20)

    return NextResponse.json({
      success: true,
      elementos: elementosLimitados,
      total: elementosLimitados.length,
      query
    })

  } catch (error) {
    console.error('Error buscando elementos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}