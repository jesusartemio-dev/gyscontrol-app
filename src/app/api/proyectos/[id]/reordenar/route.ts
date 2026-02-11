// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/reordenar/route.ts
// 🔧 Descripción: API endpoint para reordenar elementos del cronograma
// 🎯 Funcionalidades: Actualizar campo orden de EDTs, Actividades, Tareas (5 niveles)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-06
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface ReorderRequest {
  tipo: 'edt' | 'actividad' | 'tarea'
  proyectoId: string
  parentId?: string // ID del elemento padre
  cronogramaId?: string
  elementos: Array<{
    id: string
    orden: number
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: proyectoId } = await params
    const body: ReorderRequest = await request.json()

    const { tipo, parentId, cronogramaId, elementos } = body

    console.log('🔄 [REORDER API] Reordenando elementos:', {
      proyectoId,
      tipo,
      parentId,
      cronogramaId,
      elementosCount: elementos.length
    })

    // Validar que el proyecto existe y el usuario tiene acceso
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, comercialId: true, gestorId: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos (usuario debe ser comercial o gestor del proyecto)
    if (proyecto.comercialId !== session.user.id && proyecto.gestorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para modificar este proyecto' },
        { status: 403 }
      )
    }

    // Ejecutar reordenamiento según el tipo
    await prisma.$transaction(async (tx) => {
      switch (tipo) {
        case 'edt':
          // Reordenar EDTs dentro de una fase
          for (const elemento of elementos) {
            await tx.proyectoEdt.update({
              where: { id: elemento.id },
              data: { orden: elemento.orden }
            })
          }
          break

        case 'actividad':
          // Reordenar actividades dentro de un EDT (5 niveles)
          for (const elemento of elementos) {
            await tx.proyectoActividad.update({
              where: { id: elemento.id },
              data: { orden: elemento.orden }
            })
          }
          break

        case 'tarea':
          // Reordenar tareas dentro de una actividad
          for (const elemento of elementos) {
            await tx.proyectoTarea.update({
              where: { id: elemento.id },
              data: { orden: elemento.orden }
            })
          }
          break

        default:
          throw new Error(`Tipo de elemento no válido: ${tipo}`)
      }
    })

    console.log('✅ [REORDER API] Elementos reordenados exitosamente')

    return NextResponse.json({
      success: true,
      message: 'Elementos reordenados exitosamente'
    })

  } catch (error) {
    logger.error('❌ [REORDER API] Error al reordenar elementos:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}

// Método GET para obtener elementos ordenados (útil para debugging)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: proyectoId } = await params
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') as 'edt' | 'actividad' | 'tarea'
    const parentId = searchParams.get('parentId')
    const cronogramaId = searchParams.get('cronogramaId')

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: 'Parámetro tipo requerido' },
        { status: 400 }
      )
    }

    let elementos: any[] = []

    switch (tipo) {
      case 'edt':
        elementos = await prisma.proyectoEdt.findMany({
          where: {
            proyectoId,
            ...(cronogramaId && { proyectoCronogramaId: cronogramaId })
          },
          select: { id: true, nombre: true, orden: true },
          orderBy: { orden: 'asc' }
        })
        break

      case 'actividad':
        elementos = await prisma.proyectoActividad.findMany({
          where: {
            ...(cronogramaId && { proyectoCronogramaId: cronogramaId }),
            ...(parentId && { proyectoEdtId: parentId })
          },
          select: { id: true, nombre: true, orden: true },
          orderBy: { orden: 'asc' }
        })
        break

      case 'tarea':
        elementos = await prisma.proyectoTarea.findMany({
          where: {
            ...(cronogramaId && { proyectoCronogramaId: cronogramaId }),
            ...(parentId && { proyectoActividadId: parentId })
          },
          select: { id: true, nombre: true, orden: true },
          orderBy: { orden: 'asc' }
        })
        break
    }

    return NextResponse.json({
      success: true,
      data: elementos
    })

  } catch (error) {
    logger.error('❌ [REORDER API] Error al obtener elementos:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    )
  }
}