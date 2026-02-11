// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/fases/[faseId]/route.ts
// 🔧 Descripción: API para gestión individual de fases
// 🎯 Funcionalidades: GET, PUT, DELETE de fase específica
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ✅ Schema de validación para actualizar fase
const updateFaseSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  orden: z.number().min(1).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'completado', 'pausado', 'cancelado']).optional(),
  porcentajeAvance: z.number().min(0).max(100).optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/fases/[faseId] - Obtener fase específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, faseId } = await params

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Obtener la fase específica
    const fase = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId: id
      },
      include: {
        proyectoCronograma: {
          select: { id: true, nombre: true, tipo: true }
        },
        proyectoEdt: {
          include: {
            proyectoTarea: true,
            edt: {
              select: { id: true, nombre: true }
            }
          }
        },
        _count: {
          select: {
            proyectoEdt: true
          }
        }
      }
    })

    if (!fase) {
      return NextResponse.json(
        { error: 'Fase no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: fase
    })

  } catch (error) {
    logger.error('Error al obtener fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT /api/proyectos/[id]/fases/[faseId] - Actualizar fase
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, faseId } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = updateFaseSchema.parse(body)

    // ✅ Validar que la fase existe y pertenece al proyecto
    const faseExistente = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId: id
      }
    })

    if (!faseExistente) {
      return NextResponse.json(
        { error: 'Fase no encontrada o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Preparar datos de actualización
    const updateData: any = {}

    if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre
    if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion
    if (validatedData.orden !== undefined) updateData.orden = validatedData.orden
    if (validatedData.estado !== undefined) updateData.estado = validatedData.estado
    if (validatedData.porcentajeAvance !== undefined) updateData.porcentajeAvance = validatedData.porcentajeAvance

    // ✅ Manejar fechas
    if (validatedData.fechaInicioPlan !== undefined) {
      updateData.fechaInicioPlan = validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null
    }
    if (validatedData.fechaFinPlan !== undefined) {
      updateData.fechaFinPlan = validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null
    }
    if (validatedData.fechaInicioReal !== undefined) {
      updateData.fechaInicioReal = validatedData.fechaInicioReal ? new Date(validatedData.fechaInicioReal) : null
    }
    if (validatedData.fechaFinReal !== undefined) {
      updateData.fechaFinReal = validatedData.fechaFinReal ? new Date(validatedData.fechaFinReal) : null
    }

    // ✅ Actualizar la fase
    updateData.updatedAt = new Date()
    const faseActualizada = await prisma.proyectoFase.update({
      where: { id: faseId },
      data: updateData,
      include: {
        proyectoCronograma: {
          select: { id: true, nombre: true, tipo: true }
        },
        _count: {
          select: { proyectoEdt: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: faseActualizada
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error al actualizar fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyectos/[id]/fases/[faseId] - Eliminar fase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, faseId } = await params

    // ✅ Validar que la fase existe y pertenece al proyecto
    const fase = await prisma.proyectoFase.findFirst({
      where: {
        id: faseId,
        proyectoId: id
      },
      include: {
        _count: {
          select: { proyectoEdt: true }
        }
      }
    })

    if (!fase) {
      return NextResponse.json(
        { error: 'Fase no encontrada o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Verificar que no tenga EDTs asociados
    if (fase._count.proyectoEdt > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la fase porque tiene EDTs asociados' },
        { status: 400 }
      )
    }

    // ✅ Eliminar la fase
    await prisma.proyectoFase.delete({
      where: { id: faseId }
    })

    return NextResponse.json({
      success: true,
      message: 'Fase eliminada exitosamente'
    })

  } catch (error) {
    logger.error('Error al eliminar fase:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}